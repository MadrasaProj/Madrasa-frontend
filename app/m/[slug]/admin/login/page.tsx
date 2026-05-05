import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default async function TenantAdminLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoleLoginPage type="CLIENT_ADMIN" tenantSlug={slug} />;
}
