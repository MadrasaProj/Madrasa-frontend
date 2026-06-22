import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClassIbadah, type PrayerStatus, type IbadahConfig, type IbadahRecord } from "@/lib/ibadah-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import {
  Moon, BookOpen, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Calendar, List,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Section = "prayers" | "quran" | "custom";
type ViewMode = "daily" | "weekly";

const ALL_PRAYERS: { key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"; label: string; configKey: keyof IbadahConfig }[] = [
  { key: "fajr",    label: "Fajr",    configKey: "enableFajr"    },
  { key: "dhuhr",   label: "Dhuhr",   configKey: "enableDhuhr"   },
  { key: "asr",     label: "Asr",     configKey: "enableAsr"     },
  { key: "maghrib", label: "Maghrib", configKey: "enableMaghrib" },
  { key: "isha",    label: "Isha",    configKey: "enableIsha"    },
];

interface StudentRow {
  studentId: string;
  name: string;
  adno: string;
  fajr: PrayerStatus | null; dhuhr: PrayerStatus | null; asr: PrayerStatus | null; maghrib: PrayerStatus | null; isha: PrayerStatus | null;
  quranPages: number;
  customData: Record<string, boolean | number>;
}

function fmt(d: Date) { return d.toISOString().split("T")[0]; }
function fmtShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtWeekday(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}

function getLast7Days(endDate: string): string[] {
  const dates: string[] = [];
  const end = new Date(endDate);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(fmt(d));
  }
  return dates;
}

function prayerCount(log: IbadahRecord | undefined, prayers: typeof ALL_PRAYERS): number {
  if (!log) return 0;
  return prayers.filter((p) => log[p.key]).length;
}

function countBadgeColor(count: number, total: number) {
  if (total === 0) return "bg-gray-100 text-gray-400";
  if (count === total) return "bg-emerald-100 text-emerald-700";
  if (count >= total * 0.6) return "bg-amber-100 text-amber-700";
  if (count > 0) return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-400";
}

