import React, { useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { uploadImageFile } from "@/lib/storage";
import { toLocalDateString } from "@/lib/utils";
import type { RecordItem } from "@/types";

interface EditRecordModalProps {
  record: RecordItem;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COVERS = [
  {
    label: "ノート・学習",
    url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "開発・プログラミング",
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "運動・ランニング",
    url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "読書・本",
    url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
  },
];

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const { updateRecord } = useData();
  const [title, setTitle] = useState(record.title);
  const [description, setDescription] = useState(record.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(record.coverImageUrl || PRESET_COVERS[0].url);
  const [startedAt, setStartedAt] = useState(record.startedAt);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadImageFile(file, "records");
        setCoverImageUrl(url);
      } catch (error) {
        alert(`画像をアップロードできませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSaving(true);
      await updateRecord(record.id, {
        title: title.trim(),
        description: description.trim(),
        coverImageUrl,
        startedAt,
      });
      onClose();
    } catch (error) {
      alert(`レコードを保存できませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">レコードを編集</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">タイトル *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">説明・目標</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">開始日 *</label>
              <input
                type="date"
                className="form-input"
                value={startedAt}
                max={toLocalDateString()}
                onChange={(e) => setStartedAt(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">カバー画像</label>
              <div className="image-presets-selector">
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    className={`image-preset-btn ${coverImageUrl === preset.url ? "selected" : ""}`}
                    onClick={() => setCoverImageUrl(preset.url)}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} />
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
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
                  {isUploading ? "アップロード中..." : "端末から画像を選択"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={isUploading}
                    onChange={handleImageFileChange}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!title.trim() || isUploading || isSaving}
            >
              {isUploading || isSaving ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
