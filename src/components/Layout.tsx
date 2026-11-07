import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNavigation } from "./BottomNavigation";
import { CreatePostModal } from "@/features/posts/components/CreatePostModal";
import { useData } from "@/context/DataContext";

export const Layout: React.FC = () => {
  const { dataError } = useData();
  return (
    <div className="app-container graph-paper-bg">
      <Header />
      {dataError && (
        <div className="data-error-banner" role="alert">
          {dataError}
        </div>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
      <CreatePostModal />
    </div>
  );
};
export default Layout;
