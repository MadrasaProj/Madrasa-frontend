import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { sksbvData } from "@/mock-data";
import {
  Star, Users, Calendar, Trophy, Heart, BookOpen,
  Dumbbell, Bus, Shield, Plus, X, CheckCircle,
  Clock, PlayCircle, Banknote, TrendingUp, Target,
  ChevronRight, Download, User, MapPin,
  FileText, Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { t as tr } from "@/lib/i18n";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type ProgramStatus = "upcoming" | "completed" | "ongoing";

const categoryStyle: Record<string, { icon: React.ElementType; color: string; bg: string; ring: string }> = {
  Academic:  { icon: BookOpen, color: "text-blue-700",    bg: "bg-blue-50",    ring: "border-blue-200"    },
  Charity:   { icon: Heart,    color: "text-rose-700",    bg: "bg-rose-50",    ring: "border-rose-200"    },
  Cultural:  { icon: Star,     color: "text-amber-700",   bg: "bg-amber-50",   ring: "border-amber-200"   },
  Sports:    { icon: Dumbbell, color: "text-emerald-700", bg: "bg-emerald-50", ring: "border-emerald-200" },
  Outing:    { icon: Bus,      color: "text-indigo-700",  bg: "bg-indigo-50",  ring: "border-indigo-200"  },
  Community: { icon: Shield,   color: "text-teal-700",    bg: "bg-teal-50",    ring: "border-teal-200"    },
};

const statusStyle: Record<ProgramStatus, { label: string; icon: React.ElementType; badge: string }> = {
  upcoming:  { label: "Upcoming",  icon: Clock,       badge: "bg-blue-100 text-blue-700"      },
  completed: { label: "Completed", icon: CheckCircle, badge: "bg-emerald-100 text-emerald-700" },
  ongoing:   { label: "Ongoing",   icon: PlayCircle,  badge: "bg-amber-100 text-amber-700"    },
};

const ALL_CATS   = ["All","Academic","Charity","Cultural","Sports","Outing","Community"];
const ALL_STATUS = ["All","upcoming","completed","ongoing"];

// Derived spend estimate per program
const budgetData = sksbvData.programs.map((p) => ({
  name: p.title.split(" ").slice(0,2).join(" "),
  budget: p.budget ?? 3000,
  spent:  Math.round((p.budget ?? 3000) * (p.status === "completed" ? 0.95 : p.status === "ongoing" ? 0.6 : 0.1)),
}));

export default function SKSBVPage() {
  const { lang } = useLanguageStore();
  const [catFilter, setCatFilter]     = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<"overview" | "programs" | "executive" | "minutes">("overview");
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [expandedMinute, setExpandedMinute] = useState<number | null>(null);

  const programs = sksbvData.programs.filter((p) => {
    const matchCat    = catFilter === "All"    || p.category === catFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchCat && matchStatus;
  });

  const selectedProg = selectedProgram ? sksbvData.programs.find((p) => p.id === selectedProgram) : null;

  const completed = sksbvData.programs.filter((p) => p.status === "completed").length;
  const ongoing   = sksbvData.programs.filter((p) => p.status === "ongoing").length;
  const upcoming  = sksbvData.programs.filter((p) => p.status === "upcoming").length;
  const totalBudget = budgetData.reduce((a, b) => a + b.budget, 0);
  const totalSpent  = budgetData.reduce((a, b) => a + b.spent,  0);

  const meetingMinutes = [
    { id:1, date:"2025-12-10", title:"Monthly General Meeting", attendees:18, summary:"Discussed upcoming cultural fest and budget allocation for Q1 2026. Election of new secretary approved.", decisions:["Cultural fest on 15 Jan 2026","Secretary: Ameen Abdul Rashid","Budget ₹15,000 approved for Q1"] },
    { id:2, date:"2025-11-05", title:"Program Review Meeting",  attendees:14, summary:"Reviewed Quran competition outcome. 12 students participated, 3 prizes awarded. Feedback was positive.", decisions:["Annual Quran competition to be expanded next year","Prizes to include books and certificates","Date for next meeting: 10 Dec"] },
    { id:3, date:"2025-10-01", title:"Foundation Day Planning", attendees:20, summary:"Planned the SKSBV Foundation Day celebration scheduled for November. Tasks assigned to sub-committees.", decisions:["Foundation Day: 20 Nov 2025","Invitation to alumni approved","Refreshments budget: ₹5,000"] },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={sksbvData.name}
        subtitle={sksbvData.fullName}
        icon={Star}
        action={
          <button onClick={() => setShowAddProgram(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> {tr("sksbv", "addProgram", lang)}
          </button>
        }
      />

      {/* ── Union Banner ── */}
      <div className="bg-linear-to-r from-amber-500 to-orange-500 rounded-2xl p-5 mb-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Star className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-xl leading-tight">{sksbvData.name}</p>
            <p className="text-amber-100 text-sm mt-0.5">{sksbvData.fullName}</p>
            <p className="text-amber-100/80 text-xs mt-1 italic">&ldquo;{sksbvData.motto}&rdquo;</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">{tr("sksbv", "est", lang)} {sksbvData.established}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5">
          <UnionStat label={tr("sksbv", "programs", lang)}   value={sksbvData.stats.programsThisYear.toString()} />
          <UnionStat label={tr("sksbv", "members", lang)}    value={sksbvData.stats.totalMembers.toString()} />
          <UnionStat label={tr("sksbv", "completed", lang)}  value={completed.toString()} />
          <UnionStat label={tr("sksbv", "ongoing", lang)}    value={ongoing.toString()} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {(["overview","programs","executive","minutes"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all",
              activeTab === tab ? "bg-white shadow-sm text-amber-700" : "text-gray-500")}>
            {tab === "minutes" ? tr("sksbv", "meetingMinutes", lang)
              : tab === "overview" ? tr("sksbv", "overview", lang)
              : tab === "programs" ? tr("sksbv", "programs", lang)
              : tr("sksbv", "executive", lang)}
          </button>
        ))}
      </div>

      {/* ════ OVERVIEW ════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* 4 Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Trophy}    label={tr("adminPages", "totalPrograms", lang)}  value={sksbvData.stats.programsThisYear} color="amber" />
            <StatCard icon={Users}     label={tr("adminPages", "totalMembers", lang)}   value={sksbvData.stats.totalMembers}  color="blue"  />
            <StatCard icon={Banknote}  label={tr("adminPages", "totalBudget", lang)}    value={`₹${totalBudget.toLocaleString()}`} color="emerald" />
            <StatCard icon={TrendingUp} label={tr("adminPages", "totalSpent", lang)}   value={`₹${totalSpent.toLocaleString()}`}  color="rose" />
          </div>

          {/* Budget Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900 text-sm">{tr("sksbv", "budgetVsSpent", lang)}</p>
              <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-semibold">
                <Download className="w-3.5 h-3.5" /> {tr("sksbv", "export", lang)}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetData} barSize={16} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="budget" name="Budget" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="spent"  name="Spent"  fill="#059669" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="font-bold text-gray-900 text-sm mb-4">{tr("sksbv", "programsByCat", lang)}</p>
            {ALL_CATS.filter((c) => c !== "All").map((cat) => {
              const cs   = categoryStyle[cat];
              const Ic   = cs?.icon ?? Star;
              const cnt  = sksbvData.programs.filter((p) => p.category === cat).length;
              const pct  = Math.round((cnt / sksbvData.programs.length) * 100);
              return (
                <div key={cat} className="flex items-center gap-3 mb-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cs?.bg)}>
                    <Ic className={cn("w-3.5 h-3.5", cs?.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <p className="text-xs font-semibold text-gray-800">{cat}</p>
                      <span className="text-[10px] text-gray-400">{cnt} {tr("sksbv", "prog", lang)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", cs?.bg.replace("bg-","bg-").replace("-50","") + " opacity-70")}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: tr("sksbv", "completed", lang), count:completed, icon:CheckCircle, color:"bg-emerald-500", light:"bg-emerald-50", text:"text-emerald-700" },
              { label: tr("sksbv", "ongoing", lang),   count:ongoing,   icon:PlayCircle,  color:"bg-amber-500",   light:"bg-amber-50",   text:"text-amber-700"   },
              { label: tr("sksbv", "upcoming", lang),   count:upcoming,  icon:Clock,       color:"bg-blue-500",    light:"bg-blue-50",    text:"text-blue-700"    },
            ] as const).map(({ label, count, icon: Ic, color, light, text }) => (
              <div key={label} className={cn("rounded-xl p-3 text-center", light)}>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5", color)}>
                  <Ic className="w-4 h-4 text-white" />
                </div>
                <p className={cn("text-xl font-extrabold", text)}>{count}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ PROGRAMS ════ */}
      {activeTab === "programs" && (
        <>
          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {ALL_CATS.map((c) => {
                const cs = categoryStyle[c];
                const Ic = cs?.icon;
                return (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border",
                      catFilter === c ? "bg-amber-500 text-white border-transparent" : "bg-white border-gray-200 text-gray-600")}>
                    {Ic && <Ic className="w-3.5 h-3.5" />} {c}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              {ALL_STATUS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border",
                    statusFilter === s ? "bg-gray-900 text-white border-transparent" : "bg-white border-gray-200 text-gray-500")}>
                  {s === "All" ? tr("sksbv", "allStatus", lang) : s}
                </button>
              ))}
            </div>
          </div>

          {/* Programs Grid */}
          <div className="space-y-3">
            {programs.map((prog) => {
              const cs  = categoryStyle[prog.category] ?? { icon: Star, color: "text-amber-700", bg: "bg-amber-50", ring: "border-amber-200" };
              const ss  = statusStyle[prog.status as ProgramStatus] ?? statusStyle.upcoming;
              const Ic  = cs.icon;
              const SIc = ss.icon;
              const spentPct = prog.budget ? Math.round((Math.round(prog.budget * (prog.status === "completed" ? 0.95 : 0.1)) / prog.budget) * 100) : 0;
              return (
                <motion.div key={prog.id}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                  className={cn("bg-white rounded-2xl border-2 p-4 cursor-pointer hover:shadow-sm transition-all", cs.ring)}
                  onClick={() => setSelectedProgram(prog.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cs.bg, cs.ring)}>
                      <Ic className={cn("w-5 h-5", cs.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{prog.title}</p>
                        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0", ss.badge)}>
                          <SIc className="w-2.5 h-2.5" /> {ss.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prog.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {prog.date}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {prog.venue}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {prog.participants}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </div>
                  {prog.budget && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>{tr("sksbv", "budget", lang)}: ₹{prog.budget.toLocaleString()}</span>
                        <span>{tr("sksbv", "spent", lang)}: ₹{Math.round(prog.budget * (prog.status === "completed" ? 0.95 : 0.1)).toLocaleString()} ({spentPct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", spentPct > 90 ? "bg-rose-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(spentPct, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {programs.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{tr("sksbv", "noPrograms", lang)}</p>
            </div>
          )}
        </>
      )}

      {/* ════ EXECUTIVE ════ */}
      {activeTab === "executive" && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-900 text-sm">{tr("sksbv", "execCommittee", lang)} {sksbvData.established}–{tr("sksbv", "present", lang)}</p>
              <p className="text-xs text-amber-600">{sksbvData.executive.length} {tr("sksbv", "membersAcYear", lang)} {new Date().getFullYear()}</p>
            </div>
          </div>
          {sksbvData.executive.map((member, i) => (
            <motion.div key={member.id ?? i}
              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                <p className="text-xs text-amber-600 font-semibold">{member.role}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {member.class}</span>
                  {member.studentId && <span className="flex items-center gap-1"><User className="w-3 h-3" /> ID: {member.studentId}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{tr("sksbv", "active", lang)}</span>
              </div>
            </motion.div>
          ))}
          <button onClick={() => setShowAddProgram(true)}
            className="w-full py-3 border-2 border-dashed border-amber-200 rounded-2xl text-sm font-semibold text-amber-600 flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors">
            <Plus className="w-4 h-4" /> {tr("sksbv", "addExecMember", lang)}
          </button>
        </div>
      )}

      {/* ════ MEETING MINUTES ════ */}
      {activeTab === "minutes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">{tr("sksbv", "meetingRecords", lang)}</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> {tr("sksbv", "addMinutes", lang)}
            </button>
          </div>
          {meetingMinutes.map((m, i) => (
            <motion.div key={m.id}
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setExpandedMinute(expandedMinute === m.id ? null : m.id)}>
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{m.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {m.date}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {m.attendees} {tr("sksbv", "attended", lang)}</span>
                  </div>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-gray-300 shrink-0 mt-0.5 transition-transform",
                  expandedMinute === m.id ? "rotate-90" : "")} />
              </button>
              <AnimatePresence>
                {expandedMinute === m.id && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{tr("sksbv", "summary", lang)}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{m.summary}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr("sksbv", "keyDecisions", lang)}</p>
                        <div className="space-y-1.5">
                          {m.decisions.map((d, di) => (
                            <div key={di} className="flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700">{d}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700">
                        <Download className="w-3.5 h-3.5" /> {tr("sksbv", "downloadPdf", lang)}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Program Detail Drawer ── */}
      <AnimatePresence>
        {selectedProg && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setSelectedProgram(null)} />
            <motion.div
              initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
              transition={{ type:"spring", damping:28, stiffness:280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl overflow-y-auto">
              {(() => {
                const cs  = categoryStyle[selectedProg.category] ?? { icon:Star, color:"text-amber-700", bg:"bg-amber-50", ring:"border-amber-200" };
                const ss  = statusStyle[selectedProg.status as ProgramStatus] ?? statusStyle.upcoming;
                const Ic  = cs.icon;
                const SIc = ss.icon;
                const spentPct = selectedProg.budget ? Math.round((Math.round(selectedProg.budget * (selectedProg.status === "completed" ? 0.95 : 0.1)) / selectedProg.budget) * 100) : 0;
                const spentAmt = selectedProg.budget ? Math.round(selectedProg.budget * (selectedProg.status === "completed" ? 0.95 : 0.1)) : 0;
                return (
                  <>
                    <div className={cn("px-5 py-4 flex items-center justify-between", cs.bg)}>
                      <div className="flex items-center gap-2">
                        <Ic className={cn("w-5 h-5", cs.color)} />
                        <p className={cn("font-bold", cs.color)}>{selectedProg.category}</p>
                      </div>
                      <button onClick={() => setSelectedProgram(null)} className="p-1.5 rounded-lg hover:bg-white/40">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5 space-y-5">
                      {/* Title + Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-extrabold text-gray-900 text-lg leading-tight flex-1">{selectedProg.title}</p>
                          <span className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0", ss.badge)}>
                            <SIc className="w-3 h-3" /> {ss.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{selectedProg.description}</p>
                      </div>

                      {/* Details */}
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <DRow icon={Calendar}    label={tr("sksbv", "date", lang)}         value={selectedProg.date} />
                        <DRow icon={MapPin}      label={tr("sksbv", "venue", lang)}        value={selectedProg.venue} />
                        <DRow icon={Users}       label={tr("sksbv", "participants", lang)} value={selectedProg.participants.toString()} />
                        <DRow icon={Target}      label={tr("sksbv", "category", lang)}     value={selectedProg.category} />
                        {selectedProg.coordinator && <DRow icon={User} label={tr("sksbv", "coordinator", lang)} value={selectedProg.coordinator} />}
                      </div>

                      {/* Budget */}
                      {selectedProg.budget > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{tr("sksbv", "budgetTracker", lang)}</p>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="grid grid-cols-3 gap-3 text-center mb-3">
                              <div>
                                <p className="text-[10px] text-gray-400">{tr("sksbv", "allocated", lang)}</p>
                                <p className="text-base font-extrabold text-gray-900">₹{selectedProg.budget.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">{tr("sksbv", "spent", lang)}</p>
                                <p className="text-base font-extrabold text-emerald-600">₹{spentAmt.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">{tr("sksbv", "balance", lang)}</p>
                                <p className="text-base font-extrabold text-blue-600">₹{(selectedProg.budget - spentAmt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                              <span>{tr("sksbv", "utilisation", lang)}</span>
                              <span>{spentPct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(spentPct,100)}%` }}
                                transition={{ duration:0.6 }}
                                className={cn("h-full rounded-full", spentPct > 90 ? "bg-rose-500" : "bg-emerald-500")} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Winner tag for completed programs */}
                      {(selectedProg as { winner?: string }).winner && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                          <Award className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-sm font-bold text-amber-800">{tr("sksbv", "winner", lang)}: {(selectedProg as { winner?: string }).winner}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        {selectedProg.status === "upcoming" && (
                          <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                            <PlayCircle className="w-4 h-4" /> {tr("sksbv", "markOngoing", lang)}
                          </button>
                        )}
                        {selectedProg.status === "ongoing" && (
                          <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" /> {tr("sksbv", "markComplete", lang)}
                          </button>
                        )}
                        <button onClick={() => setSelectedProgram(null)}
                          className="py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">{tr("sksbv", "close", lang)}</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add Program Modal ── */}
      <AnimatePresence>
        {showAddProgram && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowAddProgram(false)} />
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="font-bold text-gray-900 text-lg">{tr("sksbv", "newProgram", lang)}</p>
                  </div>
                  <button onClick={() => setShowAddProgram(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <AddField label={tr("sksbv", "programName", lang)}    placeholder={tr("sksbv", "programNamePlc", lang)} />
                  <div className="grid grid-cols-2 gap-3">
                    <AddField label={tr("sksbv", "category", lang)} type="select" options={["Academic","Charity","Cultural","Sports","Outing","Community"]} />
                    <AddField label={tr("sksbv", "statusLabel", lang)}   type="select" options={["upcoming","ongoing","completed"]} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <AddField label={tr("sksbv", "date", lang)} type="date" />
                    <AddField label={tr("sksbv", "venue", lang)} placeholder={tr("sksbv", "location", lang)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <AddField label={tr("sksbv", "budgetRs", lang)}  placeholder="5000" type="number" />
                    <AddField label={tr("sksbv", "participants", lang)} placeholder="50"   type="number" />
                  </div>
                  <AddField label={tr("sksbv", "coordinator", lang)} placeholder={tr("sksbv", "coordinatorPlc", lang)} />
                  <AddField label={tr("sksbv", "description", lang)} placeholder={tr("sksbv", "descPlc", lang)} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddProgram(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">{tr("sksbv", "cancel", lang)}</button>
                  <button onClick={() => setShowAddProgram(false)} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold">{tr("sksbv", "addProgram", lang)}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function UnionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/20 rounded-xl p-2.5 text-center">
      <p className="text-xl font-extrabold text-white">{value}</p>
      <p className="text-[10px] text-white/70">{label}</p>
    </div>
  );
}

function StatCard({ icon:Icon, label, value, color }:
  { icon:React.ElementType; label:string; value:number|string; color:string }) {
  const colors: Record<string, { bg:string; light:string; text:string }> = {
    amber:   { bg:"bg-amber-500",   light:"bg-amber-50",   text:"text-amber-700"   },
    blue:    { bg:"bg-blue-500",    light:"bg-blue-50",    text:"text-blue-700"    },
    emerald: { bg:"bg-emerald-500", light:"bg-emerald-50", text:"text-emerald-700" },
    rose:    { bg:"bg-rose-500",    light:"bg-rose-50",    text:"text-rose-700"    },
  };
  const c = colors[color] ?? colors.amber;
  return (
    <div className={cn("rounded-2xl p-4 flex items-center gap-3", c.light)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className={cn("text-xl font-extrabold", c.text)}>{value}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function DRow({ icon:Icon, label, value }: { icon:React.ElementType; label:string; value:string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <p className="text-xs text-gray-400 w-20 shrink-0">{label}</p>
      <p className="text-sm font-semibold text-gray-800 flex-1">{value}</p>
    </div>
  );
}

function AddField({ label, placeholder, type="text", options }: { label:string; placeholder?:string; type?:string; options?:string[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {type === "select" ? (
        <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          {options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      )}
    </div>
  );
}
