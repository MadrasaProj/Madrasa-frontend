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
import { Trophy, Star, BookOpen, Flame, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const medalEmoji = ["🥇", "🥈", "🥉", "🏅", "🌟", "⭐", "✨", "💫", "🔥", "🌙"];

export default function BestPerformancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken } = useAuthStore();
  const [data, setData] = useState<BestPerformer[]>([]);
  const [customItems, setCustomItems] = useState<{ key: string; label: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";

  const roleLabel = lang === "ml"
    ? ({ admin: "അഡ്മിൻ", teacher: "അധ്യാപകൻ", parent: "രക്ഷിതാവ്", committee: "കമ്മിറ്റി" } as const)[user?.role as string] ?? "കമ്മിറ്റി"
    : ({ admin: "Admin", teacher: "Teacher", parent: "Parent", committee: "Management Committee" } as const)[user?.role as string] ?? "Management Committee";

  const isParent = user?.role === "parent";
  const accessibleIds = user?.accessibleStudentIds ?? [];

  useEffect(() => {
    if (!cid || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getBestPerformers(cid, token, { limit: isParent ? 100 : 10 })
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

    return () => { cancelled = true; };
  }, [cid, token]);

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
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score, 0) / data.length) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">{roleLabel}</p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "മികച്ച ഇബാദത്ത്" : "Best Ibadah Performance"}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              {
                icon: Star,
                label: lang === "ml" ? "മികച്ച സ്കോർ" : "Best Score",
                value: displayData[0] ? `${displayData[0].score}%` : "—",
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
            ))}
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

        {/* Parent comparison */}
        {isParent && data.filter((p) => accessibleIds.includes(p.studentId)).map((child) => {
          const rank = rankInFull(child.studentId);
          const gap = topPerformer.score - child.score;
          const vsAvg = child.score - avgScore;
          return (
            <motion.div
              key={`compare-${child.studentId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4"
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <Trophy className="w-3 h-3" />
                  {lang === "ml" ? "മികവ്" : "Top"}: {topPerformer.score}%
                </div>
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
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
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

        {/* Performers list */}
        {!loading && !error && displayData.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
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
                className={cn("bg-white rounded-2xl border p-4 shadow-sm transition-all",
                  isMyChild ? "ring-2 ring-emerald-400 bg-emerald-50/50 border-emerald-200" : "border-gray-100")}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl shrink-0 w-10 text-center">
                    {isParent ? (
                      <span className="text-sm font-black text-emerald-600">#{rank}</span>
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
                        const itemDef = customItems.find((i) => i.key === key);
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
                    style={{ width: `${performer.score}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
