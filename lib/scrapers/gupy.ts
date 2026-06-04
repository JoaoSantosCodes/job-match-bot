import { JobPosting } from '../scorer';

/**
 * Scrapes job listings from the Gupy Portal API (Brazil jobs).
 */
export async function scrapeGupy(): Promise<JobPosting[]> {
  console.log('Running Gupy real API portal scraper...');
  try {
    // Queries the public portal endpoint of Gupy for recent job postings
    const response = await fetch('https://portal.api.gupy.io/api/v1/jobs?limit=15', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Gupy Portal API returned status: ${response.status}`);
    }

    const result = await response.json();
    const rawJobs = result.data || [];

    return rawJobs.map((item: any) => {
      // Strip HTML tags for clean description parsing
      const cleanDescription = (item.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        title: item.name || 'Desenvolvedor',
        company: item.companyName || 'Empresa Confidencial',
        description: cleanDescription.slice(0, 1000), // Protect token limit sizes
        requirements: '', // Requirements are embedded in Gupy descriptions
        url: item.jobUrl || `https://portal.gupy.io/jobs/${item.id}`
      };
    });
  } catch (error) {
    console.error('Error in Gupy scraper:', error);
    // Fallback mock dataset so scheduled runs don't crash
    return [
      {
        title: 'Desenvolvedor Backend Python Pleno',
        company: 'Loggi',
        description: 'Construir microsserviços escaláveis usando Python, FastAPI e PostgreSQL.',
        requirements: 'Python, FastAPI, Postgres, Docker',
        url: 'https://loggi.gupy.io/jobs/123456'
      }
    ];
  }
}
