import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { type ClassRecord } from "@/lib/classes-api";
import { useClasses } from "@/lib/queries";
import { getStudents } from "@/lib/students-api";
import {
 getClassAttendance, bulkUpsertAttendance, bulkDeleteAttendance,
 type AttendanceStatus, type ClassAttendanceRecord,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import {
 ClipboardList, ChevronLeft, ChevronRight, Save, Loader2,
 GraduationCap, CheckCircle2, Trash2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/Skeleton";

const STATUS_CONFIG: Record<string, { label: string; short: string; bg: string; text: string }> = {
 PRESENT: { label: "Present", short: "P", bg: "bg-emerald-100", text: "text-emerald-700" },
 ABSENT: { label: "Absent", short: "A", bg: "bg-red-100", text: "text-red-600" },
 LEAVE: { label: "Leave", short: "L", bg: "bg-amber-100", text: "text-amber-700" },
 SICK: { label: "Sick", short: "S", bg: "bg-blue-100", text: "text-blue-700" },
};
const ACTIVE_STATUSES = ["PRESENT", "ABSENT", "LEAVE", "SICK"] as const;
type ActiveStatus = typeof ACTIVE_STATUSES[number];

function todayISO() {
 return new Date().toISOString().slice(0, 10);
}

interface LocalRecord {
 attendanceId?: string;
 status: AttendanceStatus | null;
 dirty: boolean;
}

export default function AdminAttendancePage() {
 const { user, accessToken, activeClientId } = useAuthStore();
 const { pathname } = useLocation();

 const cid = activeClientId ?? "";
 const token = accessToken ?? "";

 const [date, setDate] = useState(todayISO());
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string; adno: string; gender?: string }[]>([]);
  const [records, setRecords] = useState<Map<string, LocalRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Load classes using cached query hook
  const { data: classesData, isLoading: classesLoading } = useClasses({ clientId: cid, token });
  const classes = classesData ?? [];

  // Load attendance + students lazily when class OR date changes
  const loadAttendance = useCallback(async (classId: string, dateStr: string, signal?: AbortSignal) => {
    if (!cid || !token || !classId) return;
    setLoading(true); setError(null);

    try {
      const [attendanceRes, studentsRes] = await Promise.all([
        getClassAttendance(cid, token, {
          date: dateStr, classId,
          ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}),
          take: 500,
        }, signal),
        getStudents(cid, token, { classId, status: "ACTIVE", limit: 500, signal }),
      ]);

      const map = new Map<string, LocalRecord>();
      for (const s of studentsRes.data) {
        map.set(s.id, { status: null, dirty: false });
      }
      for (const rec of attendanceRes.records) {
        map.set(rec.student.id, {
          attendanceId: rec.id,
          status: rec.status,
          dirty: false,
        });
      }
      setStudents(studentsRes.data.map((s) => ({ id: s.id, name: s.name, adno: s.adno, gender: s.gender ?? undefined })));
      setRecords(map);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => {
    const ac = new AbortController();
    if (activeClassId) loadAttendance(activeClassId, date, ac.signal);
    else { setStudents([]); setRecords(new Map()); }
    return () => ac.abort();
  }, [activeClassId, date, loadAttendance]);

 const setStatus = (studentId: string, status: ActiveStatus) => {
 setRecords((prev) => {
 const next = new Map(prev);
 const existing = next.get(studentId) ?? { status: null, dirty: false };
 next.set(studentId, { ...existing, status, dirty: true });
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

 const clearAll = async () => {
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
 };

 const hasDirty = useMemo(() => {
 for (const r of records.values()) if (r.dirty) return true;
 return false;
 }, [records]);

 const hasExisting = useMemo(() => {
 for (const r of records.values()) if (r.attendanceId) return true;
 return false;
 }, [records]);

 const saveAll = async () => {
 if (!activeClassId || !cid || !token) return;
 setSaving(true); setSaveError(null);
 try {
 const entries: { studentId: string; status: AttendanceStatus }[] = [];
 for (const [sid, rec] of records) {
 if (rec.status !== null) entries.push({ studentId: sid, status: rec.status });
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
 setTimeout(() => setSaveSuccess(false), 3000);
 await loadAttendance(activeClassId, date);
 } catch (e) {
 setSaveError((e as Error).message);
 } finally {
 setSaving(false);
 }
 };

 const summary = useMemo(() => {
 const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LEAVE: 0, SICK: 0, UNMARKED: 0 };
 for (const r of records.values()) {
 if (r.status && counts[r.status] !== undefined) counts[r.status]++;
 else if (!r.status) counts.UNMARKED++;
 }
 return counts;
 }, [records]);

 const changeDate = (delta: number) => {
 const d = new Date(date);
 d.setDate(d.getDate() + delta);
 setDate(d.toISOString().slice(0, 10));
 };

 const activeClass = classes.find((c) => c.id === activeClassId);

 return (
 <DashboardLayout>
 <PageHeader
 title="Attendance"
 subtitle={activeClassId ? `${activeClass?.name ?? ""} · ${records.size} students` : "Select a class"}
 icon={ClipboardList}
 action={
 <div className="flex items-center gap-2">
 {hasDirty ? (
 <button
 onClick={saveAll}
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
 ) : null}
 {hasExisting && (
 <button
 onClick={() => setConfirmClear(true)}
 className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
 >
 <Trash2 className="w-4 h-4" /> Clear All
 </button>
 )}
 </div>
 }
 />

 {error && <ApiErrorBanner message={error} onRetry={activeClassId ? () => loadAttendance(activeClassId, date) : undefined} />}

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
 <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-xs text-gray-400">
 <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading classes…
 </div>
 ) : classes.length === 0 ? (
 <p className="text-xs text-gray-400 px-3 py-2">No classes found</p>
 ) : classes.map((cls) => (
 <button key={cls.id}
 onClick={() => setActiveClassId(cls.id)}
 className={cn(
 "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all",
 activeClassId === cls.id
 ? "bg-emerald-600 text-white shadow-sm"
 : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-200",
 )}
 >
 <GraduationCap className="w-3.5 h-3.5" /> {cls.name}
 {cls.studentCount > 0 && (
 <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold",
 activeClassId === cls.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
 )}>{cls.studentCount}</span>
 )}
 </button>
 ))}
 </div>

 {/* No class selected prompt */}
 {!activeClassId && !classesLoading && (
 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
 <GraduationCap className="w-12 h-12 mb-4 opacity-20" />
 <p className="font-semibold text-gray-500">Select a class to view attendance</p>
 <p className="text-xs mt-1">Choose a class from the tabs above</p>
 </div>
 )}

 {/* Summary bar */}
 {activeClassId && records.size > 0 && (
 <div className="grid grid-cols-5 gap-2 mb-4">
 {[
 { key: "PRESENT", label: "Present", cls: "bg-emerald-50 text-emerald-700" },
 { key: "ABSENT", label: "Absent", cls: "bg-red-50 text-red-600" },
 { key: "LEAVE", label: "Leave", cls: "bg-amber-50 text-amber-700" },
 { key: "SICK", label: "Sick", cls: "bg-blue-50 text-blue-700" },
 { key: "UNMARKED",label: "Unmarked", cls: "bg-gray-50 text-gray-500" },
 ].map(({ key, label, cls }) => (
 <div key={key} className={cn("rounded-xl p-2.5 text-center", cls)}>
 <p className="text-xl font-bold">{summary[key] ?? 0}</p>
 <p className="text-[10px] font-semibold mt-0.5">{label}</p>
 </div>
 ))}
 </div>
 )}

 {/* Clear all confirmation modal */}
 {confirmClear && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
 <AlertCircle className="w-5 h-5 text-red-600" />
 </div>
 <div>
 <p className="font-bold text-gray-900">Clear all attendance</p>
 <p className="text-xs text-gray-500 mt-0.5">{activeClass?.name} · {date}</p>
 </div>
 </div>
 <p className="text-sm text-gray-600 mb-5">
 This will remove all attendance records for this class and date. This action cannot be undone.
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => setConfirmClear(false)}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={clearAll}
 disabled={saving}
 className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
 >
 {saving ? "Clearing..." : "Yes, Clear All"}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Bulk actions */}
 {activeClassId && records.size > 0 && (
 <div className="flex gap-2 mb-4 flex-wrap">
 <span className="text-xs text-gray-400 self-center mr-1">Mark all:</span>
 {ACTIVE_STATUSES.map((s) => (
 <button key={s}
 onClick={() => markAll(s)}
 className={cn(
 "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
 STATUS_CONFIG[s].bg, STATUS_CONFIG[s].text, "hover:opacity-80",
 )}
 >
 {STATUS_CONFIG[s].label}
 </button>
 ))}
 </div>
 )}

 {saveError && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{saveError}</div>
 )}

 {/* Student list */}
 {activeClassId && (
 loading ? (
 <div className="space-y-2"><SkeletonList count={4} /></div>
 ) : error ? (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
 ) : students.length === 0 ? (
 <div className="text-center py-16 text-gray-400">
 <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
 <p className="font-semibold">No active students in this class</p>
 </div>
 ) : (
 <div className="space-y-2 pb-20">
 {students.map((student) => {
 const rec = records.get(student.id);
 const status = rec?.status ?? null;
 const cfg = status ? STATUS_CONFIG[status] : null;
 return (
 <div key={student.id}
 className={cn(
 "bg-white rounded-2xl border p-3.5 flex items-center gap-3 transition-all",
 rec?.dirty ? "border-amber-200 bg-amber-50/30" : "border-gray-100",
 )}
 >
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
 student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-emerald-100 text-emerald-700",
 )}>
 {student.name.charAt(0)}
 </div>

 <div className="flex-1 min-w-0">
 <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
 <p className="text-xs text-gray-400">{student.adno}</p>
 </div>

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
 );
 })}
 </div>
 )
 )}
 </DashboardLayout>
 );
}
