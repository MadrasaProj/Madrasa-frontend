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
import { UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default function TeacherPresentPage() {
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

  // Load attendance when class changes
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

  const present = records.filter((r) => r.status === "PRESENT");

  return (
    <DashboardLayout>
      <PageHeader
        title={t("teacherPages", "presentToday", lang)}
        subtitle={fmtDate(today)}
        icon={UserCheck}
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
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>

      {/* Summary badge */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            <span className="text-emerald-700 font-bold text-lg">{present.length}</span>
            {" "}{t("teacherPages", "totalPresent", lang)}
          </p>
          <button
            onClick={() => selectedClass && loadAttendance(selectedClass)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-3 h-3" /> {t("teacherPages", "refreshBtn", lang)}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
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
        ) : present.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-400 text-center">
            {t("teacherPages", "noPresent", lang)} {selectedClass?.name ?? ""}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {present.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{r.student.name}</p>
                  <p className="text-xs text-gray-400">{r.student.adno}</p>
                </div>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                  ✓ {t("common", "present", lang)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
