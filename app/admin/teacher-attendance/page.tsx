import { TeacherAttendanceContent } from "@/components/shared/TeacherAttendanceContent";
import { useTenantPath } from "@/hooks/useTenantPath";

export default function AdminTeacherAttendancePage() {
  const tenantPath = useTenantPath();
  return <TeacherAttendanceContent backHref={tenantPath("/admin")} />;
}
