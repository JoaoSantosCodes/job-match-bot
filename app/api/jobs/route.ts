import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId query parameter. Please pass it as ?sessionId=YOUR_SESSION_ID' },
        { status: 400 }
      );
    }

    // Retrieve the scored and matched jobs list associated with this sessionId
    const jobs = await kv.get(`jobs:${sessionId}`) || [];

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Error in jobs GET route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while fetching matched jobs.' },
      { status: 500 }
    );
  }
}