export default function TeacherIbadahPage() {
  const { user, accessToken } = useAuthStore();
  const cid       = user?.clientId ?? "";
  const token     = accessToken ?? "";
  const teacherId = user?.id ?? "";

  const [classes, setClasses]               = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId]   = useState<string | null>(null);
  const [date, setDate]                     = useState(fmt(new Date()));
  const [viewMode, setViewMode]             = useState<ViewMode>("daily");

  // Daily view state
  const [rows, setRows]         = useState<StudentRow[]>([]);
  const [config, setConfig]     = useState<IbadahConfig | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("prayers");

  // Weekly view state
  const [weeklyLogs, setWeeklyLogs]       = useState<IbadahRecord[]>([]);
  const [weeklyStudents, setWeeklyStudents] = useState<StudentRecord[]>([]);
  const [expandedCell, setExpandedCell]   = useState<string | null>(null); // "studentId|date"

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingIbadah, setLoadingIbadah]   = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // Load own classes only
  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    setLoadingClasses(true);
    getMyClasses(cid, token, ac.signal)
      .then((cls) => {
        const own = cls.filter((c) => c.classTeacherId === teacherId);
        setClasses(own);
        if (own.length > 0) setActiveClassId(own[0].id);
      })
      .catch((e) => { setError((e as Error).message); })
      .finally(() => setLoadingClasses(false));
    return () => ac.abort();
  }, [cid, token]); // eslint-disable-line

  // Daily load
  const loadDailyIbadah = useCallback(async () => {
    if (!cid || !token || !activeClassId) return;
    setLoadingIbadah(true); setError(null);
    try {
      const data = await getClassIbadah(cid, token, { classId: activeClassId, date });
      setConfig(data.config);
      setRows(data.logs.map((r) => ({
        studentId: r.studentId, name: r.student.name, adno: r.student.adno,
        fajr: r.fajr, dhuhr: r.dhuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha,
        quranPages: r.quranPages,
        customData: (r.customData as Record<string, boolean | number>) ?? {},
      })));
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingIbadah(false); }
  }, [cid, token, activeClassId, date]);

  // Weekly load
  const loadWeeklyIbadah = useCallback(async () => {
    if (!cid || !token || !activeClassId) return;
    setLoadingIbadah(true); setError(null);
    const dates = getLast7Days(date);
    const from = dates[0], to = dates[dates.length - 1];
    try {
      const [ibadahData, studentsData] = await Promise.all([
        getClassIbadah(cid, token, { classId: activeClassId, from, to }),
        getStudents(cid, token, { classId: activeClassId, limit: 200 }),
      ]);
      setConfig(ibadahData.config);
      setWeeklyLogs(ibadahData.logs);
      setWeeklyStudents(studentsData.data ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingIbadah(false); }
  }, [cid, token, activeClassId, date]);

  useEffect(() => {
    if (viewMode === "daily") loadDailyIbadah();
    else loadWeeklyIbadah();
  }, [viewMode, loadDailyIbadah, loadWeeklyIbadah]);

  const activePrayers = useMemo(
    () => config ? ALL_PRAYERS.filter((p) => config[p.configKey] !== false) : ALL_PRAYERS,
    [config],
  );
  const customItems = config?.customItems ?? [];

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(fmt(d)); };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d <= today) setDate(fmt(d));
  };
  const prevWeek = () => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(fmt(d)); };
  const nextWeek = () => {
    const d = new Date(date); d.setDate(d.getDate() + 7);
    if (d <= new Date()) setDate(fmt(d));
  };

  const weekDates = useMemo(() => getLast7Days(date), [date]);

  // Build log map for weekly view: studentId → date → log
  const logMap = useMemo(() => {
    const map = new Map<string, Map<string, IbadahRecord>>();
    for (const log of weeklyLogs) {
      const dateKey = log.date.split("T")[0];
      if (!map.has(log.studentId)) map.set(log.studentId, new Map());
      map.get(log.studentId)!.set(dateKey, log);
    }
    return map;
  }, [weeklyLogs]);

  const sections = ([
    { key: "prayers" as Section, label: "Prayers", show: activePrayers.length > 0 },
    { key: "quran"   as Section, label: "Quran",   show: config?.enableQuranPages !== false },
    { key: "custom"  as Section, label: "Custom",  show: customItems.length > 0 },
  ] as { key: Section; label: string; show: boolean }[]).filter((s) => s.show);

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Records"
        subtitle={activeClass?.name ?? "Prayer Tracking"}
        icon={Moon}
        back backHref="/teacher"
      />

      {error && <ApiErrorBanner message={error} onRetry={viewMode === "daily" ? loadDailyIbadah : loadWeeklyIbadah} />}

      {/* Read-only notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 mb-4 flex items-center gap-2 text-xs text-blue-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        Parents submit ibadah for their children. You can view records here.
      </div>

      {loadingClasses ? (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-xl" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No classes assigned to you</div>
      ) : (
        <>
          {/* Class + View toggle row */}
          <div className="flex items-start gap-3 mb-4 flex-wrap">
            <div className="flex gap-2 flex-wrap flex-1">
              {classes.map((cls) => (
                <button key={cls.id} onClick={() => setActiveClassId(cls.id)}
                  className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    activeClassId === cls.id ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700")}>
                  {cls.name}
                </button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <button onClick={() => setViewMode("daily")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  viewMode === "daily" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500")}>
                <List className="w-3.5 h-3.5" /> Daily
              </button>
              <button onClick={() => setViewMode("weekly")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  viewMode === "weekly" ? "bg-white shadow-sm text-emerald-700" : "text-gray-500")}>
                <Calendar className="w-3.5 h-3.5" /> Weekly
              </button>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={viewMode === "daily" ? prevDay : prevWeek}
              className="p-2 rounded-xl bg-white border border-gray-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              {viewMode === "daily" ? (
                <input type="date" value={date} max={fmt(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm font-semibold text-gray-800 focus:outline-none bg-transparent text-center" />
              ) : (
                <p className="text-sm font-semibold text-gray-800">
                  {fmtShort(weekDates[0])} — {fmtShort(weekDates[6])}
                </p>
              )}
            </div>
            <button onClick={viewMode === "daily" ? nextDay : nextWeek}
              disabled={date >= fmt(new Date())}
              className="p-2 rounded-xl bg-white border border-gray-200 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingIbadah ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── DAILY VIEW ── */}
              {viewMode === "daily" && (
                <>
                  {rows.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      No ibadah submitted by parents for this date yet.
                    </div>
                  ) : (
                    <>
                      {/* Section tabs */}
                      {sections.length > 1 && (
                        <div className="flex gap-1.5 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                          {sections.map((s) => (
                            <button key={s.key} onClick={() => setActiveSection(s.key)}
                              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                activeSection === s.key ? "bg-white shadow-sm text-emerald-700" : "text-gray-500")}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Prayers table */}
                      {activeSection === "prayers" && activePrayers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                          {/* Table header */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase w-48 sticky left-0 bg-gray-50">Student</th>
                                  {activePrayers.map((p) => (
                                    <th key={p.key} className="text-center px-2 py-2.5 text-[10px] font-bold text-gray-400 uppercase">{p.label.slice(0,3)}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {rows.map((r) => (
                                  <tr key={r.studentId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-2.5 sticky left-0 bg-white">
                                      <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{r.name}</p>
                                      <p className="text-[10px] text-gray-400">{r.adno}</p>
                                    </td>
                                    {activePrayers.map((p) => (
                                      <td key={p.key} className="px-2 py-2.5 text-center">
                                        <div className={cn("w-8 h-8 mx-auto rounded-lg text-sm font-bold flex items-center justify-center",
                                          r[p.key] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400")}>
                                          {r[p.key] ? "✓" : "–"}
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Quran table */}
                      {activeSection === "quran" && config?.enableQuranPages !== false && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                          <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quran Pages</p>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {rows.map((r) => (
                              <div key={r.studentId} className="flex items-center gap-4 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                                  <p className="text-xs text-gray-400">{r.adno}</p>
                                </div>
                                <span className={cn("text-lg font-bold", r.quranPages > 0 ? "text-blue-700" : "text-gray-300")}>
                                  {r.quranPages}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom items */}
                      {activeSection === "custom" && customItems.length > 0 && (
                        <div className="space-y-4">
                          {customItems.map((item) => (
                            <div key={item.key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                              <div className="px-4 py-2.5 bg-gray-50">
                                <p className="text-xs font-bold text-gray-500 uppercase">{item.label}</p>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {rows.map((r) => (
                                  <div key={r.studentId} className="flex items-center gap-4 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                                      <p className="text-xs text-gray-400">{r.adno}</p>
                                    </div>
                                    {item.type === "boolean" ? (
                                      <div className={cn("w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center",
                                        r.customData[item.key] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400")}>
                                        {r.customData[item.key] ? "✓" : "–"}
                                      </div>
                                    ) : (
                                      <span className={cn("text-lg font-bold", (r.customData[item.key] as number) > 0 ? "text-blue-700" : "text-gray-300")}>
                                        {(r.customData[item.key] as number) ?? 0}
                                      </span>
                                    )}
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

              {/* ── WEEKLY VIEW ── */}
              {viewMode === "weekly" && (
                weeklyStudents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    No students in this class.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: "520px" }}>
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {/* Frozen student column */}
                            <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase sticky left-0 bg-gray-50 min-w-[140px] border-r border-gray-100">
                              Student
                            </th>
                            {weekDates.map((d) => (
                              <th key={d} className="text-center px-2 py-3 min-w-[68px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{fmtWeekday(d)}</p>
                                <p className="text-xs font-semibold text-gray-600">{fmtShort(d)}</p>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {weeklyStudents.map((student) => {
                            const studentLogs = logMap.get(student.id);
                            return (
                              <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                {/* Frozen student cell */}
                                <td className="px-4 py-3 sticky left-0 bg-white border-r border-gray-100">
                                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[130px]">{student.name}</p>
                                  <p className="text-[10px] text-gray-400">{student.adno}</p>
                                </td>
                                {weekDates.map((d) => {
                                  const log = studentLogs?.get(d);
                                  const count = prayerCount(log, activePrayers);
                                  const total = activePrayers.length;
                                  const cellKey = `${student.id}|${d}`;
                                  const isExpanded = expandedCell === cellKey;
                                  return (
                                    <td key={d} className="px-2 py-3 text-center align-top">
                                      {!log ? (
                                        <div className="w-10 h-7 mx-auto rounded-lg bg-gray-50 text-[10px] text-gray-300 flex items-center justify-center">
                                          —
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center gap-1">
                                          <button
                                            onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                                            className={cn("px-2 py-1 rounded-lg text-xs font-bold transition-all", countBadgeColor(count, total))}
                                          >
                                            {count}/{total}
                                          </button>
                                          {isExpanded && (
                                            <div className="flex flex-col items-center gap-0.5 mt-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5">
                                              {activePrayers.map((p) => (
                                                <div key={p.key} className="flex items-center gap-1 text-[10px]">
                                                  <span className={log[p.key] ? "text-emerald-600" : "text-gray-300"}>
                                                    {log[p.key] ? "✓" : "–"}
                                                  </span>
                                                  <span className="text-gray-500">{p.label.slice(0,3)}</span>
                                                </div>
                                              ))}
                                              {config?.enableQuranPages && (
                                                <div className="flex items-center gap-1 text-[10px] border-t border-gray-50 pt-0.5 mt-0.5">
                                                  <BookOpen className="w-2.5 h-2.5 text-blue-400" />
                                                  <span className="text-gray-500">{log.quranPages}p</span>
                                                </div>
                                              )}
                                              {customItems.length > 0 && log.customData && (
                                                <div className="flex flex-col items-center gap-0.5 border-t border-gray-50 pt-0.5 mt-0.5">
                                                  {customItems.map((item) => {
                                                    const val = log.customData?.[item.key];
                                                    if (val === undefined || val === null) return null;
                                                    return (
                                                      <div key={item.key} className="text-[9px] text-blue-600 font-semibold truncate max-w-[80px]">
                                                        {item.label.slice(0, 8)}: {item.type === "boolean" ? (val ? "✓" : "—") : val}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" /> All prayers</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Partial</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Few</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 inline-block" /> Not recorded</div>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
