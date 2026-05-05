import RoleLoginPage from "@/components/auth/RoleLoginPage";

export default async function TenantParentLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoleLoginPage type="PARENT" tenantSlug={slug} />;
}
