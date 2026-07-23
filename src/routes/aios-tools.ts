/**
 * AIOS Tools Routes — CRM, Communication, and Intelligence endpoints
 * 
 * These endpoints allow agents to interact with the CRM, send messages,
 * and perform intelligence operations.
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { aiGateway } from '../lib/ai-gateway';
import { generateCompletion } from '../lib/llm-router';

const router = Router();

// ─── CRM Tools ───────────────────────────────────────────────────

/**
 * Query CRM data (companies, contacts, deals)
 */
router.post('/crm/query', async (req: Request, res: Response) => {
  try {
    const { table, filters, limit = 50, offset = 0 } = req.body;

    if (!table || !['companies', 'contacts', 'deals'].includes(table)) {
      res.status(400).json({ error: 'Invalid table. Must be companies, contacts, or deals' });
      return;
    }

    let query = supabaseAdmin.from(table).select('*');

    // Apply filters if provided
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    const { data, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      success: true, 
      data, 
      count: data?.length || 0,
      table 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Query failed' 
    });
  }
});

/**
 * Update CRM record
 */
router.post('/crm/update', async (req: Request, res: Response) => {
  try {
    const { table, id, data } = req.body;

    if (!table || !id || !data) {
      res.status(400).json({ error: 'table, id, and data are required' });
      return;
    }

    if (!['companies', 'contacts', 'deals'].includes(table)) {
      res.status(400).json({ error: 'Invalid table' });
      return;
    }

    const { data: updated, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Update failed' 
    });
  }
});

/**
 * Get business metrics (pipeline, conversion, revenue)
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    // Get pipeline metrics
    const { data: deals, error: dealsError } = await supabaseAdmin
      .from('deals')
      .select('stage, value, status, created_at');

    if (dealsError) throw dealsError;

    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, created_at');

    if (companiesError) throw companiesError;

    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, created_at');

    if (contactsError) throw contactsError;

    // Calculate metrics
    const totalDeals = deals?.length || 0;
    const activeDeals = deals?.filter(d => d.status === 'active').length || 0;
    const wonDeals = deals?.filter(d => d.status === 'won').length || 0;
    const lostDeals = deals?.filter(d => d.status === 'lost').length || 0;
    const pipelineValue = deals
      ?.filter(d => d.status === 'active')
      .reduce((sum, d) => sum + (d.value || 0), 0) || 0;
    const wonValue = deals
      ?.filter(d => d.status === 'won')
      .reduce((sum, d) => sum + (d.value || 0), 0) || 0;
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    // Stage breakdown
    const stageBreakdown = deals?.reduce((acc, deal) => {
      const stage = deal.stage || 'unknown';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      metrics: {
        totalCompanies: companies?.length || 0,
        totalContacts: contacts?.length || 0,
        totalDeals,
        activeDeals,
        wonDeals,
        lostDeals,
        pipelineValue,
        wonValue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        stageBreakdown,
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Metrics query failed' 
    });
  }
});

// ─── Communication Tools ─────────────────────────────────────────

/**
 * Send WhatsApp message via Whatsmeow
 */
router.post('/whatsapp/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({ error: 'to and message are required' });
      return;
    }

    const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
    
    const response = await fetch(`${whatsappUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'WhatsApp send failed' 
    });
  }
});

/**
 * Validate WhatsApp number
 */
router.get('/whatsapp/validate', async (req: Request, res: Response) => {
  try {
    const { number } = req.query;

    if (!number || typeof number !== 'string') {
      res.status(400).json({ error: 'number query parameter is required' });
      return;
    }

    const whatsappUrl = process.env.WHATSAPP_API_URL || 'http://localhost:8080';
    
    const response = await fetch(`${whatsappUrl}/validate?number=${encodeURIComponent(number)}`);

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'WhatsApp validation failed' 
    });
  }
});

// ─── Intelligence Tools ──────────────────────────────────────────

/**
 * Run prospection (Google Maps scraping)
 */
router.post('/prospecting/run', async (req: Request, res: Response) => {
  try {
    const { query, location, limit = 20 } = req.body;

    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const scraperUrl = process.env.SCRAPER_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${scraperUrl}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, limit }),
    });

    if (!response.ok) {
      throw new Error(`Scraper API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Prospecting failed' 
    });
  }
});

/**
 * Enrich company data
 */
router.post('/enrichment/run', async (req: Request, res: Response) => {
  try {
    const { cnpj, url } = req.body;

    if (!cnpj && !url) {
      res.status(400).json({ error: 'cnpj or url is required' });
      return;
    }

    let enrichedData: Record<string, unknown> = {};

    // CNPJ enrichment
    if (cnpj) {
      const cnpjUrl = process.env.CNPJ_SERVICE_URL || 'http://localhost:4000';
      const response = await fetch(`${cnpjUrl}/cnpj/${cnpj}`);
      if (response.ok) {
        const data = await response.json();
        enrichedData = { ...enrichedData, ...data };
      }
    }

    // URL enrichment via Firecrawl
    if (url) {
      const firecrawlUrl = process.env.FIRECRAWL_URL || 'http://localhost:3002';
      const response = await fetch(`${firecrawlUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY || 'local'}`,
        },
        body: JSON.stringify({ url }),
      });
      if (response.ok) {
        const data = await response.json();
        enrichedData = { ...enrichedData, websiteData: data };
      }
    }

    res.json({ success: true, data: enrichedData });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Enrichment failed' 
    });
  }
});

/**
 * Generate AI content using multi-LLM fallback
 */
router.post('/ai/generate', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const response = await generateCompletion({
      messages,
      model,
      temperature,
      maxTokens,
    });

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'AI generation failed' 
    });
  }
});

export default router;
