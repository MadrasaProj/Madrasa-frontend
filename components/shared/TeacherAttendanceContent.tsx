import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSessionsByDate,
  getSessionsByTeacher,
  type TeacherSession,
} from "@/lib/teacher-session-api";
import { getTeachers, type TeacherRecord } from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Search, Users } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";

function todayISO() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function dateKey(d: string) {
  return d.split("T")[0];
}

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

function SessionStatus({ session }: { session: TeacherSession }) {
  const active = session.status === "CHECKED_IN";
  return (
    <span className={cn("shrink-0 text-xs font-semibold", active ? "text-primary-600" : "text-gray-400")}>
      {active ? "Active" : "Out"}
    </span>
  );
}

function AttendanceStats({ firstLabel, firstValue, secondLabel, secondValue }: {
  firstLabel: string;
  firstValue: number;
  secondLabel: string;
  secondValue: number;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
      <div className="min-w-0 border-r border-gray-100 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700">
          <span>{firstLabel}</span>
          <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-primary-600" />
        </div>
        <p className="mt-1.5 text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]">{firstValue}</p>
      </div>
      <div className="min-w-0 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700">
          <span>{secondLabel}</span>
          <Users aria-hidden="true" className="size-4 shrink-0 text-primary-600" />
        </div>
        <p className="mt-1.5 text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]">{secondValue}</p>
      </div>
    </div>
  );
}

export function TeacherAttendanceContent() {
  const { accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [tab, setTab]             = useState("by-day");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teacherSearch, setTeacherSearch] = useState("");

  const [daySessions, setDaySessions]   = useState<TeacherSession[]>([]);
  const [dayLoading, setDayLoading]     = useState(true);
  const [dayError, setDayError]         = useState<string | null>(null);

  const [allTeachers, setAllTeachers] = useState<TeacherRecord[]>([]);
  const [sessionsByTeacher, setSessionsByTeacher] = useState<Record<string, TeacherSession[]>>({});
  const [teacherListLoading, setTeacherListLoading] = useState(true);

  useEffect(() => {
    if (!cid || !token) return;
    setTeacherListLoading(true);
    getTeachers(cid, token, { limit: 200 })
      .then(async (r) => {
        const teachers = r.data ?? [];
        setAllTeachers(teachers);
        const summaries = await Promise.all(teachers.map(async (teacher) => {
          try {
            const sessions = await getSessionsByTeacher(cid, token, teacher.id);
            return [teacher.id, sessions] as const;
          } catch {
            return [teacher.id, []] as const;
          }
        }));
        setSessionsByTeacher(Object.fromEntries(summaries));
      })
      .catch(() => setAllTeachers([]))
      .finally(() => setTeacherListLoading(false));
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

  const dayByTeacher = useMemo(() => {
    const map = new Map<string, { teacher: TeacherSession["teacher"]; sessions: TeacherSession[] }>();
    for (const s of daySessions) {
      const tid = s.teacherId;
      if (!map.has(tid)) map.set(tid, { teacher: s.teacher, sessions: [] });
      map.get(tid)!.sessions.push(s);
    }
    return [...map.values()].sort((a, b) => (a.teacher?.name ?? "").localeCompare(b.teacher?.name ?? ""));
  }, [daySessions]);

  const dayRows = useMemo(() => [...daySessions].sort((a, b) =>
    (a.teacher?.name ?? "").localeCompare(b.teacher?.name ?? "") || a.checkInTime.localeCompare(b.checkInTime),
  ), [daySessions]);

  const selectedTeacherName = allTeachers.find((t) => t.id === selectedTeacherId)?.name ?? "";
  const selectedTeacherSessions = sessionsByTeacher[selectedTeacherId] ?? [];
  const selectedTeacherGrouped = useMemo(() => groupByDate(selectedTeacherSessions), [selectedTeacherSessions]);
  const totalTrackedDays = useMemo(() => new Set(Object.values(sessionsByTeacher).flat().map((session) => dateKey(session.date))).size, [sessionsByTeacher]);

  return (
    <DashboardLayout>
      <PageHeader title="Teacher Attendance" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Teacher attendance view">
          <TabsTrigger value="by-day">By Day</TabsTrigger>
          <TabsTrigger value="by-teacher">By Teacher</TabsTrigger>
        </TabsList>

        <TabsContent value="by-day">
          <div className="mb-4 flex min-w-0 items-center">
            <ScrollableDateNavigator date={selectedDate} onDateChange={setSelectedDate} pickerTitle="Choose attendance date" />
          </div>

          {dayLoading ? (
            <SkeletonList count={4} />
          ) : dayError ? (
            <ApiErrorBanner message={dayError} onRetry={loadDay} />
          ) : (
            <div className="space-y-4">
              <AttendanceStats
                firstLabel="Teachers present"
                firstValue={dayByTeacher.length}
                secondLabel="Total teachers"
                secondValue={allTeachers.length}
              />
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
                {dayRows.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">No teacher check-ins for this date</p>
                ) : dayRows.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{session.teacher?.name ?? "Unknown"}</p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {fmtTime(session.checkInTime)} – {session.checkOutTime ? fmtTime(session.checkOutTime) : "Ongoing"}
                      </p>
                    </div>
                    <SessionStatus session={session} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-teacher">
          <div className="mb-5">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search teachers…"
                aria-label="Search teachers"
                className="h-11 pl-10"
              />
            </div>
          </div>
          {teacherListLoading ? <SkeletonList count={5} /> : filteredTeachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No teachers found</p>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {filteredTeachers.map((teacher) => {
                const sessions = sessionsByTeacher[teacher.id] ?? [];
                const days = new Set(sessions.map((session) => dateKey(session.date))).size;
                return (
                  <button key={teacher.id} type="button" onClick={() => setSelectedTeacherId(teacher.id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50">
                    <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{teacher.name}</span>
                    <span className="shrink-0 text-right text-xs font-medium tabular-nums text-gray-500">{days} / {totalTrackedDays} days</span>
                  </button>
                );
              })}
            </div>
          )}

          <ResponsivePopover open={!!selectedTeacherId} onOpenChange={(open) => { if (!open) setSelectedTeacherId(""); }} title={selectedTeacherName} fullHeight >
            <AttendanceStats firstLabel="Attendance days" firstValue={selectedTeacherGrouped.length} secondLabel="Total sessions" secondValue={selectedTeacherSessions.length} />
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {selectedTeacherGrouped.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">No attendance records found</p>
              ) : selectedTeacherGrouped.map(({ date, sessions }) => (
                <div key={date}>
                  <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{fmtDate(date)}</p>
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-4">
                      <div className="text-sm text-gray-600">
                        <p>Check-in: {fmtTime(session.checkInTime)}</p>
                        <p className="mt-1">Check-out: {session.checkOutTime ? fmtTime(session.checkOutTime) : "Ongoing"}</p>
                      </div>
                      <SessionStatus session={session} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ResponsivePopover>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
