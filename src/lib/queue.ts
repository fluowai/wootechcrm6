import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

if (typeof process !== 'undefined' && process.env) {
    dotenv.config();
}

const redisUrl = process.env.REDIS_URL;

let redisConnection: IORedis | null = null;
let scraperQueue: Queue | null = null;
let automationQueue: Queue | null = null;
let scraperQueueEvents: QueueEvents | null = null;
let automationQueueEvents: QueueEvents | null = null;

function getRedisConnection(): IORedis | null {
  if (!redisUrl) return null;
  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    redisConnection.connect().catch(() => {
      console.warn('[Queue] Redis unavailable — queues disabled');
      redisConnection = null;
    });
  }
  return redisConnection;
}

function getScraperQueue(): Queue {
  if (!scraperQueue) {
    const conn = getRedisConnection();
    if (!conn) throw new Error('Redis not configured');
    scraperQueue = new Queue('scraper-queue', { connection: conn });
  }
  return scraperQueue;
}

function getAutomationQueue(): Queue {
  if (!automationQueue) {
    const conn = getRedisConnection();
    if (!conn) throw new Error('Redis not configured');
    automationQueue = new Queue('automation-queue', { connection: conn });
  }
  return automationQueue;
}

export { redisConnection, scraperQueue, automationQueue, scraperQueueEvents, automationQueueEvents };

export async function addScrapingJob(jobName: string, data: any) {
  try {
    return await getScraperQueue().add(jobName, data);
  } catch {
    console.warn('[Queue] Scraping job skipped — Redis unavailable');
    return { id: 'skipped', data: {} };
  }
}

export async function addAutomationJob(jobName: string, data: any) {
  try {
    return await getAutomationQueue().add(jobName, data);
  } catch {
    console.warn('[Queue] Automation job skipped — Redis unavailable');
    return { id: 'skipped', data: {} };
  }
}
