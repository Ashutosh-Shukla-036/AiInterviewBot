import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { generateInterviewFeedback, InterviewQuestion, Project, AnswerAnalysis } from '@/lib/ai-services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUser(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { answers, projects } = await request.json();
    
    // Find interview
    const interview = await prisma.interview.findFirst({
      where: {
        id: params.id,
        userId
      },
      include: {
        questions: true
      }
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }
    
    // Reconstruct questions and analyses from answers
    const questions: InterviewQuestion[] = answers.map((a: any) => ({
      id: a.questionId,
      projectTitle: 'Project',
      questionText: 'Project-based question',
      category: 'technical',
      expectedPoints: []
    }));
    
    const analyses: AnswerAnalysis[] = answers.map((a: any) => a.analysis);
    
    // Generate comprehensive feedback
    const feedbackSummary = await generateInterviewFeedback(questions, analyses, projects);
    
    // Update interview status and feedback
    const updatedInterview = await prisma.interview.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        feedbackSummary
      },
      include: {
        questions: true
      }
    });
    
    return NextResponse.json({
      interview: updatedInterview,
      feedback: feedbackSummary
    });
    
  } catch (error) {
    console.error('Error completing interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}