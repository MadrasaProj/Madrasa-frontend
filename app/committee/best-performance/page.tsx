import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useState, useEffect, useRef } from "react";
import {
  getBestPerformers,
  type BestPerformer,
} from "@/lib/best-performance-api";
import { getStudents } from "@/lib/students-api";
import {
  Trophy,
  Star,
  BookOpen,
  Flame,
  Target,
  Sparkles,
  Download,
  Loader2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BestPerformancePage({ variant }: { variant?: "teacher" }) {
  const { lang } = useLanguageStore();
  const { user, accessToken } = useAuthStore();
  const [data, setData] = useState<BestPerformer[]>([]);
  const [customItems, setCustomItems] = useState<{ key: string; label: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeStep, setRangeStep] = useState<"from" | "to" | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>({});
  const [classRankings, setClassRankings] = useState<{ className: string; performers: BestPerformer[] }[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const advancingRangeRef = useRef(false);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const { activeClassId, activeClass } = useActiveClass();

  const roleLabel = lang === "ml"
    ? ({ admin: "അഡ്മിൻ", teacher: "അധ്യാപകൻ", parent: "രക്ഷിതാവ്", committee: "കമ്മിറ്റി" } as const)[user?.role as string] ?? "കമ്മിറ്റി"
    : ({ admin: "Admin", teacher: "Teacher", parent: "Parent", committee: "Management Committee" } as const)[user?.role as string] ?? "Management Committee";

  const isParent = user?.role === "parent";
  const accessibleIds = user?.accessibleStudentIds ?? [];

  const getPeriodDates = (type: "week" | "month") => {
    const end = new Date();
    const start = new Date(end);
    if (type === "week") start.setDate(end.getDate() - 6);
    else start.setDate(1);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    return { from: iso(start), to: iso(end) };
  };

  useEffect(() => {
    if (!cid || !token || (variant === "teacher" && !activeClassId)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const dates = customRange ?? getPeriodDates(periodType);
    getBestPerformers(cid, token, { ...dates, classId: variant === "teacher" ? activeClassId || undefined : undefined, limit: isParent ? 100 : 20 })
      .then((res) => {
        if (cancelled) return;
        setData(res.performers);
        setPeriod(res.period);
        setCustomItems(res.customItems ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

      if (user?.role === "teacher") {
        setClassRankings([]);
        if (activeClass) {
          Promise.all([
            getBestPerformers(cid, token, { ...dates, classId: activeClass.id, limit: 100 }),
            getStudents(cid, token, { classId: activeClass.id, limit: 500 }).catch(() => null),
          ]).then(([ranking, students]) => {
            if (cancelled) return;
            setClassRankings([{ className: activeClass.name, performers: ranking.performers }]);
            setStudentPhotos(Object.fromEntries((students?.data ?? [])
              .filter((student) => student.photoUrl || student.photo)
              .map((student) => [student.id, (student.photoUrl || student.photo)!])));
          }).catch(() => { if (!cancelled) setClassRankings([]); });
        }
      }
    return () => { cancelled = true; };
  }, [cid, token, periodType, customRange, user?.role, variant, activeClassId]);

  const formatDateRange = () => {
    if (!period) return "";
    const from = new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const to = new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${from} — ${to}`;
  };

  const displayData = data;

  const rankInFull = (sid: string) => {
    const idx = data.findIndex((p) => p.studentId === sid);
    return idx === -1 ? null : idx + 1;
  };

  const topPerformer = data[0] ?? null;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0)) : 0;

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import("html2canvas-pro").then((m) => m.default),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgWidth = pW - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pH - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pH - 20);
      }

      pdf.save("Best_Ibadah_Performance_Report.pdf");
    } catch (e) {
      console.error("Failed to generate PDF", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (variant === "teacher") {
    const streak = data.length ? Math.max(...data.map((item) => item.streak)) : 0;
    const summary = [
      { label: lang === "ml" ? "മികച്ച സ്കോർ" : "Best score", value: data[0]?.score ?? "—" },
      { label: lang === "ml" ? "ഖുർആൻ പേജുകൾ" : "Quran pages", value: data.length ? Math.max(...data.map((item) => item.totalQuranPages)) : 0 },
      { label: lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers", value: data.length ? Math.max(...data.map((item) => item.totalPrayers)) : 0 },
    ];
    const selectPeriod = (type: "week" | "month") => {
      setCustomRange(null);
      setPeriodType(type);
    };
    const selectRangeDate = (date: string) => {
      if (rangeStep === "from") {
        setRangeStart(date);
        advancingRangeRef.current = true;
        setRangeStep("to");
      } else if (rangeStep === "to") {
        setCustomRange({ from: date < rangeStart ? date : rangeStart, to: date < rangeStart ? rangeStart : date });
        setRangeStep(null);
      }
    };
    const carousel = (performers: BestPerformer[], key: string) => (
      <Swiper
        key={key}
        modules={[EffectCards]}
        effect="cards"
        grabCursor
        cardsEffect={{ perSlideOffset: 8, perSlideRotate: 2, slideShadows: false }}
        className="!overflow-visible mt-6 mx-auto w-[min(85vw,410px)] py-15"
        aria-label={lang === "ml" ? "മികച്ച വിദ്യാർത്ഥികൾ" : "Best students"}
      >
        {performers.map((performer, index) => (
          <SwiperSlide key={performer.studentId} className="!h-auto">
            <div className="bg-white overflow-hidden rounded-[28px] border-[3px] border-primary/15    ">

            <article className="relative isolate h-full  bg-linear-to-br from-white via-primary/5 to-primary/15 px-5 pb-5 pt-6 text-center text-gray-950 shadow-xl shadow-primary/10 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-white/40">
              <div className="relative mx-auto size-24">
                {studentPhotos[performer.studentId] ? (
                  <img src={studentPhotos[performer.studentId]} alt={performer.name} className="size-full rounded-full object-cover ring-4 ring-primary/15" />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-primary/15" aria-label={performer.name}>
                    {performer.name.trim().charAt(0).toUpperCase()}
                  </div>
                )}
                {index < 3 && (
                  <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-gray-900/10 ring-4 ring-white" aria-label={`Rank ${index + 1}`}>
                    <Icon icon="lucide:badge" className="absolute size-7" aria-hidden="true" />
                    <span className="relative text-[11px] font-black">{index + 1}</span>
                  </span>
                )}
              </div>
              <p className="mt-5 truncate text-lg font-bold">{performer.name}</p>
              <p className="text-xs font-medium text-gray-500">{performer.adno}</p>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-primary">{performer.score}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{lang === "ml" ? "സ്കോർ" : "Score"}</p>
              </div>
              <div className="mt-5">
                <div className="grid grid-cols-2 divide-x divide-primary/15">
                  <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.totalPrayers}</strong><small className="text-[11px] font-medium text-gray-600">{lang === "ml" ? "നമസ്കാരം" : "Prayers"}</small></div>
                  <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.totalQuranPages}</strong><small className="text-[11px] font-medium text-gray-600">{lang === "ml" ? "പേജുകൾ" : "Pages"}</small></div>
                </div>
                <div className="mt-3 grid grid-cols-2 divide-x divide-primary/15 border-t border-primary/15 pt-3">
                  <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.streak}d</strong><small className="text-[11px] font-medium text-gray-600">{lang === "ml" ? "സ്ട്രീക്ക്" : "Streak"}</small></div>
                  <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.consistency}%</strong><small className="text-[11px] font-medium text-gray-600">{lang === "ml" ? "സ്ഥിരത" : "Consistency"}</small></div>
                </div>
              </div>
              {Object.entries(performer.customCounts ?? {}).some(([, value]) => value > 0) && (
                <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-primary/15 pt-3 text-xs font-medium text-gray-700">
                  {Object.entries(performer.customCounts ?? {}).filter(([, value]) => value > 0).map(([itemKey, value]) => (
                    <span key={itemKey}>{value} {customItems.find((item) => item.key === itemKey)?.label ?? itemKey}</span>
                  ))}
                </div>
              )}
            </article>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    );

    return (
      <DashboardLayout>
        <PageHeader
          title={lang === "ml" ? "മികച്ച ഇബാദത്ത്" : "Best Ibadah Performance"}
        />
        <div ref={printRef} className="min-w-0 overflow-hidden pb-28 lg:pb-20">
          <section className="pt-13 text-center" aria-label={lang === "ml" ? "പ്രകടന സ്ഥിതിവിവരക്കണക്കുകൾ" : "Performance statistics"}>
            <div className="relative mx-auto w-fit">
              <img
                src="/icons/best-performance/streak-v2-animated.webp"
                alt=""
                className="h-auto w-[80vw] max-w-[380px] object-contain motion-reduce:hidden sm:w-64"
              />
              <img
                src="/icons/best-performance/streak-v2.webp"
                alt=""
                className="hidden h-auto w-[80vw] max-w-[380px] object-contain motion-reduce:block sm:w-64"
              />
              <div className="absolute bottom-2 left-1/2 z-10   w-max max-w-[92vw] -translate-x-1/2 translate-y-1/2 items-baseline justify-center gap-2 rounded-3xl border border-white/70 bg-white/0 px-5 py-2 shadow-xl shadow-gray-900/10 backdrop-blur-sm">
                <div className="bg-linear-to-b from-primary to-primary/60 bg-clip-text text-[clamp(6rem,28vw,8rem)] font-black leading-none tabular-nums text-transparent">{streak}</div>
                <div className="text-xs relative -top-2 font-semibold text-gray-600">{lang === "ml" ? "ദിവസങ്ങൾ" : "days"}</div>
              </div>
            </div>
            <p className="mt-20 text-sm font-medium text-gray-500">
              {/* {lang === "ml" ? "മികച്ച സ്ട്രീക്ക്" : "Best streak"} */}

            </p>
            {period && <p className="mt-3 text-xs text-gray-500">{formatDateRange()}</p>}
            <div className="mx-auto mt-7 grid max-w-md grid-cols-3 divide-x divide-gray-200 py-2">
              {summary.map(({ label, value }) => <div key={label} className="flex flex-col items-center justify-center gap-1 px-2 text-center">
                <strong className="text-2xl font-bold leading-none tabular-nums text-gray-950">{value}</strong>
                <span className="text-[11px] font-medium leading-tight text-gray-600 sm:text-xs">{label}</span>
              </div>)}
            </div>
            {data.length > 0 && <div className="mt-5 flex justify-center">
              <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={downloadingPdf}>
                {downloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                <span>{downloadingPdf ? "Exporting..." : "Download PDF"}</span>
              </Button>
            </div>}
          </section>
          {loading && <div className="mx-auto mt-8 max-w-xl space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl" />)}</div>}
          {error && <div role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700">{error}</div>}
          {!loading && !error && data.length === 0 && <p className="py-16 text-center text-sm font-medium text-gray-500">{lang === "ml" ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല" : "No ibadah data available yet"}</p>}
          {!loading && !error && data.length > 0 && <section className="mt-9">
            <h2 className="text-center text-lg mb-4 font-bold text-gray-900">{lang === "ml" ? "മികച്ച വിദ്യാർത്ഥികൾ" : "Best students"}</h2>

            {carousel(data, `overall-${period?.from}-${period?.to}`)}
          </section>}
          {!loading && !error && classRankings.length > 0 && <section className="mt-10 space-y-9">
            <h2 className="text-center text-lg font-bold text-gray-900">{lang === "ml" ? "ക്ലാസ് അടിസ്ഥാനത്തിൽ" : "Class performance"}</h2>
            {classRankings.map(({ className, performers }) => <div key={className}>
              <h3 className=" text-center w-full  pb-2 text-base font-bold text-primary">{className}</h3>
              {performers.length ? carousel(performers, `${className}-${period?.from}-${period?.to}`) : <p className="py-6 text-center text-sm text-gray-500">{lang === "ml" ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല" : "No ibadah data"}</p>}
            </div>)}
          </section>}
        </div>
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:left-64">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-lg shadow-gray-900/10 backdrop-blur">
            <button type="button" onClick={() => selectPeriod("month")} aria-pressed={!customRange && periodType === "month"} className={cn("rounded-full px-5 py-2.5 text-sm font-semibold transition-colors", !customRange && periodType === "month" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}>{lang === "ml" ? "മാസം" : "Month"}</button>
            <button type="button" onClick={() => selectPeriod("week")} aria-pressed={!customRange && periodType === "week"} className={cn("rounded-full px-5 py-2.5 text-sm font-semibold transition-colors", !customRange && periodType === "week" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}>{lang === "ml" ? "ആഴ്ച" : "Weekly"}</button>
            <button type="button" onClick={() => setRangeStep("from")} aria-label={lang === "ml" ? "തീയതി പരിധി തിരഞ്ഞെടുക്കുക" : "Choose date range"} aria-pressed={!!customRange} className={cn("flex size-10 items-center justify-center rounded-full transition-colors", customRange ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}><Calendar className="size-5" /></button>
          </div>
        </div>
        <DatePickerDrawer open={rangeStep !== null} onOpenChange={(open) => { if (!open) { if (advancingRangeRef.current) advancingRangeRef.current = false; else setRangeStep(null); } }} date={rangeStep === "to" ? rangeStart : (customRange?.from ?? "")} onDateChange={selectRangeDate} title={rangeStep === "to" ? (lang === "ml" ? "അവസാന തീയതി" : "Choose end date") : (lang === "ml" ? "ആരംഭ തീയതി" : "Choose start date")} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Printable Container */}
        <div ref={printRef} className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary rounded-3xl p-5 lg:p-6 text-primary-foreground"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-widest">{roleLabel}</p>
                  <h1 className="text-xl font-bold">
                    {lang === "ml" ? "മികച്ച ഇബാദത്ത്" : "Best Ibadah Performance"}
                  </h1>
                </div>
              </div>

              {!isParent && displayData.length > 0 && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-primary-foreground rounded-xl text-xs font-semibold backdrop-blur-xs transition-all disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{downloadingPdf ? "Exporting..." : "Download PDF"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                {
                  icon: Star,
                  label: lang === "ml" ? "മികച്ച സ്കോർ" : "Best Score",
                  value: displayData[0] ? `${displayData[0].score}` : "—",
                },
                {
                  icon: BookOpen,
                  label: lang === "ml" ? "ഖുർആൻ" : "Quran Pages",
                  value: displayData.length > 0
                    ? Math.max(...displayData.map((d) => d.totalQuranPages))
                    : 0,
                },
                {
                  icon: Flame,
                  label: lang === "ml" ? "മികച്ച സ്ട്രീക്ക്" : "Best Streak",
                  value: displayData.length > 0
                    ? `${Math.max(...displayData.map((d) => d.streak))}d`
                    : "0d",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/15 rounded-xl p-3 text-center"
                >
                  <s.icon className="w-4 h-4 mx-auto mb-1 text-primary-foreground/80" />
                  <p className="text-lg font-black">{s.value}</p>
                  <p className="text-[10px] text-primary-foreground/80">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Period info */}
          <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as "week" | "month")} className="max-w-full overflow-x-auto">
            <TabsList aria-label={lang === "ml" ? "കാലയളവ്" : "Period"}>
              <TabsTrigger value="week">
                {lang === "ml" ? "ആഴ്ചയിലെ മികച്ച പ്രകടനം" : "Weekly Best Performance"}
              </TabsTrigger>
              <TabsTrigger value="month">
                {lang === "ml" ? "മാസത്തിലെ മികച്ച പ്രകടനം" : "Monthly Best Performance"}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {period && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between px-4 py-3 bg-primary/5 border border-gray-100 rounded-2xl"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {lang === "ml" ? "കാലയളവ്" : "Period"}: {formatDateRange()}
                </span>
              </div>
              <div className="text-xs text-gray-600 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </motion.div>
          )}

          {/* Parent comparison */}
          {isParent && data.filter((p) => accessibleIds.includes(p.studentId)).map((child) => {
            const rank = rankInFull(child.studentId);
            const gap = topPerformer ? topPerformer.score - child.score : 0;
            const vsAvg = child.score - avgScore;
            return (
              <motion.div
                key={`compare-${child.studentId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {child.name.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{child.name}</p>
                  <span className={cn(
                    "ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    child.score >= 80 ? "bg-primary/10 text-primary" : child.score >= 50 ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-700",
                  )}>
                    {child.score >= 80
                      ? (lang === "ml" ? "മികവുറ്റത്" : "Excellent")
                      : child.score >= 50
                        ? (lang === "ml" ? "നല്ലത്" : "Good")
                        : (lang === "ml" ? "മെച്ചപ്പെടുത്തണം" : "Needs Improvement")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Rank</p>
                    <p className="text-3xl font-black text-primary">
                      #{rank ?? "—"}
                      <span className="text-sm font-semibold text-gray-400 ml-1">/ {data.length}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{lang === "ml" ? "സ്കോർ" : "Score"}</p>
                    <p className="text-3xl font-black text-gray-900">{child.score}<span className="text-sm font-semibold text-gray-400">%</span></p>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      child.score >= 80 ? "bg-primary" : child.score >= 50 ? "bg-gray-500" : "bg-gray-300",
                    )}
                    style={{ width: `${child.score}%` }}
                  />
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {topPerformer && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-xs font-semibold">
                      <Trophy className="w-3 h-3" />
                      {lang === "ml" ? "മികവ്" : "Top"}: {topPerformer.score}%
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
                    vsAvg >= 0 ? "bg-primary/5 text-primary" : "bg-gray-100 text-gray-700",
                  )}>
                    {vsAvg >= 0 ? "▲" : "▼"} {lang === "ml" ? "ശരാശരി" : "Avg"}: {avgScore}%
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold">
                    {lang === "ml" ? "വിടവ്" : "Gap"}: {gap}%
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Loading state */}
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <p className="text-gray-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Performers list */}
          {!loading && !error && displayData.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {isParent
                  ? (lang === "ml" ? "ഇബാദത്ത് വിവരങ്ങൾ ലഭ്യമല്ല" : "No ibadah data available for your child yet")
                  : (lang === "ml" ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല" : "No ibadah data available yet")}
              </p>
            </div>
          )}

          {!loading && !error && displayData.length > 0 && (
            <div className="space-y-3">
              {displayData.map((performer, i) => {
                const rank = rankInFull(performer.studentId) ?? i + 1;
                const isMyChild = accessibleIds.includes(performer.studentId);
                return (
                  <motion.div
                    key={performer.studentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className={cn(
                      "bg-white rounded-2xl border p-4 shadow-xs transition-all",
                      isMyChild
                        ? "ring-2 ring-primary/40 bg-primary/5 border-primary/20"
                        : "border-gray-100",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl shrink-0 w-10 text-center">
                        {isParent ? (
                          <span className="text-sm font-black text-primary">
                            #{rank}
                          </span>
                        ) : <span className="text-sm font-black text-primary">#{rank}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {performer.name}
                          </p>
                          {isMyChild && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                              {lang === "ml" ? "എന്റെ കുട്ടി" : "Your Child"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{performer.adno}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-primary/5 text-primary rounded-full">
                            <Star className="w-3 h-3" />
                            {performer.totalPrayers}{" "}
                            {lang === "ml" ? "നമസ്കാരം" : "prayers"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                            <BookOpen className="w-3 h-3" />
                            {performer.totalQuranPages}{" "}
                            {lang === "ml" ? "പേജ്" : "pages"}
                          </span>
                          {Object.entries(performer.customCounts ?? {}).map(([key, val]) => {
                            if (!val) return null;
                            const itemDef = customItems.find((ci) => ci.key === key);
                            const label = itemDef?.label ?? key;
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                              >
                                <Sparkles className="w-3 h-3" />
                                {val} {label}
                              </span>
                            );
                          })}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                            <Flame className="w-3 h-3" />
                            {performer.streak}d{" "}
                            {lang === "ml" ? "സ്ട്രീക്ക്" : "streak"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                            {performer.consistency}%{" "}
                            {lang === "ml" ? "സ്ഥിരത" : "consistency"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-primary">
                          {performer.score}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-400">
                          {lang === "ml" ? "സ്കോർ" : "SCORE"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                        style={{ width: `${performer.scorePercentage}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isParent && user?.role === "teacher" && !loading && classRankings.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">
                {lang === "ml" ? "ക്ലാസ് അടിസ്ഥാനത്തിലുള്ള മികച്ച ഇബാദത്ത് പ്രകടനം" : "Best Ibada Performance Ranking — Class-wise"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {classRankings.map(({ className, performers }) => (
                  <div key={className} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <h3 className="font-bold text-primary mb-3">{className}</h3>
                    {performers.length === 0 ? <p className="text-sm text-gray-400">No ibadah data</p> : performers.slice(0, 5).map((performer, index) => (
                      <div key={performer.studentId} className="flex items-center gap-3 py-2 border-t border-gray-50">
                        <span className="w-6 text-center font-bold text-gray-500">#{index + 1}</span>
                        <span className="flex-1 text-sm font-semibold text-gray-800">{performer.name}</span>
                        <span className="font-black text-primary">{performer.score}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
