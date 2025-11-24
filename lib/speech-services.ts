const HF_API_KEY = process.env.HF_API_KEY;
const HF_STT_MODEL = process.env.HF_STT_MODEL || 'openai/whisper-small';

export class SpeechToTextService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data more frequently
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const transcription = await this.transcribeAudio(audioBlob);
          
          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          
          resolve(transcription);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Add retry logic for better reliability
      let retries = 3;
      let result;
      
      while (retries > 0) {
        try {
          const response = await fetch(`https://api-inference.huggingface.co/models/${HF_STT_MODEL}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'audio/webm',
            },
            body: arrayBuffer,
          });

          if (!response.ok) {
            if (response.status === 503) {
              // Model is loading, wait and retry
              await new Promise(resolve => setTimeout(resolve, 2000));
              retries--;
              continue;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          result = await response.json();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (result?.error) {
        throw new Error(result.error);
      }

      return result?.text || result?.transcription || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }

  // Enhanced transcription with preprocessing
  async transcribeWithPreprocessing(audioBlob: Blob): Promise<string> {
    try {
      // Convert to higher quality format if needed
      const response = await fetch(`https://api-inference.huggingface.co/models/${HF_STT_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'audio/wav',
        },
        body: await this.convertToWav(audioBlob),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const transcription = result.text || result.transcription || '';
      
      // Post-process transcription
      return this.postProcessTranscription(transcription);
    } catch (error) {
      console.error('Transcription error:', error);
      // Fallback to regular transcription
      return this.transcribeAudio(audioBlob);
    }
  }

  private async convertToWav(audioBlob: Blob): Promise<ArrayBuffer> {
    // Simple conversion - in production, you might want more sophisticated audio processing
    return audioBlob.arrayBuffer();
  }

  private postProcessTranscription(text: string): string {
    // Clean up common transcription issues
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Proper spacing after punctuation
      .trim();
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export class TextToSpeechService {
  private synth!: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
  }

  async speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: string;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      this.stop();

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Set voice properties
      this.currentUtterance.rate = options.rate || 0.85;
      this.currentUtterance.pitch = options.pitch || 1.1;
      this.currentUtterance.volume = options.volume || 1.0;

      // Try to use a professional female voice for interviewer
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(voice => {
        const name = voice.name.toLowerCase();
        return (
          (name.includes('female') || name.includes('woman') || name.includes('sarah')) &&
          voice.lang.startsWith('en')
        ) || (
          (name.includes('google') || name.includes('microsoft')) &&
          voice.lang.startsWith('en-US')
        );
      }
      );
      
      if (preferredVoice) {
        this.currentUtterance.voice = preferredVoice;
      }

      this.currentUtterance.onend = () => resolve();
      this.currentUtterance.onerror = (error) => reject(error);

      this.synth.speak(this.currentUtterance);
    });
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    return this.synth?.speaking || false;
  }
}

export const speechToTextService = new SpeechToTextService();
export const textToSpeechService = new TextToSpeechService();