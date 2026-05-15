import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import {
  elections as seedElections,
  Election,
  ElectionCategory,
  CATEGORY_META,
} from "@/mock-data";
import {
  Vote, Users, Trophy, Clock, CheckCircle2, Lock, Eye,
  ChevronDown, ChevronUp, School, Play, AlertCircle, X,
  Plus, Trash2, ChevronRight, Check,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const statusMeta: Record<string, { label: string; label_ml: string; color: string; bg: string; icon: typeof Clock }> = {
  draft:              { label: "Draft",              label_ml: "ഡ്രാഫ്റ്റ്",              color: "text-gray-600",    bg: "bg-gray-100",    icon: Clock },
  active:             { label: "Active",             label_ml: "സജീവം",                  color: "text-emerald-700", bg: "bg-emerald-100", icon: Play },
  closed:             { label: "Closed",             label_ml: "അടഞ്ഞു",                 color: "text-orange-600",  bg: "bg-orange-100",  icon: Lock },
  results_published:  { label: "Results Published",  label_ml: "ഫലം പ്രസിദ്ധീകരിച്ചു",  color: "text-teal-700",    bg: "bg-teal-100",    icon: Trophy },
};

function StatusPill({ status, lang }: { status: string; lang: string }) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.color} ${m.bg}`}>
      <Icon className="w-3 h-3" />
      {lang === "ml" ? m.label_ml : m.label}
    </span>
  );
}

function CategoryChip({ category, lang }: { category: ElectionCategory; lang: string }) {
  const m = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.color} ${m.bg}`}>
      {m.emoji} {lang === "ml" ? m.label_ml : m.label}
    </span>
  );
}

