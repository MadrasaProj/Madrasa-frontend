import { useParams } from "react-router-dom";
import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default function TenantAdminLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  return <RoleLoginPage type="CLIENT_ADMIN" tenantSlug={slug} />;
}
