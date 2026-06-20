import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { useAuthStore } from "@/store/auth";
import { useState, useEffect } from "react";
import {
  getBestPerformers,
  type BestPerformer,
} from "@/lib/best-performance-api";
import { Trophy, Star, BookOpen, Flame, Target, Medal, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const medalEmoji = ["🥇", "🥈", "🥉", "🏅", "🌟", "⭐", "✨", "💫", "🔥", "🌙"];

export default function ParentBestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const [data, setData] = useState<BestPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllPerformers, setShowAllPerformers] = useState(true);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const ids = user?.accessibleStudentIds ?? [];
  const students = user?.accessibleStudents ?? [];
  const activeId = activeStudentId ?? ids[0] ?? "";
  const activeStudent = students.find((s) => s.id === activeId);

  const isParent = user?.role === "parent";

  useEffect(() => {
    if (!cid || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getBestPerformers(cid, token, { limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setData(res.performers);
        setPeriod(res.period);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cid, token]);

  const formatDateRange = () => {
    if (!period) return "";
    const from = new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const to = new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${from} — ${to}`;
  };

  const rankOf = (sid: string) => {
    const idx = data.findIndex((p) => p.studentId === sid);
    return idx === -1 ? null : idx + 1;
  };

  const topPerformer = data[0] ?? null;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0;

  const activeChildInList = data.find((p) => p.studentId === activeId);

  const SectionHeader = ({
    icon: Icon,
    title,
    count,
  }: {
    icon: typeof Trophy;
    title: string;
    count?: number;
  }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-700" />
      </div>
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {count}
        </span>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="px-4 py-3 lg:px-8 lg:py-6 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-emerald-600 to-teal-500 rounded-3xl p-5 lg:p-6 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "രക്ഷിതാവ്" : "Parent"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "മികച്ച ഇബാദത്ത്" : "Best Ibadah Performance"}
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Period info */}
        {period && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl"
          >
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">
              {lang === "ml" ? "കാലയളവ്" : "Period"}: {formatDateRange()}
            </span>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ──────────────────────────────────────────────────────── */}
            {/* SECTION 1: Current Student Performance & Rank            */}
            {/* ──────────────────────────────────────────────────────── */}
            <div>
              <SectionHeader
                icon={Medal}
                title={activeStudent?.name ?? (lang === "ml" ? "എന്റെ കുട്ടിയുടെ പ്രകടനം" : "My Child's Performance")}
              />

              {!activeChildInList ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                  <Medal className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-semibold text-sm">
                    {lang === "ml"
                      ? "തിരഞ്ഞെടുത്ത കുട്ടിക്ക് ഇബാദത്ത് വിവരങ്ങൾ ലഭ്യമല്ല"
                      : "No ibadah data available for the selected student"}
                  </p>
                </div>
              ) : (
                (() => {
                  const child = activeChildInList;
                  const rank = rankOf(child.studentId);
                  const gap = topPerformer ? topPerformer.score - child.score : 0;
                  const vsAvg = child.score - avgScore;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm ring-1 ring-emerald-400/30 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">
                          {child.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{child.name}</p>
                          <p className="text-xs text-gray-400">{child.adno}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            {lang === "ml" ? "റാങ്ക്" : "Rank"}
                          </p>
                          <p className="text-2xl font-black text-emerald-600">
                            #{rank ?? "—"}
                            <span className="text-sm font-semibold text-gray-400 ml-1">/ {data.length}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            {lang === "ml" ? "സ്കോർ" : "Score"}
                          </p>
                          <p className="text-4xl font-black text-gray-900">
                            {child.score}<span className="text-lg font-semibold text-gray-400">%</span>
                          </p>
                        </div>
                        <span className={cn(
                          "text-[11px] font-bold px-3 py-1 rounded-full",
                          child.score >= 80 ? "bg-emerald-100 text-emerald-700" : child.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                        )}>
                          {child.score >= 80
                            ? (lang === "ml" ? "മികവുറ്റത്" : "Excellent")
                            : child.score >= 50
                              ? (lang === "ml" ? "നല്ലത്" : "Good")
                              : (lang === "ml" ? "മെച്ചപ്പെടുത്തണം" : "Needs Improvement")}
                        </span>
                      </div>

                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
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

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl">
                          <Star className="w-3 h-3" />
                          {child.totalPrayers} {lang === "ml" ? "നമസ്കാരം" : "prayers"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-xl">
                          <BookOpen className="w-3 h-3" />
                          {child.totalQuranPages} {lang === "ml" ? "പേജ്" : "pages"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-xl">
                          <Flame className="w-3 h-3" />
                          {child.streak}d {lang === "ml" ? "സ്ട്രീക്ക്" : "streak"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl">
                          {child.consistency}% {lang === "ml" ? "സ്ഥിരത" : "consistency"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {topPerformer && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold">
                            <Trophy className="w-3 h-3" />
                            {lang === "ml" ? "മികവ്" : "Top"}: {topPerformer.score}%
                          </div>
                        )}
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold",
                          vsAvg >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                        )}>
                          {vsAvg >= 0 ? "▲" : "▼"} {lang === "ml" ? "ശരാശരി" : "Avg"}: {avgScore}%
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-semibold">
                          {lang === "ml" ? "വിടവ്" : "Gap"}: {gap}%
                        </div>
                      </div>

                      {rank && rank <= 3 && (
                        <div className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                          <span className="text-2xl">{medalEmoji[rank - 1]}</span>
                          <span className="text-sm font-bold text-amber-800">
                            {rank === 1
                              ? (lang === "ml" ? "ഒന്നാം റാങ്ക്!" : "1st Rank!")
                              : rank === 2
                                ? (lang === "ml" ? "രണ്ടാം റാങ്ക്!" : "2nd Rank!")
                                : (lang === "ml" ? "മൂന്നാം റാങ്ക്!" : "3rd Rank!")}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })()
              )}
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* SECTION 2: Best Performer List                           */}
            {/* ──────────────────────────────────────────────────────── */}
            <div>
              <button
                onClick={() => setShowAllPerformers(!showAllPerformers)}
                className="w-full flex items-center justify-between mb-4"
              >
                <SectionHeader
                  icon={Trophy}
                  title={lang === "ml" ? "മികച്ച പ്രകടനക്കാർ" : "Best Performers"}
                  count={data.length}
                />
                {showAllPerformers
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-semibold">
                    {lang === "ml" ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല" : "No ibadah data available yet"}
                  </p>
                </div>
              ) : showAllPerformers && (
                <div className="space-y-3">
                  {data.map((performer, i) => {
                    const rank = rankOf(performer.studentId) ?? i + 1;
                    const isMyChild = ids.includes(performer.studentId);
                    return (
                      <motion.div
                        key={performer.studentId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "bg-white rounded-2xl border p-4 shadow-sm transition-all",
                          isMyChild ? "ring-2 ring-emerald-400 bg-emerald-50/50 border-emerald-200" : "border-gray-100",
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl shrink-0 w-10 text-center">
                            {medalEmoji[i] ?? "🏅"}
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
                                {performer.totalPrayers} {lang === "ml" ? "നമസ്കാരം" : "prayers"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                                <BookOpen className="w-3 h-3" />
                                {performer.totalQuranPages} {lang === "ml" ? "പേജ്" : "pages"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
                                <Flame className="w-3 h-3" />
                                {performer.streak}d {lang === "ml" ? "സ്ട്രീക്ക്" : "streak"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                {performer.consistency}% {lang === "ml" ? "സ്ഥിരത" : "consistency"}
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
                            style={{ width: `${performer.score}%` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
