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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_invitations: {
        Row: {
          accepted_at: string | null
          brand_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["brand_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          brand_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["brand_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          brand_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["brand_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_invitations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["brand_role"]
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["brand_role"]
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["brand_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          business_type: string | null
          created_at: string
          default_tone: string | null
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          default_tone?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          default_tone?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          recipient: string
          status: string
          subject: string | null
          template: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          recipient: string
          status?: string
          subject?: string | null
          template: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string
          status?: string
          subject?: string | null
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generated_posts: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          brand_id: string | null
          call_to_action: string | null
          content_type: string
          copy: string | null
          created_at: string
          engagement_comments: number | null
          engagement_fetched_at: string | null
          engagement_likes: number | null
          engagement_reach: number | null
          engagement_shares: number | null
          hashtags: string | null
          id: string
          image_url: string | null
          is_winner: boolean
          last_publish_error: string | null
          platform: string
          published_at: string | null
          scheduled_date: string | null
          short_copy: string | null
          status: string
          target_profile_ids: string[]
          title: string | null
          user_id: string
          variant_group: string | null
          variant_label: string | null
          visual_idea: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string | null
          call_to_action?: string | null
          content_type: string
          copy?: string | null
          created_at?: string
          engagement_comments?: number | null
          engagement_fetched_at?: string | null
          engagement_likes?: number | null
          engagement_reach?: number | null
          engagement_shares?: number | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          is_winner?: boolean
          last_publish_error?: string | null
          platform: string
          published_at?: string | null
          scheduled_date?: string | null
          short_copy?: string | null
          status?: string
          target_profile_ids?: string[]
          title?: string | null
          user_id: string
          variant_group?: string | null
          variant_label?: string | null
          visual_idea?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string | null
          call_to_action?: string | null
          content_type?: string
          copy?: string | null
          created_at?: string
          engagement_comments?: number | null
          engagement_fetched_at?: string | null
          engagement_likes?: number | null
          engagement_reach?: number | null
          engagement_shares?: number | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          is_winner?: boolean
          last_publish_error?: string | null
          platform?: string
          published_at?: string | null
          scheduled_date?: string | null
          short_copy?: string | null
          status?: string
          target_profile_ids?: string[]
          title?: string | null
          user_id?: string
          variant_group?: string | null
          variant_label?: string | null
          visual_idea?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          brand_id: string | null
          created_at: string
          fb_user_id: string
          fb_user_name: string | null
          id: string
          ig_business_id: string | null
          ig_username: string | null
          last_refreshed_at: string | null
          page_access_token: string
          page_id: string
          page_name: string
          token_expires_at: string | null
          updated_at: string
          user_access_token: string | null
          user_id: string
          user_token_expires_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          fb_user_id: string
          fb_user_name?: string | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          last_refreshed_at?: string | null
          page_access_token: string
          page_id: string
          page_name: string
          token_expires_at?: string | null
          updated_at?: string
          user_access_token?: string | null
          user_id: string
          user_token_expires_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          fb_user_id?: string
          fb_user_name?: string | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          last_refreshed_at?: string | null
          page_access_token?: string
          page_id?: string
          page_name?: string
          token_expires_at?: string | null
          updated_at?: string
          user_access_token?: string | null
          user_id?: string
          user_token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          gdpr_accepted: boolean
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          gdpr_accepted?: boolean
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          gdpr_accepted?: boolean
          id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          notify_on_publish_failure: boolean
          notify_on_publish_success: boolean
          notify_on_quota_reset: boolean
          notify_weekly_summary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_on_publish_failure?: boolean
          notify_on_publish_success?: boolean
          notify_on_quota_reset?: boolean
          notify_weekly_summary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_on_publish_failure?: boolean
          notify_on_publish_success?: boolean
          notify_on_quota_reset?: boolean
          notify_weekly_summary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string | null
          referrer_id: string
          reward_amount: number
          rewarded: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_id: string
          reward_amount?: number
          rewarded?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          referrer_id?: string
          reward_amount?: number
          rewarded?: boolean
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_role: string | null
          avatar_url: string | null
          content: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          published: boolean
          rating: number
        }
        Insert: {
          author_name: string
          author_role?: string | null
          avatar_url?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          published?: boolean
          rating?: number
        }
        Update: {
          author_name?: string
          author_role?: string | null
          avatar_url?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          published?: boolean
          rating?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users_profiles: {
        Row: {
          business_type: string | null
          company_name: string | null
          created_at: string
          current_brand_id: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          posts_remaining: number
          quota_reset_at: string
          referral_code: string | null
          referred_by: string | null
          subscription_plan: string
          subscription_status: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          current_brand_id?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          posts_remaining?: number
          quota_reset_at?: string
          referral_code?: string | null
          referred_by?: string | null
          subscription_plan?: string
          subscription_status?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          current_brand_id?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          posts_remaining?: number
          quota_reset_at?: string
          referral_code?: string | null
          referred_by?: string | null
          subscription_plan?: string
          subscription_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_profiles_current_brand_id_fkey"
            columns: ["current_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_brand_role: {
        Args: {
          _brand_id: string
          _roles: Database["public"]["Enums"]["brand_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_member: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      reset_monthly_quotas: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      brand_role: "owner" | "editor" | "viewer"
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
    Enums: {
      app_role: ["admin", "user"],
      brand_role: ["owner", "editor", "viewer"],
    },
  },
} as const
