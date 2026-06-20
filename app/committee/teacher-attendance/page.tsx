import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeacherAttendanceContent } from "@/components/shared/TeacherAttendanceContent";
import { getClientConfig } from "@/lib/config-api";
import { useAuthStore } from "@/store/auth";
import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CommitteeTeacherAttendancePage() {
  const { accessToken, activeClientId } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (!activeClientId || !accessToken) { setLoading(false); return; }
    getClientConfig(activeClientId, accessToken)
      .then((cfg) => { if (cfg.showCommitteeTeacherCheckin === false) setAllowed(false); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeClientId, accessToken]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-12 w-60 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout>
        <PageHeader title="Access Restricted" icon={ShieldOff} back backHref="/committee" />
        <div className="py-16 text-center px-4">
          <ShieldOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">This section is not available</p>
          <p className="text-xs text-gray-400 mt-1">Contact admin to enable access</p>
          <button onClick={() => navigate("/committee")}
            className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return <TeacherAttendanceContent backHref="/committee" />;
}
