import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { 
  generateInterviewFeedback, 
  InterviewQuestion, 
  Project, 
  AnswerAnalysis,
  assessSkillLevel,
  generateIndustryComparison
} from '@/lib/ai-services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { answers, projects } = await request.json();

    // Fetch the interview
    const interview = await prisma.interview.findFirst({
      where: { id: params.id, userId },
      include: { questions: true }
    });

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Map answers to AnswerAnalysis array
    const analyses: AnswerAnalysis[] = answers.map((a: any) => a.analysis);

    // Build InterviewMetrics from answers (stub / approximation)
    const totalDuration = answers.reduce((acc: number, a: any) => acc + (a.timeTaken || 0), 0);
    const averageResponseTime = answers.length ? totalDuration / answers.length : 0;
    const wordsPerMinute = 120; // placeholder, you can calculate based on word count / time
    const pauseCount = answers.reduce((acc: number, a: any) => acc + (a.pauseCount || 0), 0);
    const confidenceLevel = answers.length
      ? Math.round(answers.reduce((acc: number, a: any) => acc + (a.analysis?.confidence || 50), 0) / answers.length)
      : 50;
    const technicalDepth = answers.length
      ? Math.round(answers.reduce((acc: number, a: any) => acc + (a.analysis?.technicalAccuracy || 50), 0) / answers.length)
      : 50;
    const communicationScore = answers.length
      ? Math.round(answers.reduce((acc: number, a: any) => acc + (a.analysis?.communicationClarity || 50), 0) / answers.length)
      : 50;

    const interviewMetrics = {
      totalDuration,
      averageResponseTime,
      wordsPerMinute,
      pauseCount,
      confidenceLevel,
      technicalDepth,
      communicationScore,
      overallRating: 'Good' as const
    };

    // Assess skill level
    const skillAssessment = await assessSkillLevel(projects || []);

    // Generate industry comparison data
    const comparisonData = generateIndustryComparison(technicalDepth);

    // Generate feedback
    const feedbackSummary = await generateInterviewFeedback(
      interviewMetrics,
      comparisonData,
      skillAssessment,
      projects || []
    );

    // Update interview status & feedback
    const updatedInterview = await prisma.interview.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        feedbackSummary
      },
      include: { questions: true }
    });

    return NextResponse.json({
      interview: updatedInterview,
      feedback: feedbackSummary
    });

  } catch (error) {
    console.error('Error completing interview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
