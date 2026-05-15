import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import {
  FileBarChart2, TrendingUp, AlertTriangle, CheckCircle2,
  IndianRupee, Users, BookOpen, Heart,
} from "lucide-react";

function computeHealthScore(d: ReturnType<typeof import("@/lib/use-committee-data").useCommitteeData>) {
  const fees   = d.fees.collectionPct;
  const att    = d.attendance.overallPct;
  const acad   = d.academic.passRate;
  const ibadah = d.ibadah.quranCompletionPct;
  return Math.round((fees + att + acad + ibadah) / 4);
}

function getStatus(v: number, lang: string) {
  if (v >= 85) return { label: lang === "ml" ? "ഉത്തമം" : "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500", border: "border-emerald-200" };
  if (v >= 70) return { label: lang === "ml" ? "നല്ലത്" : "Good",      color: "text-blue-600",    bg: "bg-blue-50",    bar: "bg-blue-500",    border: "border-blue-200"    };
  if (v >= 55) return { label: lang === "ml" ? "ശരാശരി" : "Average",  color: "text-amber-600",   bg: "bg-amber-50",   bar: "bg-amber-400",   border: "border-amber-200"   };
  return       { label: lang === "ml" ? "ദുർബലം" : "Needs Work",      color: "text-red-600",     bg: "bg-red-50",     bar: "bg-red-400",     border: "border-red-200"     };
}

