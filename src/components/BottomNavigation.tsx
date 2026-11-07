import React from "react";
import { NavLink } from "react-router-dom";
import { Layers, Camera, Film } from "lucide-react";
import { useData } from "@/context/DataContext";

export const BottomNavigation: React.FC = () => {
  const { setIsCreatePostOpen, setSelectedRecordIdForPost } = useData();

  const handleOpenCreatePost = () => {
    setSelectedRecordIdForPost(null);
    setIsCreatePostOpen(true);
  };

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) => `nav-tab-item ${isActive ? "active" : ""}`}
        end
      >
        <Layers size={22} strokeWidth={2} />
        <span>自分のログ</span>
      </NavLink>

      <div className="nav-record-btn-wrapper">
        <button
          className="nav-record-btn"
          onClick={handleOpenCreatePost}
          title="記録する"
          aria-label="記録する"
        >
          <Camera size={22} strokeWidth={2.4} />
          <span>記録する</span>
        </button>
      </div>

      <NavLink
        to="/timeline"
        className={({ isActive }) => `nav-tab-item ${isActive ? "active" : ""}`}
      >
        <Film size={22} strokeWidth={2} />
        <span>タイムライン</span>
      </NavLink>
    </nav>
  );
};

