import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import {
  IndianRupee, CheckCircle2, TrendingUp, TrendingDown,
  AlertCircle, Users, CreditCard, BarChart3,
} from "lucide-react";

function Bar({ value, color = "bg-emerald-500", height = "h-2" }: { value: number; color?: string; height?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} rounded-full transition-all duration-700`} style={{ width: `${safe}%` }} />
    </div>
  );
}

function pct(v: number, max: number) {
  return max === 0 ? 0 : Math.min(100, Math.round((v / max) * 100));
}

export default function CommitteeFinancePage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();

  const statCards = [
    {
      label:  lang === "ml" ? "വാർഷിക ലക്ഷ്യം"  : "Annual Target",
      value:  `₹${(d.fees.totalAnnualTarget / 1000).toFixed(0)}K`,
      sub:    lang === "ml" ? "ഈ അദ്ധ്യ. വർഷം" : "This academic year",
      icon:   CreditCard, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200",
    },
    {
      label:  lang === "ml" ? "ഇതുവരെ പിരിച്ചത്" : "Collected So Far",
      value:  `₹${(d.fees.collectedSoFar / 1000).toFixed(0)}K`,
      sub:    `${d.fees.collectionPct}% ${lang === "ml" ? "ലക്ഷ്യത്തിൽ" : "of target"}`,
      icon:   TrendingUp, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200",
    },
    {
      label:  lang === "ml" ? "ഇനിയും ബാക്കി"  : "Still Pending",
      value:  `₹${(d.fees.pendingAmount / 1000).toFixed(0)}K`,
      sub:    `${d.fees.unpaidStudents} ${lang === "ml" ? "വിദ്യാർ." : "students"}`,
      icon:   TrendingDown, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",
    },
    {
      label:  lang === "ml" ? "ഫീസ് അടച്ചവർ"  : "Paid Students",
      value:  `${d.fees.paidStudents}`,
      sub:    `${lang === "ml" ? "ൽ" : "of"} ${d.overview.totalStudents} ${lang === "ml" ? "വിദ്യാർ." : "students"}`,
      icon:   CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-linear-to-r from-teal-700 to-emerald-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">{lang === "ml" ? "ഫിനാൻഷ്യൽ സ്ഥിതി" : "Financial Status"}</h1>
            </div>
          </div>
          {/* Big progress bar */}
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-teal-100">
                {lang === "ml" ? "ഒട്ടാകെ ഫീസ് ശേഖരണം" : "Overall Collection Progress"}
              </span>
              <span className="text-2xl font-black text-white">{d.fees.collectionPct}%</span>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${d.fees.collectionPct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-teal-200">
              <span>₹0</span>
              <span>₹{(d.fees.totalAnnualTarget / 1000).toFixed(0)}K {lang === "ml" ? "ലക്ഷ്യം" : "target"}</span>
            </div>
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
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Paid vs Unpaid visual */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4.5 h-4.5 text-emerald-700" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "വിദ്യാർത്ഥി ഫീസ് നില" : "Student Payment Status"}
          </p>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-10 rounded-2xl overflow-hidden flex">
            <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold transition-all"
              style={{ width: `${pct(d.fees.paidStudents, d.overview.totalStudents)}%` }}
            >
              {d.fees.paidStudents}
            </div>
            <div className="bg-orange-400 flex items-center justify-center text-white text-xs font-bold flex-1">
              {d.fees.unpaidStudents}
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="font-semibold text-gray-700">{lang === "ml" ? "അടച്ചു" : "Paid"}: {d.fees.paidStudents}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-400" />
            <span className="font-semibold text-gray-700">{lang === "ml" ? "ബാക്കി" : "Pending"}: {d.fees.unpaidStudents}</span>
          </div>
        </div>
      </motion.div>

      {/* Monthly breakdown */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4.5 h-4.5 text-teal-700" />
          <p className="font-bold text-gray-800">{lang === "ml" ? "മാസ തിരിച്ച് ഫീസ് ശേഖരണം" : "Monthly Fee Collection"}</p>
        </div>
        <div className="space-y-4">
          {d.fees.monthlyTrend.map((m, i) => {
            const achieved = pct(m.collected, m.target);
            const over = m.collected >= m.target;
            return (
              <motion.div key={m.month} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-700 w-10">{lang === "ml" ? m.month_ml : m.month}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-bold ${over ? "text-teal-700" : "text-amber-600"}`}>
                      ₹{(m.collected / 1000).toFixed(1)}K
                    </span>
                    <span className="text-gray-400">/ ₹{(m.target / 1000).toFixed(0)}K</span>
                    {over
                      ? <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-1.5 py-0.5 rounded-full">✓</span>
                      : <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{achieved}%</span>
                    }
                  </div>
                </div>
                <Bar value={achieved} color={over ? "bg-teal-500" : "bg-amber-400"} height="h-2.5" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Alert: pending fee warning */}
      {d.fees.unpaidStudents > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-800">
              {lang === "ml"
                ? `${d.fees.unpaidStudents} വിദ്യാർത്ഥികൾ ഇനിയും ഫീസ് അടച്ചിട്ടില്ല`
                : `${d.fees.unpaidStudents} students have not paid fees yet`}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {lang === "ml"
                ? `ബാക്കി തുക: ₹${(d.fees.pendingAmount / 1000).toFixed(0)}K — ഉടൻ ബന്ധപ്പെടേണ്ടതാണ്`
                : `Outstanding: ₹${(d.fees.pendingAmount / 1000).toFixed(0)}K — Follow-up recommended`}
            </p>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
