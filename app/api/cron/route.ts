import { NextRequest, NextResponse } from 'next/server';
import { kv } from '../../../lib/db';
import { scrapeGupy } from '../../../lib/scrapers/gupy';
import { scrapeLinkedIn } from '../../../lib/scrapers/linkedin';
import { scrapeRemoteOk } from '../../../lib/scrapers/remoteok';
import { scoreJob, JobPosting } from '../../../lib/scorer';
import { sendDiscordAlert } from '../../../lib/notifier';
import { UserProfile } from '../../../lib/resume-parser';

export async function GET(request: NextRequest) {
  try {
    // 1. Optional: Security authorization check for Vercel Cron scheduler
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // 2. Fetch jobs from scrapers
    const scraperResults = await Promise.allSettled([
      scrapeGupy(),
      scrapeLinkedIn(),
      scrapeRemoteOk()
    ]);

    const allScrapedJobs: JobPosting[] = [];
    for (const result of scraperResults) {
      if (result.status === 'fulfilled') {
        allScrapedJobs.push(...result.value);
      } else {
        console.error('Failed to run scraper:', result.reason);
      }
    }

    // Deduplicate jobs by URL
    const uniqueJobs: JobPosting[] = [];
    const seenUrls = new Set<string>();
    for (const job of allScrapedJobs) {
      if (job.url && !seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        uniqueJobs.push(job);
      }
    }

    // 3. Scan all stored user profiles from Vercel KV
    // Vercel KV (Upstash Redis) supports the KEYS command.
    const keys = await kv.keys('profile:*');
    if (!keys || keys.length === 0) {
      return NextResponse.json({
        message: 'Cron finished. No candidate profiles found to score against.',
        scrapedCount: uniqueJobs.length
      });
    }

    const matchSummary: Record<string, number> = {};
    const cronStartTime = Date.now();

    // 4. For each profile, score new jobs and alert matches
    for (const profileKey of keys) {
      const sessionId = profileKey.replace('profile:', '');
      const profile = await kv.get<UserProfile>(profileKey);
      if (!profile) continue;

      // Retrieve existing matched jobs to avoid scoring or notifying duplicate jobs
      const matchedJobsKey = `jobs:${sessionId}`;
      const existingMatches = (await kv.get<any[]>(matchedJobsKey)) || [];
      const alreadyProcessedUrls = new Set(existingMatches.map((j) => j.url));

      const newMatches: any[] = [];
      let scoredCount = 0;

      for (let i = 0; i < uniqueJobs.length; i++) {
        const job = uniqueJobs[i];

        // Stop if we approach the Vercel serverless timeout limit (10 seconds max on Hobby)
        const elapsed = Date.now() - cronStartTime;
        if (elapsed > 7500) {
          console.warn(`Approaching Vercel execution limit (${elapsed}ms). Saving remaining jobs as direct matches.`);
          
          const remainingJobs = uniqueJobs.slice(i);
          for (const fallbackJob of remainingJobs) {
            if (!alreadyProcessedUrls.has(fallbackJob.url)) {
              newMatches.push({
                ...fallbackJob,
                score: 70,
                reason: 'Busca direta: Vaga de interesse (Pontuação por IA ignorada para evitar tempo limite do servidor).',
                matchedAt: new Date().toISOString()
              });
            }
          }
          break;
        }

        // Limit the number of new jobs scored per run to conserve free-tier Gemini API quota
        if (scoredCount >= 10) {
          console.log(`Reached limit of 10 scored jobs for profile ${sessionId}. Saving remaining as direct matches.`);
          
          const remainingJobs = uniqueJobs.slice(i);
          for (const fallbackJob of remainingJobs) {
            if (!alreadyProcessedUrls.has(fallbackJob.url)) {
              newMatches.push({
                ...fallbackJob,
                score: 70,
                reason: 'Busca direta: Vaga de interesse (Pontuação por IA ignorada para economizar cota da API).',
                matchedAt: new Date().toISOString()
              });
            }
          }
          break;
        }

        // Skip if this job was already scored and stored for this user
        if (alreadyProcessedUrls.has(job.url)) {
          continue;
        }

        // Call Gemini to score the job against user's profile
        try {
          const matchResult = await scoreJob(profile, job);
          scoredCount++;

          // Forward to Discord and store only if compatibility score is >= 70
          if (matchResult.score >= 70) {
            const matchObject = {
              ...job,
              score: matchResult.score,
              reason: matchResult.reason,
              matchedAt: new Date().toISOString()
            };
            newMatches.push(matchObject);

            // Send Discord alert in background
            await sendDiscordAlert(job, matchResult);
          }
        } catch (scoringError: any) {
          console.error(`Error scoring job "${job.title}" against profile "${sessionId}":`, scoringError);
          
          // Detect Gemini rate limit or quota exhaustion (HTTP 429 or status RESOURCE_EXHAUSTED)
          const errorMsg = (scoringError.message || '').toLowerCase();
          const errorStatus = scoringError.status || (scoringError.error && scoringError.error.code);
          if (
            errorStatus === 429 ||
            errorMsg.includes('quota') ||
            errorMsg.includes('limit') ||
            errorMsg.includes('resource_exhausted')
          ) {
            console.warn('Gemini API quota exceeded or rate limit hit. Falling back to direct matches for remaining jobs.');
            
            const remainingJobs = uniqueJobs.slice(i);
            for (const fallbackJob of remainingJobs) {
              if (!alreadyProcessedUrls.has(fallbackJob.url)) {
                newMatches.push({
                  ...fallbackJob,
                  score: 70,
                  reason: 'Busca direta: Vaga de interesse (Pontuação por IA ignorada devido a limite de cota da API).',
                  matchedAt: new Date().toISOString()
                });
              }
            }
            break;
          }
          
          // Count failures as scored attempts to avoid infinite retries on buggy postings
          scoredCount++;
        }
      }

      // If new high-score matches were found, append them to the user's list
      if (newMatches.length > 0) {
        const updatedMatches = [...newMatches, ...existingMatches];
        await kv.set(matchedJobsKey, updatedMatches);
      }

      matchSummary[sessionId] = newMatches.length;
    }

    return NextResponse.json({
      success: true,
      scrapedCount: uniqueJobs.length,
      newMatchesSummary: matchSummary
    });
  } catch (error: any) {
    console.error('Error executing cron job:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during scheduled execution.' },
      { status: 500 }
    );
  }
}
