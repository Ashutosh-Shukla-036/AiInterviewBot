import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { evaluateAnswer } from '@/lib/ai-services';

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
    
    const { answer } = await request.json();
    
    if (!answer) {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      );
    }
    
    // Find question and verify ownership
    const question = await prisma.question.findFirst({
      where: {
        id: params.id,
        interview: {
          userId
        }
      },
      include: {
        interview: true
      }
    });
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Evaluate answer
    const score = await evaluateAnswer(
      answer,
      question.expectedAnswer || '',
      question.questionText
    );
    
    // Update question with answer and score
    const updatedQuestion = await prisma.question.update({
      where: { id: params.id },
      data: {
        userAnswer: answer,
        score
      }
    });
    
    // Update interview status to IN_PROGRESS if it's still PENDING
    if (question.interview.status === 'PENDING') {
      await prisma.interview.update({
        where: { id: question.interviewId },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    return NextResponse.json({
      question: updatedQuestion,
      score
    });
    
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}