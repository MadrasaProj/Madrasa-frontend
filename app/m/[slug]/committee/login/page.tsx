import { useParams } from "react-router-dom";
import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default function TenantCommitteeLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  return <RoleLoginPage type="COMMITTEE" tenantSlug={slug} />;
}
