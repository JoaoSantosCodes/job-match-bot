// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenAI } from '@google/genai';
import { retryWithBackoff } from './retry';

export interface UserProfile {
  jobTitle: string;
  seniorityLevel: string;
  topSkills: string[];
  workArea: string;
  languages: string[];
}

/**
 * Extracts raw text from a PDF Buffer using pdf-parse.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const result = await pdf(pdfBuffer);
  return result.text || '';
}

/**
 * Uses pdf-parse to read a resume and calls the Gemini API to extract details into a structured JSON profile.
 */
export async function parseResumePdf(pdfBuffer: Buffer): Promise<UserProfile> {
  const text = await extractTextFromPdf(pdfBuffer);
  if (!text.trim()) {
    throw new Error('Could not extract any text content from the PDF resume.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }

  // Initialize the modern JS/TS client for Google GenAI
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract and standardize candidate details from the following resume text.
  
  Follow these classification guidelines strictly to ensure compatibility with job board tags:
  1. "jobTitle": Current or desired professional title (e.g., "Analista de Infraestrutura de TI", "DevOps Engineer").
  2. "seniorityLevel": Classify the experience level as exactly one of: "Junior", "Pleno", "Senior", "Lead", "Specialist", or "Intern".
  3. "workArea": Classify the professional domain as exactly one of: "DevOps", "Infrastructure", "Backend", "Frontend", "Fullstack", "Data / Analytics", "QA / Testing", "Security", or "Management".
  4. "topSkills": Extract exactly the top 5 technical skills, programming languages, frameworks, or tools (e.g., ["Linux", "Kubernetes", "TypeScript", "Zabbix", "Docker"]). Avoid general phrases.
  5. "languages": List spoken languages as standard names (e.g., ["Portuguese", "English", "Spanish"]).
  
  Resume text:
  ${text}`;

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
          jobTitle: { 
            type: 'STRING', 
            description: 'Desired or current job title extracted from resume' 
          },
          seniorityLevel: { 
            type: 'STRING', 
            description: 'Seniority level, e.g., Junior, Mid, Senior, Lead' 
          },
          topSkills: { 
            type: 'ARRAY', 
            items: { type: 'STRING' }, 
            description: 'List of top 5 technical skills' 
          },
          workArea: { 
            type: 'STRING', 
            description: 'Work area/domain, e.g., Backend, Frontend, Fullstack, DevOps, Data Science' 
          },
          languages: { 
            type: 'ARRAY', 
            items: { type: 'STRING' }, 
            description: 'Languages spoken, e.g., English, Portuguese' 
          }
        },
        required: ['jobTitle', 'seniorityLevel', 'topSkills', 'workArea', 'languages']
      }
    }
  }));

  if (!response.text) {
    throw new Error('Received an empty response from Gemini API.');
  }

  const parsed = JSON.parse(response.text);
  
  return {
    jobTitle: parsed.jobTitle || '',
    seniorityLevel: parsed.seniorityLevel || '',
    topSkills: Array.isArray(parsed.topSkills) ? parsed.topSkills : [],
    workArea: parsed.workArea || '',
    languages: Array.isArray(parsed.languages) ? parsed.languages : []
  };
}
