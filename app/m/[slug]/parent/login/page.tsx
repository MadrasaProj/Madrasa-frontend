import { useParams } from "react-router-dom";
import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default function TenantParentLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  return <RoleLoginPage type="PARENT" tenantSlug={slug} />;
}
