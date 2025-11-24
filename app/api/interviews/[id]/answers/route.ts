import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

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
    
    const { questionId, answer, score, analysis } = await request.json();
    
    if (!questionId || !answer) {
      return NextResponse.json(
        { error: 'Question ID and answer are required' },
        { status: 400 }
      );
    }
    
    // Verify interview ownership
    const interview = await prisma.interview.findFirst({
      where: {
        id: params.id,
        userId
      }
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }
    
    // Create or update question record
    const question = await prisma.question.upsert({
      where: {
        id: questionId
      },
      update: {
        userAnswer: answer,
        score: score,
        // Store analysis in expectedAnswer field for now (can be moved to separate field)
        expectedAnswer: JSON.stringify(analysis)
      },
      create: {
        id: questionId,
        interviewId: params.id,
        category: 'project-based',
        questionText: 'Project-based question',
        userAnswer: answer,
        score: score,
        expectedAnswer: JSON.stringify(analysis)
      }
    });
    
    // Update interview status to IN_PROGRESS if it's still PENDING
    if (interview.status === 'PENDING') {
      await prisma.interview.update({
        where: { id: params.id },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    return NextResponse.json({
      success: true,
      question
    });
    
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}