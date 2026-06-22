import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getStudentIbadah, upsertStudentIbadah,
  type StudentIbadahResponse, type IbadahConfig, type StudentIbadahLog,
} from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import type { PrayerStatus } from "@/lib/ibadah-api";
import { Icon } from "@iconify/react";
import {
  Moon, Calendar, Loader2, AlertCircle,
  Flame, BookOpen, ChevronDown, ChevronUp,
  CheckCircle2, Save, ChevronLeft, ChevronRight, Hash, ToggleLeft,
  Check, Sun, X, Users, List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { IbadahCounter } from "@/components/ui/IbadahCounter";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type Prayer = typeof PRAYERS[number];

const PRAYER_OPTIONS: { value: PrayerStatus | null; label: string; sub: string; icon: any; color: string }[] = [
  { value: null, label: "Missed", sub: "No prayer recorded", icon: X, color: "bg-gray-100 text-gray-500 hover:bg-gray-200" },
  { value: "NOT_PRAYABLE", label: "Excused", sub: "Ruqsa / Menses / Valid reason", icon: Moon, color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" },
  { value: "QALA", label: "Qala'", sub: "Prayed alone", icon: Sun, color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
  { value: "ADA", label: "Ada'", sub: "Prayed on time", icon: Check, color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" },
  { value: "JAMA", label: "Jama'", sub: "In congregation", icon: Users, color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
];

const PRAYER_META: Record<Prayer, { label: string; time: string; configKey: keyof IbadahConfig }> = {
  fajr:    { label: "Fajr",    time: "Dawn",      configKey: "enableFajr"    },
  dhuhr:   { label: "Dhuhr",   time: "Midday",    configKey: "enableDhuhr"   },
  asr:     { label: "Asr",     time: "Afternoon", configKey: "enableAsr"     },
  maghrib: { label: "Maghrib", time: "Sunset",    configKey: "enableMaghrib" },
  isha:    { label: "Isha",    time: "Night",     configKey: "enableIsha"    },
};

interface FormState {
  fajr: PrayerStatus | null;
  dhuhr: PrayerStatus | null;
  asr: PrayerStatus | null;
  maghrib: PrayerStatus | null;
  isha: PrayerStatus | null;
  quranPages: number;
  customData: Record<string, boolean | number | string>;
  notes: string;
}

function getEmptyForm(): FormState {
  return {
    fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null,
    quranPages: 0, customData: {}, notes: "",
  };
}

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function logToForm(log: StudentIbadahLog): FormState {
  return {
    fajr: log.fajr, dhuhr: log.dhuhr, asr: log.asr,
    maghrib: log.maghrib, isha: log.isha,
    quranPages: log.quranPages,
    customData: (log.customData as Record<string, boolean | number | string>) ?? {},
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
  const [form, setForm]               = useState<FormState>(getEmptyForm());
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [drawerPrayer, setDrawerPrayer] = useState<Prayer | null>(null);
  const [drawerCustomEnum, setDrawerCustomEnum] = useState<string | null>(null);
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
    const log = ibadah.logs.find((l) => l.date.split("T")[0] === date);
    setForm(log ? logToForm(log) : getEmptyForm());
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

  const setPrayer = (p: Prayer, value: PrayerStatus | null) => {
    setForm((prev) => ({ ...prev, [p]: value }));
    setSaved(false);
  };

  const markAll = () => {
    setForm((prev) => {
      const updates = Object.fromEntries(activePrayers.map((p) => [p, 'ADA' as PrayerStatus]));
      return { ...prev, ...updates };
    });
    setSaved(false);
  };

  const toggleCustomBoolean = (key: string) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      next[key] = !prev.customData[key];
      return { ...prev, customData: next };
    });
    setSaved(false);
  };

  const setCustomNumber = (key: string, val: number, min = 0, max = 10000) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      next[key] = Math.min(max, Math.max(min, val));
      return { ...prev, customData: next };
    });
    setSaved(false);
  };

  const setCustomEnum = (key: string, val: string | null) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      if (val) next[key] = val;
      else delete next[key];
      return { ...prev, customData: next };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!activeId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await upsertStudentIbadah(cid, token, activeId, {
        date,
        fajr:    form.fajr ?? undefined,
        dhuhr:   form.dhuhr ?? undefined,
        asr:     form.asr ?? undefined,
        maghrib: form.maghrib ?? undefined,
        isha:    form.isha ?? undefined,
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

  const prayerCount = activePrayers.filter((p) => form[p] != null).length;
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
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <div className="flex gap-1">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 flex-1 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
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
                        All Ada'
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {activePrayers.map((p) => {
                      const status = form[p];
                      const opt = PRAYER_OPTIONS.find((o) => o.value === status);
                      const Icon = opt?.icon ?? Moon;
                      return (
                        <div
                          key={p}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-80 transition-all first:rounded-t-none last:rounded-b-none",
                            status === "ADA" && "bg-gradient-to-r from-emerald-50/60 to-transparent",
                            status === "QALA" && "bg-gradient-to-r from-amber-50/60 to-transparent",
                            status === "JAMA" && "bg-gradient-to-r from-blue-50/60 to-transparent",
                            status === "NOT_PRAYABLE" && "bg-gradient-to-r from-purple-50/60 to-transparent",
                            !status && "hover:bg-gray-50",
                          )}
                          onClick={() => setDrawerPrayer(p)}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                            status === "ADA" && "text-emerald-500",
                            status === "QALA" && "text-amber-500",
                            status === "JAMA" && "text-blue-500",
                            status === "NOT_PRAYABLE" && "text-purple-500",
                            !status && "text-gray-300",
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {PRAYER_META[p].label}
                            </p>
                            <p className="text-xs text-gray-400">{PRAYER_META[p].time}</p>
                          </div>
                          <span className={cn(
                            "text-[11px] font-medium transition-all",
                            status === "ADA" && "text-emerald-500",
                            status === "QALA" && "text-amber-500",
                            status === "JAMA" && "text-blue-500",
                            status === "NOT_PRAYABLE" && "text-purple-500",
                            !status && "text-gray-300",
                          )}>
                            {opt?.label ?? "—"}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quran pages */}
              {config?.enableQuranPages !== false && (
                <IbadahCounter
                  label="Quran Pages"
                  icon={<BookOpen className="w-4 h-4" />}
                  value={form.quranPages}
                  onChange={(val) => setForm((f) => ({ ...f, quranPages: val }))}
                  suffix="pages"
                />
              )}

              {/* Custom items */}
              {customItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-0.5">Additional Ibadah</p>
                  {customItems.map((item) =>
                    item.type === "boolean" ? (
                      <div key={item.key} className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Yes / No</p>
                        </div>
                        <button
                          onClick={() => toggleCustomBoolean(item.key)}
                          className={cn(
                            "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                            form.customData[item.key] ? "bg-emerald-500" : "bg-gray-200",
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                            form.customData[item.key] ? "translate-x-5" : "translate-x-0",
                          )} />
                        </button>
                      </div>
                    ) : item.type === "enum" ? (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
                        onClick={() => setDrawerCustomEnum(item.key)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400">
                            {item.options?.map((o) => o.label).join(" · ") ?? ""}
                          </p>
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          form.customData[item.key] ? "text-purple-600" : "text-gray-300",
                        )}>
                          {(form.customData[item.key] as string) ?? "—"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </div>
                    ) : (
                      <IbadahCounter
                        key={item.key}
                        label={item.label}
                        icon={<Hash className="w-4 h-4" />}
                        value={(form.customData[item.key] as number) ?? 0}
                        onChange={(val) => setCustomNumber(item.key, val, item.min, item.max)}
                        min={item.min ?? 0}
                        max={item.max ?? 10000}
                      />
                    )
                  )}
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
                  const prayersDone = activePrayers.filter((p) => log[p] != null).length;
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
                                  log[p] != null ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400",
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
                                      log[p] != null ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500",
                                    )}
                                  >
                                    <div className="text-sm">{log[p] ?? "—"}</div>
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
                              {customItems.length > 0 && log.customData && (
                                <div className="space-y-1.5">
                                  {customItems.map((item) => {
                                    const val = log.customData?.[item.key];
                                    if (val === undefined || val === null) return null;
                                    const enumOpt = item.type === "enum" ? item.options?.find((o) => o.label === val) : null;
                                    return (
                                      <div key={item.key} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                                        {item.type === "boolean" ? (
                                          <ToggleLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        ) : item.type === "enum" && enumOpt ? (
                                          <Icon icon={enumOpt.icon} className="w-4 h-4 text-blue-500 shrink-0" />
                                        ) : (
                                          <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        )}
                                        <p className="text-sm text-blue-700">
                                          <span className="font-bold">{item.label}:</span>{" "}
                                          {item.type === "boolean" ? (val ? "Yes" : "No") : String(val)}
                                        </p>
                                      </div>
                                    );
                                  })}
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

      {/* Prayer status drawer */}
      <AnimatePresence>
        {drawerPrayer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setDrawerPrayer(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                      {PRAYER_META[drawerPrayer].time}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {PRAYER_META[drawerPrayer].label}
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerPrayer(null)}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {PRAYER_OPTIONS.map((opt) => {
                    const selected = form[drawerPrayer] === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setPrayer(drawerPrayer, opt.value);
                          setDrawerPrayer(null);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                          selected
                            ? opt.color + " border-current"
                            : "border-gray-100 hover:border-gray-200 bg-white",
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                          selected ? "bg-white/80" : "bg-gray-50",
                        )}>
                          <opt.icon className={cn(
                            "w-5 h-5",
                            selected ? "text-current" : "text-gray-400",
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-bold",
                            selected ? "text-current" : "text-gray-800",
                          )}>
                            {opt.label}
                          </p>
                          <p className={cn(
                            "text-xs",
                            selected ? "opacity-70" : "text-gray-400",
                          )}>
                            {opt.sub}
                          </p>
                        </div>
                        {selected && (
                          <div className="w-6 h-6 rounded-full bg-current flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom enum drawer */}
      <AnimatePresence>
        {drawerCustomEnum && (() => {
          const item = customItems.find((i) => i.key === drawerCustomEnum);
          if (!item?.options) return null;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setDrawerCustomEnum(null)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Additional Ibadah</p>
                      <p className="text-lg font-bold text-gray-900">{item.label}</p>
                    </div>
                    <button
                      onClick={() => setDrawerCustomEnum(null)}
                      className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {[{ icon: "", label: "Not recorded", color: "" }, ...item.options].map((opt) => {
                      const val = form.customData[drawerCustomEnum] as string | undefined;
                      const selected = opt.label && val === opt.label;
                      const isNone = !opt.label;
                      const colorMap: Record<string, string> = {
                        emerald: "bg-emerald-500", amber: "bg-amber-500", blue: "bg-blue-500",
                        purple: "bg-purple-500", rose: "bg-rose-500", cyan: "bg-cyan-500",
                        orange: "bg-orange-500", lime: "bg-lime-500",
                      };
                      const colorMatch = colorMap[opt.color] ?? "bg-gray-400";
                      return (
                        <button
                          key={opt.label || "none"}
                          onClick={() => {
                            setCustomEnum(drawerCustomEnum, opt.label || null);
                            setDrawerCustomEnum(null);
                          }}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                            selected ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-gray-200 bg-white",
                          )}
                        >
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white",
                            selected ? colorMatch : "bg-gray-50 text-gray-400",
                          )}>
                            {opt.icon ? <Icon icon={opt.icon} className="w-5 h-5" /> : <X className="w-5 h-5 text-gray-400" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "text-sm font-bold",
                              selected ? "text-emerald-700" : "text-gray-800",
                            )}>
                              {opt.label || "Not recorded"}
                            </p>
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </DashboardLayout>
  );
}
