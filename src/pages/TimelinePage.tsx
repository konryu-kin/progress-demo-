import React from "react";
import { useData } from "@/context/DataContext";
import { TimelinePostCard } from "@/features/posts/components/TimelinePostCard";

export const TimelinePage: React.FC = () => {
  const { posts } = useData();

  return (
    <div>
      <h1 className="page-header-title">タイムライン</h1>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p className="empty-state-title">まだ投稿がありません</p>
          <p className="empty-state-desc">
            中央下の「記録する」ボタンから最初の活動を記録してみましょう！
          </p>
        </div>
      ) : (
        <div className="timeline-feed">
          {posts.map((post) => (
            <TimelinePostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
export default TimelinePage;

