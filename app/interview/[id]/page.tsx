'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilState } from 'recoil';
import { currentInterviewState } from '@/store/atoms';
import AuthGuard from '@/components/AuthGuard';
import VideoInterviewInterface from '@/components/VideoInterviewInterface';
import { toast } from 'sonner';

interface InterviewPageProps {
  params: { id: string };
}

export default function InterviewPage({ params }: InterviewPageProps) {
  const [currentInterview, setCurrentInterview] = useRecoilState(currentInterviewState);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Interview not found');

      const data = await response.json();
      setCurrentInterview(data.interview);
      const interviewProjects = data.interview.skills?.projects || [];
      setProjects(interviewProjects);

      // Generate questions via API
      if (interviewProjects.length > 0) {
        const questionRes = await fetch(`/api/interviews/${params.id}/questions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ projects: interviewProjects })
        });
        if (!questionRes.ok) throw new Error('Failed to generate questions');
        const questionData = await questionRes.json();
        setQuestions(questionData.questions);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load interview');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (answers: any[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/interviews/${params.id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers, projects })
      });

      if (!res.ok) throw new Error('Failed to complete interview');

      const data = await res.json();
      setCurrentInterview(data.interview);
      toast.success('Interview completed!');
      router.push(`/interview/${params.id}/results`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete interview');
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <div className="animate-spin h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4 rounded-full"></div>
            <p>Loading your interview...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!currentInterview) return <AuthGuard><p>Interview not found</p></AuthGuard>;

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
