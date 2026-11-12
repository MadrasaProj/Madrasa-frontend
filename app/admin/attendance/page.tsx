import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, MoreVertical, School, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ScrollableRangeNavigator } from "@/components/ScrollableRangeNavigator";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { AttendanceImportModal } from "@/components/attendance/AttendanceImportModal";
import { AttendanceSemiCircle, StudentAttendanceRadial } from "@/components/attendance/AttendanceSummaryCharts";
import { AttendanceEditorContent, type ActiveStatus } from "@/components/teacher/AttendanceEditorContent";
import { StudentAttendanceDrawer } from "@/components/teacher/StudentAttendanceDrawer";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bulkDeleteAttendance, bulkUpsertAttendance, getClassAttendance, type AttendanceStatus, type ClassAttendanceRecord } from "@/lib/attendance-api";
import { downloadDailyAttendanceReport } from "@/lib/attendance-report";
import { t } from "@/lib/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { useClassAttendanceSummary, useClasses } from "@/lib/queries";
import type { ClassAttendanceSummary } from "@/lib/reports-api";
import { getStudents } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface LocalRecord {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  lateComing: boolean;
  lateComingTime: string;
  dirty: boolean;
}

export default function AdminAttendancePage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const queryClient = useQueryClient();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [editorOpen, setEditorOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportChoicesOpen, setReportChoicesOpen] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [students, setStudents] = useState<{
    id: string;
    name: string;
    adno: string;
    gender?: string;
    photoUrl?: string | null;
  }[]>([]);
  const [records, setRecords] = useState<Map<string, LocalRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    classId: string;
    student: ClassAttendanceSummary["students"][number];
  } | null>(null);
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState({ from: "ALL", to: "ALL" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dailyRecords, setDailyRecords] = useState<ClassAttendanceRecord[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailyRefresh, setDailyRefresh] = useState(0);
  const [rangeRecords, setRangeRecords] = useState<ClassAttendanceRecord[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
  }, []);

  const classesQuery = useClasses({ clientId: cid, token });
  const classes = classesQuery.data ?? [];
  const activeClass = classes.find((cls) => cls.id === selectedClassId) ?? classes[0] ?? null;
  const activeClassId = activeClass?.id ?? "";
  const summaryRange = range.from === "ALL" ? {} : range;
  const overallAttendance = useClassAttendanceSummary(
    { clientId: cid, token },
    activeClassId,
    { refetchOnMount: "always" },
  );
  const overall = overallAttendance.data;
  const rangeTotals = useMemo(() => {
    const byStatus = new Map<string, number>();
    const days = new Set<string>();
    for (const record of rangeRecords) {
      byStatus.set(record.status, (byStatus.get(record.status) ?? 0) + 1);
      days.add(record.date.slice(0, 10));
    }
    const total = rangeRecords.length;
    const present = byStatus.get("PRESENT") ?? 0;
    const absent = byStatus.get("ABSENT") ?? 0;
    return { total, present, absent, other: total - present - absent, totalDays: days.size, rate: total ? Math.round((present / total) * 100) : 0 };
  }, [rangeRecords]);

  useEffect(() => {
    if (!cid || !token || !activeClassId) {
      setRangeRecords([]);
      return;
    }
    const controller = new AbortController();
    setRangeLoading(true);
    setRangeError(null);
    getClassAttendance(cid, token, {
      ...summaryRange,
      classId: activeClassId,
      ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
      take: 1000,
    }, controller.signal).then((result) => {
      if (!controller.signal.aborted) setRangeRecords(result.records);
    }).catch((cause) => {
      if (!controller.signal.aborted) setRangeError((cause as Error).message);
    }).finally(() => {
      if (!controller.signal.aborted) setRangeLoading(false);
    });
    return () => controller.abort();
  }, [cid, token, activeClassId, summaryRange, user?.defaultAcademicYearId, dailyRefresh]);
  useEffect(() => {
    if (!cid || !token || !activeClassId || activeTab !== "daily") {
      setDailyRecords([]);
      return;
    }
    const controller = new AbortController();
    setDailyLoading(true);
    setDailyError(null);
    getClassAttendance(cid, token, {
      date,
      classId: activeClassId,
      ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
      take: 1000,
    }, controller.signal).then((result) => {
      if (!controller.signal.aborted) setDailyRecords(result.records);
    }).catch((cause) => {
      if (!controller.signal.aborted) setDailyError((cause as Error).message);
    }).finally(() => {
      if (!controller.signal.aborted) setDailyLoading(false);
    });
    return () => controller.abort();
  }, [cid, token, activeClassId, date, activeTab, user?.defaultAcademicYearId, dailyRefresh]);

  const attendanceStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT": return t("common", "present", lang);
      case "ABSENT": return t("common", "absent", lang);
      case "LEAVE": return t("teacherPages", "attendanceStatusLeave", lang);
      case "SICK": return t("teacherPages", "attendanceStatusSick", lang);
      case "LATE": return t("teacherPages", "attendanceStatusLate", lang);
      case "EXCUSED": return t("teacherPages", "attendanceStatusExcused", lang);
    }
  };

  const loadAttendance = useCallback(async (classId: string, dateStr: string, signal?: AbortSignal) => {
    if (!cid || !token || !classId) return;
    setLoading(true);
    setError(null);
    setStudents([]);
    setRecords(new Map());
    try {
      const [attendanceRes, studentsRes] = await Promise.all([
        getClassAttendance(cid, token, {
          date: dateStr,
          classId,
          ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
          take: 500,
        }, signal),
        getStudents(cid, token, { classId, status: "ACTIVE", limit: 500, signal }),
      ]);
      if (signal?.aborted) return;
      const next = new Map<string, LocalRecord>();
      for (const student of studentsRes.data) {
        next.set(student.id, {
          status: null,
          notes: "",
          lateComing: false,
          lateComingTime: "",
          dirty: false,
        });
      }
      for (const record of attendanceRes.records) {
        next.set(record.student.id, {
          attendanceId: record.id,
          status: record.status,
          notes: record.notes ?? "",
          lateComing: record.lateComing ?? false,
          lateComingTime: record.lateComingTime ?? "",
          dirty: false,
        });
      }
      setStudents(studentsRes.data.map((student) => ({
        id: student.id,
        name: student.name,
        adno: student.adno,
        gender: student.gender ?? undefined,
        photoUrl: student.photoUrl ?? student.photo,
      })));
      setRecords(next);
    } catch (cause) {
      if (signal?.aborted || (cause as Error).name === "AbortError") return;
      setError((cause as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    const controller = new AbortController();
    setSaveError(null);
    setSaveSuccess(false);
    setConfirmClear(false);
    if (activeClassId) void loadAttendance(activeClassId, date, controller.signal);
    else {
      setLoading(false);
      setStudents([]);
      setRecords(new Map());
    }
    return () => controller.abort();
  }, [activeClassId, date, loadAttendance]);

  const setStatus = (studentId: string, status: ActiveStatus) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const current = next.get(studentId);
      if (!current) return previous;
      next.set(studentId, {
        ...current,
        status,
        notes: status === "PRESENT" ? "" : current.notes,
        lateComing: status === "PRESENT" ? current.lateComing : false,
        lateComingTime: status === "PRESENT" ? current.lateComingTime : "",
        dirty: true,
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const current = next.get(studentId);
      if (current) next.set(studentId, { ...current, notes, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const setLateComing = (studentId: string, lateComing: boolean, lateComingTime?: string) => {
    setRecords((previous) => {
      const next = new Map(previous);
      const current = next.get(studentId);
      if (current) next.set(studentId, {
        ...current,
        lateComing,
        lateComingTime: lateComing ? (lateComingTime ?? current.lateComingTime) : "",
        dirty: true,
      });
      return next;
    });
    setSaveSuccess(false);
  };

  const markAll = (status: ActiveStatus) => {
    setRecords((previous) => {
      const next = new Map(previous);
      for (const [studentId, record] of next) {
        next.set(studentId, {
          ...record,
          status,
          notes: status === "PRESENT" ? "" : record.notes,
          lateComing: false,
          lateComingTime: "",
          dirty: true,
        });
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const hasDirty = useMemo(() => [...records.values()].some((record) => record.dirty), [records]);
  const hasExisting = useMemo(() => [...records.values()].some((record) => !!record.attendanceId), [records]);
  const summary = useMemo(() => {
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LEAVE: 0, SICK: 0, UNMARKED: 0 };
    for (const record of records.values()) {
      if (record.status && counts[record.status] !== undefined) counts[record.status]++;
      else counts.UNMARKED++;
    }
    return counts;
  }, [records]);
  const pct = records.size > 0 ? Math.round((summary.PRESENT / records.size) * 100) : 0;

  const invalidateAttendance = useCallback(async (classId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.attendanceSummary(cid) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.classAttendanceSummary(cid, classId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    ]);
  }, [cid, queryClient]);

  const clearAll = async () => {
    if (!activeClassId || !cid || !token) return;
    setSaving(true);
    setSaveError(null);
    try {
      await bulkDeleteAttendance(cid, token, { date, classId: activeClassId });
      toast.success("Attendance cleared successfully");
      await Promise.all([loadAttendance(activeClassId, date), invalidateAttendance(activeClassId)]);
    } catch (cause) {
      const message = (cause as Error).message || "Failed to clear attendance";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
      setConfirmClear(false);
    }
  };

  const saveAll = async () => {
    if (!activeClassId || !cid || !token) return;
    const entries = [...records.entries()].filter(([, record]) => record.status !== null).map(([studentId, record]) => ({
      studentId,
      status: record.status as AttendanceStatus,
      notes: record.notes,
      lateComing: record.status === "PRESENT" && record.lateComing,
      lateComingTime: record.status === "PRESENT" && record.lateComing ? record.lateComingTime || null : null,
    }));
    if (entries.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await bulkUpsertAttendance(cid, token, {
        classId: activeClassId,
        date,
        ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
        records: entries,
      });
      setSaveSuccess(true);
      toast.success("Attendance saved successfully");
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      await Promise.all([loadAttendance(activeClassId, date), invalidateAttendance(activeClassId)]);
    } catch (cause) {
      const message = (cause as Error).message || "Failed to save attendance";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = async (scope: "collective" | "class") => {
    if (!cid || !token || !activeClass) return;
    setReportOpen(false);
    setDownloadingReport(true);
    try {
      await downloadDailyAttendanceReport({
        clientId: cid,
        token,
        date,
        classes: scope === "collective" ? classes : [activeClass],
        academicYearId: user?.defaultAcademicYearId,
        scope,
      });
      toast.success("Attendance report downloaded");
    } catch (cause) {
      toast.error((cause as Error).message || "Failed to download attendance report");
    } finally {
      setDownloadingReport(false);
    }
  };

  const classSelector = (iconOnly: boolean) => (
    <DrawerSelector
      title="Select class"
      value={activeClassId}
      onChange={setSelectedClassId}
      options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
      placeholder={classesQuery.isLoading ? "Loading classes…" : "No classes found"}
      disabled={saving || classesQuery.isLoading}
      triggerIcon={iconOnly ? <School className="size-5" /> : undefined}
      className={iconOnly ? "h-14 w-12" : "h-11 min-w-40 max-w-64"}
    />
  );

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" className="hidden gap-2 rounded-full sm:inline-flex" onClick={() => setEditorOpen(true)}>
        <UserCheck aria-hidden="true" className="size-4" />
        {t("teacherPages", "markAttendanceDesc", lang)}
      </Button>
      <ResponsivePopover open={reportOpen} onOpenChange={setReportOpen} title="Attendance options" compact>
        <div className="space-y-1 p-2">
          <Button type="button" variant="ghost" className="w-full justify-start shadow-none" disabled={!activeClassId || downloadingReport} onClick={() => {  setReportChoicesOpen(true); }}>
            {downloadingReport ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4 " />}
            {downloadingReport ? "Preparing report…" : "Download report"}
          </Button>
          <Button type="button" variant="ghost" className="w-full justify-start shadow-none" onClick={() => { setReportOpen(false); setShowImport(true); }}>
            <FileSpreadsheet className="size-4 " /> Import previous month
          </Button>
        </div>
      </ResponsivePopover>
      <ResponsivePopover open={reportChoicesOpen} onOpenChange={setReportChoicesOpen} title="Download daily report" compact>
        <div className="space-y-2 px-4 pb-5 pt-1">
          <p className="mb-3 text-sm text-gray-600">
            {new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}Saved attendance
          </p>
          <Button type="button" variant="outline" className="w-full justify-start shadow-none" onClick={() => { void downloadReport("collective"); setReportChoicesOpen(false); }}>
            <Download className="size-4" /> All classes
          </Button>
          <Button type="button" variant="outline" className="w-full justify-start shadow-none" onClick={() => { void downloadReport("class"); setReportChoicesOpen(false); }}>
            <Download className="size-4" /> {activeClass?.name ?? "Selected class"}
          </Button>
        </div>
      </ResponsivePopover>
      <Button type="button" variant="outline" size="icon" aria-label="Attendance options" className="hidden rounded-full sm:inline-flex" onClick={() => setReportOpen(true)}>
        <MoreVertical className="size-5" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <PageHeader title="Attendance" showActionOnMobile action={pageActions} switcher={
        <ClassPicker
          title="Select class"
          options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
          value={activeClassId}
          onChange={setSelectedClassId}
          placeholder={classesQuery.isLoading ? "Loading classes…" : "No classes found"}
          disabled={saving || classesQuery.isLoading}
        />
      } />

      <div className="px-4! pt-4! pb-28! lg:pb-24!">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-max grid grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
        <div className="mb-3 rounded-2xl  ">
          <ScrollableRangeNavigator
            from={range.from}
            to={range.to}
            onChange={setRange}
            allowAllTime
            title="Attendance report date range"
          />
        </div>

        <section aria-labelledby="attendance-snapshot-title" className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
          <h2 id="attendance-snapshot-title" className="border-b border-gray-100 px-4 py-3 text-base font-semibold text-gray-900 sm:px-5">
            {t("teacherPages", "attendanceSnapshot", lang)}
          </h2>
          {classesQuery.isLoading || rangeLoading || (activeClassId && overallAttendance.isLoading) ? (
            <div className="space-y-4 bg-white/90 p-5" aria-busy="true">
              <Skeleton className="mx-auto h-24 w-full max-w-52 rounded-t-full" />
              <Skeleton className="mx-auto h-3 w-48" />
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : classesQuery.isError || rangeError ? (
            <div className="p-4"><ApiErrorBanner message={classesQuery.error?.message ?? rangeError ?? "Could not load attendance report"} onRetry={() => { void classesQuery.refetch(); setDailyRefresh((count) => count + 1); }} /></div>
          ) : !activeClassId ? (
            <p className="p-5 text-sm text-gray-600">{t("teacherPages", "selectClassView", lang)}</p>
          ) : overallAttendance.isError ? (
            <div className="p-4"><ApiErrorBanner message={overallAttendance.error.message} onRetry={() => { void overallAttendance.refetch(); }} /></div>
          ) : (
            <div className="bg-white/90">
              <div className="px-4 py-4 text-center sm:py-5">
                <AttendanceSemiCircle
                  segments={[
                    { key: "present", value: rangeTotals.present },
                    { key: "absent", value: rangeTotals.absent },
                    { key: "other", value: rangeTotals.other },
                  ]}
                  value={String(rangeTotals.total)}
                  label={t("teacherPages", "totalRecords", lang)}
                  description={`${t("teacherPages", "attendanceSnapshot", lang)}: ${rangeTotals.total} ${t("teacherPages", "totalRecords", lang)}, ${rangeTotals.present} ${t("common", "present", lang)}, ${rangeTotals.absent} ${t("common", "absent", lang)}`}
                />
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />{t("common", "present", lang)}</span>
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-red-600" />{t("common", "absent", lang)}</span>
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />{t("teacherPages", "otherAttendance", lang)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">
                <div className="bg-white/90 p-2.5 sm:p-3">
                  <p className="text-sm font-medium text-gray-600">{t("teacherPages", "attendanceTotalDays", lang)}</p>
                  <strong className="block text-2xl font-semibold tabular-nums text-gray-950">{rangeTotals.totalDays}</strong>
                </div>
                <div className="bg-white/90 p-2.5 sm:p-3">
                  <p className="text-sm font-medium text-gray-600">{t("teacherPages", "attendanceAverage", lang)}</p>
                  <strong className="block text-2xl font-semibold tabular-nums text-gray-950">{rangeTotals.rate}%</strong>
                </div>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="student-attendance-title" className="mt-4 overflow-hidden rounded-2xl bg-white">
          <h2 id="student-attendance-title" className="border-b border-gray-100 px-4 py-3 text-base font-semibold text-gray-900 sm:px-5">
            {t("teacherPages", "studentAttendanceTitle", lang)}
          </h2>
          {classesQuery.isLoading || (activeClassId && overallAttendance.isLoading) ? (
            <div className="divide-y divide-gray-100" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                  <Skeleton className="h-5 min-w-0 max-w-40 flex-1" /><Skeleton className="h-5 w-14" /><Skeleton className="h-9 w-14 rounded-t-full" />
                </div>
              ))}
            </div>
          ) : classesQuery.isError ? (
            <div className="p-4"><ApiErrorBanner message={classesQuery.error.message} onRetry={() => { void classesQuery.refetch(); }} /></div>
          ) : !activeClassId ? (
            <p className="p-5 text-sm text-gray-600">{t("teacherPages", "selectClassView", lang)}</p>
          ) : overallAttendance.isError ? (
            <div className="p-4"><ApiErrorBanner message={overallAttendance.error.message} onRetry={() => { void overallAttendance.refetch(); }} /></div>
          ) : !overall?.students.length ? (
            <p className="p-5 text-sm text-gray-600">{t("teacherPages", "noActiveStudents", lang)}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {overall.students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => { setSelectedStudent({ classId: activeClassId, student }); setStudentDrawerOpen(true); }}
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 sm:px-5"
                >
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900" title={`${student.name} · ${student.adno}`}>
                    {student.name} <span className="text-xs font-normal text-gray-500">· {student.adno}</span>
                  </p>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-gray-600">
                    {student.presentDays}/{student.totalDays}<span className="hidden sm:inline"> {t("teacherPages", "daysLabel", lang)}</span>
                  </span>
                  <StudentAttendanceRadial
                    rate={student.rate}
                    description={`${student.name}: ${student.rate === null ? t("teacherPages", "noAttendanceRecords", lang) : `${student.rate}%`}`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
          </TabsContent>
          <TabsContent value="daily">
            <section aria-labelledby="daily-report-title" className="space-y-4">
              <div className="rounded-2xl ">
                <h2 id="daily-report-title" className="mb-3 text-base font-semibold text-gray-900">Daily attendance</h2>
                <ScrollableDateNavigator date={date} onDateChange={setDate} pickerTitle="Choose attendance date" disabled={saving || downloadingReport} />
              </div>
              <ScrollableTabs
                ariaLabel="Filter daily attendance by status"
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "PRESENT", label: t("common", "present", lang) },
                  { value: "ABSENT", label: t("common", "absent", lang) },
                  { value: "LEAVE", label: t("teacherPages", "attendanceStatusLeave", lang) },
                  { value: "SICK", label: t("teacherPages", "attendanceStatusSick", lang) },
                  { value: "LATE", label: t("teacherPages", "attendanceStatusLate", lang) },
                  { value: "EXCUSED", label: t("teacherPages", "attendanceStatusExcused", lang) },
                ]}
              />
              {dailyError && <ApiErrorBanner message={dailyError} onRetry={() => setDailyRefresh((count) => count + 1)} />}
              {dailyLoading ? (
                <div className="space-y-3 rounded-2xl bg-white p-4" aria-busy="true">
                  <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
                </div>
              ) : dailyRecords.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-amber-100 bg-[#FFF9F0] px-6 py-10 text-center">
                  <img src="/images/attendance-empty-state.png" alt="An open attendance register, pencil, and calendar" className="mb-4 h-40 w-40 object-contain sm:h-48 sm:w-48" />
                  <h3 className="text-lg font-semibold text-[#49352E]">No attendance recorded for this day</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#49352E]/75">Once attendance is taken, each student’s status will appear here. You can record it now for {activeClass?.name ?? "this class"}.</p>
                  <Button type="button" className="mt-5 rounded-full bg-[#E77757] text-white hover:bg-[#d9694a]" onClick={() => setEditorOpen(true)}>
                    <UserCheck className="size-4" /> Take attendance
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...new Set(dailyRecords.map((record) => record.date.slice(0, 10)))].sort((a, b) => b.localeCompare(a)).map((day) => {
                    const recordsForDay = dailyRecords.filter((record) => record.date.slice(0, 10) === day && (statusFilter === "ALL" || record.status === statusFilter));
                    if (!recordsForDay.length) return null;
                    const statuses: Record<string, string> = { PRESENT: "bg-emerald-50 text-emerald-800", ABSENT: "bg-red-50 text-red-800", LEAVE: "bg-amber-50 text-amber-800", SICK: "bg-orange-50 text-orange-800", LATE: "bg-yellow-50 text-yellow-800", EXCUSED: "bg-blue-50 text-blue-800" };
                    return <section key={day} className="overflow-hidden rounded-2xl bg-white">
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h3 className="font-semibold text-gray-900">{new Date(`${day}T12:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
                        <Button size="sm" variant="outline" onClick={() => { setDate(day); setEditorOpen(true); }}>Edit</Button>
                      </div>
                      <div className="divide-y divide-gray-100">{recordsForDay.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900">{record.student.name}</p><p className="text-xs text-gray-500">{record.student.adno}</p></div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statuses[record.status] ?? "bg-gray-100 text-gray-700"}`}>{attendanceStatusLabel(record.status)}</span>
                      </div>)}</div>
                    </section>;
                  })}
                  {dailyRecords.every((record) => statusFilter !== "ALL" && record.status !== statusFilter) && <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600">No students match this status.</p>}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {selectedStudent?.classId === activeClassId && (
        <StudentAttendanceDrawer
          key={`${selectedStudent.classId}-${selectedStudent.student.id}`}
          student={selectedStudent.student}
          open={studentDrawerOpen}
          classId={selectedStudent.classId}
          clientId={cid}
          token={token}
          onClose={() => setStudentDrawerOpen(false)}
        />
      )}

      {!editorOpen && (
        <ButtonGroup aria-label="Attendance actions" className="fixed bottom-[92px]  left-1/2 z-40 w-max -translate-x-1/2   p-0!   lg:bottom-6 sm:hidden">
          <Button type="button" size="lg" className="gap-2 rounded-full shadow-lg shadow-primary-900/20" onClick={() => setEditorOpen(true)}>
            <UserCheck aria-hidden="true" className="size-4" />
            {t("teacherPages", "markAttendanceDesc", lang)}
          </Button>
          <Button type="button" variant="outline" size="icon-lg" aria-label="Attendance options" className="rounded-r-full!  shadow-lg" onClick={() => setReportOpen(true)}>
            <MoreVertical className="size-5" />
          </Button>
        </ButtonGroup>
      )}

      <ResponsivePopover
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={t("teacherPages", "markAttendanceDesc", lang)}
        fullHeight
        className="md:max-w-none shadow-none"
        contentClassName="px-5 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-2xl pb-8">
          <div className="mb-6 space-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <ScrollableDateNavigator date={date} onDateChange={setDate} pickerTitle="Choose attendance date" disabled={saving} hideCalendarButton />
              {classSelector(true)}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm font-medium text-gray-500">
              <span>{new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span className="truncate text-right">{activeClass?.name ?? "No classes found"}</span>
            </div>
          </div>
          {error && <ApiErrorBanner message={error} onRetry={() => { if (activeClassId) void loadAttendance(activeClassId, date); }} />}
          {classesQuery.isError && <ApiErrorBanner message={classesQuery.error.message} onRetry={() => { void classesQuery.refetch(); }} />}
          {saveSuccess && <p role="status" className="mb-4 flex items-center gap-1 text-sm font-semibold "><CheckCircle2 className="size-4" />{t("teacherPages", "saved", lang)}</p>}
          {activeClassId && !loading && students.length > 0 && (
            <div className="mb-3 rounded-lg bg-gradient-to-r from-primary-50/50 to-sky-50/50 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-semibold">
                <span className="text-emerald-700">{t("teacherPages", "present", lang)}: {summary.PRESENT}</span>
                <span className="text-red-700">{t("teacherPages", "absent", lang)}: {summary.ABSENT + summary.LEAVE + summary.SICK}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t("teacherPages", "unapprovedAbsence", lang)} {summary.ABSENT} · {t("teacherPages", "approvedLeave", lang)} {summary.LEAVE} · {t("teacherPages", "sickLeave", lang)} {summary.SICK}
              </p>
            </div>
          )}
          <div aria-busy={loading || classesQuery.isLoading}>
            <AttendanceEditorContent
              isOwnClass
              activeClassId={activeClassId}
              classesLoading={classesQuery.isLoading}
              records={records}
              summary={summary}
              pct={pct}
              confirmClear={confirmClear}
              setConfirmClear={setConfirmClear}
              activeClassName={activeClass?.name}
              date={date}
              clearAll={clearAll}
              saving={saving}
              markAll={markAll}
              saveError={saveError}
              loading={loading}
              error={error}
              students={students}
              setStatus={setStatus}
              setNotes={setNotes}
              setLateComing={setLateComing}
              hasDirty={hasDirty}
              hasExisting={hasExisting}
              handleSave={saveAll}
            />
          </div>
        </div>
      </ResponsivePopover>

      {showImport && (
        <AttendanceImportModal
          clientId={cid}
          token={token}
          academicYearId={user?.defaultAcademicYearId}
          classes={classes}
          initialClassId={activeClassId}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            if (activeClassId) {
              void loadAttendance(activeClassId, date);
              void invalidateAttendance(activeClassId);
            }
          }}
        />
      )}
    </DashboardLayout>
  );
}
