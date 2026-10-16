import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { useAuthStore } from "@/store/auth";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getBestPerformers,
  getOverallBestStudents,
  type BestPerformer,
  type OverallBestPerformer,
  type OverallBestPerformanceResponse,
} from "@/lib/best-performance-api";
import { getMyClasses } from "@/lib/classes-api";
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
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  GraduationCap,
  ClipboardList,
  Award,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const medalEmoji = ["🥇", "🥈", "🥉", "🏅", "🌟", "⭐", "✨", "💫", "🔥", "🌙"];

export default function BestPerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const periodParam = searchParams.get("period");
  const classIdParam = searchParams.get("classId");

  const { lang } = useLanguageStore();
  const { user, accessToken } = useAuthStore();
  const [rankingCategory, setRankingCategory] = useState<"total" | "ibadah">(
    categoryParam === "ibadah" ? "ibadah" : "total"
  );
  const [data, setData] = useState<BestPerformer[]>([]);
  const [overallData, setOverallData] = useState<OverallBestPerformer[]>([]);
  const [overallHighlights, setOverallHighlights] = useState<OverallBestPerformanceResponse["highlights"]>(null);
  const [customItems, setCustomItems] = useState<{ key: string; label: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<"week" | "month">(
    periodParam === "week" ? "week" : "month"
  );
  const [classRankings, setClassRankings] = useState<{
    classId: string;
    className: string;
    isClassTeacher?: boolean;
    performers: BestPerformer[];
  }[]>([]);
  const [overallClassRankings, setOverallClassRankings] = useState<{
    classId: string;
    className: string;
    isClassTeacher?: boolean;
    performers: OverallBestPerformer[];
  }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classIdParam);
  const [classSearch, setClassSearch] = useState<Record<string, string>>({});
  const [showAllPerClass, setShowAllPerClass] = useState<Record<string, boolean>>({});

  const printRef = useRef<HTMLDivElement>(null);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const roleLabel = lang === "ml"
    ? ({ admin: "അഡ്മിൻ", teacher: "അധ്യാപകൻ", parent: "രക്ഷിതാവ്", committee: "കമ്മിറ്റി" } as const)[user?.role as string] ?? "കമ്മിറ്റി"
    : ({ admin: "Admin", teacher: "Teacher", parent: "Parent", committee: "Management Committee" } as const)[user?.role as string] ?? "Management Committee";

  const isParent = user?.role === "parent";
  const isTeacher = user?.role?.toLowerCase() === "teacher" || user?.actorType === "TEACHER";
  const canViewClassRankings = isTeacher || user?.role?.toLowerCase() === "admin" || user?.actorType === "CLIENT_ADMIN" || user?.actorType === "SUPER_ADMIN" || user?.role?.toLowerCase() === "committee" || user?.actorType === "COMMITTEE";
  const accessibleIds = user?.accessibleStudentIds ?? [];

  const handleSelectCategory = (cat: "total" | "ibadah") => {
    setRankingCategory(cat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("category", cat);
      return next;
    }, { replace: true });
  };

  const handleSelectPeriod = (type: "week" | "month") => {
    setPeriodType(type);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("period", type);
      return next;
    }, { replace: true });
  };

  const handleSelectClass = (clsId: string) => {
    setSelectedClassId(clsId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("classId", clsId);
      return next;
    }, { replace: true });
  };

  const getPeriodDates = (type: "week" | "month") => {
    const now = new Date();
    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const endStr = fmt(now);
    if (type === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: fmt(start), to: endStr };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: endStr };
  };

  useEffect(() => {
    if (!cid || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const dates = getPeriodDates(periodType);

    // 1. Fetch Ibadah performers
    const p1 = getBestPerformers(cid, token, { ...dates, limit: isParent ? 100 : 20 })
      .then((res) => {
        if (cancelled) return;
        setData(res.performers);
        setPeriod(res.period);
        setCustomItems(res.customItems ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load data");
      });

    // 2. Fetch Overall Best Students (Attendance + Homework + Exam + Ibadah)
    const p2 = getOverallBestStudents(cid, token, { ...dates, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setOverallData(res.performers);
        setOverallHighlights(res.highlights);
        if (!period) setPeriod(res.period);
      })
      .catch(() => {});

    // 3. For Teachers & Admins, fetch both class-wise Ibadah & Overall rankings
    const p3 = canViewClassRankings
      ? getMyClasses(cid, token)
          .then(async (allClasses) => {
            if (cancelled) return;
            const myClassTeacherClasses = allClasses.filter((c) => user?.id && c.classTeacherId === user.id);
            const targetClasses = isTeacher
              ? (myClassTeacherClasses.length > 0 ? myClassTeacherClasses : allClasses)
              : allClasses;
            
            const [rankings, oRankings] = await Promise.all([
              Promise.all(
                targetClasses.map(async (cls) => ({
                  classId: cls.id,
                  className: cls.name,
                  isClassTeacher: cls.classTeacherId === user?.id,
                  performers: (await getBestPerformers(cid, token, { ...dates, classId: cls.id, limit: 500 })).performers,
                }))
              ),
              Promise.all(
                targetClasses.map(async (cls) => ({
                  classId: cls.id,
                  className: cls.name,
                  isClassTeacher: cls.classTeacherId === user?.id,
                  performers: (await getOverallBestStudents(cid, token, { ...dates, classId: cls.id, limit: 500 })).performers,
                }))
              ),
            ]);

            if (!cancelled) {
              setClassRankings(rankings);
              setOverallClassRankings(oRankings);
              if (targetClasses.length > 0) {
                const defaultCls = classIdParam && targetClasses.some((c) => c.id === classIdParam)
                  ? classIdParam
                  : targetClasses[0].id;
                setSelectedClassId((prev) => prev ?? defaultCls);
              }
            }
          })
          .catch(() => {
            if (!cancelled) {
              setClassRankings([]);
              setOverallClassRankings([]);
            }
          })
      : Promise.resolve();

    Promise.all([p1, p2, p3]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cid, token, periodType, user?.role, user?.actorType, user?.id]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Printable Container */}
        <div ref={printRef} className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-emerald-600 to-teal-500 rounded-3xl p-5 lg:p-6 text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  {rankingCategory === "total" ? (
                    <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                  ) : (
                    <Trophy className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">{roleLabel}</p>
                  <h1 className="text-xl font-bold">
                    {rankingCategory === "total"
                      ? (lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്കിംഗ്" : "Overall Best Student Ranking")
                      : (lang === "ml" ? "മികച്ച ഇബാദത്ത് പ്രകടനം" : "Best Ibadah Performance")}
                  </h1>
                </div>
              </div>

              {!isParent && (rankingCategory === "total" ? overallData.length > 0 : displayData.length > 0) && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-all disabled:opacity-50 cursor-pointer"
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
              {rankingCategory === "total" ? (
                [
                  {
                    icon: Award,
                    label: lang === "ml" ? "മികച്ച ആകെ സ്കോർ" : "Top Total Score",
                    value: overallData[0] ? `${overallData[0].totalScore} / 100` : "—",
                  },
                  {
                    icon: Users,
                    label: lang === "ml" ? "ഹാജർ നിരക്ക്" : "Attendance Leader",
                    value: overallHighlights?.bestAttendance ? `${overallHighlights.bestAttendance.rate}%` : "—",
                  },
                  {
                    icon: GraduationCap,
                    label: lang === "ml" ? "പരീക്ഷാ ശരാശരി" : "Academic Topper",
                    value: overallHighlights?.bestExam ? `${overallHighlights.bestExam.averagePercentage}%` : "—",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/15 rounded-xl p-3 text-center"
                  >
                    <s.icon className="w-4 h-4 mx-auto mb-1 text-emerald-200" />
                    <p className="text-lg font-black">{s.value}</p>
                    <p className="text-[10px] text-emerald-200">{s.label}</p>
                  </div>
                ))
              ) : (
                [
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
                    <s.icon className="w-4 h-4 mx-auto mb-1 text-emerald-200" />
                    <p className="text-lg font-black">{s.value}</p>
                    <p className="text-[10px] text-emerald-200">{s.label}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Category Switcher & Period Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => handleSelectCategory("total")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                  rankingCategory === "total"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-gray-500 hover:text-gray-800",
                )}
              >
                <Star className={cn("w-4 h-4", rankingCategory === "total" ? "text-amber-500 fill-amber-500" : "text-gray-400")} />
                <span>{lang === "ml" ? "ആകെ മികച്ച വിദ്യാർത്ഥി (Total)" : "Overall Best Student (Total)"}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block",
                  rankingCategory === "total" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                )}>
                  4 Pillars
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory("ibadah")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                  rankingCategory === "ibadah"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-gray-500 hover:text-gray-800",
                )}
              >
                <Trophy className={cn("w-4 h-4", rankingCategory === "ibadah" ? "text-emerald-600" : "text-gray-400")} />
                <span>{lang === "ml" ? "ഇബാദത്ത് റാങ്കിംഗ്" : "Ibadah Ranking"}</span>
              </button>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-xs w-fit">
              {(["week", "month"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => handleSelectPeriod(value)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    periodType === value
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {value === "week"
                    ? (lang === "ml" ? "ഈ ആഴ്ച (Weekly)" : "Weekly Best")
                    : (lang === "ml" ? "ഈ മാസം (Monthly)" : "Monthly Best")}
                </button>
              ))}
            </div>
          </div>

          {period && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  {lang === "ml" ? "കാലയളവ്" : "Period"}: {formatDateRange()}
                </span>
              </div>
              <div className="text-xs text-emerald-700/80 font-medium flex items-center gap-1">
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
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                    {child.name.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{child.name}</p>
                  <span className={cn(
                    "ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    child.score >= 80 ? "bg-emerald-100 text-emerald-700" : child.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
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
                    <p className="text-3xl font-black text-emerald-600">
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
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${child.score}%`,
                      background: child.score >= 80
                        ? "linear-gradient(to right, #10b981, #059669)"
                        : child.score >= 50
                          ? "linear-gradient(to right, #f59e0b, #d97706)"
                          : "linear-gradient(to right, #ef4444, #dc2626)",
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {topPerformer && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      <Trophy className="w-3 h-3" />
                      {lang === "ml" ? "മികവ്" : "Top"}: {topPerformer.score}%
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
                    vsAvg >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {/* Highlights Banner for Overall Best Student */}
          {rankingCategory === "total" && overallHighlights && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {overallHighlights.topPerformer && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>Top Performer</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs truncate">{overallHighlights.topPerformer.name}</p>
                  <p className="text-[10px] text-amber-700 font-semibold mt-0.5">{overallHighlights.topPerformer.score} pts · {overallHighlights.topPerformer.className}</p>
                </div>
              )}
              {overallHighlights.bestAttendance && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold mb-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Best Attendance</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs truncate">{overallHighlights.bestAttendance.name}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">{overallHighlights.bestAttendance.rate}% rate · {overallHighlights.bestAttendance.className}</p>
                </div>
              )}
              {overallHighlights.bestHomework && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-bold mb-1">
                    <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                    <span>Homework Champ</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs truncate">{overallHighlights.bestHomework.name}</p>
                  <p className="text-[10px] text-blue-700 font-semibold mt-0.5">{overallHighlights.bestHomework.rate}% rate · {overallHighlights.bestHomework.className}</p>
                </div>
              )}
              {overallHighlights.bestExam && (
                <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-bold mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Academic Topper</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs truncate">{overallHighlights.bestExam.name}</p>
                  <p className="text-[10px] text-purple-700 font-semibold mt-0.5">{overallHighlights.bestExam.averagePercentage}% avg · {overallHighlights.bestExam.className}</p>
                </div>
              )}
              {overallHighlights.bestIbadah && (
                <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 text-[11px] font-bold mb-1">
                    <Flame className="w-3.5 h-3.5 text-teal-600" />
                    <span>Best Ibadah</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs truncate">{overallHighlights.bestIbadah.name}</p>
                  <p className="text-[10px] text-teal-700 font-semibold mt-0.5">{overallHighlights.bestIbadah.percentage}% score · {overallHighlights.bestIbadah.className}</p>
                </div>
              )}
            </div>
          )}

          {/* Performers list: Overall Best Students */}
          {rankingCategory === "total" && !loading && !error && (
            overallData.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
                <Star className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-semibold">
                  {lang === "ml" ? "വിവരങ്ങൾ ലഭ്യമല്ല" : "No student performance records found for this period"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overallData.map((performer, i) => {
                  const isMyChild = accessibleIds.includes(performer.studentId);
                  return (
                    <motion.div
                      key={performer.studentId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      className={cn(
                        "bg-white rounded-3xl border p-4 sm:p-5 shadow-xs transition-all space-y-3",
                        isMyChild ? "ring-2 ring-emerald-400 bg-emerald-50/30 border-emerald-200" : "border-gray-100 hover:border-gray-200",
                      )}
                    >
                      {/* Top row: Rank, Name, Adno, Total Score */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-2xl shrink-0 w-9 text-center font-black">
                            {performer.rank <= 3 ? medalEmoji[performer.rank - 1] : `#${performer.rank}`}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm truncate">{performer.name}</p>
                              {performer.className && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {performer.className}
                                </span>
                              )}
                              {isMyChild && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {lang === "ml" ? "എന്റെ കുട്ടി" : "Your Child"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{performer.adno}</p>
                          </div>
                        </div>

                        {/* Total Score Badge */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-black text-emerald-600">{performer.totalScore}</span>
                            <span className="text-xs font-semibold text-gray-400">/ 100</span>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {performer.totalPercentage}% {lang === "ml" ? "ആകെ സ്കോർ" : "TOTAL"}
                          </p>
                        </div>
                      </div>

                      {/* Total composite progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                        <div style={{ width: `${(performer.attendance.score / 25) * 25}%` }} className="bg-emerald-500 h-full" title="Attendance" />
                        <div style={{ width: `${(performer.homework.score / 25) * 25}%` }} className="bg-blue-500 h-full" title="Homework" />
                        <div style={{ width: `${(performer.exam.score / 25) * 25}%` }} className="bg-purple-500 h-full" title="Exams" />
                        <div style={{ width: `${(performer.ibadah.score / 25) * 25}%` }} className="bg-teal-500 h-full" title="Ibadah" />
                      </div>

                      {/* 4 Pillars Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                        {/* Pillar 1: Attendance */}
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between font-bold text-emerald-800 text-[11px] mb-1">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-emerald-600" /> Attendance</span>
                            <span>{performer.attendance.score}/25</span>
                          </div>
                          <p className="text-[11px] font-semibold text-emerald-900">{performer.attendance.rate}% rate</p>
                          <p className="text-[10px] text-emerald-600/90">{performer.attendance.presentDays}/{performer.attendance.totalDays} days present</p>
                        </div>

                        {/* Pillar 2: Homework */}
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between font-bold text-blue-800 text-[11px] mb-1">
                            <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3 text-blue-600" /> Homework</span>
                            <span>{performer.homework.score}/25</span>
                          </div>
                          <p className="text-[11px] font-semibold text-blue-900">{performer.homework.rate}% completed</p>
                          <p className="text-[10px] text-blue-600/90">{performer.homework.completed}/{performer.homework.assigned} assignments</p>
                        </div>

                        {/* Pillar 3: Exam Marks */}
                        <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between font-bold text-purple-800 text-[11px] mb-1">
                            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3 text-purple-600" /> Exam Marks</span>
                            <span>{performer.exam.score}/25</span>
                          </div>
                          <p className="text-[11px] font-semibold text-purple-900">{performer.exam.averagePercentage}% avg</p>
                          <p className="text-[10px] text-purple-600/90">{performer.exam.examsCount} exams evaluated</p>
                        </div>

                        {/* Pillar 4: Ibadah */}
                        <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between font-bold text-teal-800 text-[11px] mb-1">
                            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-teal-600" /> Ibadah</span>
                            <span>{performer.ibadah.score}/25</span>
                          </div>
                          <p className="text-[11px] font-semibold text-teal-900">{performer.ibadah.percentage}% score</p>
                          <p className="text-[10px] text-teal-600/90">{performer.ibadah.totalPrayers} prayers · {performer.ibadah.totalQuranPages}p</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}

          {/* Performers list: Ibadah Ranking (Existing) */}
          {rankingCategory === "ibadah" && !loading && !error && displayData.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xs">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">
                {isParent
                  ? (lang === "ml" ? "ഇബാദത്ത് വിവരങ്ങൾ ലഭ്യമല്ല" : "No ibadah data available for your child yet")
                  : (lang === "ml" ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല" : "No ibadah data available yet")}
              </p>
            </div>
          )}

          {rankingCategory === "ibadah" && !loading && !error && displayData.length > 0 && (
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
                        ? "ring-2 ring-emerald-400 bg-emerald-50/50 border-emerald-200"
                        : "border-gray-100",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl shrink-0 w-10 text-center">
                        {isParent ? (
                          <span className="text-sm font-black text-emerald-600">
                            #{rank}
                          </span>
                        ) : (
                          medalEmoji[i] ?? "🏅"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {performer.name}
                          </p>
                          {isMyChild && (
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                              {lang === "ml" ? "എന്റെ കുട്ടി" : "Your Child"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{performer.adno}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                            <Star className="w-3 h-3" />
                            {performer.totalPrayers}{" "}
                            {lang === "ml" ? "നമസ്കാരം" : "prayers"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
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
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full"
                              >
                                <Sparkles className="w-3 h-3" />
                                {val} {label}
                              </span>
                            );
                          })}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
                            <Flame className="w-3 h-3" />
                            {performer.streak}d{" "}
                            {lang === "ml" ? "സ്ട്രീക്ക്" : "streak"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {performer.consistency}%{" "}
                            {lang === "ml" ? "സ്ഥിരത" : "consistency"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-emerald-600">
                          {performer.score}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-400">
                          {lang === "ml" ? "സ്കോർ" : "SCORE"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${performer.scorePercentage}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Class-wise Ranking for Teachers & Admins */}
          {!isParent && canViewClassRankings && !loading && (
            <section className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">
                      {rankingCategory === "total"
                        ? (lang === "ml" ? "ക്ലാസ് അടിസ്ഥാനത്തിലുള്ള ആകെ മികച്ച വിദ്യാർത്ഥി റാങ്ക് ലിസ്റ്റ്" : "Class-wise Best Student Ranking (Total)")
                        : (lang === "ml" ? "ക്ലാസ് അടിസ്ഥാനത്തിലുള്ള മികച്ച ഇബാദത്ത് റാങ്ക് ലിസ്റ്റ്" : "Best Ibada Performance Ranking — Class-wise")}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {rankingCategory === "total"
                        ? (lang === "ml" ? "ഹാജർ, ഹോംവർക്ക്, പരീക്ഷ, ഇബാദത്ത് എന്നിവയുടെ സമ്പൂർണ്ണ റാങ്ക് പട്ടിക" : "Showing all students ranked by Attendance, Homework, Exams & Ibadah")
                        : (lang === "ml" ? "ക്ലാസിലെ മുഴുവൻ വിദ്യാർത്ഥികളുടെയും സമ്പൂർണ്ണ റാങ്ക് പട്ടിക" : "Showing all students ranked in your class")}
                    </p>
                  </div>
                </div>

                {/* Class tabs if teacher has multiple classes */}
                {((rankingCategory === "total" ? overallClassRankings : classRankings).length > 1) && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {(rankingCategory === "total" ? overallClassRankings : classRankings).map((c) => (
                      <button
                        key={c.classId}
                        type="button"
                        onClick={() => handleSelectClass(c.classId)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer",
                          selectedClassId === c.classId
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                        )}
                      >
                        {c.className} ({c.performers.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Class ranking cards: Total vs Ibadah */}
              {rankingCategory === "total" ? (
                <div className="space-y-6">
                  {(selectedClassId
                    ? overallClassRankings.filter((c) => c.classId === selectedClassId)
                    : overallClassRankings
                  ).map(({ classId, className, isClassTeacher, performers }) => {
                    const q = (classSearch[classId] || "").toLowerCase().trim();
                    const filtered = performers.filter(
                      (p) => !q || p.name.toLowerCase().includes(q) || p.adno.toLowerCase().includes(q)
                    );
                    const isExpanded = showAllPerClass[classId] ?? true;
                    const displayedList = isExpanded ? filtered : filtered.slice(0, 15);
                    const classAvg = performers.length > 0
                      ? Math.round(performers.reduce((sum, p) => sum + p.totalScore, 0) / performers.length)
                      : 0;

                    return (
                      <div
                        key={classId || className}
                        className="bg-white rounded-3xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-4"
                      >
                        {/* Class Card Top Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-gray-900">{className}</h3>
                              {isClassTeacher && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Class Teacher
                                </span>
                              )}
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {performers.length} {lang === "ml" ? "വിദ്യാർത്ഥികൾ" : "Students"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Class Average: <span className="font-semibold text-gray-700">{classAvg} / 100</span> · Top:{" "}
                              <span className="font-semibold text-emerald-700">{performers[0]?.totalScore ?? 0} pts</span>
                            </p>
                          </div>

                          {/* Search Input within class */}
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={classSearch[classId] || ""}
                              onChange={(e) =>
                                setClassSearch((prev) => ({ ...prev, [classId]: e.target.value }))
                              }
                              placeholder={lang === "ml" ? "വിദ്യാർത്ഥിയെ തിരയുക..." : `Search in ${className}...`}
                              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </div>
                        </div>

                        {/* Students List */}
                        {performers.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-xs">
                            {lang === "ml" ? "ഈ ക്ലാസിൽ വിദ്യാർത്ഥികളില്ല" : "No students found in this class."}
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            {lang === "ml" ? "തിരഞ്ഞെടുത്ത ഫലങ്ങളൊന്നുമില്ല" : "No students match your search."}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {displayedList.map((performer) => (
                              <div
                                key={performer.studentId}
                                className={cn(
                                  "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5",
                                  performer.rank === 1
                                    ? "bg-amber-50/50 border-amber-200/80 shadow-xs"
                                    : performer.rank === 2
                                    ? "bg-slate-50/70 border-slate-200"
                                    : performer.rank === 3
                                    ? "bg-amber-50/30 border-amber-100"
                                    : "bg-white border-gray-100 hover:border-gray-200",
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border",
                                        performer.rank === 1
                                          ? "bg-amber-100 text-amber-800 border-amber-300 text-sm"
                                          : performer.rank === 2
                                          ? "bg-slate-200 text-slate-800 border-slate-300 text-sm"
                                          : performer.rank === 3
                                          ? "bg-amber-100/60 text-amber-900 border-amber-200 text-sm"
                                          : "bg-gray-50 text-gray-500 border-gray-200",
                                      )}
                                    >
                                      {performer.rank <= 3 ? medalEmoji[performer.rank - 1] : `#${performer.rank}`}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-900 text-sm truncate">{performer.name}</p>
                                      <p className="text-[11px] text-gray-400 font-mono">{performer.adno}</p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="flex items-baseline gap-1 justify-end">
                                      <span className="text-xl font-black text-emerald-600">{performer.totalScore}</span>
                                      <span className="text-xs font-semibold text-gray-400">/ 100</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 4 pillars micro-badges */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px]">
                                  <div className="bg-emerald-50 text-emerald-800 rounded-lg px-2 py-1 flex items-center justify-between">
                                    <span className="font-semibold">Attendance</span>
                                    <span className="font-bold">{performer.attendance.score}/25</span>
                                  </div>
                                  <div className="bg-blue-50 text-blue-800 rounded-lg px-2 py-1 flex items-center justify-between">
                                    <span className="font-semibold">Homework</span>
                                    <span className="font-bold">{performer.homework.score}/25</span>
                                  </div>
                                  <div className="bg-purple-50 text-purple-800 rounded-lg px-2 py-1 flex items-center justify-between">
                                    <span className="font-semibold">Exams</span>
                                    <span className="font-bold">{performer.exam.score}/25</span>
                                  </div>
                                  <div className="bg-teal-50 text-teal-800 rounded-lg px-2 py-1 flex items-center justify-between">
                                    <span className="font-semibold">Ibadah</span>
                                    <span className="font-bold">{performer.ibadah.score}/25</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expand/Collapse */}
                        {filtered.length > 15 && (
                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllPerClass((prev) => ({
                                  ...prev,
                                  [classId]: !isExpanded,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? (lang === "ml" ? "ചുരുക്കുക (ആദ്യ 15 പേർ)" : "Show Top 15 Only")
                                  : (lang === "ml" ? `എല്ലാ ${filtered.length} പേരെയും കാണിക്കുക` : `Show All ${filtered.length} Students`)}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Class ranking cards: Ibadah (Existing) */
                <div className="space-y-6">
                  {(selectedClassId
                    ? classRankings.filter((c) => c.classId === selectedClassId)
                    : classRankings
                  ).map(({ classId, className, isClassTeacher, performers }) => {
                    const q = (classSearch[classId] || "").toLowerCase().trim();
                    const filtered = performers.filter(
                      (p) => !q || p.name.toLowerCase().includes(q) || p.adno.toLowerCase().includes(q)
                    );
                    const isExpanded = showAllPerClass[classId] ?? true;
                    const displayedList = isExpanded ? filtered : filtered.slice(0, 15);
                    const classAvg = performers.length > 0
                      ? Math.round(performers.reduce((sum, p) => sum + p.score, 0) / performers.length)
                      : 0;

                    return (
                      <div
                        key={classId || className}
                        className="bg-white rounded-3xl border border-gray-100 p-5 lg:p-6 shadow-xs space-y-4"
                      >
                        {/* Class Card Top Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-gray-900">{className}</h3>
                              {isClassTeacher && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Class Teacher
                                </span>
                              )}
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {performers.length} {lang === "ml" ? "വിദ്യാർത്ഥികൾ" : "Students Ranked"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Class Average: <span className="font-semibold text-gray-700">{classAvg} pts</span> · Top:{" "}
                              <span className="font-semibold text-emerald-700">{performers[0]?.score ?? 0} pts</span>
                            </p>
                          </div>

                          {/* Search Input within class */}
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={classSearch[classId] || ""}
                              onChange={(e) =>
                                setClassSearch((prev) => ({ ...prev, [classId]: e.target.value }))
                              }
                              placeholder={lang === "ml" ? "വിദ്യാർത്ഥിയെ തിരയുക..." : `Search in ${className}...`}
                              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </div>
                        </div>

                        {/* Students List */}
                        {performers.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-xs">
                            {lang === "ml" ? "ഈ ക്ലാസിൽ വിദ്യാർത്ഥികളില്ല" : "No students found in this class."}
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            {lang === "ml" ? "തിരഞ്ഞെടുത്ത ഫലങ്ങളൊന്നുമില്ല" : "No students match your search."}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {displayedList.map((performer) => {
                              const rank = performers.findIndex((p) => p.studentId === performer.studentId) + 1;
                              return (
                                <div
                                  key={performer.studentId}
                                  className={cn(
                                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all",
                                    rank === 1
                                      ? "bg-amber-50/50 border-amber-200/80 shadow-xs"
                                      : rank === 2
                                      ? "bg-slate-50/70 border-slate-200"
                                      : rank === 3
                                      ? "bg-amber-50/30 border-amber-100"
                                      : "bg-white border-gray-100 hover:border-gray-200",
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Rank Badge */}
                                    <div
                                      className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border",
                                        rank === 1
                                          ? "bg-amber-100 text-amber-800 border-amber-300 text-sm"
                                          : rank === 2
                                          ? "bg-slate-200 text-slate-800 border-slate-300 text-sm"
                                          : rank === 3
                                          ? "bg-amber-100/60 text-amber-900 border-amber-200 text-sm"
                                          : "bg-gray-50 text-gray-500 border-gray-200",
                                      )}
                                    >
                                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                                    </div>

                                    {/* Student Name & Info */}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-gray-900 text-sm truncate">
                                          {performer.name}
                                        </p>
                                        <span className="text-[11px] text-gray-400 font-mono">
                                          {performer.adno}
                                        </span>
                                      </div>

                                      {/* Sub details: prayers, quran, streak */}
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {performer.score > 0 ? (
                                          <>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                                              <Star className="w-2.5 h-2.5" />
                                              {performer.totalPrayers} {lang === "ml" ? "നമസ്കാരം" : "prayers"}
                                            </span>
                                            {performer.totalQuranPages > 0 && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                                                <BookOpen className="w-2.5 h-2.5" />
                                                {performer.totalQuranPages} {lang === "ml" ? "പേജ്" : "pages"}
                                              </span>
                                            )}
                                            {performer.streak > 0 && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md">
                                                <Flame className="w-2.5 h-2.5" />
                                                {performer.streak}d streak
                                              </span>
                                            )}
                                            {performer.consistency > 0 && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                                {performer.consistency}% consistency
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                                            {lang === "ml" ? "ഇബാദത്ത് രേഖപ്പെടുത്തിയിട്ടില്ല" : "No ibadah recorded yet"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Score & Percentage */}
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                    <div className="flex items-baseline gap-1">
                                      <span
                                        className={cn(
                                          "text-lg font-black",
                                          performer.score > 0 ? "text-emerald-600" : "text-gray-400",
                                        )}
                                      >
                                        {performer.score}
                                      </span>
                                      <span className="text-[10px] font-semibold text-gray-400 uppercase">
                                        pts
                                      </span>
                                    </div>
                                    <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden mt-1 hidden sm:block">
                                      <div
                                        className="h-1.5 bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, performer.scorePercentage)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Expand/Collapse Toggle if many students */}
                        {filtered.length > 15 && (
                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllPerClass((prev) => ({
                                  ...prev,
                                  [classId]: !isExpanded,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                              <span>
                                {isExpanded
                                  ? (lang === "ml" ? "ചുരുക്കുക (ആദ്യ 15 പേർ)" : "Show Top 15 Only")
                                  : (lang === "ml" ? `എല്ലാ ${filtered.length} പേരെയും കാണിക്കുക` : `Show All ${filtered.length} Students`)}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
