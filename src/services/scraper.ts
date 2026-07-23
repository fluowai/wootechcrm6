import axios from 'axios';
import { chromium } from 'playwright-core';
import dotenv from 'dotenv';

if (typeof process !== 'undefined' && process.env) {
    dotenv.config();
}

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000';
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'ws://localhost:3001';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || 'my-secret-token';

// ============================================================
// GOSOM GOOGLE MAPS SCRAPER — REST API Integration
// Docs: https://github.com/gosom/google-maps-scraper
// ============================================================

export interface GosomResult {
    input_id?: string;
    title?: string;
    category?: string;
    address?: string;
    open_hours?: string;
    popular_times?: any;
    website?: string;
    phone?: string;
    plus_code?: string;
    review_count?: number;
    rating?: number;
    latitude?: number;
    longitude?: number;
    cid?: string;
    place_id?: string;
    reviews_link?: string;
    thumbnail?: string;
    timezone?: string;
    price_range?: string;
    data_id?: string;
    images?: string[];
    reservations?: string;
    order_online?: string;
    menu?: string;
    owner?: string;
    complete_address?: {
        borough?: string;
        street?: string;
        city?: string;
        postal_code?: string;
        state?: string;
        country_code?: string;
    };
    about?: { [key: string]: any };
    user_reviews?: Array<{
        name?: string;
        profile_url?: string;
        rating?: number;
        review?: string;
        date?: string;
    }>;
}

export interface ProspectingResultItem {
    googlePlaceId: string;
    nomeEmpresa: string;
    categoria: string;
    telefone: string;
    website: string;
    endereco: string;
    cidade: string;
    estado: string;
    lat: number;
    lng: number;
    rating: number;
    reviewsCount: number;
    photos: string[];
    horarioFuncionamento?: string;
    alreadyInCRM: boolean;
    source?: 'gosom' | 'openstreetmap' | 'fallback';
}

/**
 * Mapeia um resultado do Gosom para o formato ProspectingResultItem do CRM
 */
function mapGosomToProspecting(item: GosomResult, idx: number): ProspectingResultItem {
    const addr = item.complete_address;
    const cidade = addr?.city || addr?.borough || '';
    const estado = addr?.state || '';
    const endereco = item.address || `${addr?.street || ''}, ${addr?.city || ''}`.trim();

    return {
        googlePlaceId: item.place_id || item.cid || item.data_id || `gosom_${idx}`,
        nomeEmpresa: (item.title || 'Empresa').toUpperCase(),
        categoria: item.category || 'Serviços',
        telefone: item.phone || '',
        website: item.website || '',
        endereco,
        cidade,
        estado,
        lat: item.latitude || 0,
        lng: item.longitude || 0,
        rating: item.rating || 0,
        reviewsCount: item.review_count || 0,
        photos: item.images?.length ? item.images.slice(0, 3) : (item.thumbnail ? [item.thumbnail] : []),
        horarioFuncionamento: item.open_hours || undefined,
        alreadyInCRM: false,
        source: 'gosom',
    };
}

/**
 * Extrai leads do Google Maps via Gosom REST API
 * POST /api/v1/search — submete job assíncrono
 * GET  /api/v1/jobs/:id — poll status + resultados
 */
export async function extractFromGoogleMaps(
    keyword: string,
    location: string,
    depth: number = 1,
    lang: string = 'pt-BR'
): Promise<{ jobId: string | null; results: ProspectingResultItem[] }> {
    const query = `${keyword} em ${location}`;

    try {
        // 1. Submeter job de scraping ao gosom
        const jobRes = await axios.post(
            `${SCRAPER_API_URL}/api/v1/search`,
            {
                query: [query],
                depth,
                lang,
            },
            { timeout: 10000 }
        );

        const jobId: string = jobRes.data?.job_id || jobRes.data?.id || null;
        if (!jobId) {
            console.warn('[Gosom] Resposta inesperada ao criar job:', jobRes.data);
            return { jobId: null, results: [] };
        }

        console.log(`[Gosom] Job criado: ${jobId} — query: "${query}"`);

        // 2. Aguardar e fazer poll (max 60s)
        const results = await pollGosomJob(jobId);
        return { jobId, results };
    } catch (error: any) {
        console.error('[Gosom] Erro ao chamar API:', error?.message || error);
        return { jobId: null, results: [] };
    }
}

/**
 * Faz poll no job do gosom até completar (timeout 60s)
 */
export async function pollGosomJob(jobId: string, maxWaitMs: number = 60000): Promise<ProspectingResultItem[]> {
    const interval = 3000;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
        try {
            const res = await axios.get(`${SCRAPER_API_URL}/api/v1/jobs/${jobId}`, { timeout: 10000 });
            const job = res.data;

            if (job?.status === 'completed' || job?.status === 'done') {
                const rawResults: GosomResult[] = job.results || job.data || [];
                return rawResults.map((item, idx) => mapGosomToProspecting(item, idx));
            }

            if (job?.status === 'failed' || job?.status === 'error') {
                console.error('[Gosom] Job falhou:', job);
                return [];
            }
        } catch (e: any) {
            console.warn(`[Gosom] Poll error (${elapsed}ms):`, e?.message);
        }

        await new Promise((r) => setTimeout(r, interval));
        elapsed += interval;
    }

    console.warn(`[Gosom] Timeout após ${maxWaitMs}ms para job ${jobId}`);
    return [];
}

/**
 * Retorna o status atual de um job do gosom
 */
export async function getGosomJobStatus(jobId: string): Promise<{ status: string; progress?: number; results?: any[] }> {
    try {
        const res = await axios.get(`${SCRAPER_API_URL}/api/v1/jobs/${jobId}`, { timeout: 8000 });
        return res.data;
    } catch {
        return { status: 'unknown' };
    }
}

