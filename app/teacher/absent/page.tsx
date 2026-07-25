import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClassAttendance, type ClassAttendanceRecord } from "@/lib/attendance-api";
import { type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { useClasses } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { UserX, RefreshCw, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<string, { labelKey: string; color: string; bg: string }> = {
  ABSENT:  { labelKey: "absentLower",  color: "text-red-600",   bg: "bg-red-50" },
  LATE:    { labelKey: "lateLower",    color: "text-amber-700", bg: "bg-amber-50" },
  EXCUSED: { labelKey: "excusedLower", color: "text-blue-700",  bg: "bg-blue-50" },
};

export default function TeacherAbsentPage() {
  const { lang } = useLanguageStore();
  const { user, accessToken } = useAuthStore();

  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [records, setRecords]           = useState<ClassAttendanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const today = todayISO();

  // Load teacher's classes using cached query hook
  const { data: classesData } = useClasses({ clientId: user?.clientId ?? "", token: accessToken ?? "" });
  const classes = classesData ?? [];

  // Set default class once loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  const loadAttendance = useCallback(async (cls: ClassRecord, signal?: AbortSignal) => {
    if (!user?.clientId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getClassAttendance(user.clientId, accessToken, {
        date: today,
        classId: cls.id,
        ...(user.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
      }, signal);
      setRecords(res.records);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.clientId, user?.defaultAcademicYearId, accessToken, today]);

  useEffect(() => {
    const ac = new AbortController();
    if (selectedClass) loadAttendance(selectedClass, ac.signal);
    return () => ac.abort();
  }, [selectedClass, loadAttendance]);

  // Non-present = absent + late + excused
  const nonPresent = records.filter((r) => r.status !== "PRESENT");

  return (
    <DashboardLayout>
      <PageHeader
        title={t("teacherPages", "absentToday", lang)}
        subtitle={fmtDate(today)}
        icon={UserX}
        back
        backHref="/teacher"
      />

      {/* Class selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all",
              selectedClass?.id === cls.id
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {/* Summary + notify */}
      {!loading && !error && nonPresent.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            <span className="text-red-600 font-bold text-lg">{nonPresent.length}</span>
            {" "}{t("teacherPages", "totalAbsent", lang)}
          </p>
          <button className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl">
            <Bell className="w-3.5 h-3.5" /> {t("teacherPages", "notifyParents", lang)}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-4 text-sm text-red-600 bg-red-50">{error}</div>
        ) : nonPresent.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-400 text-center">
            {t("teacherPages", "allPresentIn", lang)} {selectedClass?.name ?? ""}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {nonPresent.map((r) => {
              const meta = STATUS_LABEL[r.status] ?? STATUS_LABEL.ABSENT;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0", meta.bg, meta.color)}>
                    {r.student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.student.name}</p>
                    <p className="text-xs text-gray-400">
                      {r.student.adno}{r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", meta.bg, meta.color)}>
                    {t("adminPages", meta.labelKey as any, lang)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && (
        <button
          onClick={() => selectedClass && loadAttendance(selectedClass)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> {t("teacherPages", "refreshBtn", lang)}
        </button>
      )}
    </DashboardLayout>
  );
}
