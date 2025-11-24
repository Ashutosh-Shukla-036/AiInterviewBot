import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(
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
    
    return NextResponse.json({ interview });
    
  } catch (error) {
    console.error('Error fetching interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    
    const { status, feedbackSummary } = await request.json();
    
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
    
    const updatedInterview = await prisma.interview.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(feedbackSummary && { feedbackSummary })
      },
      include: {
        questions: true
      }
    });
    
    return NextResponse.json({ interview: updatedInterview });
    
  } catch (error) {
    console.error('Error updating interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}