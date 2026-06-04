import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';
import { parseResumePdf } from '../../../lib/resume-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in the upload request. Please send a PDF file under the form field name "file".' },
        { status: 400 }
      );
    }

    // Verify if it is a PDF file
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Convert Next.js File object to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text and extract profile using Gemini API
    const profile = await parseResumePdf(buffer);

    // Generate a unique session ID
    const sessionId = uuidv4();

    // Store the parsed profile in Vercel KV with a 24-hour expiration (86400 seconds)
    // to avoid storing dead sessions indefinitely.
    await kv.set(`profile:${sessionId}`, profile, { ex: 86400 });

    // Return the session ID and profile to the frontend client
    return NextResponse.json({ sessionId, profile });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during resume upload and parsing.' },
      { status: 500 }
    );
  }
}
