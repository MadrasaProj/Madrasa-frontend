import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import {
  Users, Star, BookOpen, Award, Target, TrendingUp,
  GraduationCap, Heart,
} from "lucide-react";

function Bar({ value, color = "bg-emerald-500", height = "h-2" }: { value: number; color?: string; height?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} rounded-full`} style={{ width: `${safe}%` }} />
    </div>
  );
}

function scoreColor(v: number) {
  if (v >= 85) return "text-emerald-600 bg-emerald-50";
  if (v >= 70) return "text-blue-600 bg-blue-50";
  if (v >= 55) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function barColor(v: number) {
  if (v >= 85) return "bg-emerald-500";
  if (v >= 70) return "bg-blue-500";
  if (v >= 55) return "bg-amber-400";
  return "bg-red-400";
}

const medalEmoji = ["🥇", "🥈", "🥉", "🏅"];

export default function CommitteeStudentsPage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();

  const statCards = [
    {
      label: lang === "ml" ? "മൊത്തം വിദ്യാർത്ഥികൾ" : "Total Students",
      value: `${d.overview.totalStudents}`,
      sub: lang === "ml" ? `${d.overview.totalClasses} ക്ലാസ്സുകൾ` : `${d.overview.totalClasses} classes`,
      icon: Users, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200",
    },
    {
      label: lang === "ml" ? "ശരാശരി സ്കോർ" : "Average Score",
      value: `${d.academic.lastExamAvgScore}%`,
      sub: lang === "ml" ? "അവസാന പരീക്ഷ" : "Last exam",
      icon: Target, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200",
    },
    {
      label: lang === "ml" ? "വിജയ നിരക്ക്" : "Pass Rate",
      value: `${d.academic.passRate}%`,
      sub: lang === "ml" ? "ഒട്ടാകെ" : "Overall",
      icon: TrendingUp, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200",
    },
    {
      label: lang === "ml" ? "ഖുർആൻ പൂർത്തി" : "Quran Completion",
      value: `${d.ibadah.quranCompletionPct}%`,
      sub: lang === "ml" ? "ശ.ശ." : "Average",
      icon: BookOpen, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-linear-to-r from-violet-700 to-blue-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "വിദ്യാർത്ഥി & അക്കാദമിക് അവലോകനം" : "Students & Academic Overview"}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: lang === "ml" ? "വിദ്യാർ." : "Students", value: d.overview.totalStudents },
              { label: lang === "ml" ? "ക്ലാസ്" : "Classes", value: d.overview.totalClasses },
              { label: lang === "ml" ? "ടീച്ചർ" : "Teachers", value: d.overview.totalTeachers },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[11px] text-violet-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-2xl border ${s.border} p-4 shadow-sm`}
          >
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Class-wise table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4.5 h-4.5 text-violet-700" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "ക്ലാസ് തിരിച്ചുള്ള പ്രകടനം" : "Class-wise Performance"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 font-semibold">{lang === "ml" ? "ക്ലാസ്" : "Class"}</th>
                <th className="text-center pb-2 font-semibold">{lang === "ml" ? "വിദ്യാർ." : "Students"}</th>
                <th className="text-left pb-2 font-semibold pl-2">{lang === "ml" ? "ഹാജർ%" : "Attend%"}</th>
                <th className="text-left pb-2 font-semibold pl-2">{lang === "ml" ? "സ്കോർ%" : "Score%"}</th>
                <th className="text-left pb-2 font-semibold pl-2">{lang === "ml" ? "HW%" : "HW%"}</th>
              </tr>
            </thead>
            <tbody>
              {d.academic.classStats.map((cls, i) => (
                <motion.tr key={cls.className} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="border-t border-gray-50"
                >
                  <td className="py-2.5 font-bold text-gray-800">{cls.className}</td>
                  <td className="py-2.5 text-center text-gray-600 font-semibold">{cls.students}</td>
                  <td className="py-2.5 pl-2 min-w-22.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Bar value={cls.attendancePct} color={barColor(cls.attendancePct)} height="h-2" /></div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor(cls.attendancePct)}`}>{cls.attendancePct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-2 min-w-22.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Bar value={cls.avgScore} color={barColor(cls.avgScore)} height="h-2" /></div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor(cls.avgScore)}`}>{cls.avgScore}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-2 min-w-22.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Bar value={cls.hwCompletion} color={barColor(cls.hwCompletion)} height="h-2" /></div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor(cls.hwCompletion)}`}>{cls.hwCompletion}%</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Top Achievers */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4.5 h-4.5 text-amber-500" />
          <p className="font-bold text-gray-800">{lang === "ml" ? "മികച്ച വിദ്യാർത്ഥികൾ" : "Top Achievers"}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {d.academic.topStudents.map((s, i) => (
            <motion.div key={s.name} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.06 }}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
            >
              <span className="text-2xl">{medalEmoji[i] ?? "🌟"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-500">{s.class}</p>
                <p className="text-xs font-semibold text-violet-700 mt-0.5">
                  {lang === "ml" ? s.achievement_ml : s.achievement}
                  {s.score !== undefined ? ` — ${s.score}%` : ""}
                </p>
              </div>
              <Star className="w-4 h-4 text-amber-400 shrink-0" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Ibadah Champions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4.5 h-4.5 text-rose-500" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "ഇബാദ് ചാമ്പ്യൻസ്" : "Ibadah Champions"}
          </p>
        </div>
        <div className="space-y-3">
          {d.ibadah.ibadahChampions.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42 + i * 0.07 }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">{["🌙", "⭐", "✨"][i]}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-gray-800">{c.name}</span>
                  <span className="text-xs font-bold text-rose-600">{c.score}%</span>
                </div>
                <Bar value={c.score} color="bg-rose-400" height="h-2" />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 bg-amber-50 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">🤲</span>
          <p className="text-xs font-semibold text-amber-700">
            {lang === "ml"
              ? `${d.ibadah.prayerTrackedStudents} വിദ്യാർത്ഥികൾ നമസ്കാരം ട്രാക്ക് ചെയ്യുന്നു`
              : `${d.ibadah.prayerTrackedStudents} students are tracking daily prayers`}
          </p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
