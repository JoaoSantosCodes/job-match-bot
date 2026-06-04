import { JobPosting } from '../scorer';

/**
 * Scrapes job listings from LinkedIn Jobs using their public Guest Search endpoint.
 */
export async function scrapeLinkedIn(): Promise<JobPosting[]> {
  console.log('Running LinkedIn guest API scraper...');
  try {
    const keywords = 'DevOps';
    const location = 'Brazil';
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn Guest API returned status: ${response.status}`);
    }

    const html = await response.text();

    // Guest search listings are in <li> blocks. We find each card block using regex.
    const cardRegex = /<div[^>]+class="[^"]*job-search-card[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
    const cards = html.match(cardRegex) || [];

    const jobs: JobPosting[] = [];
    for (const card of cards) {
      // 1. Extract Url
      const urlMatch = card.match(/href="([^"]+)"/);
      const rawUrl = urlMatch ? urlMatch[1] : '';
      const url = rawUrl.split('?')[0].trim();

      // 2. Extract Title
      const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Developer';

      // 3. Extract Company
      const companyMatch = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
      const company = companyMatch ? companyMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Company';

      // 4. Extract Location
      const locationMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
      const jobLocation = locationMatch ? locationMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Brazil';

      // 5. Extract Age
      const dateMatch = card.match(/<time[^>]*>([\s\S]*?)<\/time>/);
      const dateText = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

      if (url && title && company) {
        jobs.push({
          title,
          company,
          url,
          description: `Vaga no LinkedIn em ${jobLocation}. Publicada em: ${dateText || 'Recentemente'}. Clique no link para ver a descrição completa e se candidatar.`,
          requirements: 'Ver detalhes no LinkedIn'
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error('Error in LinkedIn scraper:', error);
    // Return empty list on failure rather than crashing the aggregator
    return [];
  }
}
