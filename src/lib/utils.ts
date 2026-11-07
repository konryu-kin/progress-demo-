/**
 * ユーティリティ関数
 */

/**
 * 開始日からの経過日数 (DAY 1 から始まる)
 */
export function calculateDay(startDateStr: string, targetDateStr?: string): number {
  const start = new Date(startDateStr);
  const target = targetDateStr ? new Date(targetDateStr) : new Date();

  // 日付の差分のみ計算（時刻による誤差をなくすため年月日のみ比較）
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = targetDay.getTime() - startDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * 分を「○時間○分」または「○分」形式にフォーマットする
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0分";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

/**
 * 日時のフォーマット表示
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}
