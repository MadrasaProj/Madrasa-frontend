import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudents } from "@/lib/students-api";
import {
  getClassAttendance, bulkUpsertAttendance,
  type AttendanceStatus, type ClassAttendanceRecord,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import {
  ClipboardList, ChevronLeft, ChevronRight, Save, Loader2,
  Users, AlertCircle, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; short: string; bg: string; text: string; rowBg: string }> = {
  PRESENT: { label: "Present", short: "P", bg: "bg-emerald-100", text: "text-emerald-700", rowBg: "border-emerald-200 bg-emerald-50/40" },
  ABSENT:  { label: "Absent",  short: "A", bg: "bg-red-100",     text: "text-red-600",     rowBg: "border-red-200   bg-red-50/40"     },
  LEAVE:   { label: "Leave",   short: "L", bg: "bg-amber-100",   text: "text-amber-700",   rowBg: "border-amber-200 bg-amber-50/40"   },
  SICK:    { label: "Sick",    short: "S", bg: "bg-blue-100",    text: "text-blue-700",    rowBg: "border-blue-200  bg-blue-50/40"    },
};
const ACTIVE_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "SICK"] as const;
type ActiveStatus = typeof ACTIVE_STATUSES[number];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface LocalRecord {
  attendanceId?: string;
  status: AttendanceStatus | null;
  notes: string;
  dirty: boolean;
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
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
            <p className="font-bold text-gray-900">Marking other class</p>
            <p className="text-xs text-gray-500 mt-0.5">{className}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          You are marking attendance for a class not assigned to you. Confirm to save.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
          >
            Yes, Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherAttendancePage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [classes,        setClasses]        = useState<ClassRecord[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [activeClassId,  setActiveClassId]  = useState<string | null>(null);
  const [date,           setDate]           = useState(todayISO());
  const [students,       setStudents]       = useState<{ id: string; name: string; adno: string; gender?: string }[]>([]);
  const [records,        setRecords]        = useState<Map<string, LocalRecord>>(new Map());
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [confirmSave,    setConfirmSave]    = useState(false);

  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current); }, []);

  // Load all classes, own class first (backend already sorts for TEACHER role)
  useEffect(() => {
    if (!cid || !token) { setClassesLoading(false); return; }
    const ac = new AbortController();
    setClassesLoading(true);
    getAllClasses(cid, token, ac.signal)
      .then((cls) => {
        setClasses(cls);
        if (cls.length > 0) setActiveClassId(cls[0].id);
      })
      .catch((e) => { setError((e as Error).message); })
      .finally(() => setClassesLoading(false));
    return () => ac.abort();
  }, [cid, token]);

  // Load students + existing attendance whenever class or date changes
  const loadAttendance = useCallback(async (classId: string, dateStr: string) => {
    if (!cid || !token || !classId) return;
    setLoading(true); setError(null);
    try {
      const [attendanceRes, studentsRes] = await Promise.all([
        getClassAttendance(cid, token, {
          date: dateStr, classId,
          ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
          take: 500,
        }),
        getStudents(cid, token, { classId, status: "ACTIVE", limit: 500 }),
      ]);

      const map = new Map<string, LocalRecord>();
      const hasExistingRecords = attendanceRes.records && attendanceRes.records.length > 0;
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
        studentsRes.data.map((s) => ({ id: s.id, name: s.name, adno: s.adno, gender: s.gender ?? undefined })),
      );
      setRecords(map);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    if (activeClassId) loadAttendance(activeClassId, date);
    else { setStudents([]); setRecords(new Map()); }
  }, [activeClassId, date, loadAttendance]);

  const setStatus = (studentId: string, status: ActiveStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) ?? { status: null, notes: "", dirty: false };
      next.set(studentId, { ...existing, status, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) ?? { status: null, notes: "", dirty: false };
      next.set(studentId, { ...existing, notes, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const markAll = (status: ActiveStatus) => {
    setRecords((prev) => {
      const next = new Map(prev);
      for (const [sid] of next) next.set(sid, { ...next.get(sid)!, status, dirty: true });
      return next;
    });
    setSaveSuccess(false);
  };

  const activeClass = classes.find((c) => c.id === activeClassId) ?? null;
  const isOwnClass  = activeClass?.classTeacherId === user?.id;

  const hasDirty = useMemo(() => {
    for (const r of records.values()) if (r.dirty) return true;
    return false;
  }, [records]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LEAVE: 0, SICK: 0, UNMARKED: 0 };
    for (const r of records.values()) {
      if (r.status && counts[r.status] !== undefined) counts[r.status]++;
      else if (!r.status) counts.UNMARKED++;
    }
    return counts;
  }, [records]);

  const pct = records.size > 0
    ? Math.round((summary.PRESENT / records.size) * 100)
    : 0;

  const doSave = useCallback(async () => {
    if (!activeClassId || !cid || !token) return;
    setSaving(true); setSaveError(null);
    try {
      const entries: { studentId: string; status: AttendanceStatus; notes?: string }[] = [];
      for (const [sid, rec] of records) {
        if (rec.status !== null) {
          entries.push({
            studentId: sid,
            status: rec.status,
            ...(rec.notes ? { notes: rec.notes } : {}),
          });
        }
      }
      if (entries.length === 0) { setSaving(false); return; }

      await bulkUpsertAttendance(cid, token, {
        classId: activeClassId,
        date,
        ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
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
      await loadAttendance(activeClassId, date);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [activeClassId, cid, token, date, records, user?.defaultAcademicYearId, loadAttendance]);

  const handleSave = useCallback(async () => {
    if (!activeClassId) return;
    if (!isOwnClass) { setConfirmSave(true); return; }
    await doSave();
  }, [activeClassId, isOwnClass, doSave]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const iso = d.toISOString().slice(0, 10);
    if (iso <= todayISO()) setDate(iso);
  };

  return (
    <DashboardLayout>
      <AnimatePresence>
        {confirmSave && activeClass && (
          <OtherClassConfirmModal
            className={activeClass.name}
            onConfirm={() => { setConfirmSave(false); doSave(); }}
            onCancel={() => setConfirmSave(false)}
          />
        )}
      </AnimatePresence>

      <PageHeader
        title="Attendance"
        subtitle={activeClassId ? `${activeClass?.name ?? ""} · ${records.size} students` : "Select a class"}
        icon={ClipboardList}
        back
        backHref="/teacher"
        action={
          hasDirty ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save</>}
            </button>
          ) : saveSuccess ? (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          ) : null
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={() => activeClassId ? loadAttendance(activeClassId, date) : undefined} />}

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-4">
        <button onClick={() => changeDate(-1)}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
          />
          {date === todayISO() && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">TODAY</span>
          )}
        </div>
        <button onClick={() => changeDate(1)}
          disabled={date >= todayISO()}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Class tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {classesLoading ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-xl shrink-0" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-2">No classes found</p>
        ) : classes.map((cls) => {
          const isOwn    = cls.classTeacherId === user?.id;
          const isActive = cls.id === activeClassId;
          return (
            <button key={cls.id}
              onClick={() => { setActiveClassId(cls.id); setSaveSuccess(false); }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-white border text-gray-600 hover:border-emerald-200",
                isOwn && !isActive ? "border-emerald-300" : !isActive ? "border-gray-200" : "",
              )}
            >
              <Users className="w-3.5 h-3.5" />
              {cls.name}
              {isOwn && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700",
                )}>Mine</span>
              )}
              {cls.studentCount > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500",
                )}>{cls.studentCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Non-own class warning */}
      {!isOwnClass && activeClassId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-amber-700 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Marking a class not assigned to you — confirmation required before saving.
        </div>
      )}

      {/* No class selected */}
      {!activeClassId && !classesLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-semibold text-gray-500">Select a class to view attendance</p>
        </div>
      )}

      {/* Summary bar + progress */}
      {activeClassId && records.size > 0 && (
        <>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { key: "PRESENT",  label: "Present",  cls: "bg-emerald-50 text-emerald-700" },
              { key: "ABSENT",   label: "Absent",   cls: "bg-red-50 text-red-600"         },
              { key: "LEAVE",    label: "Leave",    cls: "bg-amber-50 text-amber-700"     },
              { key: "SICK",     label: "Sick",     cls: "bg-blue-50 text-blue-700"       },
              { key: "UNMARKED", label: "Unmarked", cls: "bg-gray-50 text-gray-500"       },
            ].map(({ key, label, cls }) => (
              <div key={key} className={cn("rounded-xl p-2.5 text-center", cls)}>
                <p className="text-xl font-bold">{summary[key] ?? 0}</p>
                <p className="text-[10px] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Attendance % progress bar */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Attendance rate</p>
              <p className="text-sm font-bold text-emerald-700">{pct}%</p>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${records.size > 0 ? (summary.PRESENT / records.size) * 100 : 0}%` }} />
              <div className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${records.size > 0 ? (summary.LEAVE / records.size) * 100 : 0}%` }} />
              <div className="h-full bg-blue-400 transition-all duration-500"
                style={{ width: `${records.size > 0 ? (summary.SICK / records.size) * 100 : 0}%` }} />
            </div>
          </div>
        </>
      )}

      {/* Bulk mark actions */}
      {activeClassId && records.size > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 self-center mr-1">Mark all:</span>
          {ACTIVE_STATUSES.map((s) => (
            <button key={s}
              onClick={() => markAll(s)}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80",
                STATUS_CONFIG[s].bg, STATUS_CONFIG[s].text,
              )}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
        </div>
      )}

      {/* Student list */}
      {activeClassId && (
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No active students in this class</p>
          </div>
        ) : (
          <div className="space-y-2 pb-24">
            {students.map((student) => {
              const rec    = records.get(student.id);
              const status = rec?.status ?? null;
              const cfg    = status ? STATUS_CONFIG[status] : null;
              return (
                <div key={student.id}
                  className={cn(
                    "bg-white rounded-2xl border transition-all",
                    rec?.dirty
                      ? cfg
                        ? cn(cfg.rowBg, "border-2")
                        : "border-amber-200 bg-amber-50/30 border-2"
                      : "border-gray-100",
                  )}
                >
                  <div className="p-3.5 flex items-center gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                      student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-emerald-100 text-emerald-700",
                    )}>
                      {student.name.charAt(0)}
                    </div>

                    {/* Name + adno */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.adno}</p>
                    </div>

                    {/* P/A/L/S buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {ACTIVE_STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(student.id, s)}
                          title={STATUS_CONFIG[s].label}
                          className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-lg transition-all",
                            status === s
                              ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ring-2 ring-offset-1 ring-current`
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                          )}
                        >
                          {STATUS_CONFIG[s].short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes — only visible when not PRESENT */}
                  {status && status !== "PRESENT" && (
                    <div className="px-3.5 pb-3">
                      <input
                        type="text"
                        placeholder="Add note (optional)"
                        value={rec?.notes ?? ""}
                        onChange={(e) => setNotes(student.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Sticky save button — always visible when on mobile for quick access */}
      {activeClassId && hasDirty && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 lg:pl-72 z-20 pointer-events-none">
          <button
            onClick={handleSave}
            disabled={saving}
            className="pointer-events-auto w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
              : <><Save className="w-5 h-5" /> Save Attendance · {summary.ABSENT > 0 ? `${summary.ABSENT} absent` : "All marked"}</>
            }
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
