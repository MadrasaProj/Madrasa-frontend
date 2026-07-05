import { useState, useEffect } from "react";
import {
  createTicket,
  replyToTicket,
  updateTicketStatus,
  searchKb,
  listLeads,
  listTasks,
  type TicketItem,
  type LeadListItem
} from "@/lib/crm-api";
import { getDailyOperations, type DailyOperations } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  MessageSquare, ShieldAlert, CheckCircle2, Clock, Search, HelpCircle,
  CornerDownLeft, Loader2, Plus, Sparkles, Filter, X, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TICKET_CATEGORIES = [
  "LOGIN", "ATTENDANCE", "FEES", "EXAMS", "REPORTS", "MOBILE_APP",
  "TRAINING", "BUG", "FEATURE_REQUEST"
];

const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TICKET_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];

export default function SupportDashboard() {
  const { accessToken, user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [clients, setClients] = useState<LeadListItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  
  const [kbQuery, setKbQuery] = useState("");
  const [kbArticles, setKbArticles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New ticket state
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ clientId: "", leadId: "", title: "", description: "", category: "LOGIN", priority: "MEDIUM" });
  const [replyContent, setReplyContent] = useState("");

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const ops = await getDailyOperations(accessToken);
      // DailyOperations.activeTickets is type any[] matching TicketItem[]
      setTickets(ops.activeTickets as any[]);

      // Load clients list for ticket generation (WON leads correspond to clients)
      const list = await listLeads(accessToken, { status: "WON" });
      setClients(list);
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
      const targetClient = clients.find(c => c.id === newTicket.clientId || c.clientId === newTicket.clientId);
      const clientId = targetClient?.clientId ?? newTicket.clientId;

      await createTicket({
        clientId,
        leadId: newTicket.leadId || undefined,
        title: newTicket.title,
        description: newTicket.description,
        category: newTicket.category as any,
        priority: newTicket.priority as any
      }, accessToken);

      setShowAddTicket(false);
      setNewTicket({ clientId: "", leadId: "", title: "", description: "", category: "LOGIN", priority: "MEDIUM" });
      setSuccessMsg("Support ticket registered successfully!");
      loadData();
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
      // Reload ticket detail or refresh ticket list
      loadData();
      setSelectedTicket(null);
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
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Support Desk Center</h1>
          <p className="text-gray-500 text-xs">Track client issues, bug reports, and SLA breach timelines.</p>
        </div>
        <button
          onClick={() => setShowAddTicket(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Open Support Ticket
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm flex justify-between items-center shadow-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Left side tickets - Right side KB Article search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets registers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-600" />
                Active tickets ({filteredTickets.length})
              </h2>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-55 bg-gray-50 border border-gray-100 text-xs py-1.5 px-3 rounded-xl focus:outline-none text-gray-600"
                >
                  <option value="">All Statuses</option>
                  {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-100 text-xs py-1.5 px-3 rounded-xl focus:outline-none text-gray-600"
                >
                  <option value="">All Categories</option>
                  {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No active tickets matching this filter.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="py-4 hover:bg-gray-50/50 px-2 rounded-2xl cursor-pointer transition-all flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm">{t.title}</span>
                        <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                      <p className="text-[10px] text-gray-400">
                        Madrasa: {t.client?.name} • Opened: {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md",
                        t.priority === "CRITICAL" || t.priority === "HIGH" ? "bg-rose-50 text-rose-800" : "bg-gray-100 text-gray-600"
                      )}>
                        {t.priority}
                      </span>
                      {t.slaBreached && (
                        <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                          <ShieldAlert className="w-3 h-3" /> SLA Breach
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Base Helper search */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              KB Article search
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="Type keywords (e.g. login, fee...)"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs placeholder-gray-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {kbArticles.map((art) => (
                <div key={art.id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-1">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {art.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-normal line-clamp-3 whitespace-pre-line">{art.content}</p>
                </div>
              ))}
              {kbQuery.length > 2 && kbArticles.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                  No matching KB articles.
                </div>
              )}
              {kbQuery.length <= 2 && (
                <div className="text-center py-6 text-xs text-gray-400">
                  Type 3+ characters to search setup guides, FAQs and common fixes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── REPLY DRAWER MODAL ── */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {selectedTicket.status.replace(/_/g, " ")}
                  </span>
                  <h2 className="text-base font-black text-gray-800 mt-1">{selectedTicket.title}</h2>
                  <p className="text-[10px] text-gray-400">Madrasa: {selectedTicket.client?.name}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Issue description</span>
                <p className="text-gray-800 leading-normal whitespace-pre-line">{selectedTicket.description}</p>
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleResolveTicket(selectedTicket.id, "RESOLVED")}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleResolveTicket(selectedTicket.id, "CLOSED")}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl transition-all"
                >
                  Close Ticket
                </button>
              </div>

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Post Reply Response</h3>
                <textarea
                  required
                  rows={4}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type advice or resolution details here..."
                  className="w-full bg-gray-50 border border-gray-100 text-xs p-3 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  Post Reply
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CREATE TICKET MODAL ── */}
      <AnimatePresence>
        {showAddTicket && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 relative"
            >
              <h3 className="text-lg font-black text-gray-800">Register Support Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Select Client Madrasa</label>
                  <select
                    required
                    value={newTicket.clientId}
                    onChange={(e) => {
                      const sel = clients.find(c => c.id === e.target.value || c.clientId === e.target.value);
                      setNewTicket(prev => ({ ...prev, clientId: e.target.value, leadId: sel?.id || "" }));
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none text-gray-600"
                  >
                    <option value="">Select active customer...</option>
                    {clients.map(c => <option key={c.id} value={c.clientId || c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Category</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none text-gray-600"
                    >
                      {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none text-gray-600 font-bold"
                    >
                      {TICKET_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Ticket Title</label>
                  <input
                    required
                    type="text"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief summary of issue (e.g. Login failures on Mobile)"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Detailed description</label>
                  <textarea
                    required
                    rows={4}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Log exact steps to reproduce or details from customer call..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-gray-700 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddTicket(false)}
                    className="bg-gray-100 text-gray-600 font-bold text-xs py-2 px-4 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl"
                  >
                    Create Ticket
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
