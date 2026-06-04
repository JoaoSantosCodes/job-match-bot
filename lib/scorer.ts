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

  const prompt = `Evaluate the compatibility of the candidate profile with the job posting on a scale of 0 to 100.
  
  Use the following weighting system to calculate the final compatibility score:
  1. Technical Skills Match (Weight: 50%): Check if the candidate's topSkills align with the core tools/languages requested in the job requirements or description.
  2. Seniority Level Match (Weight: 20%): Compare candidate's seniority (e.g. Junior, Mid, Senior) against the job's level. Deduct points for mismatch (e.g. if the candidate is under-qualified).
  3. Work Area Alignment (Weight: 20%): Check if the candidate's workArea (e.g. Infrastructure, DevOps, Backend) aligns with the job category/responsibilities.
  4. Language Compatibility (Weight: 10%): Match the candidate's spoken languages with the language of the job listing.
  
  Candidate Profile: ${JSON.stringify(profile)}
  Job Posting: ${JSON.stringify(job)}
  
  Response Format:
  Return a JSON object containing:
  - "score": An integer between 0 and 100.
  - "reason": A concise, one-line explanation of the compatibility score breakdown (e.g. "90% match: Strong alignment in Linux & Scripting, but candidate lacks Grafana").`;

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
