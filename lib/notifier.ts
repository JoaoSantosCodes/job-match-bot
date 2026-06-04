import { JobPosting, JobScore } from './scorer';

/**
 * Sends a job match notification to Discord using a webhook embed.
 * Colors: Green (>=80), Yellow (70-79).
 */
export async function sendDiscordAlert(job: JobPosting, score: JobScore): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not defined. Skipping Discord notification.');
    return false;
  }

  // Colors: Green (#2e7d32 -> 3046706), Yellow (#fbc02d -> 16498733)
  const color = score.score >= 80 ? 3046706 : 16498733;

  const embed = {
    title: job.title,
    description: `**Matching Reason:**\n${score.reason}`,
    url: job.url,
    color: color,
    fields: [
      {
        name: 'Company',
        value: job.company,
        inline: true
      },
      {
        name: 'Location',
        value: job.location || 'Não especificada',
        inline: true
      },
      {
        name: 'Compatibility Score',
        value: `🎯 **${score.score}%**`,
        inline: true
      }
    ],
    footer: {
      text: 'Job Match Bot • Matches found by Gemini AI'
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error(`Discord webhook failed with status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}
