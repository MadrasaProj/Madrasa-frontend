import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import {
  listExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  type ExpenseItem,
} from "@/lib/crm-api";
import {
  Receipt,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Megaphone,
  User,
  CreditCard,
  Briefcase,
  X,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { accessToken, user: loggedInUser } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form modals
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Action loaders
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isSuperAdmin = loggedInUser?.actorType === "SUPER_ADMIN";

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listExpenses(accessToken);
      setExpenses(list);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0 || !accessToken) return;

    setSubmitting(true);
    setError(null);
    try {
      await createExpense(
        {
          title: title.trim(),
          amount: amt,
          category,
          description: description.trim() || undefined,
        },
        accessToken
      );
      setSuccess("Expense request submitted successfully!");
      setShowModal(false);
      setTitle("");
      setAmount("");
      setCategory("MARKETING");
      setDescription("");
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError((err as Error).message ?? "Failed to submit expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!accessToken) return;
    setActionLoadingId(id);
    setError(null);
    try {
      await approveExpense(id, accessToken);
      setSuccess("Expense approved successfully.");
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError((err as Error).message ?? "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!accessToken) return;
    setActionLoadingId(id);
    setError(null);
    try {
      await rejectExpense(id, accessToken);
      setSuccess("Expense rejected successfully.");
      loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError((err as Error).message ?? "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const totalPending = expenses
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalApproved = expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalRejected = expenses
    .filter((e) => e.status === "REJECTED")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Filters & Pagination calculations
  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      exp.title.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      exp.submittedBy.name.toLowerCase().includes(q) ||
      (exp.description && exp.description.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = filteredExpenses.slice((page - 1) * pageSize, page * pageSize);

  const filterCounts = {
    ALL: expenses.length,
    PENDING: expenses.filter((e) => e.status === "PENDING").length,
    APPROVED: expenses.filter((e) => e.status === "APPROVED").length,
    REJECTED: expenses.filter((e) => e.status === "REJECTED").length,
  };

  const fmtCurrency = (val: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Approval
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "MARKETING":
        return <Megaphone className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "TRAVEL":
        return <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />;
      case "INFRASTRUCTURE":
        return <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-500 shrink-0" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Receipt className="w-7 h-7 text-emerald-600 shrink-0" />
              Operational Expenses
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Track business operational claims, travel outlays, and field marketing budgets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-xs transition-all text-xs sm:text-sm active:scale-[0.98]"
            >
              <RefreshCw className={cn("w-4 h-4 text-emerald-600", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm transition-all text-xs sm:text-sm active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Claim</span>
            </button>
          </div>
        </div>

        {/* Feedback / alerts */}
        {error && (
          <div className="flex items-center justify-between gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold text-rose-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-semibold">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-xs font-bold text-emerald-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-amber-50/70 rounded-3xl border border-amber-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-800 tracking-wider">
                Pending Approval
              </span>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 tracking-tight">
                {fmtCurrency(totalPending)}
              </p>
            </div>
            <Clock className="w-7 h-7 text-amber-500/40 self-end mt-4" />
          </div>

          <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                Approved &amp; Paid
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2 tracking-tight">
                {fmtCurrency(totalApproved)}
              </p>
            </div>
            <CheckCircle className="w-7 h-7 text-emerald-500/40 self-end mt-4" />
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Rejected Claims
              </span>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
                {fmtCurrency(totalRejected)}
              </p>
            </div>
            <XCircle className="w-7 h-7 text-gray-300 self-end mt-4" />
          </div>
        </div>

        {/* Main Expenses Registry Box */}
        <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
          {/* Filter Bar */}
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mr-1">
                Status:
              </span>
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={cn(
                    "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                    statusFilter === st
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {st} ({filterCounts[st as keyof typeof filterCounts] ?? 0})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim, submitter, cat..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Content List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="p-16 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No expenses match your search</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria or submit a claim.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-xs font-bold tracking-wider">
                      <th className="py-4 px-6">Expense Title</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Submitted By</th>
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Status</th>
                      {isSuperAdmin && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {paginatedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-gray-900">{exp.title}</p>
                            {exp.description && (
                              <p className="text-xs text-gray-500 mt-0.5 max-w-sm truncate" title={exp.description}>
                                {exp.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700">
                            {getCategoryIcon(exp.category)}
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-gray-900 text-base font-mono">
                          {fmtCurrency(exp.amount)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-800">{exp.submittedBy.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-500 font-medium">{fmtDate(exp.createdAt)}</td>
                        <td className="py-4 px-6">{getStatusBadge(exp.status)}</td>
                        {isSuperAdmin && (
                          <td className="py-4 px-6 text-right">
                            {exp.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(exp.id)}
                                  disabled={actionLoadingId === exp.id}
                                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                                >
                                  {actionLoadingId === exp.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(exp.id)}
                                  disabled={actionLoadingId === exp.id}
                                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                                >
                                  {actionLoadingId === exp.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold italic">Processed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Stack View */}
              <div className="lg:hidden space-y-3.5 p-4 bg-gray-50/50">
                {paginatedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base">{exp.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtDate(exp.createdAt)}</p>
                      </div>
                      <span className="font-black text-lg text-gray-900 font-mono shrink-0">
                        {fmtCurrency(exp.amount)}
                      </span>
                    </div>

                    {exp.description && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                        {exp.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" /> {exp.submittedBy.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <div>{getStatusBadge(exp.status)}</div>
                      {isSuperAdmin && exp.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(exp.id)}
                            disabled={actionLoadingId === exp.id}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                          >
                            {actionLoadingId === exp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(exp.id)}
                            disabled={actionLoadingId === exp.id}
                            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                          >
                            {actionLoadingId === exp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 sm:p-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-gray-500 flex-wrap">
                    <span>
                      Showing <strong>{(page - 1) * pageSize + 1}</strong>–
                      <strong>{Math.min(page * pageSize, filteredExpenses.length)}</strong> of{" "}
                      <strong>{filteredExpenses.length}</strong> claims
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
                    >
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="font-bold text-gray-700 px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all font-semibold flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Submission Modal Dialog */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Submit Expense Claim
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                      Expense Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Field visit travel to Malappuram, Hosting fees"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold text-gray-900 min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                        Amount (₹ INR) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-bold text-gray-900 min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold text-gray-900 min-h-[44px]"
                      >
                        <option value="MARKETING">MARKETING</option>
                        <option value="TRAVEL">TRAVEL</option>
                        <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                        <option value="SALARY">SALARY</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                      Description / Justification
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Provide additional details or receipt references..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium text-gray-900 resize-none"
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="min-h-[44px] flex-1 py-3 text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !title.trim() || !amount}
                      className="min-h-[44px] flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-60 shadow-xs active:scale-[0.98]"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Submit Claim</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
