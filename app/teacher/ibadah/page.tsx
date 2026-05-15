import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getClassIbadah, bulkUpsertIbadah, type IbadahRecord,
} from "@/lib/ibadah-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import {
  Moon, Save, CheckCircle2, Star, BookOpen, Heart, Sparkles,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────
type PrayerState = "present" | "absent";
type Section     = "prayers" | "quran";

const FARD: { key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"; label: string }[] = [
  { key: "fajr",    label: "Fajr"    },
  { key: "dhuhr",   label: "Dhuhr"   },
  { key: "asr",     label: "Asr"     },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha",    label: "Isha"    },
];

interface StudentRow {
  studentId: string;
  name: string;
  adno: string;
  fajr: PrayerState;
  dhuhr: PrayerState;
  asr: PrayerState;
  maghrib: PrayerState;
  isha: PrayerState;
  quranPages: number;
}

function toState(b: boolean): PrayerState { return b ? "present" : "absent"; }
function fromState(s: PrayerState): boolean { return s === "present"; }

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function TeacherIbadahPage() {
  const { user, accessToken } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const [classes, setClasses]       = useState<ClassRecord[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [date, setDate]             = useState(fmt(new Date()));
  const [rows, setRows]             = useState<StudentRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingIbadah, setLoadingIbadah]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("prayers");

  // Load teacher's classes
  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    setLoadingClasses(true);
    getMyClasses(cid, token, ac.signal)
      .then((cls) => {
        setClasses(cls);
        if (cls.length > 0) setActiveClassId(cls[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
    return () => ac.abort();
  }, [cid, token]);

  // Load ibadah records for active class + date
  const loadIbadah = useCallback(async () => {
    if (!cid || !token || !activeClassId) return;
    setLoadingIbadah(true);
    setError(null);
    try {
      const data = await getClassIbadah(cid, token, { classId: activeClassId, date });
      // Build rows from existing records
      const byStudent = new Map(data.map((r) => [r.studentId, r]));

      // If no existing records, we need class students
      // Use existing records OR create rows for existing studentIds
      if (data.length > 0) {
        setRows(
          data.map((r) => ({
            studentId: r.studentId,
            name: r.student.name,
            adno: r.student.adno,
            fajr:    toState(r.fajr),
            dhuhr:   toState(r.dhuhr),
            asr:     toState(r.asr),
            maghrib: toState(r.maghrib),
            isha:    toState(r.isha),
            quranPages: r.quranPages,
          })),
        );
      } else {
        // No records yet — rows stay as-is (empty or keep previous)
        // Only reset if switching to a new class
        setRows([]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingIbadah(false);
    }
  }, [cid, token, activeClassId, date]);

  useEffect(() => { loadIbadah(); }, [loadIbadah]);

  const togglePrayer = (studentId: string, prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha") => {
    setRows((prev) => prev.map((r) =>
      r.studentId === studentId
        ? { ...r, [prayer]: r[prayer] === "present" ? "absent" : "present" }
        : r,
    ));
  };

  const setQuranPages = (studentId: string, val: number) => {
    setRows((prev) => prev.map((r) =>
      r.studentId === studentId ? { ...r, quranPages: Math.max(0, val) } : r,
    ));
  };

  const markAllPresent = (prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha") => {
    setRows((prev) => prev.map((r) => ({ ...r, [prayer]: "present" as PrayerState })));
  };

  const handleSave = async () => {
    if (!activeClassId || !rows.length) return;
    setSaving(true);
    try {
      await bulkUpsertIbadah(cid, token, {
        classId: activeClassId,
        date,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
        records: rows.map((r) => ({
          studentId: r.studentId,
          fajr:    fromState(r.fajr),
          dhuhr:   fromState(r.dhuhr),
          asr:     fromState(r.asr),
          maghrib: fromState(r.maghrib),
          isha:    fromState(r.isha),
          quranPages: r.quranPages,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const presentAll = rows.filter((r) =>
      r.fajr === "present" && r.dhuhr === "present" && r.asr === "present" &&
      r.maghrib === "present" && r.isha === "present",
    ).length;
    const quranDone = rows.filter((r) => r.quranPages > 0).length;
    return { total, presentAll, quranDone };
  }, [rows]);

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(fmt(d));
  };
  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d <= today) setDate(fmt(d));
  };

  const activeClass = classes.find((c) => c.id === activeClassId);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Records"
        subtitle={activeClass ? `${activeClass.name} · ${new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Prayer Tracking"}
        icon={Moon}
        back backHref="/teacher"
      />

      {loadingClasses ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No classes assigned to you</div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activeClassId === cls.id
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700",
                )}
              >
                {cls.name}
                {cls.studentCount != null && (
                  <span className="ml-1.5 text-[10px] opacity-70">({cls.studentCount})</span>
                )}
              </button>
            ))}
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={prevDay} className="p-2 rounded-xl bg-white border border-gray-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <input
                type="date"
                value={date}
                max={fmt(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-semibold text-gray-800 focus:outline-none bg-transparent text-center"
              />
            </div>
            <button
              onClick={nextDay}
              disabled={date >= fmt(new Date())}
              className="p-2 rounded-xl bg-white border border-gray-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Students",      value: stats.total,       icon: Moon,     color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "All 5 Prayers", value: stats.presentAll,  icon: CheckCircle2, color: "text-blue-600",    bg: "bg-blue-50" },
                { label: "Quran Today",   value: stats.quranDone,   icon: BookOpen, color: "text-purple-600",  bg: "bg-purple-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-2">
                  <div className={cn("rounded-xl p-2", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section tabs */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            {(["prayers", "quran"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all flex items-center gap-1.5",
                  activeSection === s ? "bg-white shadow-sm text-emerald-700" : "text-gray-500",
                )}
              >
                {s === "prayers" ? <Moon className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                {s === "prayers" ? "Prayers" : "Quran"}
              </button>
            ))}
          </div>

          {loadingIbadah ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No ibadah records for this date yet.<br />
              Records appear after first save.
            </div>
          ) : (
            <>
              {/* Prayers section */}
              {activeSection === "prayers" && (
                <>
                  {/* Header row with "mark all" */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3">
                    <div className="grid grid-cols-[1fr_repeat(5,_48px)] gap-1 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                      <span>Student</span>
                      {FARD.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => markAllPresent(f.key)}
                          className="text-center text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                          title={`Mark all ${f.label}`}
                        >
                          {f.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {rows.map((r, i) => (
                        <motion.div
                          key={r.studentId}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="grid grid-cols-[1fr_repeat(5,_48px)] gap-1 items-center px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400">{r.adno}</p>
                          </div>
                          {FARD.map((f) => (
                            <button
                              key={f.key}
                              onClick={() => togglePrayer(r.studentId, f.key)}
                              className={cn(
                                "w-10 h-10 mx-auto rounded-xl text-sm font-bold transition-all active:scale-95",
                                r[f.key] === "present"
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-400",
                              )}
                            >
                              {r[f.key] === "present" ? "✓" : "✗"}
                            </button>
                          ))}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-gray-600">Present / Prayed</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-600">Absent / Not recorded</span>
                    </div>
                    <span className="text-xs text-gray-400 self-center ml-auto">Tap column header to mark all</span>
                  </div>
                </>
              )}

              {/* Quran section */}
              {activeSection === "quran" && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3">
                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quran Pages Read Today</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <motion.div
                        key={r.studentId}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.adno}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setQuranPages(r.studentId, r.quranPages - 1)}
                            className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                          >−</button>
                          <span className="w-10 text-center text-lg font-bold text-blue-700">{r.quranPages}</span>
                          <button
                            onClick={() => setQuranPages(r.studentId, r.quranPages + 1)}
                            className="w-8 h-8 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Save button */}
          {rows.length > 0 && (
            <div className="sticky bottom-20 lg:bottom-6 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                  saved
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <><CheckCircle2 className="w-5 h-5" /> Records Saved</>
                ) : (
                  <><Save className="w-5 h-5" /> Save Ibadah Records</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
