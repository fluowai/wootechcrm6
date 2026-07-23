# AIOS Implementation Phases

## Phase 1: Foundation (Week 1-2)

### 1.1 Paperclip Infrastructure
- [ ] Add Paperclip service to `docker-compose.yml`
- [ ] Configure Postgres connection (shared with CRM)
- [ ] Verify Paperclip starts and dashboard is accessible on port 4100
- [ ] Create health check endpoint for Paperclip
- [ ] Test basic Paperclip API connectivity from Express

### 1.2 Database Schema
- [ ] Create migration file `DEV/SQL/aios-schema.sql`
- [ ] Add `ai_agents` table
- [ ] Add `ai_goals` table
- [ ] Add `ai_activities` table
- [ ] Add `ai_suggestions` table
- [ ] Add `ai_conversations` + `ai_conversation_messages` tables
- [ ] Add RLS policies for all new tables
- [ ] Add triggers for `updated_at`
- [ ] Update `supabase_schema.sql` with new tables

### 1.3 AI Gateway Module
- [ ] Create `src/lib/ai-gateway.ts` — Paperclip HTTP client
- [ ] Create `src/routes/ai-os.ts` — Express router for `/api/ai-os/*`
- [ ] Implement agent CRUD endpoints
- [ ] Implement goal CRUD endpoints
- [ ] Implement activity feed endpoint
- [ ] Implement suggestions endpoint
- [ ] Mount router in `server.ts`

### 1.4 Frontend Foundation
- [ ] Create `src/components/aios/` directory
- [ ] Create `AICenterView.tsx` — Main container with tab navigation
- [ ] Update `Sidebar.tsx` — Replace "IA Comercial" with "AI Center"
- [ ] Update `App.tsx` — Route to new AICenterView
- [ ] Create `CommandCenter.tsx` — Agent status grid + goal summary

## Phase 2: Agent Organization (Week 3-4)

### 2.1 Agent Identity System
- [ ] Define default agents: CEO, CSO, CMO, CTO, CFO, SDR, Closer, CS
- [ ] Create agent configuration form (mission, KPIs, permissions, limits)
- [ ] Implement autonomy level selector (0-3)
- [ ] Implement heartbeat interval configuration
- [ ] Store agent configs in Supabase + sync to Paperclip

### 2.2 Agent Monitoring UI
- [ ] `AgentsView.tsx` — Grid of agent cards with status
- [ ] `AgentDetailModal.tsx` — Full agent config + activity history
- [ ] Agent status indicators (active/paused/inactive)
- [ ] Token usage display per agent

### 2.3 Goal Management
- [ ] `GoalsView.tsx` — List of strategic goals
- [ ] `GoalDetailModal.tsx` — Goal detail + progress bar
- [ ] Goal creation form (title, description, category, target, deadline)
- [ ] Goal-to-agent assignment
- [ ] Goal progress auto-calculation from CRM data

### 2.4 Basic Activity Feed
- [ ] `ActivityFeed.tsx` — Chronological list of agent actions
- [ ] Activity type icons and color coding
- [ ] Filter by agent, action type, date range
- [ ] Pagination for large activity lists

## Phase 3: Tools & Execution (Week 5-6)

### 3.1 CRM Tool Endpoints
- [ ] `/api/ai-os/tools/crm/query` — Read companies, contacts, deals
- [ ] `/api/ai-os/tools/crm/update` — Update CRM records
- [ ] `/api/ai-os/tools/metrics` — Get business metrics (pipeline, conversion, revenue)
- [ ] Input validation and authorization checks

### 3.2 Communication Tools
- [ ] `/api/ai-os/tools/whatsapp/send` — Send WhatsApp messages via Whatsmeow
- [ ] `/api/ai-os/tools/email/send` — Send email (future integration)
- [ ] `/api/ai-os/tools/calendar/create` — Create calendar events

### 3.3 Intelligence Tools
- [ ] `/api/ai-os/tools/prospecting/run` — Trigger GMB prospection
- [ ] `/api/ai-os/tools/enrichment/run` — Trigger company enrichment
- [ ] `/api/ai-os/tools/ai/generate` — Generate AI content (reuses Gemini)

### 3.4 Execution Engine
- [ ] Heartbeat processor — Triggers agent actions on schedule
- [ ] Goal evaluation — Checks goal progress against CRM data
- [ ] Task delegation — CEO agent delegates to sub-agents
- [ ] Activity logging — All actions logged to `ai_activities`

## Phase 4: Intelligence (Week 7-8)

### 4.1 Suggestions Engine
- [ ] Agent analysis logic (pipeline review, conversion analysis, etc.)
- [ ] `SuggestionsPanel.tsx` — Accept/dismiss/implement suggestions
- [ ] Suggestion categories: pipeline, hiring, marketing, pricing, retention
- [ ] Impact estimation for each suggestion

### 4.2 Agent-to-Agent Conversations
- [ ] Conversation creation when agents need to collaborate
- [ ] `ai_conversations` table population
- [ ] Conversation summary generation
- [ ] Escalation to user when agents disagree

### 4.3 Insights Analytics
- [ ] `InsightsView.tsx` — Charts and analytics from agent analysis
- [ ] Agent performance metrics (tokens used, tasks completed, suggestions made)
- [ ] Goal achievement trends
- [ ] ROI calculation for agent work

### 4.4 Autonomy Enforcement
- [ ] Autonomy level checks in AI Gateway
- [ ] Level 0: Queue actions for user approval
- [ ] Level 1: Auto-execute simple tasks only
- [ ] Level 2: Execute within defined rules
- [ ] Level 3: Full autonomy with post-execution reporting

## Phase 5: Polish & Production (Week 9-10)

### 5.1 Real-time Updates
- [ ] WebSocket events from AI Gateway to frontend
- [ ] Live agent status updates
- [ ] Live activity feed updates
- [ ] Live suggestion notifications

### 5.2 Token Budget Management
- [ ] Monthly token budget per agent
- [ ] Budget exhaustion warnings
- [ ] Auto-pause agents at budget limit
- [ ] Token usage dashboard

### 5.3 Error Handling
- [ ] Paperclip connection failure graceful degradation
- [ ] Agent crash recovery
- [ ] Tool call failure retry logic
- [ ] User notification for critical failures

### 5.4 Security Audit
- [ ] Verify Paperclip not exposed externally
- [ ] Verify RLS on all new tables
- [ ] Verify no secrets leak to agent memory
- [ ] Verify tool call authorization
- [ ] Penetration test of AI Gateway

### 5.5 Performance
- [ ] Activity feed pagination optimization
- [ ] WebSocket connection management
- [ ] Database query optimization for new tables
- [ ] Paperclip API call caching where appropriate
