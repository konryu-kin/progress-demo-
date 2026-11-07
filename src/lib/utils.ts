/**
 * ユーティリティ関数
 */

/** 日付文字列からの経過日数を計算する */
export function daysSince(dateString: string): number {
  const start = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** 分を「○時間○分」形式にフォーマットする */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

