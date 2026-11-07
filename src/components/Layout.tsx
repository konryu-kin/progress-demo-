import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNavigation } from "./BottomNavigation";
import { CreatePostModal } from "@/features/posts/components/CreatePostModal";

export const Layout: React.FC = () => {
  return (
    <div className="app-container graph-paper-bg">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
      <CreatePostModal />
    </div>
  );
};
export default Layout;
