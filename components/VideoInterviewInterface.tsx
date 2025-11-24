'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, MicOff, Video, Phone, PhoneOff, Volume2, User, Bot, 
  MessageSquare, Brain, Loader2, Award, Clock, Timer, Monitor, Wifi, 
  WifiOff, Pause, Play, Lightbulb, BookOpen, Trophy, Maximize, Minimize, 
  Activity, Smile, Frown, Meh, ThumbsUp, Target 
} from 'lucide-react';
import { Interview } from '@/store/atoms';
import { vapiService } from '@/lib/vapi-client';
import { InterviewQuestion, Project, analyzeAnswer, AnswerAnalysis } from '@/lib/ai-services';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface VideoInterviewInterfaceProps {
  interview: Interview;
  questions: InterviewQuestion[];
  projects: Project[];
  onComplete: (answers: { questionId: string; answer: string; analysis: AnswerAnalysis }[]) => void;
}

interface ConversationMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  questionId?: string;
  analysis?: AnswerAnalysis;
  emotion?: string;
  confidence?: number;
}

interface LiveAnalytics {
  currentScore: number;
  technicalAccuracy: number;
  communicationClarity: number;
  confidence: number;
  questionsAnswered: number;
  totalQuestions: number;
  averageResponseTime: number;
  emotionalState: string;
  stressLevel: number;
  engagementLevel: number;
}

interface BiometricData {
  timestamp: Date;
  heartRate?: number;
  stressLevel: number;
  confidence: number;
  engagement: number;
  emotion: string;
}

