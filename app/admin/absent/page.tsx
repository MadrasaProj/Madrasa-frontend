import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getClassAttendance,
  type ClassAttendanceRecord,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UserX, Loader2, RefreshCw } from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ABSENT: { label: "Absent", color: "text-red-600", bg: "bg-red-50" },
  LATE: { label: "Late", color: "text-amber-700", bg: "bg-amber-50" },
  EXCUSED: { label: "Excused", color: "text-blue-700", bg: "bg-blue-50" },
};

export default function AdminAbsentPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();

  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();

  const load = async () => {
    if (!activeClientId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getClassAttendance(activeClientId, accessToken, {
        date: today,
        take: 500,
        ...(user?.defaultAcademicYearId
          ? { academicYearId: user.defaultAcademicYearId }
          : {}),
      });
      setRecords(res.records);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeClientId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const nonPresent = records.filter((r) => r.status !== "PRESENT");

  const byClass = nonPresent.reduce<Record<string, ClassAttendanceRecord[]>>(
    (acc, r) => {
      const name = r.class?.name ?? "Unknown";
      (acc[name] ??= []).push(r);
      return acc;
    },
    {},
  );

  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const excusedCount = records.filter((r) => r.status === "EXCUSED").length;

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "absentTitle", lang)}
        subtitle={fmtDate(today)}
        icon={UserX}
        back
        backHref="/admin"
      />

      {/* Summary pills */}
      {!loading && !error && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-xl">
            <span className="text-base font-bold">{absentCount}</span> Absent
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl">
            <span className="text-base font-bold">{lateCount}</span> Late
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl">
            <span className="text-base font-bold">{excusedCount}</span> Excused
          </div>
          <button
            onClick={load}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="px-4 py-4 text-sm text-red-600 bg-red-50 rounded-2xl">
          {error}
        </div>
      ) : nonPresent.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          🎉 All students present today
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byClass)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([className, students]) => (
              <div
                key={className}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <p className="font-bold text-gray-800 text-sm">{className}</p>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    {students.length} absent/late
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {students.map((r) => {
                    const meta = STATUS_STYLE[r.status] ?? STATUS_STYLE.ABSENT;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                            meta.bg,
                            meta.color,
                          )}
                        >
                          {r.student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {r.student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {r.student.adno}
                            {r.notes ? ` · ${r.notes}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-1 rounded-lg shrink-0",
                            meta.bg,
                            meta.color,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </DashboardLayout>
  );
}
