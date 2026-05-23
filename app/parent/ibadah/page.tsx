import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getStudentIbadah, upsertStudentIbadah,
  type StudentIbadahResponse, type IbadahConfig, type StudentIbadahLog,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import {
  Moon, Calendar, Loader2, AlertCircle,
  Flame, BookOpen, ChevronDown, ChevronUp,
  CheckCircle2, Save, ChevronLeft, ChevronRight, Hash, ToggleLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type Prayer = typeof PRAYERS[number];

const PRAYER_META: Record<Prayer, { label: string; time: string; configKey: keyof IbadahConfig }> = {
  fajr:    { label: "Fajr",    time: "Dawn",      configKey: "enableFajr"    },
  dhuhr:   { label: "Dhuhr",   time: "Midday",    configKey: "enableDhuhr"   },
  asr:     { label: "Asr",     time: "Afternoon", configKey: "enableAsr"     },
  maghrib: { label: "Maghrib", time: "Sunset",    configKey: "enableMaghrib" },
  isha:    { label: "Isha",    time: "Night",     configKey: "enableIsha"    },
};

interface FormState {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  quranPages: number;
  customData: Record<string, boolean | number>;
  notes: string;
}

const EMPTY_FORM: FormState = {
  fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
  quranPages: 0, customData: {}, notes: "",
};

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function logToForm(log: StudentIbadahLog): FormState {
  return {
    fajr: log.fajr, dhuhr: log.dhuhr, asr: log.asr,
    maghrib: log.maghrib, isha: log.isha,
    quranPages: log.quranPages,
    customData: (log.customData as Record<string, boolean | number>) ?? {},
    notes: log.notes ?? "",
  };
}

export default function ParentIbadahPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const cid      = user?.clientId ?? "";
  const token    = accessToken ?? "";
  const ids      = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";

  const [ibadah, setIbadah]           = useState<StudentIbadahResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [date, setDate]               = useState(fmt(new Date()));
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [view, setView]               = useState<"form" | "history">("form");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token || !activeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentIbadah(cid, token, activeId, { limit: 90 });
      setIbadah(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, activeId]);

  useEffect(() => { load(); }, [load]);

  // Reset save state when date changes
  useEffect(() => {
    setSaved(false);
    setSaveError(null);
  }, [date]);

  // Pre-fill form from existing log when date or ibadah changes
  useEffect(() => {
    if (!ibadah) return;
    const log = ibadah.logs.find((l) => l.date.startsWith(date));
    setForm(log ? logToForm(log) : EMPTY_FORM);
  }, [date, ibadah]);

  const config = ibadah?.config ?? null;

  const activePrayers = useMemo(
    () => config ? PRAYERS.filter((p) => config[PRAYER_META[p].configKey] !== false) : [...PRAYERS],
    [config],
  );

  const customItems = config?.customItems ?? [];

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

  const togglePrayer = (p: Prayer) => {
    setForm((prev) => ({ ...prev, [p]: !prev[p] }));
    setSaved(false);
  };

  const markAll = () => {
    setForm((prev) => {
      const updates = Object.fromEntries(activePrayers.map((p) => [p, true]));
      return { ...prev, ...updates };
    });
    setSaved(false);
  };

  const toggleCustomBoolean = (key: string) => {
    setForm((prev) => ({
      ...prev,
      customData: { ...prev.customData, [key]: !prev.customData[key] },
    }));
    setSaved(false);
  };

  const setCustomNumber = (key: string, val: number, min = 0, max = 10000) => {
    setForm((prev) => ({
      ...prev,
      customData: { ...prev.customData, [key]: Math.min(max, Math.max(min, val)) },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!activeId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await upsertStudentIbadah(cid, token, activeId, {
        date,
        fajr:    form.fajr,
        dhuhr:   form.dhuhr,
        asr:     form.asr,
        maghrib: form.maghrib,
        isha:    form.isha,
        quranPages: form.quranPages,
        customData: Object.keys(form.customData).length > 0 ? form.customData : undefined,
        notes:   form.notes || undefined,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      // Update local log list
      setIbadah((prev) => {
        if (!prev) return prev;
        const exists = prev.logs.findIndex((l) => l.date.startsWith(date));
        const updated = { ...saved, date: saved.date };
        const logs =
          exists >= 0
            ? prev.logs.map((l, i) => (i === exists ? updated : l))
            : [updated, ...prev.logs].sort((a, b) => b.date.localeCompare(a.date));
        return { ...prev, logs };
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const prayerCount = activePrayers.filter((p) => form[p]).length;
  const dateLabel   = new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <DashboardLayout>
      <PageHeader
        title="Ibadah Tracker"
        subtitle="Track daily prayers & Quran"
        icon={Moon}
        back backHref="/parent"
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : !activeId ? (
        <div className="text-center py-16 text-gray-400 text-sm">No children linked to this account</div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : ibadah ? (
        <>
          {/* Student card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
              {ibadah.student.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{ibadah.student.name}</p>
              <p className="text-xs text-gray-400">
                {ibadah.student.class?.name ?? ""}{ibadah.student.class ? " · " : ""}{ibadah.student.adno}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-lg font-bold text-orange-600">{ibadah.streak}</span>
              <span className="text-[10px] text-gray-400">streak</span>
            </div>
          </div>

          {/* Weekly summary bar */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-3 mb-4">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-2">Last 7 Days</p>
            <div className="flex gap-2 items-end">
              {activePrayers.map((p) => {
                const count = ibadah.weekly[p];
                const pct   = count / 7;
                return (
                  <div key={p} className="flex-1 text-center">
                    <div className={cn(
                      "w-full h-1.5 rounded-full mb-1",
                      pct >= 0.9 ? "bg-emerald-500" : pct >= 0.7 ? "bg-amber-400" : "bg-red-400",
                    )} />
                    <p className={cn(
                      "text-xs font-bold",
                      pct >= 0.9 ? "text-emerald-700" : pct >= 0.7 ? "text-amber-600" : "text-red-600",
                    )}>{count}/7</p>
                    <p className="text-[9px] text-gray-500">{PRAYER_META[p].label.slice(0, 3)}</p>
                  </div>
                );
              })}
              {config?.enableQuranPages !== false && (
                <div className="flex-1 text-center border-l border-emerald-200 pl-2">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-blue-700">{ibadah.weekly.quranPages}</p>
                  <p className="text-[9px] text-gray-500">pages</p>
                </div>
              )}
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 mb-4 bg-white border border-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView("form")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                view === "form" ? "bg-emerald-600 text-white" : "text-gray-500",
              )}
            >
              <Moon className="w-3.5 h-3.5" /> Record
            </button>
            <button
              onClick={() => setView("history")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                view === "history" ? "bg-emerald-600 text-white" : "text-gray-500",
              )}
            >
              <Calendar className="w-3.5 h-3.5" /> History
            </button>
          </div>

          {/* RECORD VIEW */}
          {view === "form" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-28">
              {/* Date nav */}
              <div className="flex items-center gap-3">
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

              {/* Prayers */}
              {activePrayers.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Prayers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold",
                        prayerCount === activePrayers.length ? "text-emerald-600" : "text-gray-400",
                      )}>
                        {prayerCount}/{activePrayers.length}
                      </span>
                      <button
                        onClick={markAll}
                        className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        All ✓
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {activePrayers.map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePrayer(p)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left",
                          form[p] ? "bg-emerald-50/50" : "hover:bg-gray-50",
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 transition-all",
                          form[p] ? "bg-emerald-500 text-white shadow-sm scale-105" : "bg-gray-100 text-gray-400",
                        )}>
                          {form[p] ? "✓" : "✗"}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-bold", form[p] ? "text-emerald-800" : "text-gray-700")}>
                            {PRAYER_META[p].label}
                          </p>
                          <p className="text-xs text-gray-400">{PRAYER_META[p].time}</p>
                        </div>
                        <div className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-lg",
                          form[p] ? "bg-emerald-100 text-emerald-700" : "text-gray-400",
                        )}>
                          {form[p] ? "Prayed" : "Missed"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quran pages */}
              {config?.enableQuranPages !== false && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Quran Pages</p>
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setForm((f) => ({ ...f, quranPages: Math.max(0, f.quranPages - 1) }))}
                      className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:scale-95"
                    >−</button>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-blue-700">{form.quranPages}</p>
                      <p className="text-xs text-gray-400 mt-1">pages today</p>
                    </div>
                    <button
                      onClick={() => setForm((f) => ({ ...f, quranPages: Math.min(1000, f.quranPages + 1) }))}
                      className="w-12 h-12 rounded-2xl bg-blue-500 text-white text-2xl font-bold flex items-center justify-center active:scale-95"
                    >+</button>
                  </div>
                </div>
              )}

              {/* Custom items */}
              {customItems.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Additional Ibadah</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {customItems.map((item) => (
                      <div key={item.key} className="flex items-center gap-4 px-4 py-3.5">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {item.type === "boolean"
                              ? <ToggleLeft className="w-3 h-3 text-gray-400" />
                              : <Hash className="w-3 h-3 text-gray-400" />}
                            <span className="text-[10px] text-gray-400">{item.type === "boolean" ? "Yes/No" : `${item.min ?? 0}–${item.max ?? "∞"}`}</span>
                          </div>
                        </div>
                        {item.type === "boolean" ? (
                          <button
                            onClick={() => toggleCustomBoolean(item.key)}
                            className={cn(
                              "w-10 h-10 rounded-xl text-sm font-bold transition-all active:scale-95",
                              form.customData[item.key]
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-gray-100 text-gray-400",
                            )}
                          >
                            {form.customData[item.key] ? "✓" : "✗"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCustomNumber(item.key, ((form.customData[item.key] as number) ?? 0) - 1, item.min, item.max)}
                              className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                            >−</button>
                            <span className="w-8 text-center text-base font-bold text-purple-700">
                              {(form.customData[item.key] as number) ?? 0}
                            </span>
                            <button
                              onClick={() => setCustomNumber(item.key, ((form.customData[item.key] as number) ?? 0) + 1, item.min, item.max)}
                              className="w-8 h-8 rounded-xl bg-purple-500 text-white font-bold flex items-center justify-center"
                            >+</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => { setForm((f) => ({ ...f, notes: e.target.value })); setSaved(false); }}
                  placeholder="Any notes about today's ibadah..."
                  rows={2}
                  className="w-full text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-300"
                />
              </div>

              {/* Save error */}
              {saveError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                </div>
              )}

              {/* Sticky save */}
              <div className="sticky bottom-20 lg:bottom-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
                    saved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60",
                  )}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : saved ? (
                    <><CheckCircle2 className="w-5 h-5" /> Saved!</>
                  ) : (
                    <><Save className="w-5 h-5" /> Save {dateLabel} Ibadah</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* HISTORY VIEW */}
          {view === "history" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pb-20">
              {ibadah.logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Moon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  No ibadah records yet
                </div>
              ) : (
                ibadah.logs.map((log, i) => {
                  const prayersDone = activePrayers.filter((p) => log[p]).length;
                  const isExpanded  = expandedLog === log.id;
                  const logDate     = new Date(log.date).toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                  });

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                          prayersDone === activePrayers.length
                            ? "bg-emerald-500 text-white"
                            : prayersDone >= activePrayers.length * 0.6
                              ? "bg-amber-400 text-white"
                              : "bg-red-100 text-red-600",
                        )}>
                          {prayersDone}/{activePrayers.length}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{logDate}</p>
                          <p className="text-xs text-gray-400">
                            {prayersDone === activePrayers.length ? "All prayers" : `${prayersDone} prayers`}
                            {log.quranPages > 0 ? ` · ${log.quranPages} Quran pages` : ""}
                          </p>
                        </div>
                        <div className="hidden sm:flex gap-1 shrink-0">
                          {activePrayers.map((p) => (
                            <span
                              key={p}
                              className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold",
                                log[p] ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400",
                              )}
                            >
                              {PRAYER_META[p].label.slice(0, 1)}
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
                              <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${activePrayers.length}, 1fr)` }}>
                                {activePrayers.map((p) => (
                                  <div
                                    key={p}
                                    className={cn(
                                      "rounded-xl py-2.5 text-center text-[10px] font-bold",
                                      log[p] ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500",
                                    )}
                                  >
                                    <div className="text-sm">{log[p] ? "✓" : "✗"}</div>
                                    <div className="opacity-80 mt-0.5">{PRAYER_META[p].label}</div>
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
                              {/* Edit past records */}
                              <button
                                onClick={() => { setDate(fmt(new Date(log.date))); setView("form"); }}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                              >
                                Edit this day →
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </>
      ) : null}
    </DashboardLayout>
  );
}
