import { GoogleGenAI } from '@google/genai';
import { UserProfile } from './resume-parser';
import { retryWithBackoff } from './retry';

export interface JobScore {
  score: number;
  reason: string;
}

export interface JobPosting {
  title: string;
  company: string;
  description: string;
  requirements?: string;
  url: string;
}

/**
 * Scores a job against a user profile using Gemini AI.
 */
export async function scoreJob(profile: UserProfile, job: JobPosting): Promise<JobScore> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Candidate profile: ${JSON.stringify(profile)}
Job posting: ${JSON.stringify(job)}
Return JSON: { score: 0-100, reason: string (one line) }`;

  // Call the Gemini API with structured output schema configuration using retry exponential backoff
  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            score: { 
              type: 'INTEGER', 
              description: 'Compatibility score from 0 to 100' 
            },
            reason: { 
              type: 'STRING', 
              description: 'A concise one-line explanation for the compatibility score' 
            }
          },
          required: ['score', 'reason']
        }
      }
    })
  );

  if (!response.text) {
    throw new Error('Received an empty response from Gemini Scorer API.');
  }

  const parsed = JSON.parse(response.text);

  return {
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    reason: parsed.reason || ''
  };
}
