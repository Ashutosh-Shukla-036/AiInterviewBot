'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilState } from 'recoil';
import { interviewsState, isLoadingState, currentInterviewState } from '@/store/atoms';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import ResumeUploader from '@/components/ResumeUploader';
import InterviewCard from '@/components/InterviewCard';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BookOpen, TrendingUp, Clock, Brain, Zap, Settings, Award, Target, ChartBar as BarChart3, Calendar, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [interviews, setInterviews] = useRecoilState(interviewsState);
  const [isLoading, setIsLoading] = useRecoilState(isLoadingState);
  const [, setCurrentInterview] = useRecoilState(currentInterviewState);
  const [showUploader, setShowUploader] = useState(false);
  const [aiService, setAiService] = useState('gemini');
  const [resumeParser, setResumeParser] = useState('local');
  const router = useRouter();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/interviews', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInterviews(data.interviews);
      }
    } catch (error) {
      toast.error('Failed to load interviews');
    }
  };

  const handleResumeUpload = async (file: File, title: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('aiService', aiService);
      formData.append('resumeParser', resumeParser);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentInterview(data.interview);
        toast.success(`Resume processed with ${aiService.toUpperCase()}! Projects extracted and questions generated.`);
        router.push(`/interview/${data.interview.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process resume');
      }
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (interview: any) => {
    setCurrentInterview(interview);
    router.push(`/interview/${interview.id}/results`);
  };

  const handleContinueInterview = (interview: any) => {
    setCurrentInterview(interview);
    router.push(`/interview/${interview.id}`);
  };

  const completedInterviews = interviews.filter(i => i.status === 'COMPLETED');
  const inProgressInterviews = interviews.filter(i => i.status === 'IN_PROGRESS');
  const averageScore = completedInterviews.length > 0
    ? completedInterviews.reduce((sum, interview) => {
        const scores = interview.questions.filter(q => q.score).map(q => q.score!);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return sum + avgScore;
      }, 0) / completedInterviews.length
    : 0;

  const totalQuestions = interviews.reduce((sum, interview) => sum + interview.questions.length, 0);
  const recentInterviews = interviews.slice(0, 3);
  
  // Mock data for preparation
  const mockProjects = [
    {
      title: 'E-commerce Platform',
      description: 'Full-stack web application with React, Node.js, and MongoDB',
      technologies: ['React', 'Node.js', 'MongoDB', 'Express', 'JWT']
    },
    {
      title: 'Task Management App',
      description: 'Mobile-first application with real-time updates',
      technologies: ['React Native', 'Firebase', 'Redux', 'TypeScript']
    }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to AI Interview Bot
            </h1>
            <p className="text-lg text-gray-600">
              Practice technical interviews with AI-powered feedback and improve your skills
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Interviews</CardTitle>
                <BookOpen className="h-5 w-5 text-blue-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{interviews.length}</div>
                <p className="text-xs text-blue-200 mt-1">
                  {totalQuestions} questions answered
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Average Score</CardTitle>
                <Award className="h-5 w-5 text-green-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {averageScore > 0 ? `${averageScore.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-green-200 mt-1">
                  {completedInterviews.length} completed interviews
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-100">In Progress</CardTitle>
                <Clock className="h-5 w-5 text-yellow-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{inProgressInterviews.length}</div>
                <p className="text-xs text-yellow-200 mt-1">
                  Active interview sessions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">AI Performance</CardTitle>
                <Brain className="h-5 w-5 text-purple-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {averageScore >= 80 ? 'Excellent' : averageScore >= 60 ? 'Good' : 'Improving'}
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  AI-powered analysis
                </p>
              </CardContent>
            </Card>

            {/* New Stats Cards */}
            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">This Week</CardTitle>
                <Calendar className="h-5 w-5 text-indigo-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">3</div>
                <p className="text-xs text-indigo-200 mt-1">
                  Interviews completed
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* New Interview Section */}
            <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                  <Zap className="h-5 w-5" />
                  <span>Start New AI Interview</span>
                </CardTitle>
                <CardDescription>
                  Upload your resume to generate personalized project-based interview questions using advanced AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showUploader ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setShowUploader(true)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Start New Interview</span>
                      </Button>
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Brain className="h-3 w-3" />
                        <span>AI-Powered</span>
                      </Badge>
                    </div>
                    
                    {/* AI Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                          <Settings className="h-4 w-4" />
                          <span>AI Service for Questions & Analysis</span>
                        </label>
                        <Select value={aiService} onValueChange={setAiService}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="huggingface">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span>Hugging Face (Free)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                          <Target className="h-4 w-4" />
                          <span>Resume Parser</span>
                        </label>
                        <Select value={resumeParser} onValueChange={setResumeParser}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Local Parser (Fast)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="gemini">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>HuggingFace (Advanced)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">AI Configuration</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{aiService.toUpperCase()}</Badge>
                          <Badge variant="outline">{resumeParser}</Badge>
                        </div>
                      </div>
                      <ResumeUploader onUpload={handleResumeUpload} isLoading={isLoading} />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowUploader(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {interviews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span>Recent Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentInterviews.map((interview, index) => (
                        <div key={interview.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 truncate">
                            {interview.title}
                          </span>
                          <Badge 
                            variant={interview.status === 'COMPLETED' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {interview.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Improvement Areas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Technical Skills</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(averageScore, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Communication</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(averageScore + 10, 100)}%` }}></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Problem Solving</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(averageScore - 5, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span>AI Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Focus on project-specific examples</p>
                      <p>• Practice explaining technical decisions</p>
                      <p>• Improve communication clarity</p>
                      <p>• Prepare for behavioral questions</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Interview History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Interview Management</span>
                </CardTitle>
                <CardDescription>
                  Manage your interviews and prepare for upcoming sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="all">All Interviews</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {interviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">No interviews yet</p>
                        <p className="text-sm text-gray-400">Upload your resume to get started with AI-powered interviews!</p>
                      </div>
                    </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {interviews.map((interview) => (
                      <InterviewCard
                        key={interview.id}
                        interview={interview}
                        onViewDetails={handleViewDetails}
                        onContinue={handleContinueInterview}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="in-progress" className="space-y-4">
                {inProgressInterviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">No interviews in progress</p>
                        <p className="text-sm text-gray-400">Start a new interview to begin practicing!</p>
                      </div>
                    </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressInterviews.map((interview) => (
                      <InterviewCard
                        key={interview.id}
                        interview={interview}
                        onViewDetails={handleViewDetails}
                        onContinue={handleContinueInterview}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {completedInterviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">No completed interviews yet</p>
                        <p className="text-sm text-gray-400">Complete an interview to see detailed feedback and analysis!</p>
                      </div>
                    </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedInterviews.map((interview) => (
                      <InterviewCard
                        key={interview.id}
                        interview={interview}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}