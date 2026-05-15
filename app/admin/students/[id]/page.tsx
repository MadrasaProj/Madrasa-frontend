import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStudent, type StudentRecord } from "@/lib/students-api";
import { getStudentAttendance, type StudentAttendanceResponse } from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import { User, Phone, Calendar, Loader2, GraduationCap, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      "bg-emerald-100 text-emerald-700",
  INACTIVE:    "bg-gray-100 text-gray-600",
  GRADUATED:   "bg-blue-100 text-blue-700",
  TRANSFERRED: "bg-amber-100 text-amber-700",
  DROPPED_OUT: "bg-red-100 text-red-600",
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken, activeClientId } = useAuthStore();

  const [student, setStudent]       = useState<StudentRecord | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceResponse | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingAtt, setLoadingAtt]         = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    if (!activeClientId || !accessToken) return;
    const ac = new AbortController();

    Promise.all([
      getStudent(activeClientId, accessToken, id, ac.signal)
        .then(setStudent)
        .finally(() => setLoadingStudent(false)),
      getStudentAttendance(activeClientId, accessToken, id,
        { ...(user.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}), take: 365 },
        ac.signal)
        .then(setAttendance)
        .finally(() => setLoadingAtt(false)),
    ]).catch((err) => setError((err as Error).message));

    return () => ac.abort();
  }, [activeClientId, user?.defaultAcademicYearId, accessToken, id]);

  if (loadingStudent) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Profile" back />
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      </DashboardLayout>
    );
  }

  if (!student || error) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Not Found" back />
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">{error ?? "Student not found"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-semibold text-sm underline">
            Go back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Attendance stats
  const attTotal   = attendance?.total ?? 0;
  const attPresent = attendance?.summary?.PRESENT ?? 0;
  const attAbsent  = attendance?.summary?.ABSENT ?? 0;
  const attLate    = attendance?.summary?.LATE ?? 0;
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  return (
    <DashboardLayout>
      <PageHeader title="Student Profile" back backHref="/admin/students" />

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-gray-100 mb-5"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0",
            student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-emerald-100 text-emerald-700"
          )}>
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{student.name}</h2>
            <p className="text-sm text-gray-500">{student.adno}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {student.class && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                  {student.class.name}
                </span>
              )}
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg",
                student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700")}>
                {student.gender === "FEMALE" ? "♀ Girl" : "♂ Boy"}
              </span>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg",
                STATUS_COLORS[student.status] ?? STATUS_COLORS.ACTIVE)}>
                {student.status}
              </span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Hash,         label: "Admission No",   value: student.adno },
            { icon: GraduationCap,label: "Class",           value: student.class?.name ?? "—" },
            ...(student.dateOfBirth ? [{ icon: Calendar, label: "Date of Birth", value: new Date(student.dateOfBirth).toLocaleDateString("en-GB") }] : []),
            ...(student.guardianName ? [{ icon: User, label: "Guardian", value: `${student.guardianName} (${student.relationToStudent ?? "guardian"})` }] : []),
            ...(student.parentPhone ? [{ icon: Phone, label: "Parent Phone", value: student.parentPhone }] : []),
            ...(student.accademicYear ? [{ icon: Calendar, label: "Academic Year", value: student.accademicYear.name }] : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 flex gap-2.5 items-start">
              <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{String(value)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attendance summary */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4"
      >
        <SectionHeader title="Attendance" />
        {loadingAtt ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Present", val: attPresent, color: "text-emerald-700" },
                { label: "Absent",  val: attAbsent,  color: "text-red-600"   },
                { label: "Late",    val: attLate,    color: "text-amber-700" },
                { label: "Total",   val: attTotal,   color: "text-gray-800"  },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className={cn("text-xl font-bold", color)}>{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", attPct >= 75 ? "bg-emerald-500" : "bg-red-400")}
                  style={{ width: `${attPct}%` }} />
              </div>
              <span className={cn("text-sm font-bold", attPct >= 75 ? "text-emerald-700" : "text-red-600")}>
                {attPct}%
              </span>
            </div>
            {attPct < 75 && (
              <p className="text-xs text-red-500 mt-2">⚠ Below 75% attendance threshold</p>
            )}
          </>
        )}
      </motion.div>

      {/* Fees placeholder */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4 opacity-60"
      >
        <SectionHeader title="Fees" />
        <p className="text-sm text-gray-400 py-2">Fee integration coming soon (Module 3)</p>
      </motion.div>

      {/* Results placeholder */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60"
      >
        <SectionHeader title="Exam Results" />
        <p className="text-sm text-gray-400 py-2">Results integration coming soon (Module 5)</p>
      </motion.div>
    </DashboardLayout>
  );
}
