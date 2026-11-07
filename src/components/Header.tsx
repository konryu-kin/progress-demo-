import React from "react";
import { Link } from "react-router-dom";
import { Users, Heart } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <Link to="/" className="app-logo">
        progress
      </Link>
      <div className="header-actions">
        <button
          className="header-icon-btn"
          title="ユーザー"
          aria-label="ユーザー一覧"
          onClick={() => alert("MVP機能に含まれないため準備中です")}
        >
          <Users size={22} strokeWidth={2.2} />
        </button>
        <button
          className="header-icon-btn"
          title="いいね一覧"
          aria-label="いいね一覧"
          onClick={() => alert("MVP機能に含まれないため準備中です")}
        >
          <Heart size={22} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
};

