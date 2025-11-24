'use client';

import Vapi from '@vapi-ai/web';
import { InterviewQuestion, Project } from './ai-services';

// Define proper types for Vapi events
type VapiEventMap = {
  'call-start': () => void;
  'call-end': () => void;
  'speech-start': () => void;
  'speech-end': () => void;
  'message': (message: any) => void;
  'error': (error: Error) => void;
  'volume-level': (level: number) => void;
};

type VapiEventName = keyof VapiEventMap;
type VapiEventHandler<T extends VapiEventName> = VapiEventMap[T];

interface UserAnswer {
  questionId: string;
  answer: string;
  timestamp: Date;
}

class VapiService {
  private vapi: Vapi | null = null;
  private isInitialized = false;
  private currentQuestions: InterviewQuestion[] = [];
  private currentProjects: Project[] = [];
  private userAnswers: UserAnswer[] = [];
  private eventHandlers: Map<string, Set<Function>> = new Map();

  private callActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeVapi();
    }
  }

  private initializeVapi(): void {
    try {
      const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      
      if (!apiKey) {
        console.error('VAPI API key is not configured');
        return;
      }

      this.vapi = new Vapi(apiKey);
      this.isInitialized = true;
      
      // Set up event listeners
      this.vapi.on('call-start', () => {
        console.log('Call started');
        this.callActive = true;
      });

      this.vapi.on('call-end', () => {
        console.log('Call ended');
        this.callActive = false;
      });

      this.vapi.on('speech-start', () => {
        console.log('User started speaking');
      });

      this.vapi.on('speech-end', () => {
        console.log('User stopped speaking');
      });

      this.vapi.on('message', (message: any) => {
        console.log('Message received:', message);
        
        // Handle transcript messages to capture user answers
        if (message.type === 'transcript' && message.role === 'user') {
          // You can process the transcript here if needed
          console.log('User transcript:', message.transcript);
        }
      });

      this.vapi.on('error', (error: Error) => {
        console.error('Vapi error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize Vapi:', error);
      this.isInitialized = false;
    }
  }

  async startInterview(
    questions: InterviewQuestion[], 
    projects: Project[]
  ): Promise<boolean> {
    if (!this.vapi || !this.isInitialized) {
      throw new Error('Vapi not initialized. Please check your API key.');
    }

    this.currentQuestions = questions;
    this.currentProjects = projects;
    this.userAnswers = [];

    try {
      const projectsList = projects
        .map(p => `${p.title} (${p.technologies.join(', ')})`)
        .join('; ');
      
      const questionsList = questions
        .map((q, i) => `${i + 1}. ${q.questionText}`)
        .join('\n');

      // Create assistant configuration matching Vapi's API
      const assistantConfig = {
        name: 'Sarah - Senior Technical Interviewer',
        model: {
          provider: 'openai' as const,
          model: 'gpt-4',
          messages: [
            {
              role: 'system' as const,
              content: `You are Sarah, a senior technical interviewer with 10+ years of experience. You are conducting a project-based technical interview.

INTERVIEW CONTEXT:
Projects to discuss: ${projectsList}

Questions to cover:
${questionsList}

INTERVIEWER PERSONA:
- Professional, warm, and encouraging
- Ask questions naturally and conversationally
- Show genuine interest in their projects
- Ask follow-up questions based on their answers
- Acknowledge good points they make
- Guide the conversation smoothly between topics
- Be supportive but maintain professional standards

INTERVIEW FLOW:
1. Start with a warm greeting and brief introduction
2. Ask about their projects one by one
3. Dive deep into technical details, challenges, and decisions
4. Ask follow-up questions based on their responses
5. Transition naturally between projects
6. End with closing remarks and next steps

CONVERSATION STYLE:
- Use natural speech patterns
- Ask one question at a time
- Wait for complete answers before moving on
- Show active listening with acknowledgments like "That's interesting", "I see", "Tell me more about that"
- Ask clarifying questions when needed
- Keep responses concise and conversational

Remember: This is a real interview, so maintain professionalism while being personable.`
            }
          ],
          temperature: 0.7,
          maxTokens: 150
        },
        voice: {
          provider: 'playht' as const,
          voiceId: 'jennifer'
        },
        firstMessage: projects.length > 0 
          ? `Hello! I'm Sarah, and I'll be your interviewer today. I'm excited to learn about your technical projects and experience. I've reviewed your resume and I'm particularly interested in discussing your project "${projects[0].title}". Are you ready to begin?`
          : `Hello! I'm Sarah, and I'll be your interviewer today. I'm excited to learn about your technical experience. Are you ready to begin?`,
        recordingEnabled: true,
        endCallMessage: 'Thank you so much for your time today! This was a great conversation. We\'ll be in touch soon with feedback and next steps. Have a wonderful day!',
        endCallFunctionEnabled: false,
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 1800, // 30 minutes
        backgroundSound: 'off' as const
      };

      await this.vapi.start(assistantConfig as any);
      return true;
    } catch (error) {
      console.error('Failed to start interview:', error);
      throw new Error(`Failed to start interview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async endCall(): Promise<boolean> {
    if (!this.vapi) {
      throw new Error('Vapi not initialized');
    }

    try {
      this.vapi.stop();
      return true;
    } catch (error) {
      console.error('Failed to end call:', error);
      throw new Error(`Failed to end call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMessage(message: string): Promise<boolean> {
    if (!this.vapi) {
      throw new Error('Vapi not initialized');
    }

    if (!this.isCallActive()) {
      throw new Error('No active call');
    }

    try {
      // Correct way to send a message in Vapi
      this.vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content: message,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Store user answers during the interview
  storeUserAnswer(questionId: string, answer: string): void {
    this.userAnswers.push({
      questionId,
      answer,
      timestamp: new Date()
    });
  }

  // Get all stored answers
  getUserAnswers(): UserAnswer[] {
    return [...this.userAnswers];
  }

  // Get current questions
  getCurrentQuestions(): InterviewQuestion[] {
    return [...this.currentQuestions];
  }

  // Get current projects
  getCurrentProjects(): Project[] {
    return [...this.currentProjects];
  }

  // Clear interview data
  clearInterviewData(): void {
    this.currentQuestions = [];
    this.currentProjects = [];
    this.userAnswers = [];
    this.callActive = false;
  }

  isCallActive(): boolean {
    return this.callActive && this.vapi !== null;
  }

  isMuted(): boolean {
    if (!this.vapi) {
      return false;
    }
    try {
      return this.vapi.isMuted() ?? false;
    } catch {
      return false;
    }
  }

  toggleMute(): void {
    if (this.vapi) {
      try {
        const currentMuteState = this.vapi.isMuted();
        this.vapi.setMuted(!currentMuteState);
      } catch (error) {
        console.error('Failed to toggle mute:', error);
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.vapi) {
      this.vapi.setMuted(muted);
    }
  }

  on<T extends VapiEventName>(
    event: T, 
    callback: VapiEventHandler<T>
  ): void {
    if (this.vapi) {
      this.vapi.on(event, callback as any);
      
      // Store handler for cleanup
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event)?.add(callback as Function);
    }
  }

  off<T extends VapiEventName>(
    event: T, 
    callback: VapiEventHandler<T>
  ): void {
    if (this.vapi) {
      this.vapi.off(event, callback as any);
      
      // Remove from stored handlers
      this.eventHandlers.get(event)?.delete(callback as Function);
    }
  }

  // Clean up all event listeners
  cleanup(): void {
    if (this.vapi) {
      this.eventHandlers.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.vapi?.off(event as any, callback as any);
        });
      });
      this.eventHandlers.clear();
    }
  }

  // Check if Vapi is properly initialized
  isReady(): boolean {
    return this.isInitialized && this.vapi !== null;
  }
}

// Export singleton instance
export const vapiService = new VapiService();

// Export type for external use
export type { UserAnswer, VapiEventName, VapiEventHandler };