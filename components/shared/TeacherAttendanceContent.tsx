import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  getSessionsByDate,
  getSessionsByTeacher,
  type TeacherSession,
} from "@/lib/teacher-session-api";
import { getTeachers, type TeacherRecord } from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck,
  Search, User,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function shiftDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function dateKey(d: string) {
  return d.split("T")[0];
}

type Tab = "by-day" | "by-teacher";

function groupByDate(sessions: TeacherSession[]) {
  const map = new Map<string, TeacherSession[]>();
  for (const s of sessions) {
    const key = dateKey(s.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({ date, sessions: list }));
}

function uniqueDays(sessions: TeacherSession[]) {
  return new Set(sessions.map((s) => dateKey(s.date))).size;
}

interface TeacherAttendanceContentProps {
  backHref: string;
}

export function TeacherAttendanceContent({ backHref }: TeacherAttendanceContentProps) {
  const { accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [tab, setTab]             = useState<Tab>("by-day");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teacherSearch, setTeacherSearch] = useState("");

  const [daySessions, setDaySessions]   = useState<TeacherSession[]>([]);
  const [dayLoading, setDayLoading]     = useState(true);
  const [dayError, setDayError]         = useState<string | null>(null);

  const [teacherSessions, setTeacherSessions] = useState<TeacherSession[]>([]);
  const [teacherLoading, setTeacherLoading]   = useState(false);
  const [teacherError, setTeacherError]       = useState<string | null>(null);

  const [allTeachers, setAllTeachers] = useState<TeacherRecord[]>([]);

  useEffect(() => {
    if (!cid || !token) return;
    getTeachers(cid, token, { limit: 200 })
      .then((r) => setAllTeachers(r.data ?? []))
      .catch(() => {});
  }, [cid, token]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch) return allTeachers;
    const q = teacherSearch.toLowerCase();
    return allTeachers.filter((t) => t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q));
  }, [allTeachers, teacherSearch]);

  const loadDay = () => {
    if (!cid || !token) return;
    setDayLoading(true); setDayError(null);
    getSessionsByDate(cid, token, selectedDate)
      .then((s) => setDaySessions(s))
      .catch((e) => setDayError((e as Error).message))
      .finally(() => setDayLoading(false));
  };

  useEffect(() => { loadDay(); }, [selectedDate, cid, token]); // eslint-disable-line

  const loadTeacher = () => {
    if (!cid || !token || !selectedTeacherId) return;
    setTeacherLoading(true); setTeacherError(null);
    getSessionsByTeacher(cid, token, selectedTeacherId)
      .then((s) => setTeacherSessions(s))
      .catch((e) => setTeacherError((e as Error).message))
      .finally(() => setTeacherLoading(false));
  };

  useEffect(() => { loadTeacher(); }, [selectedTeacherId, cid, token]); // eslint-disable-line

  const dayByTeacher = useMemo(() => {
    const map = new Map<string, { teacher: TeacherSession["teacher"]; sessions: TeacherSession[] }>();
    for (const s of daySessions) {
      const tid = s.teacherId;
      if (!map.has(tid)) map.set(tid, { teacher: s.teacher, sessions: [] });
      map.get(tid)!.sessions.push(s);
    }
    return [...map.values()].sort((a, b) => (a.teacher?.name ?? "").localeCompare(b.teacher?.name ?? ""));
  }, [daySessions]);

  const teacherGrouped = useMemo(() => groupByDate(teacherSessions), [teacherSessions]);
  const selectedTeacherName = allTeachers.find((t) => t.id === selectedTeacherId)?.name ?? "";

  return (
    <DashboardLayout>
      <PageHeader
        title="Teacher Attendance"
        subtitle={fmtDate(selectedDate)}
        icon={ClipboardCheck}
        back
        backHref={backHref}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {([
          { key: "by-day" as Tab, label: "By Day", icon: CalendarDays },
          { key: "by-teacher" as Tab, label: "By Teacher", icon: User },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              tab === t.key ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ BY DAY ════════════════════════════════════════════════════════════ */}
      {tab === "by-day" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedDate((d) => shiftDays(d, -1))}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              {selectedDate !== todayISO() && (
                <button onClick={() => setSelectedDate(todayISO())}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Today</button>
              )}
            </div>
            <button onClick={() => setSelectedDate((d) => shiftDays(d, 1))} disabled={selectedDate >= todayISO()}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {dayLoading ? (
            <SkeletonList count={4} />
          ) : dayError ? (
            <ApiErrorBanner message={dayError} onRetry={loadDay} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{dayByTeacher.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Teachers Present</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{allTeachers.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Teachers</p>
                </div>
              </div>

              {dayByTeacher.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No teacher check-ins for this date</div>
              ) : (
                <div className="space-y-2">
                  {dayByTeacher.map(({ teacher, sessions }) => (
                    <div key={teacher?.id ?? sessions[0].teacherId}
                      className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {teacher?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{teacher?.name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400">
                            {fmtTime(sessions[0].checkInTime)} – {sessions[0].checkOutTime ? fmtTime(sessions[0].checkOutTime) : "—"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {uniqueDays(sessions)} day
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ BY TEACHER ════════════════════════════════════════════════════════ */}
      {tab === "by-teacher" && (
        <>
          <div className="mb-5">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teachers…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {filteredTeachers.map((t) => (
                <button key={t.id}
                  onClick={() => { setSelectedTeacherId(t.id); setTeacherSearch(""); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all shrink-0",
                    selectedTeacherId === t.id
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200",
                  )}>
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    selectedTeacherId === t.id ? "bg-emerald-200 text-emerald-800" : "bg-gray-100 text-gray-500",
                  )}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  {t.name}
                </button>
              ))}
              {filteredTeachers.length === 0 && <p className="text-xs text-gray-400 py-2">No teachers found</p>}
            </div>
          </div>

          {!selectedTeacherId ? (
            <div className="py-16 text-center text-sm text-gray-400">Select a teacher to view their attendance</div>
          ) : teacherLoading ? (
            <SkeletonList count={4} />
          ) : teacherError ? (
            <ApiErrorBanner message={teacherError} onRetry={loadTeacher} />
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {selectedTeacherName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedTeacherName}</p>
                    <p className="text-xs text-gray-400">
                      {teacherGrouped.length} attendance day{teacherGrouped.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {teacherGrouped.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No attendance records found</div>
              ) : (
                <div className="space-y-3">
                  {teacherGrouped.map(({ date, sessions }) => (
                    <div key={date} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900">{fmtDate(date)}</p>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {sessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                            <p className="text-xs text-gray-500">
                              {fmtTime(s.checkInTime)} – {s.checkOutTime ? fmtTime(s.checkOutTime) : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
