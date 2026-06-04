import * as path from 'path';
import * as fs from 'fs';
import { loadEnvConfig } from '@next/env';

// Load env variables from .env.local using Next.js built-in loader
loadEnvConfig(path.resolve(__dirname, '..'));

import { parseResumePdf, UserProfile } from '../lib/resume-parser';
import { scoreJob, JobPosting } from '../lib/scorer';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not defined in .env.local.');
    console.error('Please create/fill out job-match-bot/.env.local with your keys.');
    process.exit(1);
  }

  console.log('=== Starting Job Match Bot Tests ===');

  // Test 1: Job Scorer with mock user profile
  console.log('\n--- Test 1: Testing Scorer with live Gemini API ---');
  const mockProfile: UserProfile = {
    jobTitle: 'Senior Fullstack Developer',
    seniorityLevel: 'Senior',
    topSkills: ['TypeScript', 'Next.js', 'React', 'Node.js', 'PostgreSQL'],
    workArea: 'Fullstack / Web Development',
    languages: ['English', 'Portuguese']
  };

  const mockJob: JobPosting = {
    title: 'Senior Software Engineer, Full-Stack (Next.js & TS)',
    company: 'Vercel',
    description: 'We are looking for a Senior Engineer to join our dashboard team and develop React applications using Next.js, Node.js and Tailwind CSS.',
    requirements: 'TypeScript, Next.js, React, Tailwind CSS, API development',
    url: 'https://vercel.com/careers/test-1'
  };

  try {
    const scoreResult = await scoreJob(mockProfile, mockJob);
    console.log('Scoring succeeded!');
    console.log(`Job:      ${mockJob.title} at ${mockJob.company}`);
    console.log(`Score:    ${scoreResult.score}/100`);
    console.log(`Reason:   ${scoreResult.reason}`);
  } catch (error) {
    console.error('Scoring test failed:', error);
  }

  // Test 2: Resume parser (requires a real PDF file path passed as argument)
  const pdfArg = process.argv[2];
  if (pdfArg) {
    console.log(`\n--- Test 2: Parsing PDF file from "${pdfArg}" ---`);
    try {
      const pdfPath = path.resolve(pdfArg);
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`File not found: ${pdfPath}`);
      }
      const pdfBuffer = fs.readFileSync(pdfPath);
      const parsedProfile = await parseResumePdf(pdfBuffer);
      console.log('PDF Parsing and profile extraction succeeded!');
      console.log(JSON.stringify(parsedProfile, null, 2));
    } catch (error) {
      console.error('PDF parsing test failed:', error);
    }
  } else {
    console.log('\n--- Test 2: Skipping PDF Parse Test ---');
    console.log('To run this test, pass the path of a PDF resume file as a CLI argument:');
    console.log('npx tsx scratch/test-parser.ts /path/to/resume.pdf');
  }

  console.log('\n=== Tests Completed ===');
}

run().catch((err) => {
  console.error('Unhandled error in test runner:', err);
});
