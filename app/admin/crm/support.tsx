import { useState, useEffect } from "react";
import {
  createTicket,
  replyToTicket,
  updateTicketStatus,
  searchKb,
  listLeads,
  type TicketItem,
  type LeadListItem,
} from "@/lib/crm-api";
import { getDailyOperations } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import {
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Search,
  HelpCircle,
  CornerDownLeft,
  Loader2,
  Plus,
  Sparkles,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
  AlertCircle,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TICKET_CATEGORIES = [
  "LOGIN",
  "ATTENDANCE",
  "FEES",
  "EXAMS",
  "REPORTS",
  "MOBILE_APP",
  "TRAINING",
  "BUG",
  "FEATURE_REQUEST",
];

const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export default function SupportDashboard() {
  const { accessToken, user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [clients, setClients] = useState<LeadListItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const [kbQuery, setKbQuery] = useState("");
  const [kbArticles, setKbArticles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileView, setMobileView] = useState<"tickets" | "kb">("tickets");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New ticket state
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    clientId: "",
    leadId: "",
    title: "",
    description: "",
    category: "LOGIN",
    priority: "MEDIUM",
  });
  const [replyContent, setReplyContent] = useState("");

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const ops = await getDailyOperations(accessToken);
      setTickets((ops.activeTickets as any[]) || []);

      const list = await listLeads(accessToken, { status: "WON" });
      setClients(list || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKb = async () => {
    if (!accessToken) return;
    try {
      const articles = await searchKb(kbQuery, accessToken);
      setKbArticles(articles);
    } catch (e) {
      setError("KB Search Error: " + (e as Error).message);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]); // eslint-disable-line

  useEffect(() => {
    if (kbQuery.length > 2) {
      handleSearchKb();
    } else {
      setKbArticles([]);
    }
  }, [kbQuery]); // eslint-disable-line

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setActionLoading(true);
    try {
      const targetClient = clients.find(
        (c) => c.id === newTicket.clientId || c.clientId === newTicket.clientId
      );
      const clientId = targetClient?.clientId ?? newTicket.clientId;

      await createTicket(
        {
          clientId,
          leadId: newTicket.leadId || undefined,
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category as any,
          priority: newTicket.priority as any,
        },
        accessToken
      );

      setShowAddTicket(false);
      setNewTicket({
        clientId: "",
        leadId: "",
        title: "",
        description: "",
        category: "LOGIN",
        priority: "MEDIUM",
      });
      setSuccessMsg("Support ticket registered successfully!");
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setError("Failed to create ticket: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedTicket || !replyContent.trim()) return;
    setActionLoading(true);
    try {
      await replyToTicket(selectedTicket.id, replyContent, accessToken);
      setReplyContent("");
      setSuccessMsg("Reply posted successfully!");
      loadData();
      setSelectedTicket(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setError("Failed to post reply: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveTicket = async (id: string, status: string) => {
    if (!accessToken) return;
    try {
      await updateTicketStatus(id, status, accessToken);
      setSuccessMsg(`Ticket status marked as ${status}.`);
      loadData();
      setSelectedTicket(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, pageSize]);

  const paginatedTickets = filteredTickets.slice((page - 1) * pageSize, page * pageSize);

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Support Desk &amp; Customer Success
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Resolve incoming madrasa issues, bugs, and SLA response timelines
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTicket(true)}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Open Support Ticket</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-sm flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="font-bold underline text-xs text-emerald-800"
            >
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-sm flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-bold underline text-xs text-rose-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mobile Segmented Switcher (Tickets vs Knowledge Base) */}
        <div className="lg:hidden flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => setMobileView("tickets")}
            className={cn(
              "flex-1 min-h-[42px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              mobileView === "tickets"
                ? "bg-white text-gray-900 shadow-xs font-black"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Active Tickets ({filteredTickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView("kb")}
            className={cn(
              "flex-1 min-h-[42px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              mobileView === "kb"
                ? "bg-white text-gray-900 shadow-xs font-black"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Knowledge Base</span>
          </button>
        </div>

        {/* Main Grid: Left side tickets - Right side KB Article search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Tickets Register */}
          <div
            className={cn(
              "lg:col-span-2 space-y-4",
              mobileView === "kb" && "hidden lg:block"
            )}
          >
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Active Tickets ({filteredTickets.length})
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="min-h-[40px] bg-gray-50 border border-gray-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
                  >
                    <option value="">All Statuses</option>
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="min-h-[40px] bg-gray-50 border border-gray-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700"
                  >
                    <option value="">All Categories</option>
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm font-medium">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  No tickets found matching the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="divide-y divide-gray-100">
                    {paginatedTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="py-4 hover:bg-gray-50/70 px-3 rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">
                              {t.title}
                            </span>
                            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-lg uppercase">
                              {t.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                            <span>Madrasa: <strong className="text-gray-700 font-semibold">{t.client?.name || "Client"}</strong></span>
                            {t.createdAt && (
                              <span>• Opened: {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-lg uppercase",
                              t.priority === "CRITICAL" || t.priority === "HIGH"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {t.priority}
                          </span>
                          {t.slaBreached && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> SLA Breach
                            </span>
                          )}
                          <span className="text-xs text-emerald-700 font-bold capitalize mt-1">
                            {t.status.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {filteredTickets.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                      <span className="text-gray-500 font-medium">
                        Showing <strong>{(page - 1) * pageSize + 1}</strong>–
                        <strong>{Math.min(page * pageSize, filteredTickets.length)}</strong> of{" "}
                        <strong>{filteredTickets.length}</strong> tickets
                      </span>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="min-h-[38px] px-3 rounded-xl border border-gray-200 bg-white flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50 transition-colors font-semibold"
                          >
                            <ChevronLeft className="w-4 h-4" /> Prev
                          </button>
                          <span className="text-gray-700 font-bold px-2">
                            {page} / {totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="min-h-[38px] px-3 rounded-xl border border-gray-200 bg-white flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50 transition-colors font-semibold"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Knowledge Base Helper search */}
          <div
            className={cn(
              "space-y-4",
              mobileView === "tickets" && "hidden lg:block"
            )}
          >
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
                Knowledge Base &amp; FAQ
              </h2>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={kbQuery}
                  onChange={(e) => setKbQuery(e.target.value)}
                  placeholder="Search articles (login, fees, attendance)..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {kbArticles.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-1.5"
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      {art.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line line-clamp-4">
                      {art.content}
                    </p>
                  </div>
                ))}
                {kbQuery.length > 2 && kbArticles.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 font-medium">
                    No matching KB articles found.
                  </div>
                )}
                {kbQuery.length <= 2 && (
                  <div className="text-center py-8 text-xs text-gray-400 leading-relaxed font-medium">
                    Type 3+ characters to search instant solutions, guides, and FAQs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── REPLY DRAWER MODAL ── */}
        <AnimatePresence>
          {selectedTicket && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTicket(null)}
                className="fixed inset-0 bg-black backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="relative bg-white w-full max-w-lg h-full max-h-screen overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl z-10 flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                      {selectedTicket.status.replace(/_/g, " ")}
                    </span>
                    <h2 className="text-lg font-black text-gray-900 mt-2">{selectedTicket.title}</h2>
                    <p className="text-xs text-gray-500">
                      Madrasa: <strong className="text-gray-800 font-semibold">{selectedTicket.client?.name || "Client"}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl text-xs sm:text-sm space-y-2 border border-gray-100">
                  <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider">
                    Issue Description
                  </span>
                  <p className="text-gray-900 leading-relaxed whitespace-pre-line font-medium">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleResolveTicket(selectedTicket.id, "RESOLVED")}
                    className="min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveTicket(selectedTicket.id, "CLOSED")}
                    className="min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all"
                  >
                    Close Ticket
                  </button>
                </div>

                {/* Reply Form */}
                <form onSubmit={handlePostReply} className="space-y-4 pt-4 border-t border-gray-100 flex-1 flex flex-col justify-end">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Post Reply or Action Update
                  </h3>
                  <textarea
                    required
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type diagnosis, steps completed, or response to user..."
                    className="w-full bg-gray-50 border border-gray-200 text-xs sm:text-sm p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all leading-relaxed"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !replyContent.trim()}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                    <span>Post Reply</span>
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── CREATE TICKET MODAL ── */}
        <AnimatePresence>
          {showAddTicket && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddTicket(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              />

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-gray-900 text-lg">
                    Open Support Ticket
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddTicket(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="p-6 space-y-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Select Client Madrasa *
                    </label>
                    <select
                      required
                      value={newTicket.clientId}
                      onChange={(e) => {
                        const sel = clients.find(
                          (c) => c.id === e.target.value || c.clientId === e.target.value
                        );
                        setNewTicket((prev) => ({
                          ...prev,
                          clientId: e.target.value,
                          leadId: sel?.id || "",
                        }));
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 min-h-[44px]"
                    >
                      <option value="">Select active customer...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.clientId || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Category
                      </label>
                      <select
                        value={newTicket.category}
                        onChange={(e) =>
                          setNewTicket((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 min-h-[44px]"
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Priority
                      </label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) =>
                          setNewTicket((prev) => ({ ...prev, priority: e.target.value }))
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 min-h-[44px]"
                      >
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Ticket Title *
                    </label>
                    <input
                      required
                      type="text"
                      value={newTicket.title}
                      onChange={(e) =>
                        setNewTicket((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Brief summary (e.g. Login issues on Android App)"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Detailed Description *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newTicket.description}
                      onChange={(e) =>
                        setNewTicket((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Log exact steps to reproduce or information given by the madrasa administrator..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddTicket(false)}
                      className="min-h-[44px] flex-1 py-3 text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="min-h-[44px] flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs active:scale-[0.98]"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Create Ticket</span>
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
