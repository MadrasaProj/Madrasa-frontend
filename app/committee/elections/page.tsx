import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";
import {
  Vote,
  CheckCircle2,
  Clock,
  Users,
  Crown,
  AlertCircle,
} from "lucide-react";

const roleBadge: Record<string, { emoji: string; bg: string; text: string }> = {
  President: { emoji: "👑", bg: "bg-amber-100", text: "text-amber-800" },
  Chairman: { emoji: "🎖️", bg: "bg-blue-100", text: "text-blue-800" },
  Convener: { emoji: "📋", bg: "bg-purple-100", text: "text-purple-800" },
  Secretary: { emoji: "📝", bg: "bg-teal-100", text: "text-teal-800" },
  Treasurer: { emoji: "💰", bg: "bg-emerald-100", text: "text-emerald-800" },
};

export default function CommitteeElectionsPage() {
  const { lang } = useLanguageStore();
  const _d = useCommitteeData(); // available for future use
  // Elections have no backend yet — stub data
  const d = {
    elections: {
      activeCount: 0,
      completedCount: 0,
      pendingNominations: 0,
      totalVoters: 0,
      totalVotesCast: 0,
      results: [] as any[],
      sksbvUnionMembers: [] as any[],
    },
  };
  const elections: any[] = [];

  const statCards = [
    {
      label: lang === "ml" ? "സജീവ തിരഞ്ഞെടുപ്പ്" : "Active Elections",
      value: `${d.elections.activeCount}`,
      sub: lang === "ml" ? "നടക്കുന്നത്" : "In progress",
      icon: Vote,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
    },
    {
      label: lang === "ml" ? "പൂർത്തിയായത്" : "Completed",
      value: `${d.elections.completedCount}`,
      sub: lang === "ml" ? "ഈ വർഷം" : "This year",
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    {
      label: lang === "ml" ? "SKSBV അംഗങ്ങൾ" : "SKSBV Members",
      value: `${d.elections.sksbvUnionMembers.length}`,
      sub: lang === "ml" ? "യൂണിയൻ ഭരണ സമിതി" : "Union committee",
      icon: Users,
      color: "text-violet-700",
      bg: "bg-violet-50",
      border: "border-violet-200",
    },
    {
      label: lang === "ml" ? "തിരഞ്ഞെടുക്കൽ ബാക്കി" : "Pending Posts",
      value: `${d.elections.sksbvUnionMembers.filter((m) => m.name === "Pending Election").length}`,
      sub: lang === "ml" ? "ഇനിയും നടക്കേണ്ടത്" : "Yet to be elected",
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-linear-to-r from-indigo-700 to-violet-600 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
              </p>
              <h1 className="text-xl font-bold">
                {lang === "ml"
                  ? "തിരഞ്ഞെടുപ്പ് & SKSBV നേതൃത്വം"
                  : "Elections & SKSBV Leadership"}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{d.elections.activeCount}</p>
              <p className="text-xs text-indigo-200">
                {lang === "ml" ? "സജീവ തിരഞ്ഞെടുപ്പ്" : "Active Elections"}
              </p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">
                {d.elections.completedCount}
              </p>
              <p className="text-xs text-indigo-200">
                {lang === "ml" ? "പൂർത്തിയായത്" : "Completed"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-2xl border ${s.border} p-4 shadow-sm`}
          >
            <div
              className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}
            >
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              {s.label}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* SKSBV Union table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4.5 h-4.5 text-amber-500" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "SKSBV യൂണിയൻ ഭരണ സമിതി" : "SKSBV Union Committee"}
          </p>
        </div>
        <div className="space-y-2.5">
          {d.elections.sksbvUnionMembers.map((m, i) => {
            const badge = roleBadge[m.post] ?? {
              emoji: "🏷️",
              bg: "bg-gray-100",
              text: "text-gray-700",
            };
            const isPending = m.name === "Pending Election";
            return (
              <motion.div
                key={m.post}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={`flex items-center gap-3 rounded-xl p-3 ${isPending ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}
              >
                <span className="text-xl w-7 text-center">{badge.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {m.post}
                  </p>
                  {isPending ? (
                    <p className="text-sm font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {lang === "ml" ? "തിരഞ്ഞെടുക്കൽ ഉടൻ" : "Election Pending"}
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-gray-800">{m.name}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isPending
                      ? "bg-amber-200 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isPending
                    ? lang === "ml"
                      ? "ബാക്കി"
                      : "PENDING"
                    : lang === "ml"
                      ? "തിരഞ്ഞെടുക്കപ്പെട്ടു"
                      : "ELECTED"}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Active elections list */}
      {elections && elections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Vote className="w-4.5 h-4.5 text-indigo-700" />
            <p className="font-bold text-gray-800">
              {lang === "ml"
                ? "ഇപ്പോൾ നടക്കുന്ന തിരഞ്ഞെടുപ്പ്"
                : "Ongoing Elections"}
            </p>
          </div>
          <div className="space-y-3">
            {elections.slice(0, 4).map((el, i) => (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 + i * 0.06 }}
                className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3"
              >
                <Vote className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {lang === "ml" ? (el.title_ml ?? el.title) : el.title}
                  </p>
                  <p className="text-xs text-gray-500">{el.startDate}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    el.status === "active"
                      ? "bg-indigo-200 text-indigo-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {el.status === "active"
                    ? lang === "ml"
                      ? "സജീവം"
                      : "ACTIVE"
                    : lang === "ml"
                      ? "പൂർത്തി"
                      : "DONE"}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending alert */}
      {d.elections.sksbvUnionMembers.some(
        (m) => m.name === "Pending Election",
      ) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {lang === "ml"
                ? "ചില SKSBV പദവികൾ ഇനിയും ഒഴിഞ്ഞ് കിടക്കുന്നു"
                : "Some SKSBV posts are yet to be filled"}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lang === "ml"
                ? "ഉടൻ തിരഞ്ഞെടുപ്പ് നടത്തേണ്ടതാണ്"
                : "Elections should be conducted at the earliest"}
            </p>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
