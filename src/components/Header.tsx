import React from "react";
import { Link } from "react-router-dom";

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <Link to="/" className="app-logo">
        <img src="/favicon.svg" alt="" className="app-logo-icon" />
        progress
      </Link>
    </header>
  );
};
