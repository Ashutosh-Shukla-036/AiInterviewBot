'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Volume2, VolumeX, SkipForward, MessageSquare, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { Interview, Question } from '@/store/atoms';
import { speechToTextService, textToSpeechService } from '@/lib/speech-services';
import { toast } from 'sonner';

interface InterviewInterfaceProps {
  interview: Interview;
  onAnswerSubmit: (questionId: string, answer: string) => Promise<void>;
  onComplete: () => void;
}

export default function InterviewInterface({ interview, onAnswerSubmit, onComplete }: InterviewInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interviewMode, setInterviewMode] = useState<'voice' | 'text'>('text');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [hasSpokenQuestion, setHasSpokenQuestion] = useState(false);

  const currentQuestion = interview.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / interview.questions.length) * 100;

  useEffect(() => {
    // Set current answer if question already has an answer
    if (currentQuestion?.userAnswer) {
      setCurrentAnswer(currentQuestion.userAnswer);
    } else {
      setCurrentAnswer('');
    }
    setCurrentTranscript('');
    setHasSpokenQuestion(false);
    
    // Auto-speak question in voice mode
    if (interviewMode === 'voice') {
      setTimeout(() => speakQuestion(), 1000);
    }
  }, [currentQuestion]);

  const speakQuestion = async (force = false) => {
    if (hasSpokenQuestion && !force) return;
    
    try {
      setIsSpeaking(true);
      const welcomeText = currentQuestionIndex === 0 
        ? "Hello! I'm your AI interviewer. Let's begin with your first question. " 
        : "Great! Let's move on to the next question. ";
      
      const fullText = welcomeText + currentQuestion.questionText;
      
      await textToSpeechService.speak(fullText, {
        rate: 0.9,
        pitch: 1.0,
        volume: 0.8
      });
      
      setHasSpokenQuestion(true);
      toast.success('Question spoken. You can now record your answer.');
    } catch (error) {
      console.error('TTS Error:', error);
      toast.error('Failed to speak question. Please read it above.');
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    textToSpeechService.stop();
    setIsSpeaking(false);
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setCurrentTranscript('');
      await speechToTextService.startRecording();
      toast.success('Recording started. Speak your answer now.');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsTranscribing(true);
      const transcript = await speechToTextService.stopRecording();
      setCurrentTranscript(transcript);
      setCurrentAnswer(transcript);
      
      if (transcript.trim()) {
        toast.success('Speech transcribed successfully!');
      } else {
        toast.error('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe speech. Please try again.');
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentAnswer.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAnswerSubmit(currentQuestion.id, currentAnswer);
      
      // Provide audio feedback
      if (interviewMode === 'voice') {
        try {
          setIsSpeaking(true);
          await textToSpeechService.speak("Thank you for your answer. I've recorded your response.");
        } catch (error) {
          console.error('TTS Error:', error);
        } finally {
          setIsSpeaking(false);
        }
      }
      
      if (currentQuestionIndex < interview.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
        setCurrentTranscript('');
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipQuestion = () => {
    if (interviewMode === 'voice') {
      try {
        textToSpeechService.speak("Skipping this question. Let's move on.");
      } catch (error) {
        console.error('TTS Error:', error);
      }
    }
    
    if (currentQuestionIndex < interview.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
      setCurrentTranscript('');
    } else {
      onComplete();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Interview in Progress</CardTitle>
              <CardDescription>Question {currentQuestionIndex + 1} of {interview.questions.length}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm capitalize">
                {currentQuestion.category}
              </Badge>
              <Badge variant="outline" className="text-sm capitalize">
                {interviewMode} Mode
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={interviewMode === 'voice' ? 'default' : 'outline'}
              onClick={() => setInterviewMode('voice')}
              className="flex items-center space-x-2"
            >
              <Mic className="h-4 w-4" />
              <span>Voice Mode</span>
            </Button>
            <Button
              variant={interviewMode === 'text' ? 'default' : 'outline'}
              onClick={() => setInterviewMode('text')}
              className="flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Text Mode</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Current Question
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => speakQuestion(true)}
                disabled={isSpeaking}
                className="flex items-center space-x-2"
              >
                <Volume2 className="h-4 w-4" />
                <span>{isSpeaking ? 'Speaking...' : 'Listen'}</span>
              </Button>
              {isSpeaking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  className="flex items-center space-x-2"
                >
                  <VolumeX className="h-4 w-4" />
                  <span>Stop</span>
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed text-lg">
            {currentQuestion.questionText}
          </p>
        </CardContent>
      </Card>

      {/* Answer Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Answer</CardTitle>
          <CardDescription>
            {interviewMode === 'voice' 
              ? 'Use the microphone to record your answer or type it below'
              : 'Type your answer in the text area below'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Controls */}
          {interviewMode === 'voice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing || isSpeaking}
                  className="flex items-center space-x-2 px-8"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-5 w-5" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      <span>Start Recording</span>
                    </>
                  )}
                </Button>
              </div>
              
              {isRecording && (
                <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
                  <div className="animate-pulse w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="font-medium">Recording... Speak clearly into your microphone</span>
                </div>
              )}
              
              {isTranscribing && (
                <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 p-4 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Transcribing your speech...</span>
                </div>
              )}
              
              {currentTranscript && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Transcribed:</strong> {currentTranscript}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <Textarea
            placeholder="Start typing your answer here..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            rows={6}
            className="resize-none"
            disabled={isRecording || isTranscribing}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={skipQuestion}
          disabled={isSubmitting || isRecording || isTranscribing}
          className="flex items-center space-x-2"
        >
          <SkipForward className="h-4 w-4" />
          <span>Skip Question</span>
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={!currentAnswer.trim() || isSubmitting || isRecording || isTranscribing}
          className="flex items-center space-x-2 px-8"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {currentQuestionIndex === interview.questions.length - 1 ? 'Finish Interview' : 'Next Question'}
          </span>
        </Button>
      </div>
    </div>
  );
}