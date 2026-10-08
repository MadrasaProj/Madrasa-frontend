import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { type ClassRecord } from "@/lib/classes-api";
import { useClasses } from "@/lib/queries";
import { getStudents } from "@/lib/students-api";
import {
  getClassAttendance,
  bulkUpsertAttendance,
  bulkDeleteAttendance,
  type AttendanceStatus,
  type ClassAttendanceRecord,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import {
  Save,
  Loader2,
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { DateNavigator } from "@/components/DateNavigator";
import {
  AttendanceEditorContent,
  type ActiveStatus,
} from "@/components/teacher/AttendanceEditorContent";

// ── Constants ──────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function attendanceColor(percentage: number) {
  const red = [239, 68, 68];
  const yellow = [234, 179, 8];
  const green = [34, 197, 94];
  const [from, to, ratio] =
    percentage <= 50
      ? [red, yellow, percentage / 50]
      : [yellow, green, (percentage - 50) / 50];
  const color = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * ratio),
  );
  return `rgba(${color.join(",")},0.1)`;
}

interface LocalRecord {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  dirty: boolean;
}

interface ClassAttendanceSummary {
  total: number;
  present: number;
  taken: boolean;
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
            <p className="text-xs text-gray-500 mt-0.5">{className}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          {t("teacherPages", "markingOtherDesc", lang)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            {t("common", "cancel", lang)}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
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
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
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
  const [attendanceSummaries, setAttendanceSummaries] = useState<
    Map<string, ClassAttendanceSummary>
  >(new Map());
  const [editorOpen, setEditorOpen] = useState(false);

  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    },
    [],
  );

  // Load teacher's classes using cached query hook
  const { data: classesData, isLoading: classesLoading } = useClasses({
    clientId: cid,
    token,
  });
  const classes = classesData ?? [];

  useEffect(() => {
    if (!cid || !token || classes.length === 0) return;
    let cancelled = false;
    Promise.all(
      classes.map(async (cls) => {
        const response = await getClassAttendance(cid, token, {
          date,
          classId: cls.id,
          ...(user?.defaultAcademicYearId
            ? { academicYearId: user.defaultAcademicYearId }
            : {}),
          take: 500,
        });
        const present = response.records.filter(
          (record) => record.status === "PRESENT",
        ).length;
        return [
          cls.id,
          {
            total: cls.studentCount ?? 0,
            present,
            taken: response.records.length > 0,
          },
        ] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setAttendanceSummaries(new Map(entries));
      })
      .catch(() => {
        if (!cancelled) setAttendanceSummaries(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [classes, cid, token, date, user?.defaultAcademicYearId]);

  // Set default class once loaded
  useEffect(() => {
    if (classes.length > 0 && !activeClassId) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  // Load students + existing attendance whenever class or date changes
  const loadAttendance = useCallback(
    async (classId: string, dateStr: string, signal?: AbortSignal) => {
      if (!cid || !token || !classId) return;
      setLoading(true);
      setError(null);
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
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [cid, token, user?.defaultAcademicYearId],
  );

  useEffect(() => {
    const ac = new AbortController();
    if (activeClassId) loadAttendance(activeClassId, date, ac.signal);
    else {
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
      await loadAttendance(activeClassId, date);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
      setConfirmClear(false);
    }
  }, [activeClassId, cid, token, date, loadAttendance]);

  const markAll = (status: ActiveStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      for (const [sid] of next)
        next.set(sid, { ...next.get(sid)!, status, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const activeClass = classes.find((c) => c.id === activeClassId) ?? null;
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

      setAttendanceSummaries((prev) => {
        const next = new Map(prev);
        const current = next.get(activeClassId);
        next.set(activeClassId, {
          total: current?.total ?? students.length,
          present: entries.filter((entry) => entry.status === "PRESENT").length,
          taken: entries.length > 0,
        });
        return next;
      });

      setRecords((prev) => {
        const next = new Map(prev);
        for (const [sid, rec] of next) next.set(sid, { ...rec, dirty: false });
        return next;
      });
      setSaveSuccess(true);
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      await loadAttendance(activeClassId, date);
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
        action={
          <div className="flex items-center gap-2">
            {hasDirty ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                    {t("teacherPages", "savingEllipsis", lang)}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {t("common", "save", lang)}
                  </>
                )}
              </button>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />{" "}
                {t("teacherPages", "saved", lang)}
              </span>
            ) : null}
          </div>
        }
      />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={() =>
            activeClassId ? loadAttendance(activeClassId, date) : undefined
          }
        />
      )}

      <DateNavigator date={date} onDateChange={setDate} pickerTitle="Choose attendance date" />

      {/* Class list */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {classesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-2">
            {t("teacherPages", "noClassesFound", lang)}
          </p>
        ) : (
          classes.map((cls) => {
            const isOwn = cls.classTeacherId === user?.id;
            const attendance = attendanceSummaries.get(cls.id);
            const percentage = attendance?.total
              ? Math.round((attendance.present / attendance.total) * 100)
              : 0;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setActiveClassId(cls.id);
                  setSaveSuccess(false);
                  setEditorOpen(true);
                }}
                className="relative w-full border-0 border-b border-gray-100 bg-transparent px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50/70"
              >
                <div
                  className="absolute left-0 top-0 h-full w-full"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, transparent, ${attendanceColor(percentage)})`,
                  }}
                />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {cls.name}
                        </p>
                        {isOwn && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {t("teacherPages", "mineBadge", lang)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {cls.studentCount ?? 0} students
                      </p>
                    </div>
                  </div>
                  {!attendance?.taken ? (
                    <span className="shrink-0 text-xs font-semibold text-gray-400">
                      Not taken
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm font-bold text-gray-700">
                      {attendance.present}/{attendance.total}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <ResponsivePopover
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={activeClass?.name ?? "Attendance"}
        description={`${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · Edit attendance`}
        side="bottom"
        contentClassName="p-4"
      >
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
      </ResponsivePopover>
    </DashboardLayout>
  );
}
