import { NextRequest, NextResponse } from 'next/server';
import { generateProjectQuestions } from '@/lib/ai-services';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projects } = await req.json();
    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json({ error: 'Projects required' }, { status: 400 });
    }

    const questions = await generateProjectQuestions(projects);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
