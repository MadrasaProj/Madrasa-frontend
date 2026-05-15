import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudentIbadah, type StudentIbadahResponse } from "@/lib/ibadah-api";
import { getStudent, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import {
  Moon, Star, Calendar, Loader2, AlertCircle, TrendingUp,
  Flame, BookOpen, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

interface ChildData {
  studentId: string;
  student: StudentRecord | null;
  ibadah: StudentIbadahResponse | null;
  error: string | null;
}

export default function ParentIbadahPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids   = user?.accessibleStudentIds ?? [];
  const effectiveId = activeStudentId ?? (ids[0] ?? "");

  const [active, setActive]           = useState<ChildData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token || !effectiveId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [student, ibadah] = await Promise.all([
        getStudent(cid, token, effectiveId).catch(() => null),
        getStudentIbadah(cid, token, effectiveId).catch((e: Error) => ({ error: e.message })),
      ]);
      if ("error" in ibadah) {
        setActive({ studentId: effectiveId, student: student as StudentRecord, ibadah: null, error: (ibadah as any).error });
      } else {
        setActive({ studentId: effectiveId, student: student as StudentRecord, ibadah, error: null });
      }
    } catch (e) {
      setActive({ studentId: effectiveId, student: null, ibadah: null, error: (e as Error).message });
    }
    setLoading(false);
  }, [cid, token, effectiveId]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Tracker"
        subtitle="Prayer & Quran history"
        icon={Moon}
        back backHref="/parent"
        action={
          <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !effectiveId ? (
        <div className="text-center py-16 text-gray-400 text-sm">No children linked to this account</div>
      ) : (
        <>
          {active?.error ? (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {active.error}
            </div>
          ) : active?.ibadah ? (
            <>
              {/* Student card + streak */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-base shrink-0">
                  {active.ibadah.student.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{active.ibadah.student.name}</p>
                  <p className="text-xs text-gray-400">{active.student?.class?.name ?? ""} · {active.ibadah.student.adno}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-lg font-bold text-orange-600">{active.ibadah.streak}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">day streak</p>
                </div>
              </div>

              {/* Weekly summary */}
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 mb-5">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Last 7 Days</p>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {PRAYERS.map((p) => {
                    const count = active.ibadah!.weekly[p];
                    const pct = count / 7;
                    return (
                      <div key={p} className="text-center">
                        <div className={cn(
                          "w-full h-1.5 rounded-full mb-1",
                          pct >= 0.9 ? "bg-emerald-500" : pct >= 0.7 ? "bg-amber-400" : "bg-red-400",
                        )}>
                          <div className="h-full rounded-full bg-white/50" style={{ width: `${(1 - pct) * 100}%`, marginLeft: `${pct * 100}%` }} />
                        </div>
                        <p className={cn(
                          "text-sm font-bold",
                          pct >= 0.9 ? "text-emerald-700" : pct >= 0.7 ? "text-amber-600" : "text-red-600",
                        )}>{count}/7</p>
                        <p className="text-[10px] text-gray-500">{PRAYER_LABELS[p].slice(0, 3)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs bg-white/60 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="font-semibold">Quran this week</span>
                  </div>
                  <span className="font-bold text-blue-800">{active.ibadah.weekly.quranPages} pages</span>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex gap-1.5 mb-5 bg-white border border-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setShowHistory(false)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors",
                    !showHistory ? "bg-emerald-600 text-white" : "text-gray-500",
                  )}
                >
                  Summary
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                    showHistory ? "bg-emerald-600 text-white" : "text-gray-500",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" /> History
                </button>
              </div>

              {/* Summary view */}
              {!showHistory && (
                <div className="space-y-3 pb-20">
                  {/* Prayer stats card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Prayer Performance</p>
                    {PRAYERS.map((p) => {
                      const total = active.ibadah!.logs.length;
                      const done  = active.ibadah!.logs.filter((l) => l[p]).length;
                      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                      return (
                        <div key={p} className="flex items-center gap-3 mb-3 last:mb-0">
                          <p className="text-sm font-semibold text-gray-700 w-16 shrink-0">{PRAYER_LABELS[p]}</p>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className={cn(
                            "text-xs font-bold w-10 text-right shrink-0",
                            pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600",
                          )}>{pct}%</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Streak card */}
                  <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                      <Flame className="w-7 h-7 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{active.ibadah.streak} days</p>
                      <p className="text-sm text-orange-700">
                        {active.ibadah.streak === 0
                          ? "No current streak — keep going!"
                          : active.ibadah.streak >= 7
                            ? "Amazing streak! Keep it up!"
                            : "Good streak — don't break it!"}
                      </p>
                    </div>
                  </div>

                  {/* Total quran */}
                  <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">
                        {active.ibadah.logs.reduce((s, l) => s + l.quranPages, 0)}
                      </p>
                      <p className="text-sm text-blue-600">Total Quran pages (last 90 days)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* History view */}
              {showHistory && (
                <div className="space-y-2 pb-20">
                  {active.ibadah.logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      No ibadah records yet
                    </div>
                  ) : (
                    active.ibadah.logs.map((log, i) => {
                      const prayerCount = PRAYERS.filter((p) => log[p]).length;
                      const isExpanded = expandedLog === log.id;
                      const dateLabel  = new Date(log.date).toLocaleDateString("en-GB", {
                        weekday: "short", day: "numeric", month: "short",
                      });

                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                        >
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          >
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                              <Moon className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{dateLabel}</p>
                              <p className="text-xs text-gray-400">
                                {prayerCount}/5 prayers
                                {log.quranPages > 0 ? ` · ${log.quranPages} Quran pages` : ""}
                              </p>
                            </div>

                            {/* Prayer mini pills */}
                            <div className="hidden sm:flex gap-1 shrink-0">
                              {PRAYERS.map((p) => (
                                <span
                                  key={p}
                                  className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold",
                                    log[p] ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400",
                                  )}
                                >
                                  {PRAYER_LABELS[p].slice(0, 1)}
                                </span>
                              ))}
                            </div>

                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                              >
                                <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3 space-y-3">
                                  <div className="grid grid-cols-5 gap-1.5">
                                    {PRAYERS.map((p) => (
                                      <div
                                        key={p}
                                        className={cn(
                                          "rounded-xl py-2.5 text-center text-[10px] font-bold",
                                          log[p] ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500",
                                        )}
                                      >
                                        <div className="text-sm">{log[p] ? "✓" : "✗"}</div>
                                        <div className="opacity-80 mt-0.5">{PRAYER_LABELS[p]}</div>
                                      </div>
                                    ))}
                                  </div>
                                  {log.quranPages > 0 && (
                                    <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                                      <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <p className="text-sm text-blue-700">
                                        <span className="font-bold">{log.quranPages}</span> Quran pages
                                      </p>
                                    </div>
                                  )}
                                  {log.notes && (
                                    <p className="text-xs text-gray-500 italic">{log.notes}</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
