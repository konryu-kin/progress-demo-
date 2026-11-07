import React from "react";
import { X } from "lucide-react";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        cursor: "zoom-out",
        zIndex: 200,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          color: "#ffffff",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        aria-label="閉じる"
      >
        <X size={24} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <img
          src={imageUrl}
          alt="プレビュー拡大画像"
          style={{
            maxWidth: "100%",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: "12px",
          }}
        />
      </div>
    </div>
  );
};

