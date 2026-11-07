import React, { useState } from "react";
import { X, Camera, Loader2, Check } from "lucide-react";
import { useData } from "@/context/DataContext";
import { uploadImageFile } from "@/lib/storage";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, isCloudConnected } = useData();
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadImageFile(file, "avatars");
        setAvatarUrl(url);
      } catch (error) {
        alert(`画像をアップロードできませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateProfile({
      name: name.trim(),
      avatarUrl,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">プロフィール設定</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {isCloudConnected && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>☁️ Supabase クラウド同期中</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 72, height: 72 }}>
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #5978BE",
                  }}
                />
                <label
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    background: "#5978BE",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isUploading ? "wait" : "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                  title="写真を変更"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={isUploading}
                    onChange={handleAvatarFileChange}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {PRESET_AVATARS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: avatarUrl === url ? "2px solid #5978BE" : "1px solid #e2e8f0",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <img src={url} alt="プリセット" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">表示名 *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: guest user"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim() || isUploading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {savedSuccess ? (
                <>
                  <Check size={16} /> 保存完了
                </>
              ) : isUploading ? (
                "アップロード中..."
              ) : (
                "保存する"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
