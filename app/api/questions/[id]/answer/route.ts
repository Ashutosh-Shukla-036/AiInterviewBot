import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { evaluateAnswer, Project, AnswerAnalysis } from '@/lib/ai-services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUser(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { answer, project } = await request.json();
    if (!answer || !project) return NextResponse.json({ error: 'Answer and project are required' }, { status: 400 });

    const question = await prisma.question.findFirst({
      where: { id: params.id, interview: { userId } },
      include: { interview: true },
    });

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const projectForAI: Project = {
      title: question.projectTitle || project.title || 'Project',
      description: project.description || '',
      technologies: project.technologies || [],
    };

    // Evaluate answer
    const analysis: AnswerAnalysis = await evaluateAnswer(
      {
        id: question.id,
        projectTitle: projectForAI.title,
        questionText: question.questionText,
        category: question.category as 'technical' | 'behavioral' | 'problem-solving' | 'architecture',
        expectedPoints: [],
      },
      answer,
      projectForAI
    );

    // Convert to JSON-safe object
    const analysisJson = JSON.parse(JSON.stringify(analysis));

    // Update question
    const updatedQuestion = await prisma.question.update({
      where: { id: question.id },
      data: {
        userAnswer: answer,
        score: analysis.score,   // numeric only
        analysis: analysisJson,  // JSON-safe
      },
    });

    // Update interview status if still pending
    if (question.interview.status === 'PENDING') {
      await prisma.interview.update({
        where: { id: question.interviewId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json({ question: updatedQuestion, analysis });

  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
