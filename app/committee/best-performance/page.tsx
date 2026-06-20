import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { useBestPerformers } from "@/lib/api-hooks";
import { Trophy, Star, BookOpen, Flame, Target } from "lucide-react";

const medalEmoji = ["🥇", "🥈", "🥉", "🏅", "🌟", "⭐", "✨", "💫", "🔥", "🌙"];

export default function BestPerformancePage() {
  const { lang } = useLanguageStore();
  const { data: perfData, isLoading: loading, error } = useBestPerformers({ limit: 10 });

  const data = perfData?.performers ?? [];
  const period = perfData?.period ?? null;

  const formatDateRange = () => {
    if (!period) return "";
    const from = new Date(period.from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const to = new Date(period.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${from} — ${to}`;
  };

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
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
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
                value: data[0] ? `${data[0].score}%` : "—",
              },
              {
                icon: BookOpen,
                label: lang === "ml" ? "ഖുർആൻ" : "Quran Pages",
                value: data.length > 0
                  ? Math.max(...data.map((d) => d.totalQuranPages))
                  : 0,
              },
              {
                icon: Flame,
                label: lang === "ml" ? "മികച്ച സ്ട്രീക്ക്" : "Best Streak",
                value: data.length > 0
                  ? `${Math.max(...data.map((d) => d.streak))}d`
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
            <p className="text-red-600 font-semibold">{error.message}</p>
          </div>
        )}

        {/* Performers list */}
        {!loading && !error && data.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-semibold">
              {lang === "ml"
                ? "ഇബാദത്ത് ഡാറ്റ ലഭ്യമല്ല"
                : "No ibadah data available yet"}
            </p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-3">
            {data.map((performer, i) => (
              <motion.div
                key={performer.studentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl shrink-0 w-10 text-center">
                    {medalEmoji[i] ?? "🏅"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {performer.name}
                    </p>
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
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
