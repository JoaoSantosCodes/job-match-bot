import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

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
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  await parser.destroy();
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

  const prompt = `Extract from this resume: job title, seniority level, top 5 technical skills, work area, languages spoken. Return only JSON.

Resume text:
${text}`;

  // Call the Gemini API with structured output schema configuration
  const response = await ai.models.generateContent({
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
  });

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
