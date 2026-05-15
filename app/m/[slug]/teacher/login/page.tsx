import { useParams } from "react-router-dom";
import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default function TenantTeacherLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  return <RoleLoginPage type="TEACHER" tenantSlug={slug} />;
}
