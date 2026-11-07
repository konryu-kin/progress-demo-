import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import type { PostItem } from "@/types";
import { useData } from "@/context/DataContext";
import { calculateDay } from "@/lib/utils";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";

interface TimelinePostCardProps {
  post: PostItem;
  showRecordTag?: boolean;
}

export const TimelinePostCard: React.FC<TimelinePostCardProps> = ({
  post,
  showRecordTag = true,
}) => {
  const { getRecordById, getPostsByRecordId } = useData();
  const [likes, setLikes] = useState(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const record = getRecordById(post.recordId);
  const recordPosts = getPostsByRecordId(post.recordId);

  // この投稿時点での経過日数（レコード開始日からこの投稿作成日まで）
  const dayNumber = record
    ? calculateDay(record.createdAt, post.createdAt)
    : 1;

  // この投稿がレコード内で何番目の投稿か（昇順インデックス+1）
  const postIndex = (() => {
    const ascendingPosts = [...recordPosts].reverse();
    const idx = ascendingPosts.findIndex((p) => p.id === post.id);
    return idx >= 0 ? idx + 1 : recordPosts.length;
  })();

  const handleToggleLike = () => {
    if (isLiked) {
      setLikes((prev) => Math.max(0, prev - 1));
      setIsLiked(false);
    } else {
      setLikes((prev) => prev + 1);
      setIsLiked(true);
    }
  };

  const formatLikes = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
    }
    return String(num);
  };

  const thumbnail = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : null;

  return (
    <>
      <article className="timeline-post-card">
        {/* コンテンツ行: [ユーザー表示・文章] | [画像] を横並び */}
        <div className="post-content-row">
          <div className={`post-left-col ${!thumbnail ? "full-width" : ""}`}>
            <div className="post-user-header">
              <img
                src={
                  post.user?.avatarUrl ||
                  "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80"
                }
                alt={post.user?.name || "guest user"}
                className="post-avatar"
              />
              <span className="post-username">{post.user?.name || "guest user"}</span>
            </div>
            <p className="post-text">{post.content}</p>
          </div>

          {thumbnail && (
            <div
              className="post-thumbnail-wrapper"
              onClick={() => setPreviewImage(thumbnail)}
              title="画像を拡大して見る"
              style={{ cursor: "zoom-in" }}
            >
              <img src={thumbnail} alt="投稿添付画像" className="post-thumbnail-img" />
            </div>
          )}
        </div>

        {/* フッター行: コンテンツ行の下に配置（レコード名、day・post、いいね） */}
        <div className="post-card-footer">
          <div className="post-record-meta-row">
            {showRecordTag && record && (
              <Link to={`/records/${record.id}`} className="post-tag">
                # {record.title}
              </Link>
            )}
            <span className="post-meta-line">
              day {dayNumber} · post {postIndex}
            </span>
          </div>

          <div className="post-footer-actions">
            <button
              type="button"
              className="like-button"
              onClick={handleToggleLike}
              style={isLiked ? { color: "#f43f5e" } : undefined}
            >
              <Heart
                size={16}
                fill={isLiked ? "#f43f5e" : "none"}
                stroke={isLiked ? "#f43f5e" : "currentColor"}
              />
              <span>{formatLikes(likes)}</span>
            </button>
          </div>
        </div>
      </article>

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
};
