import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function RequireAdmin({ children }: Props) {
  const isAdmin = localStorage.getItem("admin") === "true"; 

  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" replace />;
}
