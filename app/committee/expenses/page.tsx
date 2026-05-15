import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { useCommitteeData } from "@/lib/use-committee-data";

// These types were in mock-data; kept inline since expenses have no backend yet
type ExpenseCategoryId = "salaries" | "infrastructure" | "programs" | "maintenance" | "utilities" | "stationery";
type ExpenseItem = {
  id: string; categoryId: ExpenseCategoryId; title: string; title_ml: string;
  amount: number; date: string; reference: string; approvedBy: string; status: "approved" | "pending" | "rejected";
};
import { useState } from "react";
import {
  Receipt, IndianRupee, TrendingDown, Wallet, PiggyBank,
  Users, Building2, Star, Wrench, Zap, BookOpen,
  CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Plus, X, Save,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function Bar({ value, color = "bg-orange-500", height = "h-2" }: { value: number; color?: string; height?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`${height} ${color} rounded-full transition-all duration-700`} style={{ width: `${safe}%` }} />
    </div>
  );
}

function pct(spent: number, budget: number) {
  return budget === 0 ? 0 : Math.min(100, Math.round((spent / budget) * 100));
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

const categoryIconMap: Record<string, React.ElementType> = {
  salaries:       Users,
  infrastructure: Building2,
  programs:       Star,
  maintenance:    Wrench,
  utilities:      Zap,
  stationery:     BookOpen,
};

const categoryColorMap: Record<string, { bar: string; bg: string; text: string; border: string; ring: string }> = {
  salaries:       { bar: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200", ring: "ring-violet-400"  },
  infrastructure: { bar: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   ring: "ring-blue-400"    },
  programs:       { bar: "bg-rose-500",    bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",   ring: "ring-rose-400"    },
  maintenance:    { bar: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  ring: "ring-amber-400"   },
  utilities:      { bar: "bg-teal-500",    bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",   ring: "ring-teal-400"    },
  stationery:     { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-400" },
};

type FilterId = "all" | "salaries" | "infrastructure" | "programs" | "maintenance" | "utilities" | "stationery";

type NewExpense = {
  title: string;
  title_ml: string;
  category: ExpenseCategoryId;
  amount: string;
  date: string;
  paidTo: string;
  paidTo_ml: string;
  status: "paid" | "pending";
  note: string;
};

const EMPTY_FORM: NewExpense = {
  title: "", title_ml: "", category: "infrastructure",
  amount: "", date: new Date().toISOString().slice(0, 10),
  paidTo: "", paidTo_ml: "", status: "paid", note: "",
};

// ── component ─────────────────────────────────────────────────────────────────

export default function CommitteeExpensesPage() {
  const { lang } = useLanguageStore();
  const d = useCommitteeData();
  // Expenses have no backend yet — stub object used for summary header
  const exp = {
    totalBudget: 0, totalSpent: 0, totalPending: 0,
    categories: [] as { id: ExpenseCategoryId; label_en: string; label_ml: string; budget: number; spent: number; items: ExpenseItem[] }[],
    recentItems: [] as ExpenseItem[],
  };

  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [showAll, setShowAll]           = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<NewExpense>(EMPTY_FORM);
  const [localExpenses, setLocalExpenses] = useState<ExpenseItem[]>([]);
  const [saved, setSaved]               = useState(false);

  const allExpenses: ExpenseItem[] = [...localExpenses, ...exp.recentExpenses];
  const maxMonth = Math.max(...exp.monthlyTrend.map((m) => m.amount));

  const filteredExpenses = activeFilter === "all"
    ? allExpenses
    : allExpenses.filter((e) => e.category === activeFilter);

  const displayedExpenses = showAll ? filteredExpenses : filteredExpenses.slice(0, 8);

  const totalPending = allExpenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
  const localSpent   = localExpenses.reduce((s, e) => s + e.amount, 0);
  const totalSpent   = exp.totalSpent + localSpent;
  const spentPct     = Math.round((totalSpent / exp.annualBudget) * 100);
  const balance      = exp.annualBudget - totalSpent;

  function handleSave() {
    if (!form.title || !form.amount || !form.paidTo || !form.date) return;
    const newItem: ExpenseItem = {
      id:       `EX-LOCAL-${Date.now()}`,
      category: form.category,
      title:    form.title,
      title_ml: form.title_ml || form.title,
      amount:   Number(form.amount),
      date:     form.date,
      paidTo:   form.paidTo,
      paidTo_ml: form.paidTo_ml || form.paidTo,
      status:   form.status,
      note:     form.note,
    };
    setLocalExpenses((prev) => [newItem, ...prev]);
    setForm(EMPTY_FORM);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowForm(false); }, 1200);
  }

  const isFormValid = form.title.trim() && form.amount && Number(form.amount) > 0 && form.paidTo.trim() && form.date;

  return (
    <DashboardLayout>

      {/* ── Add Expense modal / drawer ── */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)}
            />
            {/* Drawer */}
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="px-5 pb-8">
                {/* Drawer header */}
                <div className="flex items-center justify-between mb-5 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Plus className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900">
                        {lang === "ml" ? "പുതിയ ചെലവ് ചേർക്കുക" : "Add New Expense"}
                      </h2>
                      <p className="text-[11px] text-gray-400">
                        {lang === "ml" ? "വിശദാംശം നൽകുക" : "Fill in the details below"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)}
                    className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-4">

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "ഇനം (Category)" : "Category"} *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {exp.categories.map((cat) => {
                        const c    = categoryColorMap[cat.id] ?? categoryColorMap.stationery;
                        const Icon = categoryIconMap[cat.id] ?? BookOpen;
                        return (
                          <button key={cat.id} type="button"
                            onClick={() => setForm((f) => ({ ...f, category: cat.id as ExpenseCategoryId }))}
                            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                              form.category === cat.id
                                ? `${c.bg} ${c.border} ring-2 ${c.ring}`
                                : "bg-gray-50 border-gray-100"
                            }`}
                          >
                            <div className={`w-6 h-6 ${c.bg} rounded-lg flex items-center justify-center`}>
                              <Icon className={`w-3 h-3 ${c.text}`} />
                            </div>
                            <span className={`text-xs font-bold ${form.category === cat.id ? c.text : "text-gray-600"}`}>
                              {lang === "ml" ? cat.label_ml : cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "ചെലവ് പേര്" : "Expense Title"} *
                    </label>
                    <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder={lang === "ml" ? "ഉദാ: പുതിയ ബെഞ്ച് വാങ്ങൽ" : "e.g. New Benches Purchase"}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Title Malayalam */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "മലയാളം പേര്" : "Malayalam Title"}{" "}
                      <span className="font-normal text-gray-400">({lang === "ml" ? "ഓപ്ഷണൽ" : "optional"})</span>
                    </label>
                    <input value={form.title_ml} onChange={(e) => setForm((f) => ({ ...f, title_ml: e.target.value }))}
                      placeholder={lang === "ml" ? "ഉദാ: പുതിയ ബെഞ്ച് വാങ്ങൽ" : "e.g. പുതിയ ബെഞ്ച് വാങ്ങൽ"}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {lang === "ml" ? "തുക (₹)" : "Amount (₹)"} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                        <input type="number" min="0" value={form.amount}
                          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                          placeholder="0"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-3 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {lang === "ml" ? "തീയതി" : "Date"} *
                      </label>
                      <input type="date" value={form.date}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  {/* Paid To */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "നൽകിയത് ആർക്ക്" : "Paid To"} *
                    </label>
                    <input value={form.paidTo} onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))}
                      placeholder={lang === "ml" ? "ഉദാ: National Stationery" : "e.g. National Stationery"}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "നില" : "Payment Status"}
                    </label>
                    <div className="flex gap-2">
                      {(["paid", "pending"] as const).map((st) => (
                        <button key={st} type="button"
                          onClick={() => setForm((f) => ({ ...f, status: st }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                            form.status === st
                              ? st === "paid"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-200"
                                : "bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-200"
                              : "bg-gray-50 border-gray-200 text-gray-500"
                          }`}
                        >
                          {st === "paid"
                            ? <><CheckCircle2 className="w-3.5 h-3.5" />{lang === "ml" ? "അടച്ചു" : "Paid"}</>
                            : <><Clock className="w-3.5 h-3.5" />{lang === "ml" ? "ബാക്കി" : "Pending"}</>
                          }
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === "ml" ? "കുറിപ്പ്" : "Note"}{" "}
                      <span className="font-normal text-gray-400">({lang === "ml" ? "ഓപ്ഷണൽ" : "optional"})</span>
                    </label>
                    <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      rows={2} placeholder={lang === "ml" ? "അധിക വിവരം..." : "Additional details..."}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                    />
                  </div>

                  {/* Save button */}
                  <button onClick={handleSave} disabled={!isFormValid}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all ${
                      saved
                        ? "bg-emerald-500 text-white"
                        : isFormValid
                          ? "bg-orange-500 text-white hover:bg-orange-600 active:scale-95"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {saved
                      ? <><CheckCircle2 className="w-4 h-4" />{lang === "ml" ? "സേവ് ആയി!" : "Saved!"}</>
                      : <><Save className="w-4 h-4" />{lang === "ml" ? "ചെലവ് സേവ് ചെയ്യുക" : "Save Expense"}</>
                    }
                  </button>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="bg-linear-to-r from-orange-600 to-amber-500 rounded-3xl p-5 lg:p-6 text-white">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest">
                  {lang === "ml" ? "കമ്മിറ്റി" : "Management Committee"}
                </p>
                <h1 className="text-xl font-bold">
                  {lang === "ml" ? "ചെലവ് നിയന്ത്രണം" : "Expense Management"}
                </h1>
              </div>
            </div>
            {/* ── Add button ── */}
            <button onClick={() => { setShowForm(true); setSaved(false); }}
              className="flex items-center gap-1.5 bg-white text-orange-600 text-xs font-black px-3.5 py-2 rounded-xl shadow-sm hover:bg-orange-50 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              {lang === "ml" ? "ചേർക്കുക" : "Add"}
            </button>
          </div>
          {/* Budget progress */}
          <div className="bg-white/15 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm text-orange-200 font-semibold">
                {lang === "ml" ? "വാർഷിക ബജറ്റ് ഉപയോഗം" : "Annual Budget Usage"}
              </span>
              <span className="text-2xl font-black">{spentPct}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${spentPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-orange-200">
              <span>{lang === "ml" ? "ചെലവ്" : "Spent"}: {fmt(totalSpent)}</span>
              <span>{lang === "ml" ? "ബജറ്റ്" : "Budget"}: {fmt(exp.annualBudget)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: lang === "ml" ? "വാർഷിക ബജറ്റ്" : "Annual Budget",
            value: fmt(exp.annualBudget),
            sub:   lang === "ml" ? "ഈ വർഷം"        : "This year",
            icon: Wallet,       color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200",
          },
          {
            label: lang === "ml" ? "ആകെ ചെലവ്"    : "Total Spent",
            value: fmt(totalSpent),
            sub:   `${spentPct}% ${lang === "ml" ? "ബജറ്റിൽ" : "of budget"}`,
            icon: TrendingDown, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",
          },
          {
            label: lang === "ml" ? "ബാക്കി ബജറ്റ്" : "Remaining",
            value: fmt(balance),
            sub:   `${100 - spentPct}% ${lang === "ml" ? "ബാക്കി" : "left"}`,
            icon: PiggyBank,    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
          },
          {
            label: lang === "ml" ? "പെൻഡിങ്" : "Pending",
            value: fmt(totalPending),
            sub:   lang === "ml" ? "അടക്കാൻ ബാക്കി" : "To be paid",
            icon: IndianRupee,  color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",
          },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-2xl border ${c.border} p-4 shadow-sm`}
          >
            <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{c.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Category breakdown ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4.5 h-4.5 text-orange-600" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "ഇനം തിരിച്ചുള്ള ചെലവ്" : "Expense by Category"}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {exp.categories.map((cat, i) => {
            const used = pct(cat.spent, cat.budget);
            const c    = categoryColorMap[cat.id] ?? categoryColorMap.stationery;
            const Icon = categoryIconMap[cat.id] ?? BookOpen;
            const over = cat.spent > cat.budget;
            return (
              <motion.button key={cat.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.26 + i * 0.06 }}
                onClick={() => setActiveFilter(activeFilter === cat.id ? "all" : cat.id as FilterId)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all ${
                  activeFilter === cat.id ? `${c.bg} ${c.border} ring-2 ${c.ring}` : "bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 ${c.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      {lang === "ml" ? cat.label_ml : cat.label}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    over ? "bg-red-100 text-red-700" : `${c.bg} ${c.text}`
                  }`}>
                    {used}%
                  </span>
                </div>
                <Bar value={used} color={over ? "bg-red-500" : c.bar} height="h-2" />
                <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 font-medium">
                  <span>{fmt(cat.spent)} {lang === "ml" ? "ചെലവ്" : "spent"}</span>
                  <span>{fmt(cat.budget)} {lang === "ml" ? "ബജറ്റ്" : "budget"}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {activeFilter !== "all" && (
          <button onClick={() => setActiveFilter("all")}
            className="mt-3 text-xs text-orange-600 font-bold underline underline-offset-2"
          >
            {lang === "ml" ? "എല്ലാം കാണുക" : "Clear filter — show all"}
          </button>
        )}
      </motion.div>

      {/* ── Monthly trend bar chart ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="w-4.5 h-4.5 text-orange-600" />
          <p className="font-bold text-gray-800">
            {lang === "ml" ? "മാസ ചെലവ് ട്രെൻഡ്" : "Monthly Expense Trend"}
          </p>
        </div>
        <div className="flex items-end gap-2 h-32">
          {exp.monthlyTrend.map((m, i) => {
            const barH = maxMonth === 0 ? 0 : Math.round((m.amount / maxMonth) * 100);
            return (
              <motion.div key={m.month} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.34 + i * 0.08 }}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div className="w-full flex flex-col-reverse" style={{ height: "90px" }}>
                  <div className="w-full bg-orange-400 rounded-t transition-all" style={{ height: `${barH}%` }} />
                </div>
                <p className="text-[10px] font-bold text-gray-600">{lang === "ml" ? m.month_ml : m.month}</p>
                <p className="text-[9px] text-gray-400">{fmt(m.amount)}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Expense list ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4.5 h-4.5 text-orange-600" />
            <p className="font-bold text-gray-800">
              {lang === "ml" ? "ചെലവ് വിശദാംശം" : "Expense Details"}
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {filteredExpenses.length} {lang === "ml" ? "ഇനം" : "items"}
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {(["all", ...exp.categories.map((c) => c.id)] as FilterId[]).map((fid) => {
            const cat = exp.categories.find((c) => c.id === fid);
            const c   = fid !== "all" ? (categoryColorMap[fid] ?? categoryColorMap.stationery) : null;
            return (
              <button key={fid} onClick={() => setActiveFilter(fid)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  activeFilter === fid
                    ? fid === "all" ? "bg-orange-500 text-white border-orange-500" : `${c?.bar.replace("bg-","bg-")} text-white border-transparent`
                    : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                }`}
                style={activeFilter === fid && fid !== "all" ? { backgroundColor: undefined } : undefined}
              >
                {fid === "all"
                  ? (lang === "ml" ? "എല്ലാം" : "All")
                  : (lang === "ml" ? cat?.label_ml : cat?.label) ?? fid
                }
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {displayedExpenses.map((item, i) => {
            const c    = categoryColorMap[item.category] ?? categoryColorMap.stationery;
            const Icon = categoryIconMap[item.category] ?? BookOpen;
            const cat  = exp.categories.find((cc) => cc.id === item.category);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.04 }}
                className={`flex items-center gap-3 rounded-2xl p-3 border transition-all ${
                  item.status === "pending" ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100"
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${c.text}`} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {lang === "ml" ? item.title_ml : item.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                      {lang === "ml" ? cat?.label_ml : cat?.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {lang === "ml" ? item.paidTo_ml : item.paidTo}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                {/* Amount + status */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-sm font-black text-gray-900">{fmt(item.amount)}</span>
                  {item.status === "paid"
                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {lang === "ml" ? "അടച്ചു" : "Paid"}
                      </span>
                    : <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        {lang === "ml" ? "ബാക്കി" : "Pending"}
                      </span>
                  }
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredExpenses.length > 8 && (
          <button onClick={() => setShowAll((p) => !p)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all"
          >
            {showAll
              ? <><ChevronUp className="w-4 h-4" />{lang === "ml" ? "ചുരുക്കുക" : "Show Less"}</>
              : <><ChevronDown className="w-4 h-4" />{lang === "ml" ? `${filteredExpenses.length - 8} ഇനം കൂടി` : `Show ${filteredExpenses.length - 8} more`}</>
            }
          </button>
        )}
      </motion.div>

      {/* ── Salary detail card ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
        className="bg-white rounded-2xl border border-violet-200 p-5 shadow-sm mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-700" />
          </div>
          <div>
            <p className="font-bold text-gray-800">
              {lang === "ml" ? "ഉസ്താദ് ശമ്പള സ്ഥിതി" : "Staff Salary Status"}
            </p>
            <p className="text-[11px] text-gray-400">
              {lang === "ml" ? "ഈ അദ്ധ്യ. വർഷം" : "This academic year"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: lang === "ml" ? "ശമ്പള ബജറ്റ്"   : "Salary Budget",    value: fmt(exp.categories.find(c => c.id === "salaries")?.budget ?? 0),  color: "text-violet-700" },
            { label: lang === "ml" ? "ഇതുവരെ നൽകി"   : "Paid So Far",      value: fmt(exp.categories.find(c => c.id === "salaries")?.spent  ?? 0),  color: "text-emerald-700" },
            { label: lang === "ml" ? "ബാക്കി (ഇനിയും)" : "Remaining",       value: fmt((exp.categories.find(c => c.id === "salaries")?.budget ?? 0) - (exp.categories.find(c => c.id === "salaries")?.spent ?? 0)), color: "text-gray-700" },
            { label: lang === "ml" ? "ഒ. ഉസ്താദ്"    : "Total Staff",      value: `${d.attendance.staff.totalStaff}`,                                  color: "text-blue-700" },
          ].map((s) => (
            <div key={s.label} className="bg-violet-50 rounded-xl p-3">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {d.attendance.staff.staffList.map((staff, i) => {
            const perStaff = Math.round((exp.categories.find(c => c.id === "salaries")?.spent ?? 0) / (d.attendance.staff.totalStaff * 5));
            return (
              <motion.div key={staff.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.48 + i * 0.04 }}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
              >
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-violet-700">{staff.name.split(" ").slice(-1)[0][0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{staff.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{lang === "ml" ? staff.role_ml : staff.role}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-black text-violet-700">{fmt(perStaff)}</p>
                  <p className="text-[9px] text-gray-400">{lang === "ml" ? "/മാസം" : "/month"}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Pending alert ── */}
      {totalPending > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-800">
              {lang === "ml"
                ? `${fmt(totalPending)} ചെലവ് അടക്കാൻ ബാക്കി`
                : `${fmt(totalPending)} in expenses pending payment`}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {lang === "ml"
                ? "ഉടൻ അടക്കാൻ ക്രമീകരണം ചെയ്യേണ്ടതാണ്"
                : "Please arrange payment for pending items at the earliest"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {exp.recentExpenses.filter((e) => e.status === "pending").map((e) => (
                <span key={e.id} className="text-[10px] bg-orange-100 text-orange-800 font-semibold px-2 py-0.5 rounded-full">
                  {lang === "ml" ? e.title_ml : e.title} — {fmt(e.amount)}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </DashboardLayout>
  );
}
