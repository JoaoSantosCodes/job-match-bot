import { JobPosting } from '../scorer';

/**
 * Scrapes job listings from Remote.ok.
 * Placeholder implementation.
 */
export async function scrapeRemoteOk(): Promise<JobPosting[]> {
  console.log('Running Remote.ok scraper...');
  return [
    {
      title: 'Full Stack Engineer - TypeScript/Node.js',
      company: 'RemoteFirst Co',
      description: 'Looking for a generalist to build web applications using React, Next.js, and Node.js.',
      requirements: 'React, Node, TypeScript, Next.js',
      url: 'https://remoteok.com/remote-jobs/112233'
    }
  ];
}
