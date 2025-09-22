import { NextRequest, NextResponse } from 'next/server';
import { getLLMPrompt, setLLMPrompt } from '@/lib/blob-logger';
import { DEFAULT_LLM_PROMPT } from '@/lib/prompts';

export async function GET() {
  try {
    const prompt = await getLLMPrompt();
    if (prompt) {
      return NextResponse.json({ prompt });
    }
    // If no prompt is in Redis, return the default prompt.
    return NextResponse.json({ prompt: DEFAULT_LLM_PROMPT });
  } catch (error) {
    console.error('Error fetching LLM prompt:', error);
    return NextResponse.json({ error: 'Failed to fetch LLM prompt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== 'string' || prompt.length < 50) {
      return NextResponse.json({ error: 'Invalid prompt provided. Must be a string of at least 50 characters.' }, { status: 400 });
    }
    await setLLMPrompt(prompt);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting LLM prompt:', error);
    return NextResponse.json({ error: 'Failed to set LLM prompt' }, { status: 500 });
  }
}