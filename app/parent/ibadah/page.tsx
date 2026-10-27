import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import type { IbadahConfig, StudentIbadahLog } from "@/lib/ibadah-api";
import type { PrayerStatus } from "@/lib/ibadah-api";
import { useAuthStore } from "@/store/auth";
import { useStudentIbadah, useUpsertStudentIbadah } from "@/lib/queries";
import { Icon } from "@iconify/react";
import {
  Moon, Loader2, AlertCircle,
  Flame, BookOpen, ChevronDown, ChevronUp,
  Save, Hash, ToggleLeft,
  Check, Sun, X, Users, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { IbadahCounter } from "@/components/ui/IbadahCounter";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ScrollableDateNavigator } from "@/components/ScrollableDateNavigator";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type Prayer = typeof PRAYERS[number];

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

function fmt(d: Date) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

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
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";

  const [date, setDate] = useState(fmt(new Date()));
  const [form, setForm] = useState<FormState>(getEmptyForm());
  const [drawerPrayer, setDrawerPrayer] = useState<Prayer | null>(null);
  const [drawerCustomEnum, setDrawerCustomEnum] = useState<string | null>(null);
  const [dirtyPrayers, setDirtyPrayers] = useState<Set<Prayer>>(new Set());
  const [recordOpen, setRecordOpen] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { lang } = useLanguageStore();

  const prayerOptions = [
    { value: null as PrayerStatus | null, label: t("parentPages", "missedLabel", lang), sub: t("parentPages", "missedSub", lang), icon: X, color: "bg-gray-50 text-gray-500" },
    { value: "NOT_PRAYABLE" as PrayerStatus, label: t("parentPages", "excusedLabel", lang), sub: t("parentPages", "excusedSub", lang), icon: Check, color: "bg-primary-50 text-primary-600" },
    { value: "QALA" as PrayerStatus, label: t("parentPages", "qalaLabel", lang), sub: t("parentPages", "qalaSub", lang), icon: Sun, color: "bg-amber-50 text-amber-600" },
    { value: "ADA" as PrayerStatus, label: t("parentPages", "adaLabel", lang), sub: t("parentPages", "adaSub", lang), icon: Check, color: "bg-primary-50 text-primary-600" },
    { value: "JAMA" as PrayerStatus, label: t("parentPages", "jama", lang), sub: t("parentPages", "jamaSub", lang), icon: Users, color: "bg-blue-50 text-blue-600" },
  ];

  const prayerMeta: Record<Prayer, { label: string; time: string; configKey: keyof IbadahConfig }> = {
    fajr: { label: t("parentPages", "fajrName", lang), time: t("parentPages", "dawn", lang), configKey: "enableFajr" },
    dhuhr: { label: t("parentPages", "dhuhrName", lang), time: t("parentPages", "midday", lang), configKey: "enableDhuhr" },
    asr: { label: t("parentPages", "asrName", lang), time: t("parentPages", "afternoon", lang), configKey: "enableAsr" },
    maghrib: { label: t("parentPages", "maghribName", lang), time: t("parentPages", "sunset", lang), configKey: "enableMaghrib" },
    isha: { label: t("parentPages", "ishaName", lang), time: t("parentPages", "night", lang), configKey: "enableIsha" },
  };

  const { data: ibadah, isLoading, error } = useStudentIbadah(
    { clientId: cid, token },
    activeId,
    { limit: 90 },
  );
  const saveMutation = useUpsertStudentIbadah({ clientId: cid, token }, activeId);

  useEffect(() => {
    setDirtyPrayers(new Set());
  }, [date]);

  // Pre-fill form from existing log when date or ibadah changes
  useEffect(() => {
    if (!ibadah) return;
    const log = ibadah.logs.find((l) => l.date.split("T")[0] === date);
    setForm(log ? logToForm(log) : getEmptyForm());
  }, [date, ibadah]);

  const config = ibadah?.config ?? null;

  const activePrayers = useMemo(
    () => config ? PRAYERS.filter((p) => config[prayerMeta[p].configKey] !== false) : [...PRAYERS],
    [config],
  );

  const customItems = config?.customItems ?? [];

  const openRecord = (recordDate: string) => {
    const log = ibadah?.logs.find((entry) => entry.date.split("T")[0] === recordDate);
    setDate(recordDate);
    setForm(log ? logToForm(log) : getEmptyForm());
    setDirtyPrayers(new Set());
    setDrawerPrayer(null);
    setDrawerCustomEnum(null);
    saveMutation.reset();
    setRecordOpen(true);
  };

  const onRecordOpenChange = (open: boolean) => {
    setRecordOpen(open);
    if (!open) {
      setDrawerPrayer(null);
      setDrawerCustomEnum(null);
    }
  };

  const setPrayer = (p: Prayer, value: PrayerStatus | null) => {
    setForm((prev) => ({ ...prev, [p]: value }));
    setDirtyPrayers((prev) => new Set(prev).add(p));
  };

  const markAll = () => {
    setForm((prev) => {
      const updates = Object.fromEntries(activePrayers.map((p) => [p, 'ADA' as PrayerStatus]));
      return { ...prev, ...updates };
    });
    setDirtyPrayers((prev) => new Set([...prev, ...activePrayers]));
  };

  const toggleCustomBoolean = (key: string) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      next[key] = !prev.customData[key];
      return { ...prev, customData: next };
    });
  };

  const setCustomNumber = (key: string, val: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      next[key] = Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, val));
      return { ...prev, customData: next };
    });
  };

  const setCustomEnum = (key: string, val: string | null) => {
    setForm((prev) => {
      const next = { ...prev.customData };
      if (val) next[key] = val;
      else delete next[key];
      return { ...prev, customData: next };
    });
  };

  const handleSave = async () => {
    if (!activeId) return;
    try {
      await saveMutation.mutateAsync({
        date,
        fajr: dirtyPrayers.has("fajr") ? (form.fajr ?? undefined) : undefined,
        dhuhr: dirtyPrayers.has("dhuhr") ? (form.dhuhr ?? undefined) : undefined,
        asr: dirtyPrayers.has("asr") ? (form.asr ?? undefined) : undefined,
        maghrib: dirtyPrayers.has("maghrib") ? (form.maghrib ?? undefined) : undefined,
        isha: dirtyPrayers.has("isha") ? (form.isha ?? undefined) : undefined,
        quranPages: form.quranPages,
        customData: Object.keys(form.customData).length > 0 ? form.customData : undefined,
        notes: form.notes || undefined,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      setRecordOpen(false);
    } catch (e) {
      // surfaced via mutation state
    }
  };

  const prayerCount = activePrayers.filter((p) => form[p] != null).length;
  const dateLabel = new Date(date).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
  const errorMessage = error instanceof Error ? error.message : null;
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : null;

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "ibadahTitle", lang)} />

      <div className="px-4">
        {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      ) : !activeId ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t("parentPages", "noChildren", lang)}</div>
      ) : errorMessage ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
        </div>
      ) : ibadah ? (
        <>
        {/* Weekly summary */}
        <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-950">{t("parentPages", "prayersThisWeek", lang)}</h2>
              <p className="truncate text-xs text-gray-500">{ibadah.student.name}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
              <Flame className="size-3.5 text-orange-500" />
              {ibadah.streak} {t("parentPages", "dayStreak", lang)}
            </span>
          </div>
          <div className="p-4 sm:p-5">
          <div className="flex gap-2" style={{ height: 112 }}>
            {activePrayers.map((p) => {
              const count = ibadah.weekly[p];
              const pct = count / 7;
              const fillH = Math.round(pct * 100);
              return (
                <div key={p} className="flex-1 flex flex-col items-center gap-1.5 justify-end relative" style={{ height: 100 }}>
                  <div className="w-full h-full rounded-lg bg-gray-100 overflow-hidden relative flex items-end justify-center">
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 rounded-b-lg flex items-center justify-center text-sm font-bold text-white transition-all",
                        count >= 7 && "bg-gradient-to-t from-primary-700 to-primary-500",
                        count === 6 && "bg-gradient-to-t from-primary-600 to-primary-400",
                        count >= 4 && count <= 5 && "bg-gradient-to-t from-primary-500 to-primary-300",
                        count <= 3 && "bg-gradient-to-t from-primary-400 to-primary-200",
                      )}
                      style={{ height: `${fillH}%` }}
                    >
                      {count}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">{prayerMeta[p].label.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>

          {config?.enableQuranPages !== false && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-600" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{t("parentPages", "quranPages", lang)}</p>
                  <p className="text-[11px] text-gray-500">{t("parentPages", "pagesReadThisWeek", lang)}</p>
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-primary-700">{ibadah.weekly.quranPages}</span>
            </div>
          )}
          </div>
        </section>

        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-950">{t("parentPages", "historyLabel", lang)}</h2>
        </div>

        <div className="fixed bottom-24 right-4 z-40 lg:bottom-6">
          <Button type="button" size="lg" onClick={() => openRecord(fmt(new Date()))}>
            <Plus /> {t("parentPages", "record", lang)}
          </Button>
        </div>

        <ResponsivePopover
          open={recordOpen}
          onOpenChange={onRecordOpenChange}
          className="h-dvh! max-h-dvh! w-screen! rounded-none!"
          title={t("parentPages", "record", lang)}
          description={ibadah.student.name}
          contentClassName="px-4 pb-6"
          footer={
            <div className="border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {saveError && <p role="alert" className="mb-2 flex items-center gap-2 text-sm text-red-600"><AlertCircle className="size-4 shrink-0" />{saveError}</p>}
              <Button type="button" size="lg" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t("parentPages", "saveFor", lang)} {dateLabel}
              </Button>
            </div>
          }
        >
        <div className="mx-auto max-w-2xl space-y-4 pt-2">
          <ScrollableDateNavigator
            date={date}
            onDateChange={setDate}
            pickerTitle={t("parentPages", "record", lang)}
            hideCalendarButton
          />

        {/* Prayers */}
        {activePrayers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-primary-600" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t("parentPages", "fiveDailyPrayers", lang)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-bold",
                prayerCount === activePrayers.length ? "text-primary-600" : "text-gray-400",
              )}>
                {prayerCount}/{activePrayers.length}
              </span>
              <button
                onClick={markAll}
                className="text-[10px] font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors"
              >
                {t("parentPages", "allAda", lang)}
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {activePrayers.map((p) => {
              const status = form[p];
              const opt = prayerOptions.find((o) => o.value === status);
              const Icon = opt?.icon ?? Moon;
              return (
                <div
                  key={p}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-80 transition-all first:rounded-t-none last:rounded-b-none",
                    status === "ADA" && "bg-gradient-to-r from-primary-50/60 to-transparent",
                    status === "NOT_PRAYABLE" && "bg-gradient-to-r from-primary-50/60 to-transparent",
                    status === "QALA" && "bg-gradient-to-r from-amber-50/60 to-transparent",
                    status === "JAMA" && "bg-gradient-to-r from-blue-50/60 to-transparent",
                    !status && "hover:bg-gray-50",
                  )}
                  onClick={() => setDrawerPrayer(p)}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                    (status === "ADA" || status === "NOT_PRAYABLE") && "text-primary-500",
                    status === "QALA" && "text-amber-500",
                    status === "JAMA" && "text-blue-500",
                    !status && "text-gray-300",
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {prayerMeta[p].label}
                    </p>
                    <p className="text-xs text-gray-400">{prayerMeta[p].time}</p>
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium transition-all",
                    (status === "ADA" || status === "NOT_PRAYABLE") && "text-primary-500",
                    status === "QALA" && "text-amber-500",
                    status === "JAMA" && "text-blue-500",
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
          label={t("parentPages", "quranPages", lang)}
          icon={<BookOpen className="w-4 h-4" />}
          value={form.quranPages}
          onChange={(val) => setForm((f) => ({ ...f, quranPages: val }))}
          suffix={t("parentPages", "pages", lang)}
        />
        )}

        {/* Custom items */}
        {customItems.length > 0 && (
        <div className="bg-white rounded-xl border border-primary-100/50 overflow-hidden divide-y divide-primary-50">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-primary-700">{t("parentPages", "additionalIbadah", lang)}</p>
          </div>
          {customItems.map((item) =>
            item.type === "boolean" ? (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-gray-700">{item.label}</p>
              <button
                onClick={() => toggleCustomBoolean(item.key)}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors shrink-0",
                  form.customData[item.key] ? "bg-primary-500" : "bg-gray-200",
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform",
                  form.customData[item.key] ? "translate-x-5" : "translate-x-0",
                )} />
              </button>
            </div>
            ) : item.type === "enum" ? (
            <div
              key={item.key}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary-50/30 transition-colors"
              onClick={() => setDrawerCustomEnum(item.key)}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-700">{item.label}</p>
              </div>
              <span className="text-xs font-medium text-primary-600">
                {(form.customData[item.key] as string) ?? "—"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-200 shrink-0" />
            </div>
            ) : (
            <div key={item.key} className="p-3">
              <IbadahCounter
                label={item.label}
                icon={<Hash className="w-4 h-4" />}
                value={(form.customData[item.key] as number) ?? 0}
                onChange={(val) => setCustomNumber(item.key, val, item.min, item.max)}
                min={item.min ?? 0}
                max={item.max ?? Number.MAX_SAFE_INTEGER}
              />
            </div>
            )
          )}
        </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-primary-100/50 px-4 py-3">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={t("parentPages", "addNote", lang)}
            rows={1}
            className="w-full text-sm text-gray-500 resize-none focus:outline-none placeholder-gray-300 bg-transparent"
          />
        </div>

        </div>
      {/* Prayer status drawer */}
      <AnimatePresence>
        {drawerPrayer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setDrawerPrayer(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="relative px-5 pt-6 pb-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                      <Moon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{prayerMeta[drawerPrayer].time}</p>
                      <p className="text-base font-semibold text-gray-900">{prayerMeta[drawerPrayer].label}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerPrayer(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-1">
                  {prayerOptions.map((opt) => {
                    const selected = form[drawerPrayer] === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setPrayer(drawerPrayer, opt.value);
                          setDrawerPrayer(null);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                          selected ? "bg-gradient-to-r " + opt.color : "hover:bg-gray-50",
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          selected ? "bg-white/80" : "bg-gray-100",
                        )}>
                          <opt.icon className={cn(
                            "w-4 h-4",
                            selected ? "text-current" : "text-gray-400",
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            selected ? "text-current font-semibold" : "text-gray-700",
                          )}>
                            {opt.label}
                          </p>
                          <p className={cn(
                            "text-[11px]",
                            selected ? "text-current/70" : "text-gray-400",
                          )}>
                            {opt.sub}
                          </p>
                        </div>
                        {selected && (
                          <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-current" />
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
                className="fixed inset-0 bg-black/40 z-50"
                onClick={() => setDrawerCustomEnum(null)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto"
              >
                <div className="px-5 pt-6 pb-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                        <Hash className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-base font-semibold text-gray-900">{item.label}</p>
                    </div>
                    <button onClick={() => setDrawerCustomEnum(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {[{ icon: "", label: t("parentPages", "notRecorded", lang), color: "" }, ...item.options].map((opt) => {
                      const val = form.customData[drawerCustomEnum] as string | undefined;
                      const selected = opt.label && val === opt.label;
                      const colorMap: Record<string, string> = {
                        emerald: "text-primary-600", amber: "text-amber-600", blue: "text-blue-600",
                        purple: "text-purple-600", rose: "text-rose-600", cyan: "text-cyan-600",
                        orange: "text-orange-600", lime: "text-lime-600",
                      };
                      const colorMatch = colorMap[opt.color] ?? "text-gray-600";
                      return (
                        <button
                          key={opt.label || "none"}
                          onClick={() => {
                            setCustomEnum(drawerCustomEnum, opt.label || null);
                            setDrawerCustomEnum(null);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                            selected ? "bg-primary-50" : "hover:bg-gray-50",
                          )}
                        >
                          {opt.icon ? (
                            <Icon icon={opt.icon} className={cn("w-4 h-4 shrink-0", selected ? colorMatch : "text-gray-400")} />
                          ) : (
                            <X className={cn("w-4 h-4 shrink-0", selected ? "text-gray-500" : "text-gray-300")} />
                          )}
                          <div className="flex-1">
                            <p className={cn("text-sm", selected ? "font-semibold text-primary-700" : "text-gray-600")}>
                              {opt.label || t("parentPages", "notRecorded", lang)}
                            </p>
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
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
        </ResponsivePopover>

        {/* History */}
        <section data-ui-style="classic" className="card mx-0 mb-20 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
          {ibadah.logs.length === 0 ? (
            <div className="text-center py-16">
              <Moon className="w-10 h-10 mx-auto mb-3 text-primary-200" />
              <p className="text-sm text-gray-400">{t("parentPages", "noHistory", lang)}</p>
            </div>
          ) : (
            ibadah.logs.map((log, i) => {
              const prayersDone = activePrayers.filter((p) => log[p] != null).length;
              const isExpanded = expandedLog === log.id;
              const logDate = new Date(log.date).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-GB", {
                weekday: "short", day: "numeric", month: "short",
              });

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold",
                      prayersDone === activePrayers.length
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-500",
                    )}>
                      {prayersDone}/{activePrayers.length}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{logDate}</p>
                      <p className="text-xs text-gray-500">
                        {prayersDone === activePrayers.length ? t("parentPages", "allPrayers", lang) : `${prayersDone} ${t("parentPages", "xPrayers", lang)}`}
                        {log.quranPages > 0 ? ` · ${log.quranPages} ${t("parentPages", "pages", lang)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {activePrayers.map((p) => (
                        <div
                          key={p}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log[p] != null ? "bg-primary-500" : "bg-gray-200",
                          )}
                        />
                      ))}
                    </div>
                    {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-gray-100 bg-gray-50/40 px-4 py-4">
                          <div className="flex gap-1.5">
                            {activePrayers.map((p) => (
                              <div
                                key={p}
                                className={cn(
                                  "flex-1 rounded-lg py-2 text-center text-[10px] font-semibold",
                                  log[p] != null ? "bg-primary-50 text-primary-700" : "bg-gray-50 text-gray-400",
                                )}
                              >
                                <div>{prayerOptions.find((o) => o.value === log[p])?.label ?? "—"}</div>
                                <div className="mt-0.5 opacity-70">{prayerMeta[p].label}</div>
                              </div>
                            ))}
                          </div>
                          {log.quranPages > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-primary-600">
                              <BookOpen className="w-3 h-3" /> {log.quranPages} {t("parentPages", "pages", lang)}
                            </div>
                          )}
                          {customItems.length > 0 && log.customData && (
                            <div className="space-y-1">
                              {customItems.map((item) => {
                                const val = log.customData?.[item.key];
                                if (val === undefined || val === null) return null;
                                const enumOpt = item.type === "enum" ? item.options?.find((o) => o.label === val) : null;
                                return (
                                  <div key={item.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                                    {item.type === "boolean" ? (
                                      <ToggleLeft className="w-3 h-3 shrink-0" />
                                    ) : item.type === "enum" && enumOpt ? (
                                      <Icon icon={enumOpt.icon} className="w-3 h-3 shrink-0" />
                                    ) : (
                                      <Hash className="w-3 h-3 shrink-0" />
                                    )}
                                    <span>{item.label}:</span>{" "}
                                    <span>{item.type === "boolean" ? (val ? t("parentPages", "yesLabel", lang) : t("parentPages", "noLabel", lang)) : String(val)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {log.notes && (
                            <p className="text-xs text-gray-400 italic">{log.notes}</p>
                          )}
                          <button
                            onClick={() => openRecord(log.date.split("T")[0])}
                            className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                          >
                            {t("parentPages", "editRecord", lang)} →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </section>
        </>
      ) : null}

      </div>
    </DashboardLayout>
  );
}
