/**
 * AIOS Agent Conversations — Agent-to-Agent Communication
 * 
 * Handles conversations between agents when they need to collaborate
 * on complex tasks or resolve disagreements.
 */

import { supabaseAdmin } from './supabase';
import { generateCompletion } from './llm-router';

// ─── Types ───────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  mission: string;
  autonomyLevel: number;
}

interface Conversation {
  id: string;
  topic: string;
  participants: Array<{ agentId: string; agentName: string; role: string }>;
  status: 'active' | 'resolved' | 'escalated';
  summary?: string;
  resolution?: string;
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  agentName: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Conversation Manager ────────────────────────────────────────

/**
 * Create a new conversation between agents
 */
export async function createConversation(
  topic: string,
  participantIds: string[],
  initialMessage?: string
): Promise<Conversation> {
  // Get participant details
  const { data: agents, error } = await supabaseAdmin
    .from('ai_agents')
    .select('id, name, role')
    .in('id', participantIds);

  if (error) throw error;
  if (!agents || agents.length === 0) {
    throw new Error('No valid agents found for conversation');
  }

  const participants = agents.map(a => ({
    agentId: a.id,
    agentName: a.name,
    role: a.role,
  }));

  // Create conversation
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('ai_conversations')
    .insert({
      user_id: 'system',
      topic,
      participants,
      status: 'active',
    })
    .select()
    .single();

  if (convError) throw convError;

  // Add initial message if provided
  if (initialMessage && agents.length > 0) {
    await addMessage(conversation.id, agents[0].name, initialMessage);
  }

  return conversation;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  agentName: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<ConversationMessage> {
  const { data: message, error } = await supabaseAdmin
    .from('ai_conversation_messages')
    .insert({
      conversation_id: conversationId,
      agent_name: agentName,
      content,
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return message;
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  const { data: messages, error } = await supabaseAdmin
    .from('ai_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return messages || [];
}

/**
 * Facilitate an agent response in a conversation
 */
export async function facilitateAgentResponse(
  conversationId: string,
  agentId: string,
  context: string
): Promise<string> {
  // Get agent details
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error('Agent not found');
  }

  // Get conversation history
  const messages = await getConversationMessages(conversationId);

  // Build prompt
  const messagesText = messages
    .map(m => `${m.agent_name}: ${m.content}`)
    .join('\n\n');

  const response = await generateCompletion({
    messages: [
      {
        role: 'system',
        content: `Você é ${agent.name}, ${agent.role} no departamento de ${agent.department}.
Sua missão é: ${agent.mission}

Você está participando de uma conversa com outros agentes.
Analise o contexto e responda de forma construtiva e profissional.
Se concordar com algo, diga. Se discordar, explique por quê.
Se precisar de mais informações, pergunte.`
      },
      {
        role: 'user',
        content: `Contexto da conversa:\n${context}\n\nHistórico:\n${messagesText}

Agora responda como ${agent.name}:`
      }
    ],
    agentId: agent.id,
  });

  // Add the response to the conversation
  await addMessage(conversationId, agent.name, response.content, {
    agentId: agent.id,
    role: agent.role,
  });

  return response.content;
}

/**
 * Resolve a conversation
 */
export async function resolveConversation(
  conversationId: string,
  resolution: string
): Promise<void> {
  // Get all messages for summary
  const messages = await getConversationMessages(conversationId);
  
  // Generate summary
  const summaryResponse = await generateCompletion({
    messages: [
      {
        role: 'system',
        content: 'Gere um resumo conciso desta conversa entre agentes, destacando os pontos principais e a decisão final.'
      },
      {
        role: 'user',
        content: messages.map(m => `${m.agent_name}: ${m.content}`).join('\n\n')
      }
    ]
  });

  // Update conversation
  await supabaseAdmin
    .from('ai_conversations')
    .update({
      status: 'resolved',
      resolution,
      summary: summaryResponse.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
}

/**
 * Escalate a conversation to the user
 */
export async function escalateConversation(
  conversationId: string,
  reason: string
): Promise<void> {
  await supabaseAdmin
    .from('ai_conversations')
    .update({
      status: 'escalated',
      resolution: `Escalado para o usuário: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
}

/**
 * Get active conversations for a user
 */
export async function getActiveConversations(): Promise<Conversation[]> {
  const { data: conversations, error } = await supabaseAdmin
    .from('ai_conversations')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return conversations || [];
}

/**
 * Auto-facilitate a conversation until resolution or escalation
 */
export async function autoFacilitateConversation(
  conversationId: string,
  maxRounds: number = 10
): Promise<void> {
  const conversation = await supabaseAdmin
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation.data || conversation.data.status !== 'active') {
    return;
  }

  const participants = conversation.data.participants as Array<{
    agentId: string;
    agentName: string;
    role: string;
  }>;

  let round = 0;
  while (round < maxRounds) {
    // Get each agent's perspective
    for (const participant of participants) {
      const messages = await getConversationMessages(conversationId);
      const context = messages.map(m => `${m.agent_name}: ${m.content}`).join('\n\n');

      await facilitateAgentResponse(conversationId, participant.agentId, context);

      // Check if conversation should continue
      const latestMessages = await getConversationMessages(conversationId);
      const lastMessage = latestMessages[latestMessages.length - 1];

      if (lastMessage?.content.toLowerCase().includes('concordo') ||
          lastMessage?.content.toLowerCase().includes('resolvido') ||
          lastMessage?.content.toLowerCase().includes('perfeito')) {
        await resolveConversation(conversationId, 'Consenso alcançado entre os agentes');
        return;
      }

      if (lastMessage?.content.toLowerCase().includes('escalado') ||
          lastMessage?.content.toLowerCase().includes('não sei decidir')) {
        await escalateConversation(conversationId, 'Agentes não conseguiram chegar a um consenso');
        return;
      }
    }

    round++;
  }

  // If max rounds reached, resolve or escalate
  if (round >= maxRounds) {
    await resolveConversation(conversationId, 'Conversa encerrada após número máximo de rodadas');
  }
}
