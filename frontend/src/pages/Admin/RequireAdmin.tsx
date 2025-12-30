import { Navigate } from "react-router-dom";
import * as api from "../../api/sjApi";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const token = api.getToken();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}
