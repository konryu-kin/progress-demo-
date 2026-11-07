import React from "react";
import { Plus } from "lucide-react";

interface NewRecordCardProps {
  onClick: () => void;
}

export const NewRecordCard: React.FC<NewRecordCardProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      className="new-record-card"
      onClick={onClick}
      title="新しく始める"
    >
      <div className="new-record-icon">
        <Plus size={36} strokeWidth={2.2} />
      </div>
      <span className="new-record-text">新しく始める</span>
    </button>
  );
};

