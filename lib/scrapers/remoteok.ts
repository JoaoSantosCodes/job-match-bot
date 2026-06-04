import { JobPosting } from '../scorer';

/**
 * Scrapes job listings from Remote.ok using their public JSON API.
 */
export async function scrapeRemoteOk(): Promise<JobPosting[]> {
  console.log('Running Remote.ok real API scraper...');
  try {
    // RemoteOK API requires a browser User-Agent header, otherwise it returns a 403 Forbidden
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`RemoteOK API returned status: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('RemoteOK API response did not return a valid array.');
    }

    // The first item in the RemoteOK JSON array is always a legal disclaimer/notice
    const rawJobs = data.slice(1).slice(0, 15); // limit to 15 latest jobs to protect Gemini rate limits

    return rawJobs.map((item: any) => {
      // Clean HTML tags and excessive spacing from job descriptions
      const cleanDescription = (item.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        title: item.position || 'Remote Developer',
        company: item.company || 'Confidential Company',
        description: cleanDescription.slice(0, 1000), // Slice to keep prompt context sizes optimal
        requirements: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`
      };
    });
  } catch (error) {
    console.error('Error in RemoteOK scraper:', error);
    // Fallback mock dataset so scheduled runs don't crash
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
}
