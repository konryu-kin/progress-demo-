/**
 * Supabase データベースのテーブルスキーマに対応する型定義
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
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
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          cover_image_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          cover_image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          cover_image_url?: string;
          updated_at?: string;
        };
      };
      posts: {
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
    };
  };
}

