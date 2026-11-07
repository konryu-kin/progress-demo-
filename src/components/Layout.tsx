import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-layout">
      <header>
        <h1>Progress</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

