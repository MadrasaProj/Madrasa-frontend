import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import { Megaphone, AlertCircle, Info, BellRing, Filter } from "lucide-react";
import { useState } from "react";

type Priority = "all" | "high" | "medium" | "low";

const priorityConfig: Record<string, { bg: string; text: string; border: string; icon: React.ElementType; label_en: string; label_ml: string; dot: string }> = {
  high:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: AlertCircle, label_en: "High",   label_ml: "ഉടൻ",      dot: "bg-red-500"    },
  medium: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: BellRing,    label_en: "Medium", label_ml: "ഇടത്തരം",  dot: "bg-amber-400"  },
  low:    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Info,        label_en: "Low",    label_ml: "സാധാരണ",   dot: "bg-blue-400"   },
};

export default function CommitteeAnnouncementsPage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();
  const [filter, setFilter] = useState<Priority>("all");

  const countHigh   = d.announcements.filter((a) => a.priority === "high").length;
  const countMedium = d.announcements.filter((a) => a.priority === "medium").length;
  const countLow    = d.announcements.filter((a) => a.priority === "low").length;

  const filtered = filter === "all" ? d.announcements : d.announcements.filter((a) => a.priority === filter);

  const tabs: { key: Priority; label_en: string; label_ml: string; count: number; active: string; inactive: string }[] = [
    { key: "all",    label_en: "All",    label_ml: "എല്ലാം",    count: d.announcements.length, active: "bg-gray-800 text-white",   inactive: "bg-gray-100 text-gray-600" },
    { key: "high",   label_en: "High",   label_ml: "ഉടൻ",       count: countHigh,               active: "bg-red-600 text-white",    inactive: "bg-red-50 text-red-600"    },
    { key: "medium", label_en: "Medium", label_ml: "ഇടത്തരം",   count: countMedium,             active: "bg-amber-500 text-white",  inactive: "bg-amber-50 text-amber-600"},
    { key: "low",    label_en: "Low",    label_ml: "സാധാരണ",    count: countLow,                active: "bg-blue-600 text-white",   inactive: "bg-blue-50 text-blue-600"  },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-linear-to-r from-rose-700 to-pink-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-rose-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml" ? "അറിയിപ്പുകൾ & നോട്ടീസ്" : "Announcements & Notices"}
              </h1>
            </div>
          </div>
          {/* Priority summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: lang === "ml" ? "ഉടൻ" : "High Priority",   count: countHigh,   color: "text-red-200" },
              { label: lang === "ml" ? "ഇടത്തരം" : "Medium",       count: countMedium, color: "text-amber-200" },
              { label: lang === "ml" ? "സാധാരണ" : "Low",           count: countLow,    color: "text-blue-200" },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{s.count}</p>
                <p className={`text-[11px] ${s.color}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex items-center gap-2 mb-5 overflow-x-auto pb-1"
      >
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === tab.key ? tab.active : tab.inactive}`}
          >
            <span>{lang === "ml" ? tab.label_ml : tab.label_en}</span>
            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${filter === tab.key ? "bg-white/25" : "bg-black/10"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Announcements list */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 text-gray-400"
            >
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">
                {lang === "ml" ? "ഈ വിഭാഗത്തിൽ അറിയിപ്പുകൾ ഇല്ല" : "No announcements in this category"}
              </p>
            </motion.div>
          )}
          {filtered.map((a, i) => {
            const cfg = priorityConfig[a.priority];
            const Icon = cfg.icon;
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-2xl border ${cfg.border} p-4 shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4.5 h-4.5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} uppercase tracking-wider`}>
                        {lang === "ml" ? cfg.label_ml : cfg.label_en}
                      </span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug">
                      {lang === "ml" ? a.title_ml : a.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[11px] text-gray-400 font-medium">
                        {a.id}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* Footer info */}
      {d.announcements.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-5 bg-gray-50 rounded-2xl p-4 text-center"
        >
          <p className="text-xs text-gray-500">
            {lang === "ml"
              ? `ആകെ ${d.announcements.length} അറിയിപ്പുകൾ — ${d.madrasa.session} അദ്ധ്യ. വർഷം`
              : `Total ${d.announcements.length} announcements — Academic year ${d.madrasa.session}`}
          </p>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
