import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  DollarSign,
  AlertCircle,
  Calendar,
  Sparkles,
  Megaphone,
  User,
  CreditCard,
  Briefcase,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { accessToken, user: loggedInUser } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setTimeout(() => setSuccess(null), 3000);
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
      setTimeout(() => setSuccess(null), 3000);
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
      setTimeout(() => setSuccess(null), 3000);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "MARKETING":
        return <Megaphone className="w-4 h-4 text-sky-600" />;
      case "TRAVEL":
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case "SALARY":
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case "INFRASTRUCTURE":
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />;
    }
  };

  const fmtCurrency = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-600 shrink-0" />
              Expense Tracker
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Submit business expenses. Pending submissions require Super Admin approval.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-sm transition-all text-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> New Expense Request
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-800">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Aggregation Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Approval</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{fmtCurrency(totalPending)}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Approved</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{fmtCurrency(totalApproved)}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected</p>
              <h3 className="text-xl font-bold text-gray-800 mt-0.5">{fmtCurrency(totalRejected)}</h3>
            </div>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No expenses recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">Submit your first business expense claim above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Expense Title</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Submitted By</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Status</th>
                    {isSuperAdmin && <th className="py-4 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/30 transition-all text-sm">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-gray-800">{exp.title}</p>
                          {exp.description && (
                            <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate" title={exp.description}>
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
                      <td className="py-4 px-6 font-bold text-gray-850">{fmtCurrency(exp.amount)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-700">{exp.submittedBy.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-mono text-xs">{fmtDate(exp.createdAt)}</td>
                      <td className="py-4 px-6">{getStatusBadge(exp.status)}</td>
                      {isSuperAdmin && (
                        <td className="py-4 px-6 text-right">
                          {exp.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(exp.id)}
                                disabled={actionLoadingId === exp.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                              >
                                {actionLoadingId === exp.id ? (
                                  <Loader2 className="w-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(exp.id)}
                                disabled={actionLoadingId === exp.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                              >
                                {actionLoadingId === exp.id ? (
                                  <Loader2 className="w-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic font-medium">Decided</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Stack View */}
            <div className="md:hidden space-y-4">
              {expenses.map((exp) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">{exp.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(exp.createdAt)}</p>
                    </div>
                    <span className="font-mono font-bold text-lg text-gray-850">
                      {fmtCurrency(exp.amount)}
                    </span>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-gray-500 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                      {exp.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-50 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700">
                      {getCategoryIcon(exp.category)}
                      {exp.category}
                    </span>
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" /> {exp.submittedBy.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50">
                    <div>{getStatusBadge(exp.status)}</div>
                    {isSuperAdmin && exp.status === "PENDING" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                        >
                          {actionLoadingId === exp.id ? (
                            <Loader2 className="w-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(exp.id)}
                          disabled={actionLoadingId === exp.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                        >
                          {actionLoadingId === exp.id ? (
                            <Loader2 className="w-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Submission Modal Dialog */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-650" />
                    Submit Expense Request
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Expense Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Travel tickets to Malappuram, Hosting fees"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                        Amount (INR) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-850"
                      >
                        <option value="MARKETING">MARKETING</option>
                        <option value="TRAVEL">TRAVEL</option>
                        <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                        <option value="SALARY">SALARY</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Description / Justification
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Provide additional details or receipt references..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 resize-none"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !title.trim() || !amount}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Claim
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
