import React, { useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { uploadImageFile } from "@/lib/storage";
import type { PostItem } from "@/types";

interface EditPostModalProps {
  post: PostItem;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
}) => {
  const { updatePost } = useData();
  const [content, setContent] = useState(post.content);
  const [imageUrl, setImageUrl] = useState(
    post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : ""
  );
  const [activityMinutes, setActivityMinutes] = useState(post.activityMinutes);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        setImageUrl(await uploadImageFile(file, "posts"));
      } catch (error) {
        alert(`画像をアップロードできませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
      } finally {
        setIsUploading(false);
        input.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      await updatePost(post.id, {
        content: content.trim(),
        activityMinutes,
        imageUrls: imageUrl ? [imageUrl] : [],
      });
      onClose();
    } catch (error) {
      alert(`投稿を保存できませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">投稿を編集</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">投稿内容 *</label>
              <textarea
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor={`edit-post-minutes-${post.id}`}>活動時間（分）</label>
              <input
                id={`edit-post-minutes-${post.id}`}
                type="number"
                className="form-input"
                min={0}
                max={1440}
                step={1}
                value={activityMinutes}
                onChange={(e) => setActivityMinutes(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">添付画像</label>
              {imageUrl && (
                <div style={{ position: "relative", width: 120, height: 120, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                  <img src={imageUrl} alt="プレビュー" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                    }}
                    title="画像を削除"
                  >
                    ×
                  </button>
                </div>
              )}
              <label className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                {isUploading ? "アップロード中..." : "端末から写真を選択"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={isUploading}
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={!content.trim() || isUploading || isSaving}>
              {isSaving ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
