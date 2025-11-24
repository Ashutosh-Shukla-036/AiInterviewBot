import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const HF_API_KEY = process.env.HF_API_KEY;
const HF_STT_MODEL = process.env.HF_STT_MODEL || 'openai/whisper-tiny';

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
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert audio file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Send to Hugging Face Whisper model
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_STT_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      transcription: result.text || result.transcription || '',
      confidence: result.confidence || 0.8
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}