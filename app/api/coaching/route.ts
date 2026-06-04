import { NextRequest, NextResponse } from 'next/server';
import { kv } from '../../../lib/db';
import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../../../lib/resume-parser';
import { retryWithBackoff } from '../../../lib/retry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    // 1. Check if coaching feedback is already cached in Redis
    const cacheKey = `coaching:${sessionId}`;
    const cachedData = await kv.get<any>(cacheKey);

    if (cachedData) {
      console.log(`Coaching feedback cache hit for session: ${sessionId}`);
      return NextResponse.json({ report: cachedData, cached: true });
    }

    // 2. Fetch candidate profile and matched jobs to build analysis
    const profileKey = `profile:${sessionId}`;
    const jobsKey = `jobs:${sessionId}`;

    const [profile, jobs] = await Promise.all([
      kv.get<UserProfile>(profileKey),
      kv.get<any[]>(jobsKey)
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Candidate profile not found.' }, { status: 404 });
    }

    const matchedJobsList = jobs || [];

    // 3. Request Gemini AI analysis
    const report = await generateCoachingReport(profile, matchedJobsList);

    // 4. Cache coaching report for 24 hours
    await kv.set(cacheKey, report, { ex: 86400 } as any);

    return NextResponse.json({ report, cached: false });
  } catch (error: any) {
    console.error('Error generating career coaching feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate career coaching feedback.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const profileKey = `profile:${sessionId}`;
    const jobsKey = `jobs:${sessionId}`;

    const [profile, jobs] = await Promise.all([
      kv.get<UserProfile>(profileKey),
      kv.get<any[]>(jobsKey)
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Candidate profile not found.' }, { status: 404 });
    }

    const matchedJobsList = jobs || [];

    // Force regenerate report
    const report = await generateCoachingReport(profile, matchedJobsList);

    // Cache updated report
    const cacheKey = `coaching:${sessionId}`;
    await kv.set(cacheKey, report, { ex: 86400 } as any);

    return NextResponse.json({ report, cached: false });
  } catch (error: any) {
    console.error('Error regenerating career coaching feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate coaching report.' },
      { status: 500 }
    );
  }
}

/**
 * Sends profile and vacancies to Gemini to perform skill gap analysis and certification/course recommendation.
 */
async function generateCoachingReport(profile: UserProfile, jobs: any[]): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Map jobs to clean compact format to conserve prompt tokens
  const simplifiedJobs = jobs.slice(0, 10).map((j) => ({
    title: j.title,
    company: j.company,
    requirements: j.requirements || '',
    description: (j.description || '').slice(0, 300)
  }));

  const prompt = `Analyze the candidate profile and compare it with the requirements of the matching vacancies.
Identify which technical tools, technologies, or skills are missing or highly requested but weak in the candidate's profile.
Then, recommend industry-standard professional certifications and courses/learning tracks to help the candidate close those gaps and improve their resume.
Finally, give actionable resume tips.

Candidate Profile:
${JSON.stringify(profile)}

Target Jobs Scraped:
${JSON.stringify(simplifiedJobs)}

Response format instructions:
Return a JSON object matching the requested schema. Provide clear recommendations in Portuguese (suitable for a Brazilian IT professional).`;

  // Call Gemini with Structured JSON Schema output configuration
  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            skillsGaps: {
              type: 'ARRAY',
              description: 'Technical skills or tools highly demanded by the jobs but missing from the candidate profile',
              items: {
                type: 'OBJECT',
                properties: {
                  skill: { type: 'STRING', description: 'Name of the technology/tool, e.g. Kubernetes' },
                  urgency: { type: 'STRING', description: 'Alta, Média or Baixa' },
                  description: { type: 'STRING', description: 'Why this is critical based on the matching jobs list' }
                },
                required: ['skill', 'urgency', 'description']
              }
            },
            certifications: {
              type: 'ARRAY',
              description: 'Professional IT certifications that would make the candidate profile stand out for these jobs',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: 'Certification name, e.g. AWS Certified Solutions Architect' },
                  provider: { type: 'STRING', description: 'E.g. AWS, CNCF, HashiCorp' },
                  benefit: { type: 'STRING', description: 'How this certification adds value' }
                },
                required: ['name', 'provider', 'benefit']
              }
            },
            recommendedCourses: {
              type: 'ARRAY',
              description: 'Recommended courses, platform routes or learning paths to close the skill gaps',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING', description: 'Course name, e.g. Kubernetes do Zero ao Pro' },
                  platform: { type: 'STRING', description: 'E.g. Udemy, Coursera, Alura, YouTube' },
                  duration: { type: 'STRING', description: 'Estimated time to complete, e.g. 20h, 4 semanas' }
                },
                required: ['name', 'platform', 'duration']
              }
            },
            resumeTips: {
              type: 'ARRAY',
              description: 'Actionable bullet-point tips to rewrite, highlight or improve details on the resume',
              items: { type: 'STRING' }
            }
          },
          required: ['skillsGaps', 'certifications', 'recommendedCourses', 'resumeTips']
        }
      }
    })
  );

  if (!response.text) {
    throw new Error('Received empty response from Gemini Coaching Analyzer.');
  }

  return JSON.parse(response.text);
}
