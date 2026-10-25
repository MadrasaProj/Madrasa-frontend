import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function SuperAdminIbadahPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/madrasas", { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="p-10 text-center text-sm text-gray-500">
        Ibadah configuration is managed individually per madrasa under each madrasa's administration settings. Redirecting...
      </div>
    </DashboardLayout>
  );
}
