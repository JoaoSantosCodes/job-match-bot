import { JobPosting } from '../scorer';

/**
 * Scrapes job listings from Gupy (Brazil jobs).
 * Placeholder implementation.
 */
export async function scrapeGupy(): Promise<JobPosting[]> {
  console.log('Running Gupy scraper...');
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
