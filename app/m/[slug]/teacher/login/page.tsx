import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default async function TenantTeacherLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoleLoginPage type="TEACHER" tenantSlug={slug} />;
}
