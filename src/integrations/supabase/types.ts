export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind: string
          thread_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_briefs: {
        Row: {
          broken_phone: string | null
          business_summary: string | null
          buyer_filters: string | null
          care_fear_need: string | null
          created_at: string
          desired_outcomes: string | null
          ecosystems: string | null
          icp_description: string | null
          icp_titles: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          offer_summary: string | null
          pain_points: string | null
          partner_types: string | null
          problems_solved: string | null
          sort_order: number
          story_notes: string | null
          unfair_advantage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          broken_phone?: string | null
          business_summary?: string | null
          buyer_filters?: string | null
          care_fear_need?: string | null
          created_at?: string
          desired_outcomes?: string | null
          ecosystems?: string | null
          icp_description?: string | null
          icp_titles?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          offer_summary?: string | null
          pain_points?: string | null
          partner_types?: string | null
          problems_solved?: string | null
          sort_order?: number
          story_notes?: string | null
          unfair_advantage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          broken_phone?: string | null
          business_summary?: string | null
          buyer_filters?: string | null
          care_fear_need?: string | null
          created_at?: string
          desired_outcomes?: string | null
          ecosystems?: string | null
          icp_description?: string | null
          icp_titles?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          offer_summary?: string | null
          pain_points?: string | null
          partner_types?: string | null
          problems_solved?: string | null
          sort_order?: number
          story_notes?: string | null
          unfair_advantage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_profile: {
        Row: {
          business_summary: string | null
          created_at: string
          id: string
          problems_solved: string | null
          story_notes: string | null
          unfair_advantage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_summary?: string | null
          created_at?: string
          id?: string
          problems_solved?: string | null
          story_notes?: string | null
          unfair_advantage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_summary?: string | null
          created_at?: string
          id?: string
          problems_solved?: string | null
          story_notes?: string | null
          unfair_advantage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          id: string
          is_approved: boolean
          prospect_id: string
          slot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          campaign_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          prospect_id: string
          slot: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          prospect_id?: string
          slot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brief_id: string | null
          channel: string
          connection_note: string | null
          created_at: string
          id: string
          list_id: string | null
          message_1: string | null
          message_2: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brief_id?: string | null
          channel?: string
          connection_note?: string | null
          created_at?: string
          id?: string
          list_id?: string | null
          message_1?: string | null
          message_2?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brief_id?: string | null
          channel?: string
          connection_note?: string | null
          created_at?: string
          id?: string
          list_id?: string | null
          message_1?: string | null
          message_2?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_message_id: string | null
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_brief_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_brief_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_brief_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_brief_id_fkey"
            columns: ["current_brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_lists: {
        Row: {
          audience: string
          brief_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          temperature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          brief_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          temperature?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          brief_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          temperature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_lists_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          audience: string
          blurb: string | null
          brief_id: string | null
          call_at: string | null
          company: string | null
          created_at: string
          email: string | null
          follow_up_state: string
          id: string
          last_touch_at: string | null
          linkedin_url: string | null
          list_id: string | null
          location: string | null
          name: string
          next_action_at: string | null
          next_action_kind: string | null
          notes: string | null
          sequence_step: number
          social_url: string | null
          sources: Json
          status: string
          temperature: string
          title: string | null
          updated_at: string
          user_id: string
          website: string | null
          why_fits: string | null
        }
        Insert: {
          audience?: string
          blurb?: string | null
          brief_id?: string | null
          call_at?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          follow_up_state?: string
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          list_id?: string | null
          location?: string | null
          name: string
          next_action_at?: string | null
          next_action_kind?: string | null
          notes?: string | null
          sequence_step?: number
          social_url?: string | null
          sources?: Json
          status?: string
          temperature?: string
          title?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          why_fits?: string | null
        }
        Update: {
          audience?: string
          blurb?: string | null
          brief_id?: string | null
          call_at?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          follow_up_state?: string
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          list_id?: string | null
          location?: string | null
          name?: string
          next_action_at?: string | null
          next_action_kind?: string | null
          notes?: string | null
          sequence_step?: number
          social_url?: string | null
          sources?: Json
          status?: string
          temperature?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          why_fits?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          agent: string
          brief_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          brief_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          brief_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          agent: string | null
          brief_id: string | null
          created_at: string
          done_at: string | null
          id: string
          is_done: boolean
          prospect_id: string | null
          sort_order: number
          thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string | null
          brief_id?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          prospect_id?: string | null
          sort_order?: number
          thread_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string | null
          brief_id?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          prospect_id?: string | null
          sort_order?: number
          thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      touches: {
        Row: {
          body_excerpt: string | null
          brief_id: string | null
          channel: string | null
          created_at: string
          id: string
          kind: string
          occurred_at: string
          outcome: string | null
          prospect_id: string
          sequence_step: number | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          body_excerpt?: string | null
          brief_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          outcome?: string | null
          prospect_id: string
          sequence_step?: number | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          body_excerpt?: string | null
          brief_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          outcome?: string | null
          prospect_id?: string
          sequence_step?: number | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touches_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "audience_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touches_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touches_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
