import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Edit3, Calendar, FileText } from "lucide-react";
import { useData } from "@/context/DataContext";
import { TimelinePostCard } from "@/features/posts/components/TimelinePostCard";
import { EditRecordModal } from "@/features/records/components/EditRecordModal";

export const RecordDetailPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const {
    getRecordById,
    getPostsByRecordId,
    getRecordStats,
    deleteRecord,
    setIsCreatePostOpen,
    setSelectedRecordIdForPost,
  } = useData();

  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);

  if (!recordId) {
    return <div>レコードが見つかりません</div>;
  }

  const record = getRecordById(recordId);
  const posts = getPostsByRecordId(recordId);
  const stats = getRecordStats(recordId);

  if (!record) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">レコードが見つかりませんでした</p>
        <button className="btn-secondary" onClick={() => navigate("/")} style={{ marginTop: 12 }}>
          ログ一覧へ戻る
        </button>
      </div>
    );
  }

  const handleCreatePostForThisRecord = () => {
    setSelectedRecordIdForPost(record.id);
    setIsCreatePostOpen(true);
  };

  const handleDeleteRecord = () => {
    if (
      window.confirm(
        `「${record.title}」と、このレコードに紐づくすべての投稿を削除しますか？`
      )
    ) {
      deleteRecord(record.id);
      navigate("/");
    }
  };

  return (
    <div>
      <div className="record-detail-hero">
        <div className="record-detail-top-nav">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ChevronLeft size={16} />
            ログ一覧
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => setIsEditRecordOpen(true)}
              title="レコードを編集"
              style={{ color: "#64748b" }}
            >
              <Edit3 size={18} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              onClick={handleDeleteRecord}
              title="レコードを削除"
              style={{ color: "#94a3b8" }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <h1 className="record-detail-title">{record.title}</h1>
        {record.description && (
          <p className="record-detail-desc">{record.description}</p>
        )}

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">経過日数</div>
            <div className="stat-value highlight" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Calendar size={13} />
              DAY {stats.currentDay}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">投稿数</div>
            <div className="stat-value" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <FileText size={13} />
              {stats.postCount}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={handleCreatePostForThisRecord}
        >
          <Plus size={18} />
          このレコードに記録する
        </button>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "#1e293b", paddingLeft: 4 }}>
        活動タイムライン ({posts.length})
      </h2>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📸</div>
          <p className="empty-state-title">まだ投稿がありません</p>
          <p className="empty-state-desc">「このレコードに記録する」から日々の進捗を投稿しましょう！</p>
        </div>
      ) : (
        <div className="timeline-feed">
          {posts.map((post) => (
            <TimelinePostCard key={post.id} post={post} showRecordTag={false} />
          ))}
        </div>
      )}

      <EditRecordModal
        record={record}
        isOpen={isEditRecordOpen}
        onClose={() => setIsEditRecordOpen(false)}
      />
    </div>
  );
};
export default RecordDetailPage;
