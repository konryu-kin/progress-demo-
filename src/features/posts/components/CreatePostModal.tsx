import React, { useState, useEffect } from "react";
import { X, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { uploadImageFile } from "@/lib/storage";

const SAMPLE_POST_IMAGES = [
  {
    label: "ノート",
    url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "PC作業",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "デスク",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "本・読書",
    url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
  },
];

export const CreatePostModal: React.FC = () => {
  const {
    records,
    isCreatePostOpen,
    setIsCreatePostOpen,
    selectedRecordIdForPost,
    addPost,
  } = useData();

  const [recordId, setRecordId] = useState("");
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string>(SAMPLE_POST_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [useNoImage, setUseNoImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isCreatePostOpen) {
      if (selectedRecordIdForPost) {
        setRecordId(selectedRecordIdForPost);
      } else if (records.length > 0 && !recordId) {
        setRecordId(records[0].id);
      }
    }
  }, [isCreatePostOpen, selectedRecordIdForPost, records, recordId]);

  if (!isCreatePostOpen) return null;

  const handleClose = () => {
    setIsCreatePostOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadImageFile(file, "posts");
        setCustomImageUrl(url);
        setUseNoImage(false);
      } catch (err) {
        alert("画像のアップロードに失敗しました");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId) {
      alert("レコードを選択してください");
      return;
    }
    if (!content.trim()) {
      alert("投稿内容を入力してください");
      return;
    }

    const finalImage = useNoImage
      ? []
      : customImageUrl.trim()
      ? [customImageUrl.trim()]
      : selectedImage
      ? [selectedImage]
      : [];

    await addPost({
      recordId,
      content: content.trim(),
      activityMinutes: 0,
      imageUrls: finalImage,
    });

    setContent("");
    setCustomImageUrl("");
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">今日の活動を記録する</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">対象のレコード *</label>
              <select
                className="form-select"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                required
              >
                {records.length === 0 ? (
                  <option value="">レコードがありません</option>
                ) : (
                  records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">投稿内容 *</label>
              <textarea
                className="form-textarea"
                placeholder="進捗や気付きをひとこと（例: レポート第2章完了！、今日は30分集中できた）"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <ImageIcon size={15} />
                  添付写真
                </label>
                <label style={{ fontSize: "12px", color: "#64748b", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={useNoImage}
                    onChange={(e) => setUseNoImage(e.target.checked)}
                    style={{ marginRight: 4 }}
                  />
                  写真なし
                </label>
              </div>

              {!useNoImage && (
                <>
                  {customImageUrl && (
                    <div style={{ position: "relative", width: 100, height: 100, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                      <img src={customImageUrl} alt="アップロード画像" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setCustomImageUrl("")}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          cursor: "pointer",
                        }}
                        title="画像を解除"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <label
                      className="btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: isUploading ? "wait" : "pointer",
                        fontSize: 13,
                        opacity: isUploading ? 0.7 : 1,
                      }}
                    >
                      {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                      {isUploading ? "アップロード中..." : "写真・画像を添付"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={isUploading}
                        onChange={handleFileUpload}
                      />
                    </label>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>またはプリセットから選択:</span>
                  </div>

                  {!customImageUrl && (
                    <div className="image-presets-selector">
                      {SAMPLE_POST_IMAGES.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          className={`image-preset-btn ${
                            selectedImage === preset.url ? "selected" : ""
                          }`}
                          onClick={() => {
                            setSelectedImage(preset.url);
                          }}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!content.trim() || !recordId || isUploading}
            >
              {isUploading ? "処理中..." : "記録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
