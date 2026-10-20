import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-cards";
import { Icon } from "@iconify/react";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useBestPerformers } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function periodDates(type: "week" | "month") {
  const end = new Date();
  const start = new Date(end);
  if (type === "week") start.setDate(end.getDate() - 6);
  else start.setDate(1);
  const iso = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  return { from: iso(start), to: iso(end) };
}

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeStep, setRangeStep] = useState<"from" | "to" | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const advancingRangeRef = useRef(false);

  const ids = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const activeStudent = user?.accessibleStudents?.find((student) => student.id === activeId);
  const dates = customRange ?? periodDates(periodType);
  const { data: response, isLoading, error } = useBestPerformers(
    { clientId: user?.clientId ?? "", token: accessToken ?? "" },
    { ...dates, limit: 100, ...(activeStudent?.classId && { classId: activeStudent.classId }), ...(activeStudent?.gender && { gender: activeStudent.gender }) },
  );
  const performers = response?.performers ?? [];
  const customItems = response?.customItems ?? [];
  const child = performers.find((performer) => performer.studentId === activeId);
  const childRank = child ? performers.findIndex((performer) => performer.studentId === child.studentId) + 1 : null;
  const topScore = performers[0]?.score ?? 0;
  const averageScore = performers.length ? Math.round(performers.reduce((sum, performer) => sum + performer.score, 0) / performers.length) : 0;
  const streak = performers.length ? Math.max(...performers.map((performer) => performer.streak)) : 0;
  const summary = [
    { label: lang === "ml" ? "മികച്ച സ്കോർ" : "Best score", value: performers[0]?.score ?? "—" },
    { label: lang === "ml" ? "ഖുർആൻ പേജുകൾ" : "Quran pages", value: performers.length ? Math.max(...performers.map((performer) => performer.totalQuranPages)) : 0 },
    { label: lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers", value: performers.length ? Math.max(...performers.map((performer) => performer.totalPrayers)) : 0 },
  ];
  const dateRange = response?.period
    ? `${new Date(response.period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(response.period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

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
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import("html2canvas-pro").then((module) => module.default),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const width = pdf.internal.pageSize.getWidth() - 20;
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      const imageHeight = canvas.height * width / canvas.width;
      const image = canvas.toDataURL("image/png");
      for (let offset = 0; offset < imageHeight; offset += pageHeight) {
        if (offset) pdf.addPage();
        pdf.addImage(image, "PNG", 10, 10 - offset, width, imageHeight);
      }
      pdf.save("Best_Ibadah_Performance_Report.pdf");
    } catch (downloadError) {
      console.error("Failed to generate PDF", downloadError);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "bestIbadahPerf", lang)}
        action={performers.length > 0 && <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={downloadingPdf}>
          {downloadingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">{downloadingPdf ? "Exporting..." : "Download PDF"}</span><span className="sm:hidden">PDF</span>
        </Button>}
      />
      <div ref={printRef} className="min-w-0 overflow-hidden pb-28 lg:pb-20">
        <section className="pt-13 text-center" aria-label={lang === "ml" ? "പ്രകടന സ്ഥിതിവിവരക്കണക്കുകൾ" : "Performance statistics"}>
          <div className="relative mx-auto w-fit">
            <img src="/icons/best-performance/streak-v2-animated.webp" alt="" className="h-auto w-[80vw] max-w-[380px] object-contain motion-reduce:hidden sm:w-64" />
            <img src="/icons/best-performance/streak-v2.webp" alt="" className="hidden h-auto w-[80vw] max-w-[380px] object-contain motion-reduce:block sm:w-64" />
            <div className="absolute bottom-2 left-1/2 z-10 w-max max-w-[92vw] -translate-x-1/2 translate-y-1/2 rounded-3xl border border-white/70 bg-white/0 px-5 py-2 shadow-xl shadow-gray-900/10 backdrop-blur-sm">
              <div className="bg-linear-to-b from-primary to-primary/60 bg-clip-text text-[clamp(6rem,28vw,8rem)] font-black leading-none tabular-nums text-transparent">{streak}</div>
              <div className="relative -top-2 text-xs font-semibold text-gray-600">{lang === "ml" ? "ദിവസങ്ങൾ" : "days"}</div>
            </div>
          </div>
          <div className="mt-20">{dateRange && <p className="text-xs text-gray-500">{dateRange}</p>}</div>
          <div className="mx-auto mt-7 grid max-w-md grid-cols-3 divide-x divide-gray-200 py-2">
            {summary.map(({ label, value }) => <div key={label} className="flex flex-col items-center justify-center gap-1 px-2 text-center">
              <strong className="text-2xl font-bold leading-none tabular-nums text-gray-950">{value}</strong>
              <span className="text-[11px] font-medium leading-tight text-gray-600 sm:text-xs">{label}</span>
            </div>)}
          </div>
        </section>

        {isLoading && <div className="mx-auto mt-8 max-w-xl space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl" />)}</div>}
        {error && <div role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700">{error.message}</div>}
        {!isLoading && !error && <>
          <section className="mx-auto mt-10 max-w-xl px-4">
            <h2 className="mb-4 text-center text-lg font-bold text-gray-900">{activeStudent?.name ?? t("parentPages", "myChildPerformance", lang)}</h2>
            {child ? <div className="rounded-[28px] border-[3px] border-primary/15 bg-linear-to-br from-white via-primary/5 to-primary/15 p-5 shadow-xl shadow-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{child.name.trim().charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-gray-950">{child.name}</p><p className="text-xs text-gray-500">{child.adno}</p></div>
                <div className="text-right"><strong className="text-2xl font-extrabold text-primary">#{childRank}</strong><p className="text-xs text-gray-500">/ {performers.length}</p></div>
              </div>
              <div className="mt-5 grid grid-cols-2 divide-x divide-primary/15 border-t border-primary/15 pt-4 text-center">
                <div><strong className="text-2xl font-bold text-gray-950">{child.score}</strong><p className="text-xs text-gray-600">{t("parentPages", "scoreLabel", lang)}</p></div>
                <div><strong className="text-2xl font-bold text-gray-950">{averageScore}</strong><p className="text-xs text-gray-600">{t("parentPages", "avgLabel", lang)}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 divide-x divide-primary/15 border-t border-primary/15 pt-4 text-center">
                <div><strong className="text-lg font-bold text-gray-950">{topScore}%</strong><p className="text-xs text-gray-600">{t("parentPages", "topLabel", lang)}</p></div>
                <div><strong className="text-lg font-bold text-gray-950">{topScore - child.score}%</strong><p className="text-xs text-gray-600">{t("parentPages", "gapLabel", lang)}</p></div>
              </div>
            </div> : <p className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-sm font-medium text-gray-500">{t("parentPages", "noIbadahForStudent", lang)}</p>}
          </section>

          {performers.length === 0 ? <p className="py-16 text-center text-sm font-medium text-gray-500">{t("parentPages", "noIbadahData", lang)}</p> : <section className="mt-10">
            <h2 className="mb-4 text-center text-lg font-bold text-gray-900">{t("parentPages", "bestPerformers", lang)}</h2>
            <Swiper key={`${response?.period.from}-${response?.period.to}-${activeId}`} modules={[EffectCards]} effect="cards" grabCursor cardsEffect={{ perSlideOffset: 8, perSlideRotate: 2, slideShadows: false }} className="!overflow-visible mx-auto mt-6 w-[min(85vw,410px)] py-15" aria-label={t("parentPages", "bestPerformers", lang)}>
              {performers.map((performer, index) => <SwiperSlide key={performer.studentId} className="!h-auto">
                <article className={cn("overflow-hidden rounded-[28px] border-[3px] bg-linear-to-br from-white via-primary/5 to-primary/15 px-5 pb-5 pt-6 text-center text-gray-950 shadow-xl shadow-primary/10", ids.includes(performer.studentId) ? "border-primary/40" : "border-primary/15")}>
                  <div className="relative mx-auto size-24">
                    <div className="flex size-full items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-primary/15" aria-label={performer.name}>{performer.name.trim().charAt(0).toUpperCase()}</div>
                    {index < 3 && <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-4 ring-white" aria-label={`Rank ${index + 1}`}><Icon icon="lucide:badge" className="absolute size-7" aria-hidden="true" /><span className="relative text-[11px] font-black">{index + 1}</span></span>}
                  </div>
                  <p className="mt-5 truncate text-lg font-bold">{performer.name}</p>
                  <p className="text-xs font-medium text-gray-500">{performer.adno}</p>
                  {ids.includes(performer.studentId) && <p className="mt-2 text-xs font-bold text-primary">{t("parentPages", "myChildBestPerf", lang)}</p>}
                  <div className="mt-5"><p className="text-3xl font-extrabold text-primary">{performer.score}</p><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("parentPages", "scoreLabel", lang)}</p></div>
                  <div className="mt-5 grid grid-cols-2 divide-x divide-primary/15">
                    <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.totalPrayers}</strong><small className="text-[11px] font-medium text-gray-600">{t("parentPages", "prayersLabel", lang)}</small></div>
                    <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.totalQuranPages}</strong><small className="text-[11px] font-medium text-gray-600">{t("parentPages", "pagesLabel", lang)}</small></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 divide-x divide-primary/15 border-t border-primary/15 pt-3">
                    <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.streak}d</strong><small className="text-[11px] font-medium text-gray-600">{t("parentPages", "streakLabel", lang)}</small></div>
                    <div className="flex flex-col items-center gap-1 px-2"><strong className="text-xl font-bold leading-none tabular-nums">{performer.consistency}%</strong><small className="text-[11px] font-medium text-gray-600">{t("parentPages", "consistencyLabel", lang)}</small></div>
                  </div>
                  {Object.entries(performer.customCounts ?? {}).some(([, value]) => value > 0) && <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-primary/15 pt-3 text-xs font-medium text-gray-700">
                    {Object.entries(performer.customCounts ?? {}).filter(([, value]) => value > 0).map(([key, value]) => <span key={key}>{value} {customItems.find((item) => item.key === key)?.label ?? key}</span>)}
                  </div>}
                </article>
              </SwiperSlide>)}
            </Swiper>
          </section>}
        </>}
      </div>
      <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:left-64">
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-lg shadow-gray-900/10 backdrop-blur">
          <button type="button" onClick={() => selectPeriod("month")} aria-pressed={!customRange && periodType === "month"} className={cn("rounded-full px-5 py-2.5 text-sm font-semibold transition-colors", !customRange && periodType === "month" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}>{lang === "ml" ? "മാസം" : "Month"}</button>
          <button type="button" onClick={() => selectPeriod("week")} aria-pressed={!customRange && periodType === "week"} className={cn("rounded-full px-5 py-2.5 text-sm font-semibold transition-colors", !customRange && periodType === "week" ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}>{lang === "ml" ? "ആഴ്ച" : "Weekly"}</button>
          <button type="button" onClick={() => setRangeStep("from")} aria-label={lang === "ml" ? "തീയതി പരിധി തിരഞ്ഞെടുക്കുക" : "Choose date range"} aria-pressed={!!customRange} className={cn("flex size-10 items-center justify-center rounded-full transition-colors", customRange ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/5")}><Calendar className="size-5" /></button>
        </div>
      </div>
      <DatePickerDrawer open={rangeStep !== null} onOpenChange={(open) => { if (!open) { if (advancingRangeRef.current) advancingRangeRef.current = false; else setRangeStep(null); } }} date={rangeStep === "to" ? rangeStart : customRange?.from ?? ""} onDateChange={selectRangeDate} title={rangeStep === "to" ? (lang === "ml" ? "അവസാന തീയതി" : "Choose end date") : (lang === "ml" ? "ആരംഭ തീയതി" : "Choose start date")} />
    </DashboardLayout>
  );
}
