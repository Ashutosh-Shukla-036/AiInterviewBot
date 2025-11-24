'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilState } from 'recoil';
import { currentInterviewState } from '@/store/atoms';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ResultsPageProps {
  params: { id: string };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const [currentInterview, setCurrentInterview] = useRecoilState(currentInterviewState);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!currentInterview || currentInterview.id !== params.id) {
      fetchInterview();
    } else {
      setIsLoading(false);
    }
  }, [params.id, currentInterview]);

  const fetchInterview = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/interviews/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentInterview(data.interview);
      } else {
        toast.error('Interview not found');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
      toast.error('Failed to load interview');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!currentInterview) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center h-96">
            <p>Interview not found</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const answeredQuestions = currentInterview.questions.filter(q => q.userAnswer && q.score !== null);
  const averageScore = answeredQuestions.length > 0
    ? answeredQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / answeredQuestions.length
    : 0;

  const categoryScores: { [key: string]: number[] } = {};
  answeredQuestions.forEach(q => {
    if (!categoryScores[q.category]) categoryScores[q.category] = [];
    categoryScores[q.category].push(q.score || 0);
  });

  const categoryAverages = Object.entries(categoryScores).map(([category, scores]) => ({
    category,
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    count: scores.length
  })).sort((a, b) => b.average - a.average);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4" />;
    if (score >= 60) return <Award className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="mb-4 flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900">{currentInterview.title}</h1>
            <p className="text-gray-600 mt-2">Interview Results & Feedback</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview Stats */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Overall Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(averageScore).split(' ')[0]}`}>
                      {averageScore.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {answeredQuestions.length} of {currentInterview.questions.length} questions answered
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryAverages.map(({ category, average, count }) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{category}</span>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(average)}
                          <span className={`text-sm font-semibold px-2 py-1 rounded ${getScoreColor(average)}`}>
                            {average.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            average >= 80 ? 'bg-green-500' :
                            average >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${average}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">{count} questions</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Feedback */}
              {currentInterview.feedbackSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Feedback Summary</CardTitle>
                    <CardDescription>Personalized insights and recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line text-sm leading-relaxed">
                      {currentInterview.feedbackSummary}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Question by Question Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Question-by-Question Results</CardTitle>
                  <CardDescription>Detailed breakdown of your performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentInterview.questions.map((question, index) => (
                    <div key={question.id} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              Q{index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {question.category}
                            </Badge>
                            {question.score !== null && (
                              <Badge className={`text-xs ${getScoreColor(question.score)}`}>
                                {question.score.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 mb-3">
                            {question.questionText}
                          </p>
                        </div>
                      </div>

                      {question.userAnswer ? (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-sm text-blue-900 mb-2">Your Answer:</h4>
                          <p className="text-sm text-blue-800">{question.userAnswer}</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">No answer provided</span>
                        </div>
                      )}

                      {index < currentInterview.questions.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}