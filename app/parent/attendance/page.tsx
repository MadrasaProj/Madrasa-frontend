import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import {
  getStudentAttendance,
  type StudentAttendanceResponse,
  type AttendanceStatus,
} from "@/lib/attendance-api";

const STATUS_MAP: Record<AttendanceStatus, "present" | "absent"> = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "absent",
  EXCUSED: "present",
};

export default function ParentAttendancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();

  const effectiveId = activeStudentId ?? (user?.accessibleStudentIds?.[0] ?? "");
  const activeStudent = user?.accessibleStudents?.find((s) => s.id === effectiveId);
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveId || !accessToken || !user?.clientId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getStudentAttendance(user.clientId, accessToken, effectiveId, undefined, controller.signal)
      .then((res) => {
        setData(res);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [effectiveId, accessToken, user?.clientId]);

  const presentCount = data?.summary?.PRESENT ?? 0;
  const absentCount = (data?.summary?.ABSENT ?? 0) + (data?.summary?.LATE ?? 0);
  const total = data?.total ?? 0;
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  if (!user?.clientId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} back />
        <p className="text-center text-gray-400 py-10">Session expired. Please log in again.</p>
      </DashboardLayout>
    );
  }

  if (!effectiveId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} back />
        <p className="text-center text-gray-400 py-10">No students linked to your account.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "attendanceTitle", lang)}
        subtitle={activeStudent ? `${activeStudent.name}${activeStudent.className ? ` · ${activeStudent.className}` : ""}` : undefined}
        back
      />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
              <p className="text-xs text-gray-500 mt-1">{t("parentPages", "presentDays", lang)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-gray-500 mt-1">{t("parentPages", "absentDays", lang)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-blue-600">{percentage}%</p>
              <p className="text-xs text-gray-500 mt-1">{t("nav", "attendance", lang)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">
                {t("parentPages", "overallAttendance", lang)}
              </span>
              <span className="text-emerald-600 font-bold">{percentage}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>

          {/* Day records */}
          <div className="space-y-3">
            {data.records.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {new Date(rec.date).toLocaleDateString(
                      lang === "ml" ? "ml-IN" : "en-US",
                      { weekday: "long", month: "long", day: "numeric" },
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {rec.date.slice(0, 10)}
                    {rec.class && ` · ${rec.class.name}`}
                    {rec.notes && ` · ${rec.notes}`}
                  </p>
                </div>
                <StatusBadge
                  status={STATUS_MAP[rec.status] ?? "absent"}
                  size="sm"
                />
              </motion.div>
            ))}

            {data.records.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">
                No attendance records found.
              </p>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
