import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Pencil, Trash2 } from "lucide-react";
import type { PostItem } from "@/types";
import { useData } from "@/context/DataContext";
import { calculateDay, formatMinutes } from "@/lib/utils";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { EditPostModal } from "./EditPostModal";

interface TimelinePostCardProps {
  post: PostItem;
  showRecordTag?: boolean;
}

export const TimelinePostCard: React.FC<TimelinePostCardProps> = ({
  post,
  showRecordTag = true,
}) => {
  const { getRecordById, getPostsByRecordId, deletePost, togglePostLike } = useData();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const record = getRecordById(post.recordId);
  const recordPosts = getPostsByRecordId(post.recordId);

  // この投稿時点での経過日数（レコード開始日からこの投稿作成日まで）
  const dayNumber = record
    ? calculateDay(record.startedAt, post.createdAt)
    : 1;

  // この投稿がレコード内で何番目の投稿か（昇順インデックス+1）
  const postIndex = (() => {
    const ascendingPosts = [...recordPosts].reverse();
    const idx = ascendingPosts.findIndex((p) => p.id === post.id);
    return idx >= 0 ? idx + 1 : recordPosts.length;
  })();

  const handleDelete = async () => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      await deletePost(post.id);
    } catch (error) {
      alert(`投稿を削除できませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  };

  const handleToggleLike = async () => {
    try {
      setIsTogglingLike(true);
      await togglePostLike(post.id);
    } catch (error) {
      alert(`いいねを更新できませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsTogglingLike(false);
    }
  };

  const formattedLikes = post.likesCount >= 1000
    ? `${(post.likesCount / 1000).toFixed(post.likesCount % 1000 === 0 ? 0 : 1)}K`
    : String(post.likesCount);

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

        {/* フッター行: コンテンツ行の下に配置 */}
        <div className="post-card-footer">
          <div className="post-record-meta-row">
            {showRecordTag && record && (
              <Link to={`/records/${record.id}`} className="post-tag">
                # {record.title}
              </Link>
            )}
            <span className="post-meta-line">
              day {dayNumber} · post {postIndex} · {formatMinutes(post.activityMinutes)}
            </span>
          </div>

          <div className="post-footer-actions">
            <button
              type="button"
              className={`post-action-button like-action${post.isLiked ? " liked" : ""}`}
              onClick={handleToggleLike}
              disabled={isTogglingLike}
              aria-label={post.isLiked ? "いいねを取り消す" : "いいね"}
              aria-pressed={post.isLiked}
            >
              <Heart size={15} fill={post.isLiked ? "currentColor" : "none"} />
              {formattedLikes}
            </button>
            <button
              type="button"
              className="post-action-button"
              onClick={() => setIsEditOpen(true)}
              aria-label="投稿を編集"
            >
              <Pencil size={15} />
              編集
            </button>
            <button
              type="button"
              className="post-action-button danger"
              onClick={handleDelete}
              aria-label="投稿を削除"
            >
              <Trash2 size={15} />
              削除
            </button>
          </div>
        </div>
      </article>

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
      {isEditOpen && (
        <EditPostModal post={post} isOpen onClose={() => setIsEditOpen(false)} />
      )}
    </>
  );
};
