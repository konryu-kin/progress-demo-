/**
 * Supabase データベースのテーブルスキーマに対応する型定義
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      records: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          cover_image_url: string;
          started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          cover_image_url?: string;
          started_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          cover_image_url?: string;
          started_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Relationships: [];
        Row: {
          id: string;
          record_id: string;
          user_id: string;
          content: string;
          image_urls: string[];
          activity_minutes: number;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          record_id: string;
          user_id: string;
          content: string;
          image_urls?: string[];
          activity_minutes?: number;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string;
          user_id?: string;
          content?: string;
          image_urls?: string[];
          activity_minutes?: number;
          likes_count?: number;
          updated_at?: string;
        };
      };
      post_likes: {
        Relationships: [];
        Row: {
          post_id: string;
          visitor_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          visitor_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          visitor_id?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_guest_api_rate_limit: {
        Args: {
          p_ip_hash: string;
          p_max_requests: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_guest_post_like_states: {
        Args: { p_visitor_id: string };
        Returns: Array<{
          post_id: string;
          like_count: number;
          is_liked: boolean;
        }>;
      };
      toggle_guest_post_like: {
        Args: { p_post_id: string; p_visitor_id: string };
        Returns: Array<{ is_liked: boolean; like_count: number }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
