import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { Button } from "@/components/ui/button";
import { BestPerformerCard } from "@/components/parent/BestPerformerCard";
import { PerformanceHistoryCharts } from "@/components/parent/PerformanceHistoryCharts";
import { periodDates } from "@/lib/best-performance-period";
import { Skeleton } from "@/components/ui/Skeleton";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { motion, useReducedMotion } from "framer-motion";
import "swiper/css";
import "swiper/css/pagination";
import { Calendar, Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useBestPerformers } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const [periodType, setPeriodType] = useState<"week" | "month">("month");
  const [customRange, setCustomRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [rangeStep, setRangeStep] = useState<"from" | "to" | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const reduceMotion = useReducedMotion();
  const printRef = useRef<HTMLDivElement>(null);
  const advancingRangeRef = useRef(false);

  const ids = user?.accessibleStudentIds ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const activeStudent = user?.accessibleStudents?.find(
    (student) => student.id === activeId,
  );
  const dates = customRange ?? periodDates(periodType);
  const {
    data: response,
    isLoading,
    error,
  } = useBestPerformers(
    { clientId: user?.clientId ?? "", token: accessToken ?? "" },
    {
      ...dates,
      limit: 100,
      ...(activeStudent?.classId && { classId: activeStudent.classId }),
      ...(activeStudent?.gender && { gender: activeStudent.gender }),
    },
  );
  const performers = response?.performers ?? [];

  const customItems = response?.customItems ?? [];
  const child = performers.find(
    (performer) => performer.studentId === activeId,
  );
  const childRank = child
    ? performers.findIndex(
        (performer) => performer.studentId === child.studentId,
      ) + 1
    : null;
  const topScore = performers[0]?.score ?? 0;
  const averageScore = performers.length
    ? Math.round(
        performers.reduce((sum, performer) => sum + performer.score, 0) /
          performers.length,
      )
    : 0;
  const streak = child?.streak ?? 0;
  const summary = [
    { label: t("parentPages", "scoreLabel", lang), value: child?.score ?? "—" },
    {
      label: t("parentPages", "avgLabel", lang),
      value: performers.length ? averageScore : "—",
    },
    {
      label: t("parentPages", "topLabel", lang),
      value: performers.length ? topScore : "—",
    },
    {
      label: t("parentPages", "gapLabel", lang),
      value: child ? Math.max(0, topScore - child.score) : "—",
    },
    {
      label: t("parentPages", "rankLabel", lang),
      value: childRank ? `#${childRank}/${performers.length}` : "—",
    },
    {
      label: lang === "ml" ? "നമസ്കാരങ്ങൾ" : "Prayers",
      value: child?.totalPrayers ?? "—",
    },
    {
      label: lang === "ml" ? "ഖുർആൻ പേജുകൾ" : "Quran pages",
      value: child?.totalQuranPages ?? "—",
    },
    {
      label: t("parentPages", "consistencyLabel", lang),
      value: child ? `${child.consistency}%` : "—",
    },
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
      setCustomRange({
        from: date < rangeStart ? date : rangeStart,
        to: date < rangeStart ? rangeStart : date,
      });
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
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const width = pdf.internal.pageSize.getWidth() - 20;
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      const imageHeight = (canvas.height * width) / canvas.width;
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
        action={
          performers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span className="hidden sm:inline">
                {downloadingPdf ? "Exporting..." : "Download PDF"}
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
          )
        }
      />
      <div
        ref={printRef}
        className="mx-auto w-full max-w-6xl min-w-0 overflow-hidden !p-0 *:px-4   lg:pb-20"
      >
        <section
          className="pt-10"
          aria-label={
            lang === "ml"
              ? "പ്രകടന സ്ഥിതിവിവരക്കണക്കുകൾ"
              : "Performance statistics"
          }
        >
          <div className="flex flex-col items-center gap-5 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {lang === "ml" ? "ഇബാദത്ത് അവലോകനം" : "Ibadah overview"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                {lang === "ml"
                  ? "പ്രകടനം ഒറ്റനോട്ടത്തിൽ"
                  : "Performance at a glance"}
              </h2>
              {dateRange && (
                <p className="mt-2 text-sm text-gray-500">{dateRange}</p>
              )}
            </div>
            <div
              className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1"
              role="group"
              aria-label={
                lang === "ml" ? "കാലയളവ് തിരഞ്ഞെടുക്കുക" : "Choose period"
              }
            >
              <button
                type="button"
                onClick={() => selectPeriod("month")}
                aria-pressed={!customRange && periodType === "month"}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  !customRange && periodType === "month"
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                {lang === "ml" ? "മാസം" : "Month"}
              </button>
              <button
                type="button"
                onClick={() => selectPeriod("week")}
                aria-pressed={!customRange && periodType === "week"}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  !customRange && periodType === "week"
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                {lang === "ml" ? "ആഴ്ച" : "Week"}
              </button>
              <button
                type="button"
                onClick={() => setRangeStep("from")}
                aria-label={
                  lang === "ml"
                    ? "തീയതി പരിധി തിരഞ്ഞെടുക്കുക"
                    : "Choose date range"
                }
                aria-pressed={!!customRange}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                  customRange
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <Calendar className="size-4" />
                <span>{lang === "ml" ? "തീയതികൾ" : "Dates"}</span>
              </button>
            </div>
          </div>
          <div className="mt-7 grid gap-1.5 overflow-hidden rounded-[22px] lg:grid-cols-[1.06fr_1fr]">
            <div className="flex min-h-[300px] flex-col items-center justify-center bg-[#f4f6f3] px-6 py-5 text-center sm:min-h-[390px]">
              <div className="relative h-48 w-full max-w-[380px] sm:h-60">
                <img
                  src="/icons/best-performance/streak-v2-animated.webp"
                  alt=""
                  className="pointer-events-none absolute inset-0 size-full object-contain motion-reduce:hidden"
                />
                <img
                  src="/icons/best-performance/streak-v2.webp"
                  alt=""
                  className="pointer-events-none absolute inset-0 hidden size-full object-contain motion-reduce:block"
                />
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  {lang === "ml" ? "തുടർച്ചയായ ദിവസങ്ങൾ" : "Day streak"}
                </p>
                <strong className="mt-2 block text-6xl font-semibold leading-none tracking-tight text-primary tabular-nums sm:text-7xl">
                  {streak}
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {summary.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex min-h-24 min-w-0 flex-col items-center justify-center bg-[#f7f7f7] px-5 py-4 text-center sm:min-h-0 sm:px-6"
                >
                  <span className="text-xs font-medium text-gray-600">
                    {label}
                  </span>
                  <strong className="mt-2 text-2xl font-semibold leading-none tracking-tight text-gray-950 tabular-nums sm:text-3xl">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="mx-auto mt-8 max-w-xl space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-3xl" />
            ))}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mx-auto mt-8 bg-green-500 max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700"
          >
            {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <>
            {activeId && user?.clientId && accessToken && (
              <PerformanceHistoryCharts
                clientId={user.clientId}
                token={accessToken}
                studentId={activeId}
                lang={lang}
                periodType={periodType}
              />
            )}

            {performers.length === 0 ? (
              <p className="py-16 text-center text-sm font-medium text-gray-500">
                {t("parentPages", "noIbadahData", lang)}
              </p>
            ) : (
              <motion.section
                className="mx-auto mt-16 max-w-[480px] overflow-hidden rounded-[30px] bg-primary/5 px-4 py-18 pb-32 sm:px-8"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, color-mix(in oklch, var(--primary) 5%, transparent), transparent 55%, color-mix(in oklch, var(--primary) 5%, transparent)), linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)), url('/icons/best-performance/performance-bg.webp')",
                  backgroundSize: "220% 220%, cover, cover",
                  backgroundRepeat: "no-repeat",
                }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        backgroundPosition: [
                          "0% 50%, center, center",
                          "100% 50%, center, center",
                          "0% 50%, center, center",
                        ],
                      }
                }
                transition={{
                  duration: 14,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              >
                <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-950">
                  {t("parentPages", "bestPerformers", lang)}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                  {lang === "ml"
                    ? `${performers.length} വിദ്യാർത്ഥികൾ`
                    : `${performers.length} performers`}
                </p>
                <Swiper
                  key={`${response?.period.from}-${response?.period.to}-${activeId}`}
                  modules={[Pagination]}
                  slidesPerView={1}
                  spaceBetween={16}
                  grabCursor
                  pagination={{ clickable: true, dynamicBullets: true }}
                  className="mx-auto mt-7 w-full max-w-lg [&_.swiper-pagination-bullet]:!size-2.5 [&_.swiper-pagination-bullet-active]:!bg-primary"
                  aria-label={t("parentPages", "bestPerformers", lang)}
                >
                  {performers.map((performer, index) => (
                    <SwiperSlide key={performer.studentId} className="!h-auto">
                      <BestPerformerCard
                        performer={performer}
                        rank={index + 1}
                        isMyChild={ids.includes(performer.studentId)}
                        customItems={customItems}
                        lang={lang}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </motion.section>
            )}
          </>
        )}
      </div>
      <DatePickerDrawer
        open={rangeStep !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (advancingRangeRef.current) advancingRangeRef.current = false;
            else setRangeStep(null);
          }
        }}
        date={rangeStep === "to" ? rangeStart : (customRange?.from ?? "")}
        onDateChange={selectRangeDate}
        title={
          rangeStep === "to"
            ? lang === "ml"
              ? "അവസാന തീയതി"
              : "Choose end date"
            : lang === "ml"
              ? "ആരംഭ തീയതി"
              : "Choose start date"
        }
      />
    </DashboardLayout>
  );
}