function ProgressBar({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function ElectionDetailModal({ election, onClose, lang }: { election: Election; onClose: () => void; lang: string }) {
  const totalVotes = election.totalVotesCast;
  const sorted = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount);
  const winner = election.winnerCandidateId
    ? election.candidates.find((c) => c.id === election.winnerCandidateId)
    : null;
  const barColors = ["bg-emerald-500", "bg-teal-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-t-3xl p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">
                  {election.type === "parent_vote"
                    ? (lang === "ml" ? "രക്ഷിതാവ് വോട്ട്" : "Parent Vote")
                    : (lang === "ml" ? "ക്ലാസ് വോട്ട്" : "Class Vote")}
                </span>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">
                  {CATEGORY_META[election.category].emoji} {lang === "ml" ? CATEGORY_META[election.category].label_ml : CATEGORY_META[election.category].label}
                </span>
              </div>
              <h2 className="text-xl font-bold leading-snug">
                {lang === "ml" ? election.title_ml : election.title}
              </h2>
              <p className="text-emerald-200 text-sm mt-1">
                {lang === "ml" ? election.position_ml : election.position}
                {election.class !== "all" && ` · ${election.class}`}
              </p>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-full p-2 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill status={election.status} lang={lang} />
            <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
              {lang === "ml" ? "ആകെ വോട്ടുകൾ" : "Total Votes"}: {totalVotes}/{election.totalEligibleVoters}
            </span>
            {election.madrasaName && (
              <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">🏫 {election.madrasaName}</span>
            )}
          </div>
        </div>

        {winner && (
          <div className="mx-5 mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">{winner.symbol}</div>
            <div className="flex-1">
              <p className="text-amber-600 text-xs font-bold uppercase tracking-wide">🏆 {lang === "ml" ? "ജേതാവ്" : "Winner"}</p>
              <p className="font-bold text-gray-900">{winner.name}</p>
              <p className="text-xs text-gray-500">{winner.class} · {winner.voteCount} {lang === "ml" ? "വോട്ടുകൾ" : "votes"}</p>
            </div>
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
        )}

        <div className="px-5 pt-4">
          <p className="text-sm text-gray-600 leading-relaxed">{lang === "ml" ? election.description_ml : election.description}</p>
        </div>

        <div className="p-5">
          <p className="text-sm font-bold text-gray-800 mb-4">
            {lang === "ml" ? "ഫലം" : "Results"} ({lang === "ml" ? "ആകെ" : "Total"}: {totalVotes} {lang === "ml" ? "വോട്ടുകൾ" : "votes"})
          </p>
          <div className="space-y-4">
            {sorted.map((c, i) => (
              <div key={c.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-lg shrink-0">{c.symbol}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                      {c.id === election.winnerCandidateId && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                          {lang === "ml" ? "ജേതാവ്" : "Winner"} 🏆
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{c.class}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{c.voteCount} {lang === "ml" ? "വോട്ട്" : "votes"}</span>
                </div>
                <ProgressBar value={c.voteCount} max={totalVotes || 1} color={barColors[i % barColors.length]} />
              </div>
            ))}
          </div>
        </div>

        <div className="mx-5 mb-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{lang === "ml" ? "ടൈംലൈൻ" : "Timeline"}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{lang === "ml" ? "ആരംഭം" : "Start"}</p>
              <p className="font-semibold text-gray-800">{election.startDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{lang === "ml" ? "അവസാനം" : "End"}</p>
              <p className="font-semibold text-gray-800">{election.endDate}</p>
            </div>
            {election.sessionOpenedAt && (
              <div>
                <p className="text-xs text-gray-500">{lang === "ml" ? "സെഷൻ തുറന്നു" : "Session Opened"}</p>
                <p className="font-semibold text-gray-800">{new Date(election.sessionOpenedAt).toLocaleTimeString()}</p>
              </div>
            )}
            {election.sessionClosedAt && (
              <div>
                <p className="text-xs text-gray-500">{lang === "ml" ? "സെഷൻ അടഞ്ഞു" : "Session Closed"}</p>
                <p className="font-semibold text-gray-800">{new Date(election.sessionClosedAt).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Election Card
// ─────────────────────────────────────────────────────────────────────────────

function ElectionCard({ election, lang, onView }: { election: Election; lang: string; onView: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const totalVotes = election.totalVotesCast;
  const eligibleVoters = election.totalEligibleVoters;
  const turnout = eligibleVoters === 0 ? 0 : Math.round((totalVotes / eligibleVoters) * 100);
  const topCandidate = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount)[0];
  const isType1 = election.type === "parent_vote";
  const barColors = ["bg-emerald-500", "bg-teal-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className={`h-1 ${isType1 ? "bg-linear-to-r from-emerald-500 to-teal-500" : "bg-linear-to-r from-teal-500 to-blue-500"}`} />
      <div className="p-4 lg:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${CATEGORY_META[election.category].bg}`}>
            {CATEGORY_META[election.category].emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1">
              <CategoryChip category={election.category} lang={lang} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isType1 ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"}`}>
                {isType1 ? "Parent" : "Class"}
              </span>
              {election.class !== "all" && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{election.class}</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-sm leading-snug">{lang === "ml" ? election.title_ml : election.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{lang === "ml" ? election.position_ml : election.position}</p>
          </div>
          <StatusPill status={election.status} lang={lang} />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
            <p className="text-xs lg:text-sm font-bold text-gray-800">{election.candidates.length}</p>
            <p className="text-[10px] text-gray-500">{lang === "ml" ? "സ്ഥാനാർ." : "Candidates"}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
            <p className="text-xs lg:text-sm font-bold text-emerald-700">{totalVotes}</p>
            <p className="text-[10px] text-emerald-600">{lang === "ml" ? "വോട്ടുകൾ" : "Votes Cast"}</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-2 text-center border border-teal-100">
            <p className="text-xs lg:text-sm font-bold text-teal-700">{turnout}%</p>
            <p className="text-[10px] text-teal-600">{lang === "ml" ? "ടേർനൗട്ട്" : "Turnout"}</p>
          </div>
        </div>

        {totalVotes > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-3 flex items-center gap-3">
            <div className="text-lg">{topCandidate?.symbol}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-600 font-semibold uppercase">{lang === "ml" ? "മുൻനിരക്കാർ" : "Leading"}</p>
              <p className="text-sm font-bold text-gray-800 truncate">{topCandidate?.name}</p>
            </div>
            <p className="text-sm font-bold text-amber-700 shrink-0">{topCandidate?.voteCount} {lang === "ml" ? "വോ." : "votes"}</p>
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2 mb-3">
                {[...election.candidates].sort((a, b) => b.voteCount - a.voteCount).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">{c.symbol}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{c.name}</span>
                    <div className="flex items-center gap-1.5 w-28">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColors[i % barColors.length]} rounded-full`}
                          style={{ width: `${totalVotes === 0 ? 0 : (c.voteCount / totalVotes) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.voteCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button onClick={onView}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            {lang === "ml" ? "വിശദാംശങ്ങൾ" : "View Details"}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {lang === "ml" ? "ഫലം" : "Results"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Election Modal — 4-Step Wizard
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_GROUPS = [
  {
    group: "Madrasa",
    label: "Madrasa Posts",
    label_ml: "മദ്‌റസ പദവികൾ",
    items: ["madrasa_leader", "quran_reciter"] as ElectionCategory[],
  },
  {
    group: "SKSBV",
    label: "SKSBV Student Union",
    label_ml: "SKSBV വിദ്യാർത്ഥി യൂണിയൻ",
    items: ["sksbv_president", "sksbv_chairman", "sksbv_convener", "sksbv_secretary", "sksbv_treasurer"] as ElectionCategory[],
  },
  {
    group: "Class",
    label: "Class-Level Awards",
    label_ml: "ക്ലാസ് തലം",
    items: ["class_monitor", "best_student", "ibadah_champion"] as ElectionCategory[],
  },
  {
    group: "Custom",
    label: "Custom",
    label_ml: "ഇഷ്ടാനുസൃതം",
    items: ["custom"] as ElectionCategory[],
  },
];

const CLASS_OPTIONS = ["All Classes", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
const SYMBOL_OPTIONS = ["⭐", "🌙", "📖", "🌸", "🌟", "🏅", "🌺", "🥇", "🌈", "🎖️", "👑", "📋", "✍️", "📝", "💰", "📊", "⚡", "🌿", "🕊️", "🔑"];

interface DraftCandidate { name: string; class: string; bio: string; symbol: string; }

interface CreateElectionWizard {
  step: 1 | 2 | 3 | 4;
  category: ElectionCategory | null;
  type: "parent_vote" | "class_vote";
  madrasaName: string;
  title: string;
  title_ml: string;
  description: string;
  description_ml: string;
  position: string;
  position_ml: string;
  startDate: string;
  endDate: string;
  forClass: string;
  eligibleVoters: number;
  candidates: DraftCandidate[];
}

const defaultWizard = (): CreateElectionWizard => ({
  step: 1,
  category: null,
  type: "parent_vote",
  madrasaName: "Noor ul Islam Madrasa",
  title: "",
  title_ml: "",
  description: "",
  description_ml: "",
  position: "",
  position_ml: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  forClass: "All Classes",
  eligibleVoters: 10,
  candidates: [
    { name: "", class: "", bio: "", symbol: "⭐" },
    { name: "", class: "", bio: "", symbol: "🌙" },
  ],
});

function CreateElectionModal({ onClose, onCreate, lang }: {
  onClose: () => void;
  onCreate: (e: Election) => void;
  lang: string;
}) {
  const [wizard, setWizard] = useState<CreateElectionWizard>(defaultWizard());
  const [toast, setToast] = useState(false);

  const setW = (patch: Partial<CreateElectionWizard>) => setWizard((w) => ({ ...w, ...patch }));

  const selectCategory = (cat: ElectionCategory) => {
    const m = CATEGORY_META[cat];
    setW({
      category: cat,
      position: m.label,
      position_ml: m.label_ml,
      type: (cat === "class_monitor" || cat === "best_student" || cat === "ibadah_champion") ? "class_vote" : "parent_vote",
    });
  };

  const addCandidate = () => {
    const used = wizard.candidates.map((c) => c.symbol);
    const next = SYMBOL_OPTIONS.find((s) => !used.includes(s)) ?? "⭐";
    setW({ candidates: [...wizard.candidates, { name: "", class: "", bio: "", symbol: next }] });
  };

  const removeCandidate = (i: number) => setW({ candidates: wizard.candidates.filter((_, idx) => idx !== i) });

  const updateCandidate = (i: number, patch: Partial<DraftCandidate>) => {
    const updated = [...wizard.candidates];
    updated[i] = { ...updated[i], ...patch };
    setW({ candidates: updated });
  };

  const canAdvance = () => {
    if (wizard.step === 1) return wizard.category !== null;
    if (wizard.step === 2) return wizard.title.trim() !== "" && wizard.position.trim() !== "" && !!wizard.startDate && !!wizard.endDate;
    if (wizard.step === 3) return wizard.candidates.length >= 2 && wizard.candidates.every((c) => c.name.trim() !== "");
    return true;
  };

  const handleCreate = () => {
    const newElection: Election = {
      id: `EL${Date.now()}`,
      type: wizard.type,
      category: wizard.category!,
      madrasaId: "MDA001",
      madrasaName: wizard.madrasaName,
      title: wizard.title,
      title_ml: wizard.title_ml || wizard.title,
      description: wizard.description,
      description_ml: wizard.description_ml || wizard.description,
      position: wizard.position,
      position_ml: wizard.position_ml || wizard.position,
      status: "draft",
      startDate: wizard.startDate,
      endDate: wizard.endDate,
      class: wizard.forClass === "All Classes" ? "all" : wizard.forClass,
      totalEligibleVoters: wizard.eligibleVoters,
      totalVotesCast: 0,
      candidates: wizard.candidates.map((c, i) => ({
        id: `EC_NEW_${i}`,
        name: c.name,
        class: c.class || wizard.forClass,
        position: wizard.position,
        photo: null,
        bio: c.bio,
        bio_ml: c.bio,
        voteCount: 0,
        symbol: c.symbol,
      })),
      parentVotes: [],
      classVotes: [],
    };
    onCreate(newElection);
    setToast(true);
    setTimeout(onClose, 1800);
  };

  const steps = [
    { num: 1, label: lang === "ml" ? "കാറ്റഗറി" : "Category" },
    { num: 2, label: lang === "ml" ? "വിശദാംശം" : "Details" },
    { num: 3, label: lang === "ml" ? "സ്ഥാനാർ." : "Candidates" },
    { num: 4, label: lang === "ml" ? "അവലോകനം" : "Review" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-t-3xl p-5 text-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">
                {lang === "ml" ? "പുതിയ തിരഞ്ഞെടുപ്പ്" : "New Election"}
              </p>
              <h2 className="text-lg font-bold">{lang === "ml" ? "തിരഞ്ഞെടുപ്പ് ആരംഭിക്കുക" : "Create an Election"}</h2>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-full p-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Step Bar */}
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  wizard.step > s.num ? "bg-white text-emerald-700"
                    : wizard.step === s.num ? "bg-white text-emerald-700 ring-2 ring-white/50"
                    : "bg-white/25 text-white/70"
                }`}>
                  {wizard.step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block ${wizard.step === s.num ? "text-white" : "text-white/60"}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full mx-1 ${wizard.step > s.num ? "bg-white/70" : "bg-white/25"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP 1: Category Picker */}
          {wizard.step === 1 && (
            <div>
              <p className="text-sm font-bold text-gray-800 mb-4">
                {lang === "ml" ? "ഏത് പദവിക്ക് വേണ്ടിയുള്ള തിരഞ്ഞെടുപ്പ് ആണ്?" : "What position is this election for?"}
              </p>
              <div className="space-y-5">
                {CATEGORY_GROUPS.map((group) => (
                  <div key={group.group}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {lang === "ml" ? group.label_ml : group.label}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {group.items.map((cat) => {
                        const m = CATEGORY_META[cat];
                        const sel = wizard.category === cat;
                        const autoType = (cat === "class_monitor" || cat === "best_student" || cat === "ibadah_champion") ? "Class Vote" : "Parent Vote";
                        return (
                          <button key={cat} onClick={() => selectCategory(cat)}
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${sel ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-gray-50 hover:border-emerald-200"}`}
                          >
                            <span className="text-2xl shrink-0">{m.emoji}</span>
                            <div className="min-w-0">
                              <p className={`text-xs font-bold leading-tight ${sel ? "text-emerald-800" : "text-gray-800"}`}>
                                {lang === "ml" ? m.label_ml : m.label}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{autoType}</p>
                            </div>
                            {sel && <Check className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Details */}
          {wizard.step === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-2 border border-gray-100">
                <span className="text-xl">{wizard.category ? CATEGORY_META[wizard.category].emoji : "🗳️"}</span>
                <div>
                  <p className="text-xs text-gray-500">{lang === "ml" ? "തിരഞ്ഞെടുത്ത കാറ്റഗറി" : "Selected Category"}</p>
                  <p className="text-sm font-bold text-gray-800">
                    {wizard.category ? (lang === "ml" ? CATEGORY_META[wizard.category].label_ml : CATEGORY_META[wizard.category].label) : ""}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${wizard.type === "parent_vote" ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"}`}>
                    {wizard.type === "parent_vote" ? "Parent Vote" : "Class Vote"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "തലക്കെട്ട് (English) *" : "Title (English) *"}</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  placeholder="e.g. SKSBV Chairman Election 2026"
                  value={wizard.title} onChange={(e) => setW({ title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "തലക്കെട്ട് (Malayalam)" : "Title (Malayalam)"}</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="ഉദാ: SKSBV ചെയർമാൻ തിരഞ്ഞെടുപ്പ് 2026"
                  value={wizard.title_ml} onChange={(e) => setW({ title_ml: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "പദവി (EN) *" : "Position (EN) *"}</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={wizard.position} onChange={(e) => setW({ position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "പദവി (ML)" : "Position (ML)"}</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={wizard.position_ml} onChange={(e) => setW({ position_ml: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "വിവരണം" : "Description"}</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  placeholder="Brief description..."
                  value={wizard.description} onChange={(e) => setW({ description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "ആരംഭ തീയതി *" : "Start Date *"}</label>
                  <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={wizard.startDate} onChange={(e) => setW({ startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "അവസാന തീയതി *" : "End Date *"}</label>
                  <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={wizard.endDate} onChange={(e) => setW({ endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "ക്ലാസ് / സ്കോപ്" : "Class / Scope"}</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                    value={wizard.forClass} onChange={(e) => setW({ forClass: e.target.value })}
                  >
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "ആകെ വോട്ടർമാർ" : "Eligible Voters"}</label>
                  <input type="number" min={1} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={wizard.eligibleVoters} onChange={(e) => setW({ eligibleVoters: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{lang === "ml" ? "മദ്‌റസ നാമം" : "Madrasa Name"}</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  value={wizard.madrasaName} onChange={(e) => setW({ madrasaName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Candidates */}
          {wizard.step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-800">
                  {lang === "ml" ? "സ്ഥാനാർത്ഥികളെ ചേർക്കുക" : "Add Candidates"} ({wizard.candidates.length})
                </p>
                <button onClick={addCandidate}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {lang === "ml" ? "ചേർക്കുക" : "Add"}
                </button>
              </div>
              <div className="space-y-3">
                {wizard.candidates.map((cand, i) => (
                  <div key={i} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <select className="border border-gray-200 rounded-xl px-2 py-1.5 text-lg bg-white focus:outline-none"
                          value={cand.symbol} onChange={(e) => updateCandidate(i, { symbol: e.target.value })}
                        >
                          {SYMBOL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className="text-xs font-bold text-gray-600">
                          {lang === "ml" ? `സ്ഥാനാർത്ഥി ${i + 1}` : `Candidate ${i + 1}`}
                        </span>
                      </div>
                      {wizard.candidates.length > 2 && (
                        <button onClick={() => removeCandidate(i)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">{lang === "ml" ? "പേര് *" : "Full Name *"}</label>
                        <input className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                          placeholder="Student name"
                          value={cand.name} onChange={(e) => updateCandidate(i, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">{lang === "ml" ? "ക്ലാസ്" : "Class"}</label>
                        <select className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                          value={cand.class} onChange={(e) => updateCandidate(i, { class: e.target.value })}
                        >
                          <option value="">Select class</option>
                          {CLASS_OPTIONS.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">{lang === "ml" ? "ബയോ / വാഗ്ദാനം" : "Bio / Campaign Promise"}</label>
                      <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white resize-none"
                        placeholder="Brief bio..."
                        value={cand.bio} onChange={(e) => updateCandidate(i, { bio: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {wizard.candidates.length < 2 && (
                <p className="text-xs text-red-500 mt-2">{lang === "ml" ? "കുറഞ്ഞത് 2 സ്ഥാനാർത്ഥികൾ" : "Minimum 2 candidates required"}</p>
              )}
            </div>
          )}

          {/* STEP 4: Review */}
          {wizard.step === 4 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">{lang === "ml" ? "അവലോകനം" : "Review & Confirm"}</p>
                <div className="space-y-2 text-sm">
                  {[
                    { k: lang === "ml" ? "കാറ്റഗറി" : "Category",   v: wizard.category ? `${CATEGORY_META[wizard.category].emoji} ${CATEGORY_META[wizard.category].label}` : "—" },
                    { k: lang === "ml" ? "തരം" : "Vote Type",         v: wizard.type === "parent_vote" ? "Parent Vote" : "Class Vote" },
                    { k: lang === "ml" ? "തലക്കെട്ട്" : "Title",       v: wizard.title },
                    { k: lang === "ml" ? "പദവി" : "Position",         v: wizard.position },
                    { k: lang === "ml" ? "ക്ലാസ്" : "Scope",           v: wizard.forClass },
                    { k: lang === "ml" ? "തീയതി" : "Dates",           v: `${wizard.startDate} → ${wizard.endDate}` },
                    { k: lang === "ml" ? "വോട്ടർമാർ" : "Voters",       v: String(wizard.eligibleVoters) },
                    { k: lang === "ml" ? "മദ്‌റസ" : "Madrasa",         v: wizard.madrasaName },
                  ].map((row) => (
                    <div key={row.k} className="flex gap-2">
                      <span className="text-gray-500 w-28 shrink-0">{row.k}:</span>
                      <span className="font-semibold text-gray-800">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  {lang === "ml" ? "സ്ഥാനാർത്ഥികൾ" : "Candidates"} ({wizard.candidates.length})
                </p>
                <div className="space-y-2">
                  {wizard.candidates.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <span className="text-xl">{c.symbol}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{c.name || `Candidate ${i + 1}`}</p>
                        <p className="text-xs text-gray-500">{c.class || wizard.forClass}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  {lang === "ml"
                    ? "ഇത് ഡ്രാഫ്റ്റ് ആയി സൃഷ്‌ടിക്കും. ആക്‌ടിവേറ്റ് ചെയ്‌ത ശേഷം മാത്രം ദൃശ്യമാകും."
                    : "This will be created as a Draft. Activate it to make it visible to parents/teachers."}
                </p>
              </div>

              <AnimatePresence>
                {toast && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500 text-white rounded-2xl p-4 text-center font-bold text-sm"
                  >
                    ✅ {lang === "ml" ? "തിരഞ്ഞെടുപ്പ് വിജയകരമായി സൃഷ്‌ടിച്ചു!" : "Election created successfully!"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
          {wizard.step > 1 && !toast && (
            <button onClick={() => setW({ step: (wizard.step - 1) as 1 | 2 | 3 | 4 })}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              {lang === "ml" ? "← തിരക്കെ" : "← Back"}
            </button>
          )}
          <div className="flex-1" />
          {wizard.step < 4 ? (
            <button
              onClick={() => canAdvance() && setW({ step: (wizard.step + 1) as 1 | 2 | 3 | 4 })}
              disabled={!canAdvance()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${canAdvance() ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              {lang === "ml" ? "തുടരുക" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            !toast && (
              <button onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
              >
                <Vote className="w-4 h-4" />
                {lang === "ml" ? "✅ തിരഞ്ഞെടുപ്പ് ആരംഭിക്കുക" : "✅ Create Election"}
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_FILTER_OPTIONS: { key: "all" | ElectionCategory; label: string; label_ml: string }[] = [
  { key: "all",              label: "All",             label_ml: "എല്ലാം"             },
  { key: "madrasa_leader",   label: "Madrasa Leader",  label_ml: "മദ്‌റസ ലീഡർ"        },
  { key: "sksbv_president",  label: "President",       label_ml: "പ്രസിഡൻ്റ്"        },
  { key: "sksbv_chairman",   label: "Chairman",        label_ml: "ചെയർമാൻ"            },
  { key: "sksbv_convener",   label: "Convener",        label_ml: "കൺവീനർ"             },
  { key: "sksbv_secretary",  label: "Secretary",       label_ml: "സെക്രട്ടറി"         },
  { key: "sksbv_treasurer",  label: "Treasurer",       label_ml: "ട്രഷറർ"             },
  { key: "class_monitor",    label: "Monitor",         label_ml: "മോണിറ്റർ"           },
  { key: "best_student",     label: "Best Student",    label_ml: "മികച്ച വിദ്യാർത്ഥി"  },
  { key: "quran_reciter",    label: "Quran Reciter",   label_ml: "ഖുർആൻ"              },
  { key: "ibadah_champion",  label: "Ibadah",          label_ml: "ഇബാദത്ത്"            },
];

export default function AdminElectionsPage() {
  const { lang } = useLanguageStore();
  const [electionsList, setElectionsList] = useState<Election[]>(seedElections);
  const [typeFilter, setTypeFilter] = useState<"all" | "parent_vote" | "class_vote">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ElectionCategory>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = electionsList.filter((e) => {
    const typeMatch = typeFilter === "all" || e.type === typeFilter;
    const catMatch = categoryFilter === "all" || e.category === categoryFilter;
    const statusMatch = statusFilter === "all" || e.status === statusFilter;
    return typeMatch && catMatch && statusMatch;
  });

  const stats = {
    total: electionsList.length,
    active: electionsList.filter((e) => e.status === "active").length,
    parentVote: electionsList.filter((e) => e.type === "parent_vote").length,
    classVote: electionsList.filter((e) => e.type === "class_vote").length,
    totalVotes: electionsList.reduce((s, e) => s + e.totalVotesCast, 0),
    sksbv: electionsList.filter((e) => CATEGORY_META[e.category].group === "SKSBV").length,
  };

  const typeTabs: { key: "all" | "parent_vote" | "class_vote"; label: string; label_ml: string; icon: typeof Vote }[] = [
    { key: "all",         label: "All Elections", label_ml: "എല്ലാ തിരഞ്ഞെടുപ്പ്",    icon: Vote },
    { key: "parent_vote", label: "Parent Votes",  label_ml: "രക്ഷിതാവ് വോട്ട്",      icon: Users },
    { key: "class_vote",  label: "Class Votes",   label_ml: "ക്ലാസ് വോട്ട്",          icon: School },
  ];

  const statusTabs = [
    { key: "all",               label: "All",     label_ml: "എല്ലാം" },
    { key: "active",            label: "Active",  label_ml: "സജീവം" },
    { key: "draft",             label: "Draft",   label_ml: "ഡ്രാഫ്റ്റ്" },
    { key: "closed",            label: "Closed",  label_ml: "അടഞ്ഞു" },
    { key: "results_published", label: "Results", label_ml: "ഫലം" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Vote className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                {lang === "ml" ? "തിരഞ്ഞെടുപ്പ് മോഡ്യൂൾ" : "Elections Module"}
              </h1>
              <p className="text-xs text-gray-500">
                {lang === "ml" ? "SKSBV · മദ്‌റസ ലീഡർ · ക്ലാസ് — എല്ലാ തിരഞ്ഞെടുപ്പ്" : "SKSBV · Madrasa Leader · Class Votes"}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === "ml" ? "പുതിയ തിരഞ്ഞെടുപ്പ്" : "New Election"}</span>
            <span className="sm:hidden">{lang === "ml" ? "New" : "New"}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3 mb-5"
      >
        {[
          { label: lang === "ml" ? "ആകെ" : "Total",       value: stats.total,      icon: Vote,         color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: lang === "ml" ? "സജീവം" : "Active",     value: stats.active,     icon: Play,         color: "text-green-700",   bg: "bg-green-50"   },
          { label: lang === "ml" ? "Parent" : "Parent",    value: stats.parentVote, icon: Users,        color: "text-teal-700",    bg: "bg-teal-50"    },
          { label: lang === "ml" ? "Class" : "Class",      value: stats.classVote,  icon: School,       color: "text-blue-700",    bg: "bg-blue-50"    },
          { label: "SKSBV",                                  value: stats.sksbv,      icon: Trophy,       color: "text-purple-700",  bg: "bg-purple-50"  },
          { label: lang === "ml" ? "വോട്ടുകൾ" : "Votes",  value: stats.totalVotes, icon: CheckCircle2, color: "text-amber-700",   bg: "bg-amber-50"   },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
            className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm"
          >
            <div className={`w-7 h-7 rounded-xl ${s.bg} flex items-center justify-center mb-1.5`}>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <p className="text-lg lg:text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Active alert */}
      {stats.active > 0 && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 lg:p-4 mb-4 flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800">
              {lang === "ml" ? `${stats.active} തിരഞ്ഞെടുപ്പ് ഇപ്പോൾ നടക്കുന്നു` : `${stats.active} election(s) currently active`}
            </p>
            <p className="text-xs text-emerald-600">
              {lang === "ml" ? "ലൈവ് ഫലങ്ങൾ തൽസമയം" : "Live results updating in real-time"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">LIVE</span>
          </div>
        </motion.div>
      )}

      {/* Category Filter */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORY_FILTER_OPTIONS.map((opt) => (
          <button key={opt.key}
            onClick={() => setCategoryFilter(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
              categoryFilter === opt.key ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.key !== "all" && CATEGORY_META[opt.key as ElectionCategory].emoji + " "}
            {lang === "ml" ? opt.label_ml : opt.label}
          </button>
        ))}
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
        {typeTabs.map((tab) => (
          <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              typeFilter === tab.key ? "bg-teal-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {lang === "ml" ? tab.label_ml : tab.label}
          </button>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-1">
        {statusTabs.map((s) => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 ${
              statusFilter === s.key ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {lang === "ml" ? s.label_ml : s.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{lang === "ml" ? "തിരഞ്ഞെടുപ്പൊന്നും കണ്ടെത്തിയില്ല" : "No elections found"}</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((el) => (
            <ElectionCard key={el.id} election={el} lang={lang} onView={() => setSelectedElection(el)} />
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedElection && (
          <ElectionDetailModal election={selectedElection} onClose={() => setSelectedElection(null)} lang={lang} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateModal && (
          <CreateElectionModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(e) => setElectionsList((prev) => [e, ...prev])}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