// ============================================================
// BROWSERLESS + PLAYWRIGHT — Website Crawler & Email Finder
// ============================================================

export interface WebsiteScrapeResult {
    success: boolean;
    emails: string[];
    phones: string[];
    whatsappLinks: string[];
    socialLinks: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        youtube?: string;
        twitter?: string;
        tiktok?: string;
    };
    techHints: string[];
    error?: string;
}

/**
 * Conecta ao Browserless via CDP e extrai:
 * - Emails (regex + mailto links)
 * - Telefones
 * - Links WhatsApp (wa.me)
 * - Redes sociais
 * - Sinais de tecnologia (WordPress, Shopify, etc.)
 */
export async function scrapeWebsiteForEmails(url: string): Promise<WebsiteScrapeResult> {
    let browser;
    const wsUrl = `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`;

    try {
        browser = await chromium.connectOverCDP(wsUrl);
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // Extrair todo o HTML e links da página
        const rawData = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return {
                html: document.documentElement.innerHTML,
                links: anchors.map(a => ({ href: a.href || '', text: a.textContent?.trim() || '' })),
                textContent: document.body?.innerText || '',
            };
        });
        const { html, textContent } = rawData;
        const links: Array<{ href: string; text: string }> = rawData.links as Array<{ href: string; text: string }>;

        // === EMAILS ===
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const mailtoEmails = links
            .filter(l => l.href.startsWith('mailto:'))
            .map(l => l.href.replace('mailto:', '').split('?')[0].toLowerCase().trim());
        const htmlEmails = (html.match(emailRegex) || []).map(e => e.toLowerCase());
        const allEmails = [...new Set([...mailtoEmails, ...htmlEmails])].filter(e =>
            !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg') &&
            !e.endsWith('.gif') && !e.endsWith('.webp') && !e.endsWith('.css') &&
            !e.endsWith('.js') && !e.includes('sentry') && !e.includes('example') &&
            e.length < 100
        );

        // === TELEFONES ===
        const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/g;
        const telLinks = links
            .filter(l => l.href.startsWith('tel:'))
            .map(l => l.href.replace('tel:', '').trim());
        const htmlPhones = (textContent.match(phoneRegex) || []).map(p => p.trim());
        const allPhones = [...new Set([...telLinks, ...htmlPhones])].slice(0, 10);

        // === WHATSAPP ===
        const waLinks = links
            .filter(l => l.href.includes('wa.me') || l.href.includes('whatsapp.com') || l.href.includes('api.whatsapp'))
            .map(l => l.href);
        const waLinksUnique = [...new Set(waLinks)].slice(0, 5);

        // === REDES SOCIAIS ===
        const allHrefs = links.map(l => l.href);
        const findSocial = (patterns: string[]) => allHrefs.find(h => patterns.some(p => h.includes(p))) || undefined;

        const socialLinks = {
            instagram: findSocial(['instagram.com/']),
            facebook: findSocial(['facebook.com/', 'fb.com/']),
            linkedin: findSocial(['linkedin.com/company/', 'linkedin.com/in/']),
            youtube: findSocial(['youtube.com/', 'youtu.be/']),
            twitter: findSocial(['twitter.com/', 'x.com/']),
            tiktok: findSocial(['tiktok.com/']),
        };

        // === SINAIS DE TECNOLOGIA ===
        const techHints: string[] = [];
        if (html.includes('wp-content') || html.includes('/wordpress/')) techHints.push('WordPress');
        if (html.includes('elementor')) techHints.push('Elementor');
        if (html.includes('cdn.shopify')) techHints.push('Shopify');
        if (html.includes('wix.com') || html.includes('wixsite')) techHints.push('Wix');
        if (html.includes('squarespace')) techHints.push('Squarespace');
        if (html.includes('webflow')) techHints.push('Webflow');
        if (html.includes('googletagmanager')) techHints.push('Google Tag Manager');
        if (html.includes('gtag') || html.includes('analytics.js')) techHints.push('Google Analytics');
        if (html.includes('fbevents.js') || html.includes('fbq(')) techHints.push('Meta Pixel');
        if (html.includes('hotjar')) techHints.push('Hotjar');
        if (html.includes('rdstation') || html.includes('rd-js')) techHints.push('RD Station');
        if (html.includes('hubspot')) techHints.push('HubSpot');
        if (html.includes('intercom')) techHints.push('Intercom');

        return {
            success: true,
            emails: allEmails.slice(0, 10),
            phones: allPhones,
            whatsappLinks: waLinksUnique,
            socialLinks,
            techHints: [...new Set(techHints)],
        };
    } catch (error: any) {
        console.error('[Browserless] Erro ao scrape website:', error?.message || error);
        // Fallback: tentar fetch simples sem browser
        return await scrapeWebsiteFallback(url);
    } finally {
        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }
    }
}

/**
 * Fallback sem browser: fetch simples + regex
 */
async function scrapeWebsiteFallback(url: string): Promise<WebsiteScrapeResult> {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WootechCRM/1.0)' },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const emails = [...new Set(html.match(emailRegex) || [])].filter(e =>
            !e.endsWith('.png') && !e.endsWith('.jpg') && e.length < 80
        ).slice(0, 8);

        const waMatch = html.match(/wa\.me\/(\d{10,15})/);
        const whatsappLinks = waMatch ? [`https://wa.me/${waMatch[1]}`] : [];

        return {
            success: true,
            emails,
            phones: [],
            whatsappLinks,
            socialLinks: {},
            techHints: [],
        };
    } catch (e: any) {
        return {
            success: false,
            emails: [],
            phones: [],
            whatsappLinks: [],
            socialLinks: {},
            techHints: [],
            error: e?.message,
        };
    }
}
