import { supabaseAdmin } from './supabase.js';
import { generateCompletion } from './llm-router.js';
import { jarvisBridge } from './jarvis-bridge.js';

// ─── Tools Definition ──────────────────────────────────────────

const AVAILABLE_TOOLS = [
  {
    name: 'execute_cli_command',
    description: 'Executa um comando no terminal/CLI do servidor via Jarvis.',
    parameters: {
      command: 'string (O comando bash/shell a ser executado)'
    }
  },
  {
    name: 'send_whatsapp',
    description: 'Envia uma mensagem via WhatsApp para um número.',
    parameters: {
      to: 'string (Número do telefone com código do país, ex: 5511999999999)',
      message: 'string (Conteúdo da mensagem)'
    }
  },
  {
    name: 'search_crm',
    description: 'Pesquisa dados de empresas ou leads no CRM.',
    parameters: {
      query: 'string (Termo de busca, ex: nome da empresa ou nicho)'
    }
  },
  {
    name: 'delegate_task',
    description: 'Delega uma tarefa para outro agente (útil para o CTO distribuir trabalho).',
    parameters: {
      agent_role: 'string (Papel ou nome do agente, ex: "Vendas", "Marketing")',
      task: 'string (Descrição detalhada da tarefa)',
      priority: 'string ("low", "normal", "high")'
    }
  }
];

const TOOLS_PROMPT = `
Você tem acesso às seguintes ferramentas:
${AVAILABLE_TOOLS.map(t => `- ${t.name}: ${t.description}\n  Parâmetros: ${JSON.stringify(t.parameters)}`).join('\n')}

Quando você precisar usar uma ferramenta, responda EXATAMENTE com o seguinte formato JSON:
{
  "action": "nome_da_ferramenta",
  "args": {
    "param1": "valor"
  }
}

Quando você tiver terminado a tarefa e não precisar mais de ferramentas, responda com:
{
  "action": "final_answer",
  "content": "Sua resposta final e resumo do que foi feito aqui."
}
`;

// ─── Tool Execution ─────────────────────────────────────────────

async function executeTool(action: string, args: any): Promise<string> {
  try {
    switch (action) {
      case 'execute_cli_command':
        if (!args.command) return 'Erro: parâmetro "command" é obrigatório.';
        const cmdRes = await jarvisBridge.executeCommand({ command: args.command, timeout: 10000 });
        return `Status: ${cmdRes.status}\nOutput:\n${cmdRes.output}`;

      case 'send_whatsapp':
        if (!args.to || !args.message) return 'Erro: "to" e "message" são obrigatórios.';
        const waRes = await jarvisBridge.sendWhatsAppMessage(args.to, args.message);
        return waRes.success ? 'Mensagem enviada com sucesso.' : 'Falha ao enviar mensagem.';

      case 'search_crm':
        const { data, error } = await supabaseAdmin
          .from('companies')
          .select('id, name, industry, status')
          .ilike('name', `%${args.query || ''}%`)
          .limit(5);
        if (error) return `Erro no banco de dados: ${error.message}`;
        return data && data.length > 0 ? JSON.stringify(data, null, 2) : 'Nenhuma empresa encontrada.';

      case 'delegate_task':
        if (!args.agent_role || !args.task) return 'Erro: "agent_role" e "task" são obrigatórios.';
        // Buscar agente alvo
        const { data: agents } = await supabaseAdmin.from('ai_agents').select('id, name, role').eq('status', 'active');
        const targetAgent = agents?.find(a => a.role.toLowerCase().includes(args.agent_role.toLowerCase()) || a.name.toLowerCase().includes(args.agent_role.toLowerCase()));
        
        if (!targetAgent) return `Erro: Agente com papel/nome '${args.agent_role}' não encontrado.`;
        
        // Criar tarefa pending para o agente alvo
        await supabaseAdmin.from('ai_activities').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          agent_id: targetAgent.id,
          agent_name: targetAgent.name,
          action_type: 'execution',
          title: `Tarefa delegada: ${args.task.substring(0, 50)}...`,
          description: `Tarefa recebida via delegação.`,
          metadata: { task: args.task, priority: args.priority || 'normal' },
          status: 'pending'
        });
        return `Tarefa delegada com sucesso para ${targetAgent.name} (${targetAgent.role}).`;

      default:
        return `Erro: Ferramenta '${action}' desconhecida.`;
    }
  } catch (error) {
    return `Erro ao executar ferramenta: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// ─── ReAct Loop ──────────────────────────────────────────────────

export async function runAgentTask(agent: any, taskDesc: string, conversationId?: string): Promise<string> {
  const messages: any[] = [
    {
      role: 'system',
      content: `Você é ${agent.name}, ${agent.role} no departamento de ${agent.department}.
Missão: ${agent.mission}

Você recebeu uma tarefa do CTO. Use as ferramentas disponíveis para completar a tarefa da melhor forma possível.
Siga RIGOROSAMENTE o formato JSON solicitado.
${TOOLS_PROMPT}`
    },
    {
      role: 'user',
      content: `Tarefa a executar: ${taskDesc}`
    }
  ];

  // Helper para postar na sala de guerra
  const postToGroupChat = async (content: string) => {
    if (!conversationId) return;
    try {
      await supabaseAdmin.from('ai_conversation_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content,
        agent_name: agent.name
      });
    } catch (e) {
      console.error(`[AgenticLoop] Falha ao postar no chat:`, e);
    }
  };

  // Anuncia que começou a trabalhar
  await postToGroupChat(`Recebi a tarefa: "${taskDesc}". Vou começar a trabalhar nisso agora.`);

  let iterations = 0;
  const maxIterations = 5; // Evitar loops infinitos

  while (iterations < maxIterations) {
    iterations++;
    console.log(`[AgenticLoop] ${agent.name} - Iteration ${iterations}`);

    const response = await generateCompletion({
      messages,
      agentId: agent.id,
      temperature: 0.2 // Baixa temperatura para manter o formato JSON
    });

    let actionResponse: any;
    try {
      // Extrair JSON da resposta
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Não foi possível encontrar o formato JSON na resposta.');
      }
      actionResponse = JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Se falhar o parse, avisa o LLM do erro
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ 
        role: 'user', 
        content: `Erro ao fazer parse do seu JSON: ${e instanceof Error ? e.message : String(e)}. Lembre-se de retornar APENAS o JSON no formato especificado.`
      });
      continue;
    }

    if (actionResponse.action === 'final_answer') {
      const finalMsg = actionResponse.content || 'Tarefa concluída sem detalhes adicionais.';
      await postToGroupChat(`✅ Finalizei: ${finalMsg}`);
      return finalMsg;
    }

    // Executar a ferramenta
    console.log(`[AgenticLoop] ${agent.name} chamando ferramenta: ${actionResponse.action}`, actionResponse.args);
    await postToGroupChat(`Executando ação: \`${actionResponse.action}\`...`);
    
    const toolResult = await executeTool(actionResponse.action, actionResponse.args || {});
    
    // Adicionar ao histórico
    messages.push({ role: 'assistant', content: JSON.stringify(actionResponse) });
    messages.push({ role: 'user', content: `Resultado da ferramenta ${actionResponse.action}:\n${toolResult}` });
  }

  await postToGroupChat(`⚠️ Tive dificuldades e abortei a tarefa após várias tentativas.`);
  return 'A tarefa excedeu o número máximo de iterações permitidas e foi abortada.';
}
