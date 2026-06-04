import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '../../../lib/db';
import { parseResumePdf } from '../../../lib/resume-parser';
import { rateLimit } from '../../../lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (Limit to 10 uploads per hour per IP)
    const limitResult = await rateLimit(request, 10, 3600);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many uploads. You are allowed to upload a maximum of 10 resumes per hour.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limitResult.limit.toString(),
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': limitResult.reset.toString()
          }
        }
      );
    }
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in the upload request. Please send a PDF file under the form field name "file".' },
        { status: 400 }
      );
    }

    // Limit upload size to 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. The maximum allowed limit is 5MB.' },
        { status: 400 }
      );
    }

    // Verify if it is a PDF file by extension and MIME type
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Convert Next.js File object to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify the PDF magic number file signature (%PDF)
    if (buffer.length < 4 || buffer.toString('utf-8', 0, 4) !== '%PDF') {
      return NextResponse.json(
        { error: 'Invalid file signature. The uploaded file is not a valid PDF document.' },
        { status: 400 }
      );
    }

    // Parse PDF text and extract profile using Gemini API
    const profile = await parseResumePdf(buffer);

    // Generate a unique session ID
    const sessionId = uuidv4();

    // Store the parsed profile in Vercel KV with a 24-hour expiration (86400 seconds)
    // to avoid storing dead sessions indefinitely.
    await kv.set(`profile:${sessionId}`, profile, { ex: 86400 });

    // Return the session ID and profile to the frontend client with rate limit headers
    return NextResponse.json(
      { sessionId, profile },
      {
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString()
        }
      }
    );
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during resume upload and parsing.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, profile } = await request.json();

    if (!sessionId || !profile) {
      return NextResponse.json(
        { error: 'Missing sessionId or profile data in the request body.' },
        { status: 400 }
      );
    }

    const validatedProfile = {
      jobTitle: profile.jobTitle || '',
      seniorityLevel: profile.seniorityLevel || '',
      topSkills: Array.isArray(profile.topSkills) ? profile.topSkills : [],
      workArea: profile.workArea || '',
      languages: Array.isArray(profile.languages) ? profile.languages : []
    };

    await kv.set(`profile:${sessionId}`, validatedProfile, { ex: 86400 });

    return NextResponse.json({ success: true, profile: validatedProfile });
  } catch (error: any) {
    console.error('Error in upload PUT route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while updating the profile.' },
      { status: 500 }
    );
  }
}
