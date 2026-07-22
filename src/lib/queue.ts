import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

if (typeof process !== 'undefined' && process.env) {
    dotenv.config();
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

// Setup Queues
export const scraperQueue = new Queue('scraper-queue', { connection: redisConnection });
export const automationQueue = new Queue('automation-queue', { connection: redisConnection });

// Setup Queue Events for monitoring
export const scraperQueueEvents = new QueueEvents('scraper-queue', { connection: redisConnection });
export const automationQueueEvents = new QueueEvents('automation-queue', { connection: redisConnection });

export async function addScrapingJob(jobName: string, data: any) {
  return await scraperQueue.add(jobName, data);
}

export async function addAutomationJob(jobName: string, data: any) {
  return await automationQueue.add(jobName, data);
}
