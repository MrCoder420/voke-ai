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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blogs: {
        Row: {
          id: number
          title: string
          content: string
          image_url: string | null
          author: string
          category: string
          status: string
          views: number | null
          created_at: string
          published_at: string | null
        }
        Insert: {
          id?: number
          title: string
          content: string
          image_url?: string | null
          author: string
          category: string
          status?: string
          views?: number | null
          created_at?: string
          published_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          content?: string
          image_url?: string | null
          author?: string
          category?: string
          status?: string
          views?: number | null
          created_at?: string
          published_at?: string | null
        }
        Relationships: []
      }
      interview_answers: {
        Row: {
          analyzed_at: string | null
          body_language_score: number | null
          confidence_score: number | null
          created_at: string | null
          delivery_score: number | null
          duration_seconds: number | null
          id: string
          model_answer: string | null
          question: string
          question_number: number
          session_id: string
          transcript: string | null
          video_url: string | null
          whats_good: Json | null
          whats_wrong: Json | null
        }
        Insert: {
          analyzed_at?: string | null
          body_language_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          duration_seconds?: number | null
          id?: string
          model_answer?: string | null
          question: string
          question_number: number
          session_id: string
          transcript?: string | null
          video_url?: string | null
          whats_good?: Json | null
          whats_wrong?: Json | null
        }
        Update: {
          analyzed_at?: string | null
          body_language_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          duration_seconds?: number | null
          id?: string
          model_answer?: string | null
          question?: string
          question_number?: number
          session_id?: string
          transcript?: string | null
          video_url?: string | null
          whats_good?: Json | null
          whats_wrong?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          body_language_summary: string | null
          completed_at: string | null
          confidence_summary: string | null
          created_at: string | null
          eye_contact_summary: string | null
          id: string
          interview_type: string
          job_profile_id: string | null
          overall_score: number | null
          resume_content: string | null
          role: string
          status: string | null
          time_limit_minutes: number | null
          total_duration_seconds: number | null
          user_id: string
        }
        Insert: {
          body_language_summary?: string | null
          completed_at?: string | null
          confidence_summary?: string | null
          created_at?: string | null
          eye_contact_summary?: string | null
          id?: string
          interview_type: string
          job_profile_id?: string | null
          overall_score?: number | null
          resume_content?: string | null
          role?: string
          status?: string | null
          time_limit_minutes?: number | null
          total_duration_seconds?: number | null
          user_id: string
        }
        Update: {
          body_language_summary?: string | null
          completed_at?: string | null
          confidence_summary?: string | null
          created_at?: string | null
          eye_contact_summary?: string | null
          id?: string
          interview_type?: string
          job_profile_id?: string | null
          overall_score?: number | null
          resume_content?: string | null
          role?: string
          status?: string | null
          time_limit_minutes?: number | null
          total_duration_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_job_profile_id_fkey"
            columns: ["job_profile_id"]
            isOneToOne: false
            referencedRelation: "job_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_market_trends: {
        Row: {
          category: string
          created_at: string | null
          demand_level: string
          description: string
          growth_rate: string | null
          id: string
          key_companies: Json | null
          last_updated: string | null
          preparation_tips: Json | null
          salary_range: string | null
          title: string
          trending_skills: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          demand_level: string
          description: string
          growth_rate?: string | null
          id?: string
          key_companies?: Json | null
          last_updated?: string | null
          preparation_tips?: Json | null
          salary_range?: string | null
          title: string
          trending_skills?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          demand_level?: string
          description?: string
          growth_rate?: string | null
          id?: string
          key_companies?: Json | null
          last_updated?: string | null
          preparation_tips?: Json | null
          salary_range?: string | null
          title?: string
          trending_skills?: Json | null
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          application_url: string | null
          company: string
          created_at: string | null
          description: string
          experience_level: string | null
          id: string
          location: string | null
          posted_date: string | null
          remote_ok: boolean | null
          requirements: string | null
          salary_range: string | null
          skills_required: Json | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_url?: string | null
          company: string
          created_at?: string | null
          description: string
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          remote_ok?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          skills_required?: Json | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_url?: string | null
          company?: string
          created_at?: string | null
          description?: string
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          remote_ok?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          skills_required?: Json | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_recommendations: {
        Row: {
          created_at: string | null
          id: string
          interview_session_ids: Json | null
          job_posting_id: string
          match_reasons: Json | null
          match_score: number
          skill_gaps: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interview_session_ids?: Json | null
          job_posting_id: string
          match_reasons?: Json | null
          match_score: number
          skill_gaps?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interview_session_ids?: Json | null
          job_posting_id?: string
          match_reasons?: Json | null
          match_score?: number
          skill_gaps?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_recommendations_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          }
        ]
      }
      job_profiles: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          job_profile_id: string | null
          priority: number | null
          resources: Json | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          job_profile_id?: string | null
          priority?: number | null
          resources?: Json | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          job_profile_id?: string | null
          priority?: number | null
          resources?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_job_profile_id_fkey"
            columns: ["job_profile_id"]
            isOneToOne: false
            referencedRelation: "job_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      peer_interview_ratings: {
        Row: {
          communication_score: number
          created_at: string
          feedback_text: string | null
          id: string
          overall_score: number
          problem_solving_score: number
          rated_user_id: string
          rater_user_id: string
          session_id: string
          technical_score: number
        }
        Insert: {
          communication_score: number
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_score: number
          problem_solving_score: number
          rated_user_id: string
          rater_user_id: string
          session_id: string
          technical_score: number
        }
        Update: {
          communication_score?: number
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_score?: number
          problem_solving_score?: number
          rated_user_id?: string
          rater_user_id?: string
          session_id?: string
          technical_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "peer_interview_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "peer_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_interview_sessions: {
        Row: {
          created_at: string
          difficulty_level: string
          duration_minutes: number
          guest_user_id: string | null
          host_user_id: string
          id: string
          meeting_notes: string | null
          scheduled_at: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty_level: string
          duration_minutes?: number
          guest_user_id?: string | null
          host_user_id: string
          id?: string
          meeting_notes?: string | null
          scheduled_at: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty_level?: string
          duration_minutes?: number
          guest_user_id?: string | null
          host_user_id?: string
          id?: string
          meeting_notes?: string | null
          scheduled_at?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          resume_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          resume_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          resume_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_career_recommendations: {
        Row: {
          created_at: string | null
          id: string
          learning_priorities: Json | null
          market_insights: string | null
          preparation_roadmap: string | null
          recommended_roles: Json | null
          skill_gaps: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          learning_priorities?: Json | null
          market_insights?: string | null
          preparation_roadmap?: string | null
          recommended_roles?: Json | null
          skill_gaps?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          learning_priorities?: Json | null
          market_insights?: string | null
          preparation_roadmap?: string | null
          recommended_roles?: Json | null
          skill_gaps?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_career_plans: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_skill_level: string | null
          id: string
          job_recommendation_id: string | null
          milestones: Json | null
          month_1_goals: Json | null
          month_2_goals: Json | null
          month_3_goals: Json | null
          progress_percentage: number | null
          resources: Json | null
          target_role: string
          updated_at: string | null
          user_id: string
          weekly_tasks: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_skill_level?: string | null
          id?: string
          job_recommendation_id?: string | null
          milestones?: Json | null
          month_1_goals?: Json | null
          month_2_goals?: Json | null
          month_3_goals?: Json | null
          progress_percentage?: number | null
          resources?: Json | null
          target_role: string
          updated_at?: string | null
          user_id: string
          weekly_tasks?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_skill_level?: string | null
          id?: string
          job_recommendation_id?: string | null
          milestones?: Json | null
          month_1_goals?: Json | null
          month_2_goals?: Json | null
          month_3_goals?: Json | null
          progress_percentage?: number | null
          resources?: Json | null
          target_role?: string
          updated_at?: string | null
          user_id?: string
          weekly_tasks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_career_plans_job_recommendation_id_fkey"
            columns: ["job_recommendation_id"]
            isOneToOne: false
            referencedRelation: "job_recommendations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          learning_path_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          learning_path_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          learning_path_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interview_sessions: {
        Row: {
          analysis_result: Json | null
          analyzed_at: string | null
          body_language_score: number | null
          confidence_score: number | null
          created_at: string | null
          delivery_score: number | null
          duration_seconds: number | null
          feedback_summary: string | null
          id: string
          model_answer: string | null
          overall_score: number | null
          question: string
          role: string | null
          status: string | null
          transcript: string | null
          user_id: string
          video_analysis_details: Json | null
          video_url: string | null
          whats_good: Json | null
          whats_wrong: Json | null
        }
        Insert: {
          analysis_result?: Json | null
          analyzed_at?: string | null
          body_language_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          duration_seconds?: number | null
          feedback_summary?: string | null
          id?: string
          model_answer?: string | null
          overall_score?: number | null
          question: string
          role?: string | null
          status?: string | null
          transcript?: string | null
          user_id: string
          video_analysis_details?: Json | null
          video_url?: string | null
          whats_good?: Json | null
          whats_wrong?: Json | null
        }
        Update: {
          analysis_result?: Json | null
          analyzed_at?: string | null
          body_language_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          duration_seconds?: number | null
          feedback_summary?: string | null
          id?: string
          model_answer?: string | null
          overall_score?: number | null
          question?: string
          role?: string | null
          status?: string | null
          transcript?: string | null
          user_id?: string
          video_analysis_details?: Json | null
          video_url?: string | null
          whats_good?: Json | null
          whats_wrong?: Json | null
        }
        Relationships: []
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
