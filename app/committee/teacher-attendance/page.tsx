import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeacherAttendanceContent } from "@/components/shared/TeacherAttendanceContent";
import { useClientConfig } from "@/lib/api-hooks";
import { useAuthStore } from "@/store/auth";
import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CommitteeTeacherAttendancePage() {
  const navigate = useNavigate();
  const { data: config, isLoading: loading } = useClientConfig();
  const allowed = !config || config.showCommitteeTeacherCheckin !== false;

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
