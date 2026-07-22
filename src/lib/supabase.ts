import { createClient } from '@supabase/supabase-js';

// Função segura para buscar variáveis de ambiente tanto no Node (backend) quanto no Vite (frontend)
const getEnvVar = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Optional chaining evita o crash se import.meta.env for undefined no Node
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);



export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          user_id: string;
          razao_social: string;
          nome_fantasia: string;
          cnpj: string;
          situacao: string;
          cnae_code: string;
          cnae_text: string;
          capital_social: number;
          fundacao: string;
          porte: string;
          natureza_juridica: string;
          endereco: any;
          website: string | null;
          instagram: string | null;
          facebook: string | null;
          linkedin: string | null;
          telefones: string[];
          emails: string[];
          observacoes: string | null;
          tags: string[];
          enriched: boolean;
          score_comercial: number | null;
          rating_gmb: number | null;
          reviews_count_gmb: number | null;
          place_id_gmb: string | null;
          tech_stack: any[] | null;
          decision_makers: any[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          company_name: string;
          name: string;
          role: string;
          department: string;
          whatsapp: string;
          phone: string | null;
          email: string;
          linkedin: string | null;
          birthday: string | null;
          observacoes: string | null;
          tags: string[];
          is_decision_maker: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          company_name: string;
          title: string;
          value: number;
          probability: number;
          expected_revenue: number;
          stage_id: string;
          assigned_to: string;
          contact_name: string;
          contact_whatsapp: string;
          contact_email: string;
          time_in_stage_days: number;
          priority: string;
          tags: string[];
          loss_reason: string | null;
          win_reason: string | null;
          history: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['deals']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          deal_id: string | null;
          company_id: string | null;
          title: string;
          type: string;
          scheduled_at: string;
          status: string;
          notes: string | null;
          assigned_to: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      whatsapp_chats: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          contact_name: string;
          contact_number: string;
          company_name: string | null;
          avatar: string | null;
          last_message: string;
          last_message_timestamp: string;
          unread_count: number;
          tags: string[];
          assigned_to: string | null;
          has_whatsapp: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['whatsapp_chats']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['whatsapp_chats']['Insert']>;
      };
      whatsapp_messages: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string;
          sender: string;
          content: string;
          media_type: string | null;
          media_url: string | null;
          timestamp: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['whatsapp_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['whatsapp_messages']['Insert']>;
      };
      automations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          active: boolean;
          nodes: any[];
          edges: any[];
          execution_count: number;
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['automations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['automations']['Insert']>;
      };
    };
  };
};
