import { Worker } from 'bullmq';
import { redisConnection } from './queue.js';
import { extractFromGoogleMaps, scrapeWebsiteForEmails } from '../services/scraper.js';

export const scraperWorker = new Worker(
  'scraper-queue',
  async (job) => {
    console.log(`[ScraperWorker] Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'google-maps-scrape') {
      const { keyword, location } = job.data;
      
      console.log(`[ScraperWorker] Starting scraping for: ${keyword} in ${location}`);
      // Simula ou executa a chamada real para o Gosom
      // const results = await extractFromGoogleMaps(keyword, location);
      
      // Update progress
      await job.updateProgress(50);
      
      // Simulando o processo de encontrar emails com o browserless
      // if (results && results.length > 0) {
      //   for(const item of results) {
      //      if (item.website) {
      //         const enriched = await scrapeWebsiteForEmails(item.website);
      //         item.enrichedData = enriched;
      //      }
      //   }
      // }
      
      await job.updateProgress(100);
      return { status: 'completed', message: 'Scraping finished' }; // return results
    }
  },
  { connection: redisConnection }
);

scraperWorker.on('completed', (job, returnvalue) => {
  console.log(`[ScraperWorker] Job ${job.id} completed!`, returnvalue);
});

scraperWorker.on('failed', (job, err) => {
  console.log(`[ScraperWorker] Job ${job?.id} failed with error:`, err.message);
});

console.log('[ScraperWorker] Worker started and listening to queue...');
