import { Worker, Job } from 'bullmq';
import { redisConnection } from './queue.js';
import { extractFromGoogleMaps, scrapeWebsiteForEmails } from '../services/scraper.js';
import { supabaseAdmin } from './supabase.js';

// ============================================================
// SCRAPER WORKER — BullMQ Background Job Processor
// Processa scraping do Google Maps (gosom) + enrichment de sites
// ============================================================

export const scraperWorker = new Worker(
    'scraper-queue',
    async (job: Job) => {
        console.log(`[ScraperWorker] Job ${job.id} | tipo: ${job.name}`);

        // -------------------------------------------------------
        // JOB: google-maps-scrape
        // Extrai leads do Google Maps via gosom e salva no Supabase
        // -------------------------------------------------------
        if (job.name === 'google-maps-scrape') {
            const { keyword, location, depth = 1, userId } = job.data;

            console.log(`[ScraperWorker] Iniciando scraping: "${keyword}" em "${location}"`);
            await job.updateProgress(10);

            // 1. Chamar gosom para extrair leads do Google Maps
            const { jobId: gosomJobId, results } = await extractFromGoogleMaps(keyword, location, depth);
            await job.updateProgress(60);

            if (!results || results.length === 0) {
                console.warn('[ScraperWorker] Gosom não retornou resultados.');
                await job.updateProgress(100);
                return { status: 'completed', found: 0, gosomJobId };
            }

            console.log(`[ScraperWorker] Gosom retornou ${results.length} leads. Iniciando enriquecimento de sites...`);

            const enrichedResults = [];
            let enrichedCount = 0;

            // 2. Para cada resultado, se tiver website, extrair emails e sociais
            for (const item of results) {
                let webData = null;

                if (item.website) {
                    try {
                        webData = await scrapeWebsiteForEmails(item.website);
                    } catch (e: any) {
                        console.warn(`[ScraperWorker] Website scrape falhou para ${item.website}:`, e?.message);
                    }
                }

                enrichedResults.push({
                    ...item,
                    emails: webData?.emails || [],
                    phones_extra: webData?.phones || [],
                    whatsapp_links: webData?.whatsappLinks || [],
                    social_links: webData?.socialLinks || {},
                    tech_hints: webData?.techHints || [],
                });

                enrichedCount++;
                const progress = 60 + Math.round((enrichedCount / results.length) * 30);
                await job.updateProgress(Math.min(progress, 90));
            }

            // 3. Salvar no Supabase (batch insert)
            if (enrichedResults.length > 0 && supabaseAdmin) {
                const rows = enrichedResults.map((item) => ({
                    user_id: userId || null,
                    razao_social: item.nomeEmpresa + ' LTDA',
                    nome_fantasia: item.nomeEmpresa,
                    cnpj: `gmaps-${item.googlePlaceId}`,
                    situacao: 'ATIVA',
                    cnae_text: item.categoria,
                    endereco: {
                        logradouro: item.endereco,
                        cidade: item.cidade,
                        estado: item.estado,
                        lat: item.lat,
                        lng: item.lng,
                    },
                    website: item.website || null,
                    telefones: [item.telefone].filter(Boolean),
                    emails: item.emails,
                    tags: ['Google Maps', item.categoria, 'gosom'],
                    enriched: false,
                    score_comercial: 70,
                    rating_gmb: item.rating,
                    reviews_count_gmb: item.reviewsCount,
                    place_id_gmb: item.googlePlaceId,
                    tech_stack: item.tech_hints?.map((t: string) => ({ name: t, category: 'detected' })) || [],
                    observacoes: `Importado automaticamente via Google Maps Scraper (gosom). Fonte: ${item.source}`,
                }));

                const { error } = await supabaseAdmin.from('companies').upsert(rows, {
                    onConflict: 'place_id_gmb',
                    ignoreDuplicates: true,
                });

                if (error) {
                    console.error('[ScraperWorker] Erro ao salvar no Supabase:', error.message);
                } else {
                    console.log(`[ScraperWorker] ${enrichedResults.length} leads salvos no Supabase.`);
                }
            }

            await job.updateProgress(100);
            return {
                status: 'completed',
                found: enrichedResults.length,
                gosomJobId,
                keyword,
                location,
            };
        }

        // -------------------------------------------------------
        // JOB: website-enrich
        // Enriquece um único website com emails, sociais, tech
        // -------------------------------------------------------
        if (job.name === 'website-enrich') {
            const { url, companyId } = job.data;

            console.log(`[ScraperWorker] Enriquecendo website: ${url}`);
            await job.updateProgress(10);

            const webData = await scrapeWebsiteForEmails(url);
            await job.updateProgress(80);

            if (webData.success && supabaseAdmin && companyId) {
                await supabaseAdmin.from('companies').update({
                    emails: webData.emails,
                    tech_stack: webData.techHints.map(t => ({ name: t, category: 'detected' })),
                }).eq('id', companyId);
            }

            await job.updateProgress(100);
            return { status: 'completed', ...webData };
        }

        return { status: 'skipped', reason: `Unknown job type: ${job.name}` };
    },
    { connection: redisConnection, concurrency: 3 }
);

scraperWorker.on('completed', (job, returnvalue) => {
    console.log(`[ScraperWorker] ✅ Job ${job.id} (${job.name}) concluído:`, returnvalue);
});

scraperWorker.on('failed', (job, err) => {
    console.error(`[ScraperWorker] ❌ Job ${job?.id} (${job?.name}) falhou:`, err.message);
});

scraperWorker.on('progress', (job, progress) => {
    console.log(`[ScraperWorker] 📊 Job ${job.id} progresso: ${progress}%`);
});

console.log('[ScraperWorker] 🚀 Worker iniciado e aguardando jobs na fila...');
