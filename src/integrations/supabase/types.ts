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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      crime_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      crime_reports: {
        Row: {
          address: string
          category_id: string
          created_at: string
          description: string
          id: string
          incident_date: string
          incident_time: string | null
          is_anonymous: boolean
          latitude: number
          lga: string | null
          longitude: number
          officer_id: string | null
          report_number: string
          reporter_id: string
          severity: Database["public"]["Enums"]["report_severity"]
          state: string | null
          status: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          category_id: string
          created_at?: string
          description: string
          id?: string
          incident_date: string
          incident_time?: string | null
          is_anonymous?: boolean
          latitude: number
          lga?: string | null
          longitude: number
          officer_id?: string | null
          report_number?: string
          reporter_id: string
          severity?: Database["public"]["Enums"]["report_severity"]
          state?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          incident_time?: string | null
          is_anonymous?: boolean
          latitude?: number
          lga?: string | null
          longitude?: number
          officer_id?: string | null
          report_number?: string
          reporter_id?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          state?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crime_reports_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crime_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          report_id: string
          storage_path: string
          type: Database["public"]["Enums"]["evidence_type"]
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          report_id: string
          storage_path: string
          type: Database["public"]["Enums"]["evidence_type"]
          uploaded_by: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          report_id?: string
          storage_path?: string
          type?: Database["public"]["Enums"]["evidence_type"]
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "crime_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_updates: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          note: string
          officer_id: string
          report_id: string
          status_change: Database["public"]["Enums"]["report_status"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          note: string
          officer_id: string
          report_id: string
          status_change?: Database["public"]["Enums"]["report_status"] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          note?: string
          officer_id?: string
          report_id?: string
          status_change?: Database["public"]["Enums"]["report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "investigation_updates_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "crime_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge_number: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          station: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          station?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          station?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          report_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          report_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          report_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "crime_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          report_id: string
          reporter_id: string
          stars: number
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          report_id: string
          reporter_id: string
          stars: number
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          report_id?: string
          reporter_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_ratings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "crime_reports"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_report_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "citizen" | "police" | "admin"
      evidence_type: "image" | "video" | "document"
      report_severity: "low" | "medium" | "high" | "critical"
      report_status:
        | "pending"
        | "assigned"
        | "under_investigation"
        | "resolved"
        | "rejected"
        | "closed"
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
      app_role: ["citizen", "police", "admin"],
      evidence_type: ["image", "video", "document"],
      report_severity: ["low", "medium", "high", "critical"],
      report_status: [
        "pending",
        "assigned",
        "under_investigation",
        "resolved",
        "rejected",
        "closed",
      ],
    },
  },
} as const