function Bar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-3 ${color} rounded-full transition-all duration-700`} style={{ width: `${safe}%` }} />
    </div>
  );
}

export default function CommitteeReportsPage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();
  const health = computeHealthScore(d);
  const overallStatus = getStatus(health, lang);

  const sections = [
    {
      icon: IndianRupee, key: "finance",
      label: lang === "ml" ? "ഫിനാൻഷ്യൽ" : "Finance",
      score: d.fees.collectionPct,
      details: [
        { k: lang === "ml" ? "ശേഖരണം" : "Collection", v: `₹${(d.fees.collectedSoFar / 1000).toFixed(0)}K / ₹${(d.fees.totalAnnualTarget / 1000).toFixed(0)}K` },
        { k: lang === "ml" ? "ബാക്കി" : "Pending",    v: `₹${(d.fees.pendingAmount / 1000).toFixed(0)}K (${d.fees.unpaidStudents} ${lang === "ml" ? "വിദ്യാർ." : "students"})` },
      ],
    },
    {
      icon: Users, key: "attendance",
      label: lang === "ml" ? "ഹാജർ" : "Attendance",
      score: d.attendance.overallPct,
      details: [
        { k: lang === "ml" ? "ഒ.ഹാജർ %" : "Avg %",      v: `${d.attendance.overallPct}%` },
        { k: lang === "ml" ? "ഇന്ന്" : "Today",          v: `${d.attendance.todayPresent} / ${d.attendance.todayPresent + d.attendance.todayAbsent}` },
        { k: lang === "ml" ? "ശ്രദ്ധ ആവശ്" : "Attention", v: `${d.attendance.lowAttendanceStudents} ${lang === "ml" ? "വിദ്യാർ." : "students"}` },
      ],
    },
    {
      icon: BookOpen, key: "academic",
      label: lang === "ml" ? "അക്കാദമിക്" : "Academic",
      score: d.academic.passRate,
      details: [
        { k: lang === "ml" ? "ശ.ശ. സ്കോർ" : "Avg Score", v: `${d.academic.lastExamAvgScore}%` },
        { k: lang === "ml" ? "വിജയ %" : "Pass Rate",      v: `${d.academic.passRate}%` },
        { k: lang === "ml" ? "ടോപ്പ് വിദ്യാർ." : "Toppers", v: `${d.academic.topStudents.length}` },
      ],
    },
    {
      icon: Heart, key: "ibadah",
      label: lang === "ml" ? "ഇബാദ" : "Ibadah",
      score: d.ibadah.quranCompletionPct,
      details: [
        { k: lang === "ml" ? "ഖുർആൻ %" : "Quran %",      v: `${d.ibadah.quranCompletionPct}%` },
        { k: lang === "ml" ? "നമ. ട്രാക്ക്" : "Prayer Tracked", v: `${d.ibadah.prayerTrackedStudents}` },
        { k: lang === "ml" ? "ചാമ്പ്യൻസ്" : "Champions",   v: `${d.ibadah.ibadahChampions.length}` },
      ],
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-linear-to-r from-slate-700 to-gray-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileBarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "മദ്‌റസ ആരോഗ്യ റിപ്പോർട്ട്" : "Madrasa Health Report"}
              </h1>
            </div>
          </div>
          {/* Big health gauge */}
          <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shrink-0`}>
              <span className={`text-xl font-black ${overallStatus.color}`}>{health}</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">
                {lang === "ml" ? "ഒट्टाकে ആരോഗ്യ സ്കോർ" : "Overall Health Score"}
              </p>
              <p className={`text-sm font-semibold ${overallStatus.color.replace("text-", "text-")} bg-white/20 rounded-lg px-2 py-0.5 inline-block mt-1`}>
                {overallStatus.label}
              </p>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden mt-2">
                <div className={`h-full ${overallStatus.bar} rounded-full`} style={{ width: `${health}%` }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4-section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {sections.map((s, i) => {
          const st = getStatus(s.score, lang);
          return (
            <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`bg-white rounded-2xl border ${st.border} p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${st.bg} rounded-xl flex items-center justify-center`}>
                    <s.icon className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <p className="font-bold text-gray-800 text-sm">{s.label}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xl font-black ${st.color}`}>{s.score}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                </div>
              </div>
              <Bar value={s.score} color={st.bar} />
              <div className="mt-3 space-y-1">
                {s.details.map((detail) => (
                  <div key={detail.k} className="flex justify-between text-xs">
                    <span className="text-gray-500">{detail.k}</span>
                    <span className="font-bold text-gray-700">{detail.v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Madrasa info card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <p className="font-bold text-gray-800 mb-3">
          {lang === "ml" ? "മദ്‌റസ വിവരങ്ങൾ" : "Madrasa Information"}
        </p>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          {[
            { k: lang === "ml" ? "പേര്" : "Name",              v: lang === "ml" ? d.madrasa.name_ml : d.madrasa.name },
            { k: lang === "ml" ? "സ്ഥലം" : "Location",         v: d.madrasa.location },
            { k: lang === "ml" ? "സ്ഥാപിതം" : "Established",   v: d.madrasa.established },
            { k: lang === "ml" ? "അദ്ധ്യ. വർഷം" : "Session",  v: d.madrasa.session },
          ].map((row) => (
            <div key={row.k}>
              <p className="text-xs text-gray-400 font-medium">{row.k}</p>
              <p className="font-bold text-gray-800">{row.v}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Summary alert */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className={`rounded-2xl p-4 flex items-start gap-3 border ${
          health >= 80
            ? "bg-emerald-50 border-emerald-200"
            : health >= 65
              ? "bg-amber-50 border-amber-200"
              : "bg-red-50 border-red-200"
        }`}
      >
        {health >= 80
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
        <div>
          <p className={`text-sm font-bold ${health >= 80 ? "text-emerald-800" : "text-amber-800"}`}>
            {health >= 80
              ? (lang === "ml" ? "മദ്‌റസ മൊത്തത്തിൽ നന്നായി പ്രവർത്തിക്കുന്നു" : "Madrasa is performing well overall")
              : (lang === "ml" ? "ചില മേഖലകൾ ശ്രദ്ധ ആവശ്യമാണ്" : "Some areas need attention")}
          </p>
          <p className={`text-xs mt-0.5 ${health >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
            {lang === "ml"
              ? `ആരോഗ്യ സ്കോർ: ${health}/100 — ${d.madrasa.session} അദ്ധ്യ. വർഷം`
              : `Health score: ${health}/100 — Academic year ${d.madrasa.session}`}
          </p>
        </div>
      </motion.div>

      {/* Trend summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mt-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-slate-600" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "ഫീസ് ശേഖരണ ട്രെൻഡ്" : "Fee Collection Trend"}
          </p>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {d.fees.monthlyTrend.map((m, i) => {
            const max = Math.max(...d.fees.monthlyTrend.map((x) => x.collected));
            const h = max === 0 ? 0 : Math.round((m.collected / max) * 100);
            return (
              <motion.div key={m.month} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                transition={{ delay: 0.56 + i * 0.07 }}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full bg-slate-500 rounded-t" style={{ height: `${h * 0.55}px`, minHeight: "4px" }} />
                <p className="text-[9px] text-gray-400 font-medium">{lang === "ml" ? m.month_ml : m.month}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
