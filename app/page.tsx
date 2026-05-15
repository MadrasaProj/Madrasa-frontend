import { Navigate } from "react-router-dom";

export default function RootPage() {
  return <Navigate to="/super-admin/login" replace />;
}
