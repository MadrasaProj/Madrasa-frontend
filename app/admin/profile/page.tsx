import ProfilePage from "@/components/profile/ProfilePage";
import { adminProfileConfig, superAdminProfileConfig } from "@/components/profile/profileConfig";
import { useAuthStore } from "@/store/auth";

export default function AdminProfilePage() {
  const { user } = useAuthStore();
  const config = user?.actorType === "SUPER_ADMIN" ? superAdminProfileConfig : adminProfileConfig;
  return <ProfilePage config={config} />;
}
