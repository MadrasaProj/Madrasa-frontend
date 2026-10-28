import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { getStudents } from "@/lib/students-api";
import {
  getClassAttendance,
  bulkUpsertAttendance,
  bulkDeleteAttendance,
  type AttendanceStatus,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useAttendanceSummary, useClasses } from "@/lib/queries";
import { queryKeys } from "@/lib/queryKeys";
import { AlertTriangle, CheckCircle2, School, UserCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { DrawerSelector } from "@/components/DrawerSelector";
import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AttendanceEditorContent,
  type ActiveStatus,
} from "@/components/teacher/AttendanceEditorContent";

// ── Constants ──────────────────────────────────────────────────────────────

function todayISO() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

interface LocalRecord {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  dirty: boolean;
}

const attendanceChartConfig = {
  present: { color: "#059669" },
  absent: { color: "#dc2626" },
  other: { color: "#f59e0b" },
} satisfies ChartConfig;

function AttendanceSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { key: keyof typeof attendanceChartConfig; value: number }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const chartData = total > 0 ? segments : [{ key: "empty" as const, value: 1 }];

  return (
    <div role="img" aria-label={description} className="relative mx-auto w-full max-w-56">
      <ChartContainer config={attendanceChartConfig} className="!aspect-auto h-28 w-full" aria-hidden="true">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="key"
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="95%"
            innerRadius={68}
            outerRadius={88}
            cornerRadius={3}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.key === "empty" ? "#e5e7eb" : `var(--color-${entry.key})`}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <span className="pointer-events-none absolute inset-x-0 top-14 text-2xl font-semibold tabular-nums text-gray-950">{value}</span>
      <span className="-mt-7 block text-base font-medium text-gray-500">{label}</span>
    </div>
  );
}

// ── Other-class confirmation modal ─────────────────────────────────────────

