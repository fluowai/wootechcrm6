# AI-BOS Active Spec

## Status: PHASE 1 IN PROGRESS

## Scope
Implement AI Business Operating System in WooTech CRM using Paperclip as invisible runtime.

## Acceptance Criteria
1. Paperclip runs as Docker container, inaccessible to end users
2. AI Gateway translates CRM events ↔ Paperclip tasks
3. Agents work autonomously based on goals, not commands
4. All UI branded as WooTech CRM (no Paperclip references visible)
5. Agent activity visible in real-time via WebSocket
6. Business metrics (lead score, pipeline, revenue) used by agents
7. Suggestions engine provides actionable recommendations
8. Token budgets enforced per agent
9. Autonomy levels (0-3) control agent behavior
10. RLS enabled on all new tables

## Architecture
- See `DEV/ARCH/aios-architecture.md`

## Implementation Phases
- See `DEV/WORKFLOWS/implementation-phases.md`

## Database Migration
- See `DEV/SQL/aios-schema.sql`

## Current Phase
Phase 1: Foundation (Week 1-2) — **IN PROGRESS**

## Completed
1. ✅ Paperclip + Ollama Docker services added
2. ✅ LLM Router with multi-provider fallback (12 providers)
3. ✅ AI Gateway (Paperclip HTTP client)
4. ✅ API Routes `/api/ai-os/*`
5. ✅ Frontend: AICenterView.tsx with tabs
6. ✅ Sidebar: "AI Center" replaces "IA Comercial"
7. ✅ App.tsx routed to AICenterView

## Next Actions
1. Run database migration (`DEV/SQL/aios-schema.sql`) against Supabase
2. Build Onboarding UI ("Descreva sua empresa")
3. Build Agent CRUD forms
4. Build Goal CRUD forms
5. Add WebSocket for real-time status updates
