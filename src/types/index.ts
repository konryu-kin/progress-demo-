/**
 * アプリ全体で使用する型定義
 */

/** レコード（趣味の活動記録） */
export type Record = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

/** 投稿 */
export type Post = {
  id: string;
  recordId: string;
  content: string;
  imageUrls: string[];
  activityMinutes: number;
  createdAt: string;
  updatedAt: string;
};

