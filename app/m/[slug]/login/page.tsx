import { Navigate, useParams } from "react-router-dom";

export default function LegacyTenantLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/m/${slug}/admin/login`} replace />;
}
