import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { parseResumeWithAI } from '@/lib/ai-services';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUser(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const interviews = await prisma.interview.findMany({
      where: { userId },
      include: {
        questions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ interviews });
    
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUser(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const aiService = formData.get('aiService') as string || 'gemini';
    const resumeParser = formData.get('resumeParser') as string || 'local';
    
    if (!file || !title) {
      return NextResponse.json(
        { error: 'File and title are required' },
        { status: 400 }
      );
    }
    
    // Extract text from resume file
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = '';
    
    try {
      if (file.type === 'application/pdf') {
        const data = await pdf(buffer);
        resumeText = data.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        resumeText = result.value;
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (error) {
      console.error('File parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse resume file' },
        { status: 400 }
      );
    }
    
    // Parse resume with selected AI service
    const parsedData = await parseResumeWithAI(resumeText);

    console.log(parsedData);
    
    // Store projects in the skills field for now (we can create a separate projects table later)
    const interviewData = {
      projects: parsedData.projects,
      aiService,
      resumeParser,
      resumeText: resumeText.substring(0, 2000) // Store first 2000 chars for reference
    };

  const skillsJson = JSON.parse(JSON.stringify(interviewData));
    
    // Create interview
    const interview = await prisma.interview.create({
      data: {
        userId,
        title,
        skills: skillsJson,
        status: 'PENDING'
      }
    });
    
    // Fetch complete interview with questions
    const completeInterview = await prisma.interview.findUnique({
      where: { id: interview.id },
      include: {
        questions: true
      }
    });

    console.log(interview);
    console.log(completeInterview);
    
    return NextResponse.json({ interview: completeInterview });
    
  } catch (error) {
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}