function OtherClassConfirmModal({
  className,
  onConfirm,
  onCancel,
}: {
  className: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { lang } = useLanguageStore();
  return (
    <div className="fixed inset-0 bg-black/50 z-1050 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">
              {t("teacherPages", "markingOtherClass", lang)}
            </p>
            <p className="text-base text-gray-500 mt-0.5">{className}</p>
          </div>
        </div>
        <p className="text-base text-gray-600 mb-5">
          {t("teacherPages", "markingOtherDesc", lang)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-base font-semibold text-gray-600 hover:bg-gray-50"
          >
            {t("common", "cancel", lang)}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-base font-semibold hover:bg-amber-600"
          >
            {t("teacherPages", "yesSaveBtn", lang)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherAttendancePage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const queryClient = useQueryClient();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [students, setStudents] = useState<
    { id: string; name: string; adno: string; gender?: string }[]
  >([]);
  const [records, setRecords] = useState<Map<string, LocalRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    },
    [],
  );

  const { activeClass: defaultClass, isLoading: activeClassLoading } = useActiveClass();
  const classesQuery = useClasses({ clientId: cid, token });
  const overallAttendance = useAttendanceSummary(
    { clientId: cid, token },
    undefined,
    { refetchOnMount: "always" },
  );
  const overall = overallAttendance.data;
  const overallAbsent =
    overall?.byStatus.find((entry) => entry.status === "ABSENT")?._count.id ?? 0;
  const overallRate = Math.max(0, Math.min(100, overall?.rate ?? 0));
  const overallOther = Math.max(0, (overall?.total ?? 0) - (overall?.present ?? 0) - overallAbsent);
  const classes = classesQuery.data ?? [];
  const classesLoading = classesQuery.isLoading || activeClassLoading;
  const activeClass = classes.find((cls) => cls.id === selectedClassId)
    ?? defaultClass
    ?? classes[0]
    ?? null;
  const activeClassId = activeClass?.id ?? "";

  // Load students + existing attendance whenever class or date changes
  const loadAttendance = useCallback(
    async (classId: string, dateStr: string, signal?: AbortSignal) => {
      if (!cid || !token || !classId) return;
      setLoading(true);
      setError(null);
      setStudents([]);
      setRecords(new Map());
      try {
        const [attendanceRes, studentsRes] = await Promise.all([
          getClassAttendance(
            cid,
            token,
            {
              date: dateStr,
              classId,
              ...(user?.defaultAcademicYearId
                ? { academicYearId: user.defaultAcademicYearId }
                : {}),
              take: 500,
            },
            signal,
          ),
          getStudents(cid, token, {
            classId,
            status: "ACTIVE",
            limit: 500,
            signal,
          }),
        ]);

        if (signal?.aborted) return;

        const map = new Map<string, LocalRecord>();
        const hasExistingRecords =
          attendanceRes.records && attendanceRes.records.length > 0;
        for (const s of studentsRes.data) {
          map.set(s.id, {
            status: hasExistingRecords ? null : "PRESENT",
            notes: "",
            dirty: !hasExistingRecords,
          });
        }
        for (const rec of attendanceRes.records) {
          map.set(rec.student.id, {
            attendanceId: rec.id,
            status: rec.status,
            notes: rec.notes ?? "",
            dirty: false,
          });
        }
        setStudents(
          studentsRes.data.map((s) => ({
            id: s.id,
            name: s.name,
            adno: s.adno,
            gender: s.gender ?? undefined,
          })),
        );
        setRecords(map);
      } catch (e) {
        if (signal?.aborted || (e as Error).name === "AbortError") return;
        setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [cid, token, user?.defaultAcademicYearId],
  );

  useEffect(() => {
    const ac = new AbortController();
    setSaveError(null);
    setSaveSuccess(false);
    setConfirmSave(false);
    setConfirmClear(false);
    if (activeClassId) loadAttendance(activeClassId, date, ac.signal);
    else {
      setLoading(false);
      setStudents([]);
      setRecords(new Map());
    }
    return () => ac.abort();
  }, [activeClassId, date, loadAttendance]);

  const setStatus = (studentId: string, status: ActiveStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) ?? {
        status: null,
        notes: "",
        dirty: false,
      };
      next.set(studentId, { ...existing, status, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) ?? {
        status: null,
        notes: "",
        dirty: false,
      };
      next.set(studentId, { ...existing, notes, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const clearAll = useCallback(async () => {
    if (!activeClassId) return;
    setSaving(true);
    try {
      await bulkDeleteAttendance(cid, token, { date, classId: activeClassId });
      await Promise.all([
        loadAttendance(activeClassId, date),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.attendanceSummary(cid) }),
      ]);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
      setConfirmClear(false);
    }
  }, [activeClassId, cid, token, date, loadAttendance, queryClient]);

  const markAll = (status: ActiveStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      for (const [sid] of next)
        next.set(sid, { ...next.get(sid)!, status, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const isOwnClass = activeClass?.classTeacherId === user?.id;

  const hasDirty = useMemo(() => {
    for (const r of records.values()) if (r.dirty) return true;
    return false;
  }, [records]);

  const hasExisting = useMemo(() => {
    for (const r of records.values()) if (r.attendanceId) return true;
    return false;
  }, [records]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LEAVE: 0,
      SICK: 0,
      UNMARKED: 0,
    };
    for (const r of records.values()) {
      if (r.status && counts[r.status] !== undefined) counts[r.status]++;
      else if (!r.status) counts.UNMARKED++;
    }
    return counts;
  }, [records]);

  const pct =
    records.size > 0 ? Math.round((summary.PRESENT / records.size) * 100) : 0;

  const doSave = useCallback(async () => {
    if (!activeClassId || !cid || !token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const entries: {
        studentId: string;
        status: AttendanceStatus;
        notes?: string;
      }[] = [];
      for (const [sid, rec] of records) {
        if (rec.status !== null) {
          entries.push({
            studentId: sid,
            status: rec.status,
            ...(rec.notes ? { notes: rec.notes } : {}),
          });
        }
      }
      if (entries.length === 0) {
        setSaving(false);
        return;
      }

      await bulkUpsertAttendance(cid, token, {
        classId: activeClassId,
        date,
        ...(user?.defaultAcademicYearId
          ? { academicYearId: user.defaultAcademicYearId }
          : {}),
        records: entries,
      });

      setRecords((prev) => {
        const next = new Map(prev);
        for (const [sid, rec] of next) next.set(sid, { ...rec, dirty: false });
        return next;
      });
      setSaveSuccess(true);
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      await Promise.all([
        loadAttendance(activeClassId, date),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports.attendanceSummary(cid) }),
      ]);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [
    activeClassId,
    cid,
    token,
    date,
    records,
    user?.defaultAcademicYearId,
    loadAttendance,
    queryClient,
  ]);

  const handleSave = useCallback(async () => {
    if (!activeClassId) return;
    if (!isOwnClass) {
      setConfirmSave(true);
      return;
    }
    await doSave();
  }, [activeClassId, isOwnClass, doSave]);

  return (
    <DashboardLayout>
      <AnimatePresence>
        {confirmSave && activeClass && (
          <OtherClassConfirmModal
            className={activeClass.name}
            onConfirm={() => {
              setConfirmSave(false);
              doSave();
            }}
            onCancel={() => setConfirmSave(false)}
          />
        )}
      </AnimatePresence>

      <PageHeader
        title={t("teacherPages", "attendancePageTitle", lang)}
      />

      <div className="px-4! pt-4! pb-28! lg:pb-24!">
        <section aria-labelledby="attendance-snapshot-title" className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
          <h2 id="attendance-snapshot-title" className="border-b border-gray-100 px-4 py-3 text-base font-semibold text-gray-900 sm:px-5">
            {t("teacherPages", "attendanceSnapshot", lang)}
          </h2>
          {overallAttendance.isLoading ? (
            <div className="space-y-4 bg-white/90 p-5" aria-busy="true">
              <Skeleton className="mx-auto h-24 w-full max-w-52 rounded-t-full sm:h-28 sm:max-w-56" />
              <Skeleton className="mx-auto h-3 w-48" />
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : overallAttendance.isError ? (
            <div className="p-4">
              <ApiErrorBanner message={overallAttendance.error.message} onRetry={() => { void overallAttendance.refetch(); }} largeText />
            </div>
          ) : (
            <div className="bg-white/90">
              <div className="px-4 py-4 text-center sm:py-5">
                <AttendanceSemiCircle
                  segments={[
                    { key: "present", value: overall?.present ?? 0 },
                    { key: "absent", value: overallAbsent },
                    { key: "other", value: overallOther },
                  ]}
                  value={String(overall?.total ?? 0)}
                  label={t("teacherPages", "totalRecords", lang)}
                  description={`${t("teacherPages", "attendanceSnapshot", lang)}: ${overall?.total ?? 0} ${t("teacherPages", "totalRecords", lang)}, ${overall?.present ?? 0} ${t("common", "present", lang)}, ${overallAbsent} ${t("common", "absent", lang)}, ${overallOther} ${t("teacherPages", "otherAttendance", lang)}`}
                />
                <div className="flex flex-wrap mt-4 justify-center gap-x-4 gap-y-1 text-base text-gray-600">
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />{t("common", "present", lang)}</span>
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-red-600" />{t("common", "absent", lang)}</span>
                  <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />{t("teacherPages", "otherAttendance", lang)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100">
                <div className="bg-white/90 p-3 sm:p-4">
                  <p className="text-base font-medium text-gray-600">{t("teacherPages", "attendanceTotalDays", lang)}</p>
                  <strong className="mt-1 block text-xl font-semibold tabular-nums text-gray-950">{overall?.totalDays ?? "—"}</strong>
                </div>
                <div className="bg-white/90 p-3 sm:p-4">
                  <p className="text-base font-medium text-gray-600">{t("teacherPages", "attendanceAverage", lang)}</p>
                  <strong className="mt-1 block text-xl font-semibold tabular-nums text-gray-950">{overallRate}%</strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {!drawerOpen && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm   p-0! lg:bottom-6 lg:left-[calc(50%+8rem)] lg:w-auto">
          <Button type="button" size="lg" className="w-max gap-2 rounded-full text-base shadow-lg shadow-primary-900/20" onClick={() => setDrawerOpen(true)}>
            <UserCheck aria-hidden="true" className="size-4" />
            {t("teacherPages", "markAttendanceDesc", lang)}
          </Button>
        </div>
      )}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent
          className="data-[swipe-direction=down]:rounded-none bg-white"
          style={{
            "--drawer-content-height": "100dvh",
            "--drawer-content-max-height": "100dvh",
          } as React.CSSProperties}
        >
          <DrawerHeader className="flex-row items-center justify-between border-b border-gray-100 p-1 px-2 text-left">
            <DrawerTitle className="font-bold">
              {t("teacherPages", "markAttendanceDesc", lang)}
            </DrawerTitle>
            <DrawerClose
              aria-label={t("common", "close", lang)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <X aria-hidden="true" className="size-5" />
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="mx-auto max-w-2xl">
              {error && (
                <ApiErrorBanner
                  message={error}
                  largeText
                  onRetry={() =>
                    activeClassId ? loadAttendance(activeClassId, date) : undefined
                  }
                />
              )}

              <div className="mb-4 space-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ScrollableDateNavigator
                    date={date}
                    onDateChange={setDate}
                    pickerTitle="Choose attendance date"
                    disabled={saving}
                    hideCalendarButton
                    largeText
                  />
                  <DrawerSelector
                    title={t("teacherPages", "selectClassOpt", lang)}
                    value={activeClassId}
                    onChange={setSelectedClassId}
                    options={classes.map((cls) => ({
                      value: cls.id,
                      label: `${cls.name}${cls.classTeacherId === user?.id ? ` · ${t("teacherPages", "mineBadge", lang)}` : ""}`,
                    }))}
                    placeholder={classesLoading ? t("common", "loading", lang) : t("teacherPages", "noClassesFound", lang)}
                    disabled={saving || classesLoading}
                    optionClassName="text-base"
                    triggerItem={
                      <Button
                        variant="outline"
                        className="h-14 w-12 rounded-lg px-0 py-1           "
                      >
                        <School aria-hidden="true" className="size-5" />
                      </Button>
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-base font-medium text-gray-500">
                  <span>{new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="truncate text-right">{activeClass?.name ?? t("teacherPages", "noClassesFound", lang)}</span>
                </div>
              </div>

              {classesQuery.error && (
                <ApiErrorBanner
                  message={classesQuery.error.message}
                  largeText
                  onRetry={() => { void classesQuery.refetch(); }}
                />
              )}

              {saveSuccess && (
                <p role="status" className="mb-4 flex items-center gap-1 text-base font-semibold text-primary-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("teacherPages", "saved", lang)}
                </p>
              )}

              <div aria-busy={loading || classesLoading}>
                <AttendanceEditorContent
                  isOwnClass={isOwnClass}
                  activeClassId={activeClassId}
                  classesLoading={classesLoading}
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
                  hasDirty={hasDirty}
                  hasExisting={hasExisting}
                  handleSave={handleSave}
                />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
}
