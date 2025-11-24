'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilState } from 'recoil';
import { currentInterviewState } from '@/store/atoms';
import AuthGuard from '@/components/AuthGuard';
import VideoInterviewInterface from '@/components/VideoInterviewInterface';
import { generateProjectQuestions, InterviewQuestion, Project, AnswerAnalysis } from '@/lib/ai-services';
import { toast } from 'sonner';

interface InterviewPageProps {
  params: { id: string };
}

export default function InterviewPage({ params }: InterviewPageProps) {
  const [currentInterview, setCurrentInterview] = useRecoilState(currentInterviewState);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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

        console.log(data);
        setCurrentInterview(data.interview);
        
        // Extract projects from interview skills (which now contains projects)
        // ✅ Correct: pull projects directly
        const interviewProjects = data.interview.skills?.projects || [];
        setProjects(interviewProjects);
        
        // Generate questions based on projects
        if (interviewProjects.length > 0) {
          try {
            const generatedQuestions = await generateProjectQuestions(interviewProjects);
            setQuestions(generatedQuestions);
          } catch (error) {
            console.error('Error generating questions:', error);
            toast.error('Failed to generate interview questions');
          }
        }
      } else {
        toast.error('Interview not found');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to load interview');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (answers: { questionId: string; answer: string; analysis: AnswerAnalysis }[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Save all answers to the database
      for (const answerData of answers) {
        await fetch(`/api/interviews/${params.id}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            questionId: answerData.questionId,
            answer: answerData.answer,
            score: answerData.analysis.score,
            analysis: answerData.analysis
          })
        });
      }
      
      // Complete the interview
      const completeResponse = await fetch(`/api/interviews/${params.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answers,
          projects: projects
        })
      });

      if (completeResponse.ok) {
        const data = await completeResponse.json();
        setCurrentInterview(data.interview);
        toast.success('Interview completed successfully!');
        router.push(`/interview/${params.id}/results`);
      } else {
        throw new Error('Failed to complete interview');
      }
    } catch (error) {
      toast.error('Failed to complete interview');
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading your interview...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!currentInterview) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg">Interview not found</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <VideoInterviewInterface
        interview={currentInterview}
        questions={questions}
        projects={projects}
        onComplete={handleComplete}
      />
    </AuthGuard>
  );
}