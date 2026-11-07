/**
 * アプリ全体で使用する型定義
 */

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type RecordItem = {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  startedAt: string;
  createdAt: string; // ISO string
  updatedAt: string;
};

export type PostItem = {
  id: string;
  recordId: string;
  userId: string;
  user?: User;
  content: string;
  imageUrls: string[];
  activityMinutes: number; // 今回の活動時間（分）
  createdAt: string; // ISO string
  likesCount: number;
  isLiked: boolean;
};

export type RecordStats = {
  currentDay: number;
  postCount: number;
  totalMinutes: number;
};

export * from "./database";
