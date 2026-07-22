import axios from 'axios';
import { chromium, Page } from 'playwright-core';
import dotenv from 'dotenv';

if (typeof process !== 'undefined' && process.env) {
    dotenv.config();
}

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000';
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'ws://localhost:3001';

/**
 * Funções para integração com gosom/google-maps-scraper
 */
export async function extractFromGoogleMaps(keyword: string, location: string) {
    try {
        const query = `${keyword} in ${location}`;
        // O gosom expõe uma API no container (depende da doc oficial da imagem específica)
        // Aqui enviamos um mock request adaptável
        const response = await axios.post(`${SCRAPER_API_URL}/api/scrape`, {
            query: [query],
            depth: 1,
            // limits etc
        });
        
        return response.data;
    } catch (error) {
        console.error('Error hitting Gosom Google Maps Scraper:', error);
        throw error;
    }
}

/**
 * Funções de enriquecimento via Browserless (Playwright)
 */
export async function scrapeWebsiteForEmails(url: string) {
    let browser;
    try {
        browser = await chromium.connectOverCDP(BROWSERLESS_URL);
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Simples regex para encontrar emails na página HTML carregada
        const content = await page.content();
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const matches = content.match(emailRegex);
        
        const uniqueEmails = matches ? [...new Set(matches)] : [];
        
        // Encontrar links de redes sociais (básico)
        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors.map(a => a.href).filter(href => href.includes('instagram.com') || href.includes('linkedin.com') || href.includes('facebook.com') || href.includes('wa.me'));
        });

        const uniqueLinks = [...new Set(links)];
        
        return {
            emails: uniqueEmails,
            socialLinks: uniqueLinks,
            success: true
        };
    } catch (error) {
        console.error('Error scraping website with Playwright:', error);
        return { success: false, error };
    } finally {
        if (browser) await browser.close();
    }
}
