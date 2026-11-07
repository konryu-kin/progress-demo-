import React, { useState } from "react";
import { X } from "lucide-react";
import { useData } from "@/context/DataContext";

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (recordId: string) => void;
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

export const CreateRecordModal: React.FC<CreateRecordModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { addRecord } = useData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0].url);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newRecord = await addRecord({
      title: title.trim(),
      description: description.trim(),
      coverImageUrl: selectedCover,
    });

    setTitle("");
    setDescription("");
    onClose();
    if (onCreated) {
      onCreated(newRecord.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">新しいレコードを始める</h2>
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
                placeholder="例: 現コミュ 課題、筋トレ習慣、イラスト練習"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">説明・目標（任意）</label>
              <textarea
                className="form-textarea"
                placeholder="このレコードで取り組むことや意気込みを入力"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">カバー画像</label>
              <div className="image-presets-selector">
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    className={`image-preset-btn ${selectedCover === preset.url ? "selected" : ""}`}
                    onClick={() => setSelectedCover(preset.url)}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              作成する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