export default function VideoInterviewInterface({ 
  questions,
  projects,
  onComplete 
}: VideoInterviewInterfaceProps) {
  // Core States
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewAnswers, setInterviewAnswers] = useState<{ questionId: string; answer: string; analysis: AnswerAnalysis }[]>([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  // Advanced Features States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showBiometrics, setShowBiometrics] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [audioLevel, setAudioLevel] = useState(50);
  const [videoQuality, setVideoQuality] = useState<'HD' | 'SD' | 'LOW'>('HD');
  const [currentEmotion, setCurrentEmotion] = useState<'happy' | 'neutral' | 'nervous' | 'confident'>('neutral');
  const [interviewTimer, setInterviewTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [biometricData, setBiometricData] = useState<BiometricData[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState<'intro' | 'technical' | 'behavioral' | 'conclusion'>('intro');
  
  // Analytics State
  const [analytics, setAnalytics] = useState<LiveAnalytics>({
    currentScore: 0,
    technicalAccuracy: 0,
    communicationClarity: 0,
    confidence: 0,
    questionsAnswered: 0,
    totalQuestions: questions.length,
    averageResponseTime: 0,
    emotionalState: 'calm',
    stressLevel: 20,
    engagementLevel: 85
  });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setInterviewTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Biometric Simulation
  useEffect(() => {
    if (isCallActive) {
      const interval = setInterval(() => {
        const newBiometric: BiometricData = {
          timestamp: new Date(),
          stressLevel: Math.random() * 40 + 10,
          confidence: Math.random() * 30 + 70,
          engagement: Math.random() * 20 + 80,
          emotion: ['happy', 'neutral', 'focused', 'confident'][Math.floor(Math.random() * 4)]
        };
        setBiometricData(prev => [...prev.slice(-20), newBiometric]);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isCallActive]);

  // Initialize camera
  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'user' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Camera access denied. Video will be disabled.');
      setIsVideoOn(false);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const startInterview = async () => {
    try {
      setIsConnecting(true);
      setInterviewStarted(true);
      setIsTimerRunning(true);
      setIsRecording(true);
      
      // Celebration effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Add welcome message
      const welcomeMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'interviewer',
        content: `Hello! I'm Sarah Johnson, your senior technical interviewer today. I've reviewed your resume and I'm excited to discuss your ${projects.length} projects with you. This will be a comprehensive technical interview covering your experience, problem-solving skills, and technical expertise. Are you ready to begin?`,
        timestamp: new Date(),
        emotion: 'professional',
        confidence: 95
      };
      setConversation([welcomeMessage]);
      
      // Start Vapi interview
      await vapiService.startInterview(questions, projects);
      setIsCallActive(true);
      setInterviewPhase('technical');
      
      toast.success('Interview started! Sarah is ready to begin.');
      
      // Set up Vapi event listeners
      vapiService.on('call-start', () => {
        console.log('Interview call started');
        setIsConnecting(false);
        setConnectionQuality('excellent');
      });

      vapiService.on('call-end', () => {
        console.log('Interview call ended');
        setIsCallActive(false);
        setIsTimerRunning(false);
        handleInterviewEnd();
      });

      vapiService.on('speech-start', () => {
        console.log('Candidate started speaking');
        setCurrentEmotion('confident');
      });

      vapiService.on('speech-end', () => {
        console.log('Candidate stopped speaking');
        setCurrentEmotion('neutral');
      });

      vapiService.on('message', (message: any) => {
        handleVapiMessage(message);
      });

      vapiService.on('error', (error: Error) => {
        console.error('Vapi error:', error);
        toast.error('Interview connection error. Please try again.');
        setIsCallActive(false);
        setIsConnecting(false);
        setConnectionQuality('poor');
      });

    } catch (error) {
      console.error('Failed to start interview:', error);
      toast.error('Failed to start interview. Please check your connection.');
      setIsConnecting(false);
    }
  };

  const pauseInterview = () => {
    setIsPaused(!isPaused);
    setIsTimerRunning(!isPaused);
    if (!isPaused) {
      toast.info('Interview paused. Take your time!');
    } else {
      toast.success('Interview resumed!');
    }
  };

  const endInterview = async () => {
    try {
      await vapiService.endCall();
      setIsCallActive(false);
      setIsTimerRunning(false);
      setIsRecording(false);
      
      // Celebration for completion
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
      
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      
      toast.success('Interview completed successfully!');
      handleInterviewEnd();
    } catch (error) {
      console.error('Failed to end interview:', error);
      toast.error('Failed to end interview properly.');
    }
  };

  const handleVapiMessage = async (message: any) => {
    console.log('Vapi message:', message);
    
    if (message.type === 'transcript') {
      if (message.role === 'assistant') {
        // Interviewer speaking
        const messageId = Date.now().toString();
        const newMessage: ConversationMessage = {
          id: messageId,
          role: 'interviewer',
          content: message.transcript,
          timestamp: new Date(),
          emotion: 'professional',
          confidence: 90
        };
        setConversation(prev => [...prev, newMessage]);
        
        // Generate hints based on question
        if (message.transcript.includes('?')) {
          generateHint(message.transcript);
        }
        
      } else if (message.role === 'user') {
        // Candidate speaking
        setCurrentTranscript(message.transcript);
        
        // If this looks like a complete answer, process it
        if (message.transcript.length > 20 && (
          message.transcript.endsWith('.') || 
          message.transcript.endsWith('?') || 
          message.transcript.endsWith('!')
        )) {
          await processUserAnswer(message.transcript);
        }
      }
    }
  };

  const generateHint = (question: string) => {
    const hints = [
      "Remember to use the STAR method: Situation, Task, Action, Result",
      "Focus on specific technical details and metrics",
      "Mention the technologies you used and why you chose them",
      "Quantify your impact with numbers and results",
      "Don't forget to mention teamwork and collaboration",
      "Discuss challenges you overcame and lessons learned"
    ];
    
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    setCurrentHint(randomHint);
    
    setTimeout(() => setCurrentHint(''), 10000);
  };

  const processUserAnswer = async (answer: string) => {
    if (!answer.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Add user answer to conversation
      const userMessageId = Date.now().toString();
      const emotion = analyzeEmotion(answer);
      const confidence = analyzeConfidence(answer);
      
      const userMessage: ConversationMessage = {
        id: userMessageId,
        role: 'candidate',
        content: answer,
        timestamp: new Date(),
        emotion,
        confidence
      };
      setConversation(prev => [...prev, userMessage]);

      // Find the most relevant question for this answer
      const relevantQuestion = findRelevantQuestion(answer);
      if (!relevantQuestion) {
        setIsProcessing(false);
        return;
      }

      // Find the relevant project
      const relevantProject = projects.find(p => p.title === relevantQuestion.projectTitle) || projects[0];

      // Analyze the answer
      const analysis = await analyzeAnswer(relevantQuestion, answer, relevantProject);
      
      // Store the answer and analysis
      const answerData = {
        questionId: relevantQuestion.id,
        answer,
        analysis
      };
      
      setInterviewAnswers(prev => [...prev, answerData]);
      vapiService.storeUserAnswer(relevantQuestion.id, answer);

      // Update analytics
      updateAnalytics(analysis);
      
      // Update performance data for charts
      setPerformanceData(prev => [...prev, {
        question: prev.length + 1,
        score: analysis.score,
        technical: analysis.technicalAccuracy,
        communication: analysis.communicationClarity,
        confidence: confidence
      }]);
      
      // Update conversation with analysis
      setConversation(prev => prev.map(msg => 
        msg.id === userMessageId 
          ? { ...msg, analysis, questionId: relevantQuestion.id }
          : msg
      ));

      // Show score celebration
      if (analysis.score >= 80) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      }

      toast.success(`Answer analyzed! Score: ${analysis.score.toFixed(1)}%`);

    } catch (error) {
      console.error('Error processing answer:', error);
      toast.error('Failed to analyze answer');
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeEmotion = (text: string): string => {
    const positiveWords = ['excited', 'great', 'excellent', 'amazing', 'love', 'enjoy'];
    const nervousWords = ['um', 'uh', 'maybe', 'think', 'probably'];
    const confidentWords = ['definitely', 'absolutely', 'certainly', 'clearly', 'successfully'];
    
    const lowerText = text.toLowerCase();
    
    if (positiveWords.some(word => lowerText.includes(word))) return 'happy';
    if (confidentWords.some(word => lowerText.includes(word))) return 'confident';
    if (nervousWords.some(word => lowerText.includes(word))) return 'nervous';
    return 'neutral';
  };

  const analyzeConfidence = (text: string): number => {
    const confidenceIndicators = ['definitely', 'absolutely', 'clearly', 'successfully', 'achieved'];
    const uncertaintyIndicators = ['maybe', 'think', 'probably', 'might', 'possibly'];
    
    const lowerText = text.toLowerCase();
    let confidence = 70; // Base confidence
    
    confidenceIndicators.forEach(word => {
      if (lowerText.includes(word)) confidence += 5;
    });
    
    uncertaintyIndicators.forEach(word => {
      if (lowerText.includes(word)) confidence -= 5;
    });
    
    return Math.max(0, Math.min(100, confidence));
  };

  const findRelevantQuestion = (answer: string): InterviewQuestion | null => {
    const answeredQuestionIds = interviewAnswers.map(a => a.questionId);
    const unansweredQuestions = questions.filter(q => !answeredQuestionIds.includes(q.id));
    
    if (unansweredQuestions.length > 0) {
      return unansweredQuestions[0];
    }
    
    return questions[0] || null;
  };

  const updateAnalytics = (analysis: AnswerAnalysis) => {
    setAnalytics(prev => {
      const newQuestionsAnswered = prev.questionsAnswered + 1;
      const newCurrentScore = ((prev.currentScore * prev.questionsAnswered) + analysis.score) / newQuestionsAnswered;
      const newTechnicalAccuracy = ((prev.technicalAccuracy * prev.questionsAnswered) + analysis.technicalAccuracy) / newQuestionsAnswered;
      const newCommunicationClarity = ((prev.communicationClarity * prev.questionsAnswered) + analysis.communicationClarity) / newQuestionsAnswered;
      const newConfidence = ((prev.confidence * prev.questionsAnswered) + analysis.problemSolvingApproach) / newQuestionsAnswered;

      return {
        ...prev,
        currentScore: newCurrentScore,
        technicalAccuracy: newTechnicalAccuracy,
        communicationClarity: newCommunicationClarity,
        confidence: newConfidence,
        questionsAnswered: newQuestionsAnswered,
        averageResponseTime: (prev.averageResponseTime + (analysis.responseTime || 15)) / 2,
        emotionalState: analysis.sentiment || 'neutral',
        stressLevel: Math.max(0, Math.min(100, 100 - newConfidence)),
        engagementLevel: Math.min(100, newCommunicationClarity + 10)
      };
    });
  };

  const handleInterviewEnd = () => {
    onComplete(interviewAnswers);
    vapiService.clearInterviewData();
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy': return <Smile className="h-4 w-4 text-green-400" />;
      case 'confident': return <ThumbsUp className="h-4 w-4 text-blue-400" />;
      case 'nervous': return <Frown className="h-4 w-4 text-yellow-400" />;
      default: return <Meh className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return <Wifi className="h-4 w-4 text-green-400" />;
      case 'good': return <Wifi className="h-4 w-4 text-yellow-400" />;
      case 'poor': return <WifiOff className="h-4 w-4 text-red-400" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((analytics.questionsAnswered) / analytics.totalQuestions) * 100;

  const radarData = [
    { subject: 'Technical', A: analytics.technicalAccuracy, fullMark: 100 },
    { subject: 'Communication', A: analytics.communicationClarity, fullMark: 100 },
    { subject: 'Confidence', A: analytics.confidence, fullMark: 100 },
    { subject: 'Engagement', A: analytics.engagementLevel, fullMark: 100 },
    { subject: 'Problem Solving', A: analytics.currentScore, fullMark: 100 }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="text-center">
              <Trophy className="h-24 w-24 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-white mb-2">Interview Completed!</h2>
              <p className="text-xl text-gray-300">Great job! Analyzing your performance...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AI Technical Interview</h1>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>with Sarah Johnson</span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {interviewPhase}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant={isCallActive ? "default" : "secondary"} className="bg-green-600 text-white text-xs flex items-center space-x-1">
                {isCallActive ? (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span>Ready</span>
                  </>
                )}
              </Badge>
              
              <div className="flex items-center space-x-1 text-xs">
                {getConnectionIcon()}
                <span className="text-gray-300 capitalize">{connectionQuality}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-xs">
                <Timer className="h-3 w-3 text-blue-400" />
                <span className="text-blue-400 font-mono">{formatTime(interviewTimer)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={toggleFullscreen}
              className="text-black border-gray-600 hover:bg-gray-700 text-xs"
            >
              {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            </Button>
            
            <div className="w-32">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-400 mt-1">
                {analytics.questionsAnswered}/{analytics.totalQuestions} Questions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 h-screen flex">
        {/* Video Section */}
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 p-6">
            <div className="h-full grid grid-cols-2 gap-6">
              {/* Interviewer Video */}
              <Card className="bg-gray-800 border-gray-700 relative overflow-hidden h-full group">
                <CardContent className="p-0 h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center relative">
                    <div className="text-center">
                      <motion.div 
                        className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl"
                        animate={{ 
                          scale: isCallActive ? [1, 1.05, 1] : 1,
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Bot className="h-16 w-16 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2">Sarah Johnson</h3>
                      <p className="text-blue-200 text-sm mb-1">Senior Technical Interviewer</p>
                      <p className="text-blue-300 text-xs mb-3">Google • 10+ Years Experience</p>
                      
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <Badge variant="outline" className="text-blue-300 border-blue-400">
                          AI Powered
                        </Badge>
                        <Badge variant="outline" className="text-green-300 border-green-400">
                          Expert Level
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Speaking Indicator */}
                    {isCallActive && (
                      <motion.div 
                        className="absolute bottom-4 left-4 flex items-center space-x-2 bg-green-600/90 px-3 py-2 rounded-full backdrop-blur-sm"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium">Speaking...</span>
                      </motion.div>
                    )}
                    
                    {/* Connection Status */}
                    {isConnecting && (
                      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-yellow-600/90 px-3 py-2 rounded-full backdrop-blur-sm">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                        <span className="text-white text-sm">Connecting...</span>
                      </div>
                    )}
                    
                    {/* Mood Indicator */}
                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-blue-600/90 px-3 py-2 rounded-full backdrop-blur-sm">
                      <Smile className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">Professional</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Video */}
              <Card className="bg-gray-800 border-gray-700 relative overflow-hidden h-full group">
                <CardContent className="p-0 h-full">
                  {isVideoOn ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover rounded-lg"
                      />
                      
                      {/* Video Quality Indicator */}
                      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                        <Monitor className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-xs font-medium">{videoQuality}</span>
                      </div>
                      
                      {/* Emotion Detection */}
                      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 px-3 py-2 rounded-full backdrop-blur-sm">
                        {getEmotionIcon(currentEmotion)}
                        <span className="text-white text-sm capitalize">{currentEmotion}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <User className="h-16 w-16 text-gray-400" />
                        </div>
                        <p className="text-gray-400 text-xl mb-2">Camera Off</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleVideo}
                          className="text-gray-400 border-gray-500"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Turn On Camera
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Processing Indicator */}
                  {isProcessing && (
                    <motion.div 
                      className="absolute bottom-4 right-4 flex items-center space-x-2 bg-blue-600/90 px-3 py-2 rounded-full backdrop-blur-sm"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span className="text-white text-sm">Analyzing...</span>
                    </motion.div>
                  )}
                  
                  {/* Muted Indicator */}
                  {isMuted && (
                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 px-3 py-2 rounded-full backdrop-blur-sm">
                      <MicOff className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">Muted</span>
                    </div>
                  )}
                  
                  {/* Pause Indicator */}
                  {isPaused && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center">
                        <Pause className="h-16 w-16 text-white mb-4 mx-auto" />
                        <p className="text-white text-xl">Interview Paused</p>
                        <p className="text-gray-300 text-sm">Take your time to prepare</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Fixed Bottom Controls */}
          <div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 px-6 py-4">
            {/* Main Controls */}
            <div className="flex justify-center items-center space-x-4 mb-4">
              
              
              {/* Pause/Resume Button */}
              {isCallActive && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={pauseInterview}
                  className="rounded-full w-14 h-14 border-gray-600"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </Button>
              )}
              
              {/* Main Call Button */}
              {!isCallActive ? (
                <Button
                  onClick={startInterview}
                  disabled={isConnecting}
                  className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16 text-lg font-semibold shadow-lg"
                  size="lg"
                >
                  {isConnecting ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Phone className="h-8 w-8" />
                  )}
                </Button>
              ) : (
                <Button
                  onClick={endInterview}
                  variant="destructive"
                  className="rounded-full w-16 h-16 shadow-lg"
                  size="lg"
                >
                  <PhoneOff className="h-8 w-8" />
                </Button>
              )}
              
              {/* Additional Controls */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowNotes(!showNotes)}
                className="rounded-full w-14 h-14 border-gray-600"
              >
                <BookOpen className="h-6 w-6" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowHints(!showHints)}
                className="rounded-full w-14 h-14 border-gray-600"
              >
                <Lightbulb className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Audio Level Control */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Volume2 className="h-4 w-4 text-gray-400" />
              <Slider
                value={[audioLevel]}
                onValueChange={(value) => setAudioLevel(value[0])}
                max={100}
                step={1}
                className="w-32"
              />
              <span className="text-sm text-gray-400 w-8">{audioLevel}%</span>
            </div>
            
            {/* Live Transcript - Fixed Position */}
            {currentTranscript && (
              <motion.div 
                className="bg-gray-700/90 backdrop-blur-sm rounded-lg p-4 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">Live Transcript:</span>
                  <Badge variant="outline" className="text-xs">
                    Real-time
                  </Badge>
                </div>
                <p className="text-white text-sm leading-relaxed line-clamp-2">{currentTranscript}</p>
              </motion.div>
            )}
            
            {/* Hints Display */}
            {currentHint && showHints && (
              <motion.div 
                className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-3 max-w-2xl mx-auto mt-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Hint:</span>
                </div>
                <p className="text-yellow-100 text-sm mt-1">{currentHint}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Fixed */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <Tabs defaultValue="analytics" className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                <TabsTrigger value="conversation" className="text-xs">Chat</TabsTrigger>
                <TabsTrigger value="biometrics" className="text-xs">Metrics</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="analytics" className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-sm">
                  <Brain className="h-4 w-4 mr-2" />
                  Live Performance
                </h3>
                
                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
                    <div className="text-lg font-bold">{analytics.currentScore.toFixed(1)}%</div>
                    <div className="text-xs opacity-80">Overall Score</div>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3">
                    <div className="text-lg font-bold">{analytics.technicalAccuracy.toFixed(1)}%</div>
                    <div className="text-xs opacity-80">Technical</div>
                  </Card>
                  <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3">
                    <div className="text-lg font-bold">{analytics.communicationClarity.toFixed(1)}%</div>
                    <div className="text-xs opacity-80">Communication</div>
                  </Card>
                  <Card className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-3">
                    <div className="text-lg font-bold">{analytics.confidence.toFixed(1)}%</div>
                    <div className="text-xs opacity-80">Confidence</div>
                  </Card>
                </div>
                
                {/* Performance Chart */}
                {performanceData.length > 0 && (
                  <Card className="bg-gray-700 p-3">
                    <h4 className="text-sm font-medium mb-2">Performance Trend</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={performanceData}>
                        <XAxis dataKey="question" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                
                {/* Radar Chart */}
                <Card className="bg-gray-700 p-3">
                  <h4 className="text-sm font-medium mb-2">Skill Assessment</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#4B5563" />
                      <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" fontSize={10} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" fontSize={10} />
                      <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="conversation" className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold flex items-center text-sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Interview Conversation
                </h3>
              </div>
              
              <div 
                ref={conversationRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {!interviewStarted && (
                  <div className="text-center text-gray-400 py-8">
                    <Phone className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-sm">Click the green button to start your interview</p>
                    <p className="text-xs text-gray-500 mt-1">Sarah is ready to meet you!</p>
                  </div>
                )}
                
                {conversation.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        message.role === 'candidate'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {message.role === 'candidate' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          {message.role === 'candidate' ? 'You' : 'Sarah'}
                        </span>
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.emotion && (
                          <div className="flex items-center space-x-1">
                            {getEmotionIcon(message.emotion)}
                          </div>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Analysis for candidate messages */}
                      {message.role === 'candidate' && message.analysis && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            <Award className="h-2 w-2 mr-1" />
                            {message.analysis.score.toFixed(1)}%
                          </Badge>
                          {message.confidence && (
                            <Badge variant="outline" className="text-xs">
                              <Target className="h-2 w-2 mr-1" />
                              {message.confidence}% confident
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-center">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing response...</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="biometrics" className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Biometric Analysis
                </h3>
                
                {/* Stress Level */}
                <Card className="bg-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Stress Level</span>
                    <Badge variant={analytics.stressLevel < 30 ? "default" : analytics.stressLevel < 60 ? "secondary" : "destructive"}>
                      {analytics.stressLevel.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analytics.stressLevel} className="h-2" />
                </Card>
                
                {/* Engagement */}
                <Card className="bg-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Engagement</span>
                    <Badge variant="default" className="bg-green-600">
                      {analytics.engagementLevel.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analytics.engagementLevel} className="h-2" />
                </Card>
                
                {/* Response Time */}
                <Card className="bg-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Avg Response Time</span>
                    <Badge variant="outline">
                      {analytics.averageResponseTime.toFixed(1)}s
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400">
                    Optimal range: 10-20 seconds
                  </div>
                </Card>
                
                {/* Emotional State */}
                <Card className="bg-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Emotional State</span>
                    <div className="flex items-center space-x-1">
                      {getEmotionIcon(analytics.emotionalState)}
                      <span className="text-sm capitalize">{analytics.emotionalState}</span>
                    </div>
                  </div>
                </Card>
                
                {/* Biometric Timeline */}
                {biometricData.length > 0 && (
                  <Card className="bg-gray-700 p-3">
                    <h4 className="text-sm font-medium mb-2">Stress Timeline</h4>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={biometricData.slice(-10)}>
                        <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip />
                        <Line type="monotone" dataKey="stressLevel" stroke="#EF4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="confidence" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}