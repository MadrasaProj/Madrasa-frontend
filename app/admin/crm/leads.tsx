import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listLeads, getLead, createLead, updateLead, deleteLead,
  logActivity, scheduleDemo, provisionTrial, convertLead,
  listDistricts,
  type LeadListItem, type LeadDetail, type DistrictItem
} from "@/lib/crm-api";
import { listInternalUsers, type InternalUserItem } from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Plus, Search, Phone, MessageSquare, Play, CheckCircle, X, Loader2,
  DollarSign, Calendar, Users, Award, Trash, Clock, ChevronRight,
  AlertTriangle, Copy, Check, List, Filter, RefreshCw, ExternalLink,
  ArrowRight, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Pipeline stage config ────────────────────────────────────────────────────
const LEAD_STATUSES = [
  "NEW", "CONTACTED", "FOLLOW_UP", "DEMO_SCHEDULED", "DEMO_COMPLETED",
  "TRIAL_CREATED", "NEGOTIATION", "PAYMENT_PENDING", "WON", "LOST", "ON_HOLD"
] as const;
type LeadStatus = typeof LEAD_STATUSES[number];

// Simplified 5-step visual pipeline (WON/LOST/ON_HOLD are outcomes, shown separately)
const PIPELINE_STEPS = [
  { key: "intake",      label: "Intake",       statuses: ["NEW", "CONTACTED", "FOLLOW_UP"] as string[] },
  { key: "demo",        label: "Demo",         statuses: ["DEMO_SCHEDULED", "DEMO_COMPLETED"] as string[] },
  { key: "trial",       label: "Trial",        statuses: ["TRIAL_CREATED"] as string[] },
  { key: "closing",     label: "Negotiation",  statuses: ["NEGOTIATION", "PAYMENT_PENDING"] as string[] },
  { key: "won",         label: "Won",          statuses: ["WON"] as string[] },
];

const ACTIVITY_TYPES = [
  { value: "CALL",          label: "📞 Phone Call" },
  { value: "WHATSAPP",      label: "💬 WhatsApp" },
  { value: "MEETING",       label: "🤝 Meeting" },
  { value: "SITE_VISIT",    label: "🏫 Site Visit" },
  { value: "PROPOSAL_SENT", label: "📄 Proposal Sent" },
];

const LEAD_SOURCES = [
  "REFERRAL", "WHATSAPP", "FACEBOOK", "WEBSITE", "DIRECT_VISIT",
  "WEBINAR", "CAMPAIGN", "COLD_OUTREACH", "EXISTING_CUSTOMER"
];

const CONTACT_ROLES = ["Sadr Usthad", "Secretary", "President", "Manager", "Muhtamim", "Other"];

const STATUS_COLORS: Record<string, string> = {
  NEW:             "bg-gray-100 text-gray-600",
  CONTACTED:       "bg-blue-50 text-blue-700",
  FOLLOW_UP:       "bg-cyan-50 text-cyan-700",
  DEMO_SCHEDULED:  "bg-violet-50 text-violet-700",
  DEMO_COMPLETED:  "bg-indigo-50 text-indigo-700",
  TRIAL_CREATED:   "bg-amber-50 text-amber-700",
  NEGOTIATION:     "bg-orange-50 text-orange-700",
  PAYMENT_PENDING: "bg-rose-50 text-rose-700",
  WON:             "bg-emerald-100 text-emerald-800",
  LOST:            "bg-red-100 text-red-700",
  ON_HOLD:         "bg-gray-200 text-gray-600",
};

const SCORE_COLORS: Record<string, string> = {
  COLD:           "bg-blue-50 text-blue-700 border-blue-100",
  WARM:           "bg-amber-50 text-amber-700 border-amber-100",
  HOT:            "bg-orange-50 text-orange-700 border-orange-100",
  READY_TO_CLOSE: "bg-emerald-50 text-emerald-800 border-emerald-100",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmLeadsPage() {
  const { accessToken, user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [teamUsers, setTeamUsers] = useState<InternalUserItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);

  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>("ALL");
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inline expandable sections (replace modals)
  const [activeSection, setActiveSection] = useState<"followup" | "demo" | "convert" | null>(null);

  // Form states
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "CALL", notes: "", followUpDate: "" });
  const [demoForm, setDemoForm] = useState({ date: "", type: "Online", attendees: "", notes: "", outcome: "INTERESTED" });
  const [convertForm, setConvertForm] = useState({
    subdomain: "", adminName: "", adminIdentifier: "", adminPassword: "", amountPaid: 12000, commissionPercentage: 20
  });
  const [newLeadForm, setNewLeadForm] = useState({
    name: "", type: "Samastha", districtId: "", district: "", place: "",
    studentCount: 150, teacherCount: 8, source: "WHATSAPP",
    contactName: "", contactPhone: "", contactRole: "Sadr Usthad",
    commissionPercentage: 20,
    contributors: [{ userId: "", percentage: 20 }]
  });

  const isSuperOrManager = ["SUPER_ADMIN", "SALES_MANAGER"].includes(user?.actorType ?? "");
  const canDelete = ["SUPER_ADMIN", "SALES_MANAGER"].includes(user?.actorType ?? "");

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [list, dList] = await Promise.all([
        listLeads(accessToken, { search }),
        listDistricts(accessToken),
      ]);
      setLeads(list);
      setDistricts(dList);
      if (isSuperOrManager) {
        const users = await listInternalUsers(accessToken);
        setTeamUsers(users);
        if (users.length > 0 && !newLeadForm.contributors[0].userId) {
          setNewLeadForm(prev => ({
            ...prev,
            contributors: [{ userId: user?.id || users[0].id, percentage: prev.commissionPercentage }]
          }));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadDetail = async (id: string) => {
    if (!accessToken) return;
    setDetailLoading(true);
    try {
      const detail = await getLead(id, accessToken);
      setSelectedLead(detail);
      // Pre-fill convert form from lead data
      setConvertForm(prev => ({
        ...prev,
        subdomain: detail.name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15),
        adminName: detail.contacts[0]?.name || "",
        adminIdentifier: detail.contacts[0]?.phone || "",
        adminPassword: `admin_${Math.random().toString(36).substring(2, 8)}`,
        commissionPercentage: detail.commissionPercentage ?? 20,
      }));
    } catch (e) {
      setError("Could not load lead: " + (e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [accessToken, search]); // eslint-disable-line

  // Read ?id= query param on mount to auto-open lead
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && idParam !== selectedLeadId) {
      setSelectedLeadId(idParam);
      setShowMobileDetail(true);
    }
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    if (selectedLeadId) loadLeadDetail(selectedLeadId);
    else setSelectedLead(null);
  }, [selectedLeadId]); // eslint-disable-line

  const selectLead = (id: string) => {
    setSelectedLeadId(id);
    setActiveSection(null);
    setShowMobileDetail(true);
    setSearchParams({ id });
  };

  const closeLead = () => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setShowMobileDetail(false);
    setActiveSection(null);
    setSearchParams({});
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const toast = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccessMsg(msg);
    setTimeout(() => { setError(null); setSuccessMsg(null); }, 4000);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setActionLoading(true);
    try {
      const contributors = newLeadForm.contributors.filter(c => c.userId);
      if (contributors.length > 0) {
        const total = contributors.reduce((s, c) => s + Number(c.percentage), 0);
        if (Math.abs(total - newLeadForm.commissionPercentage) > 0.01) {
          toast(`Attribution split must total exactly ${newLeadForm.commissionPercentage}%. Currently: ${total}%`, true);
          return;
        }
      }
      await createLead({
        name: newLeadForm.name, type: newLeadForm.type,
        district: newLeadForm.district, districtId: newLeadForm.districtId || undefined,
        place: newLeadForm.place, source: newLeadForm.source as any,
        studentCount: Number(newLeadForm.studentCount), teacherCount: Number(newLeadForm.teacherCount),
        commissionPercentage: Number(newLeadForm.commissionPercentage),
        contacts: [{
          name: newLeadForm.contactName, phone: newLeadForm.contactPhone,
          role: newLeadForm.contactRole, isPrimary: true
        }],
        contributors,
      } as any, accessToken);
      setShowAddDrawer(false);
      setNewLeadForm(prev => ({
        ...prev, name: "", place: "", contactName: "", contactPhone: "",
        districtId: "", district: ""
      }));
      toast("Lead created successfully!");
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedLeadId) return;
    setActionLoading(true);
    try {
      const result: any = await logActivity(selectedLeadId, {
        type: activityForm.type,
        notes: activityForm.notes,
        followUpDate: activityForm.followUpDate || undefined,
      }, accessToken);
      setActivityForm({ type: "CALL", notes: "", followUpDate: "" });
      setActiveSection(null);
      // Show what stage it advanced to
      const newStatus = result?.newStatus;
      toast(newStatus && newStatus !== selectedLead?.status
        ? `Follow-up logged! Stage advanced to: ${newStatus.replace(/_/g, " ")}`
        : "Follow-up logged successfully!"
      );
      loadLeadDetail(selectedLeadId);
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleLogDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedLeadId) return;
    setActionLoading(true);
    try {
      await scheduleDemo(selectedLeadId, {
        date: demoForm.date,
        type: demoForm.type,
        attendees: demoForm.attendees.split(",").map(a => a.trim()).filter(Boolean),
        notes: demoForm.notes || undefined,
        outcome: demoForm.outcome as any,
      }, accessToken);
      setDemoForm({ date: "", type: "Online", attendees: "", notes: "", outcome: "INTERESTED" });
      setActiveSection(null);
      toast("Demo logged! Stage auto-updated.");
      loadLeadDetail(selectedLeadId);
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleProvisionTrial = async () => {
    if (!accessToken || !selectedLeadId) return;
    setActionLoading(true);
    try {
      const info = await provisionTrial(selectedLeadId, accessToken);
      toast(`Trial ready! Login: ${info.loginPhone || info.loginEmail} / Password: ${info.password}. Subdomain: ${info.subdomain}`);
      loadLeadDetail(selectedLeadId);
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedLeadId) return;
    setActionLoading(true);
    try {
      await convertLead(selectedLeadId, convertForm, accessToken);
      setActiveSection(null);
      toast("🎉 Lead converted to paying client! Commissions split & recorded.");
      loadLeadDetail(selectedLeadId);
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleUpdateStage = async (newStatus: string) => {
    if (!accessToken || !selectedLeadId) return;
    setActionLoading(true);
    try {
      await updateLead(selectedLeadId, { status: newStatus as any }, accessToken);
      toast(`Stage → ${newStatus.replace(/_/g, " ")}`);
      loadLeadDetail(selectedLeadId);
      loadData();
    } catch (e) { toast((e as Error).message, true); }
    finally { setActionLoading(false); }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Delete this lead permanently?") || !accessToken) return;
    try {
      await deleteLead(id, accessToken);
      toast("Lead deleted.");
      closeLead();
      loadData();
    } catch (e) { toast((e as Error).message, true); }
  };

  // ─── Filtered leads ───────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l =>
    activeStage === "ALL" ? true : l.status === activeStage
  );

  // ─── Pipeline step index ──────────────────────────────────────────────────
  const getPipelineStep = (status: string) => {
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      if (PIPELINE_STEPS[i].statuses.includes(status)) return i;
    }
    return -1;
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderStatusBadge = (status: string) => (
    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500")}>
      {status.replace(/_/g, " ")}
    </span>
  );

  const renderScoreBadge = (score: string) => (
    <span className={cn("text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase", SCORE_COLORS[score] ?? "bg-gray-100 text-gray-500")}>
      {score}
    </span>
  );

  // ─── Lead Detail Content ──────────────────────────────────────────────────
  const renderDetailContent = () => {
    if (!selectedLead) return null;
    const lead = selectedLead;
    const isWon = lead.status === "WON";
    const currentStepIdx = getPipelineStep(lead.status);

    return (
      <div className="space-y-5">
        {/* ── Pipeline Progress Bar ── */}
        <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {PIPELINE_STEPS.map((step, i) => {
              const isActive = step.statuses.includes(lead.status);
              const isDone = i < currentStepIdx || (isWon && step.key === "won");
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateStage(step.statuses[0])}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all border",
                      isActive ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" :
                      isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                    )}
                  >
                    {isDone && !isActive ? <Check className="w-3 h-3 inline mr-1" /> : null}
                    {step.label}
                  </button>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          {/* Quick override select */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold shrink-0">Override Status:</span>
            <select
              value={lead.status}
              onChange={e => handleUpdateStage(e.target.value)}
              className="bg-white border border-gray-100 text-xs font-semibold py-1 px-2 rounded-lg focus:outline-none focus:border-emerald-600 text-gray-700 flex-1"
            >
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        {/* ── Quick Actions Bar ── */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === "followup" ? null : "followup")}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl border text-center gap-1.5 transition-all",
              activeSection === "followup"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
            )}
          >
            <Phone className="w-4 h-4" />
            <span className="text-[10px] font-bold">Log Follow-up</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === "demo" ? null : "demo")}
            disabled={isWon}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl border text-center gap-1.5 transition-all disabled:opacity-40",
              activeSection === "demo"
                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                : "bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-bold">Log Demo</span>
          </button>
          {!isWon && (
            <button
              type="button"
              onClick={handleProvisionTrial}
              disabled={actionLoading || lead.status === "TRIAL_CREATED"}
              className="flex flex-col items-center p-3 rounded-2xl border text-center gap-1.5 transition-all bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 disabled:opacity-40"
            >
              <Play className="w-4 h-4" />
              <span className="text-[10px] font-bold">
                {lead.status === "TRIAL_CREATED" ? "Trial Active" : "Launch Trial"}
              </span>
            </button>
          )}
          {isWon && (
            <div className="flex flex-col items-center p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold">Won ✓</span>
            </div>
          )}
        </div>

        {/* Convert button — full width, prominent */}
        {!isWon && (
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === "convert" ? null : "convert")}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border font-bold text-sm transition-all",
              activeSection === "convert"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
            )}
          >
            <DollarSign className="w-4 h-4" />
            Convert to Paying Client
          </button>
        )}

        {/* ── Inline: Follow-up Form ── */}
        <AnimatePresence>
          {activeSection === "followup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleLogActivity} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-blue-800">Log Follow-up / Contact</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Type</label>
                    <select
                      value={activityForm.type}
                      onChange={e => setActivityForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Schedule Follow-up</label>
                    <input
                      type="date"
                      value={activityForm.followUpDate}
                      onChange={e => setActivityForm(p => ({ ...p, followUpDate: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <textarea
                  required
                  rows={2}
                  value={activityForm.notes}
                  onChange={e => setActivityForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="What happened? Key discussion points, next steps..."
                  className="w-full bg-white border border-gray-100 text-xs p-3 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Follow-up
                  </button>
                  <button type="button" onClick={() => setActiveSection(null)}
                    className="px-4 bg-white border border-gray-100 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Inline: Demo Form ── */}
        <AnimatePresence>
          {activeSection === "demo" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleLogDemo} className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-violet-800">Log Demo Session</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Demo Date & Time</label>
                    <input type="datetime-local" required value={demoForm.date}
                      onChange={e => setDemoForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Mode</label>
                    <select value={demoForm.type} onChange={e => setDemoForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none">
                      <option value="Online">Online Call</option>
                      <option value="Site-Visit">Site Visit</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Outcome</label>
                  <select value={demoForm.outcome} onChange={e => setDemoForm(p => ({ ...p, outcome: e.target.value }))}
                    className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none focus:border-violet-500 font-semibold">
                    <option value="INTERESTED">✅ Interested — Moving Forward</option>
                    <option value="NEED_FOLLOW_UP">🔁 Needs Another Follow-up</option>
                    <option value="NEED_COMMITTEE_APPROVAL">📋 Needs Committee Approval</option>
                    <option value="TRIAL_REQUESTED">🧪 Requested Trial</option>
                    <option value="NOT_INTERESTED">❌ Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Attendees (comma-separated)</label>
                  <input type="text" value={demoForm.attendees}
                    onChange={e => setDemoForm(p => ({ ...p, attendees: e.target.value }))}
                    placeholder="Sadr Usthad, Secretary..."
                    className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none"
                  />
                </div>
                <textarea rows={2} value={demoForm.notes}
                  onChange={e => setDemoForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Key features shown, objections raised, client feedback..."
                  className="w-full bg-white border border-gray-100 text-xs p-3 rounded-xl focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Demo
                  </button>
                  <button type="button" onClick={() => setActiveSection(null)}
                    className="px-4 bg-white border border-gray-100 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Inline: Convert Form ── */}
        <AnimatePresence>
          {activeSection === "convert" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleConvertLead} className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black text-indigo-800">Convert to Paying Client</h4>
                <div>
                  <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Subdomain Slug</label>
                  <input required type="text" value={convertForm.subdomain}
                    onChange={e => setConvertForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))}
                    className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none font-mono"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">
                    Live URL: <span className="font-mono font-semibold">{convertForm.subdomain}.dashboard.smartmadrasa.app</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Admin Name</label>
                    <input type="text" value={convertForm.adminName}
                      onChange={e => setConvertForm(p => ({ ...p, adminName: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Login (Phone/Email)</label>
                    <input required type="text" value={convertForm.adminIdentifier}
                      onChange={e => setConvertForm(p => ({ ...p, adminIdentifier: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Password</label>
                    <input required type="text" value={convertForm.adminPassword}
                      onChange={e => setConvertForm(p => ({ ...p, adminPassword: e.target.value }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Amount Paid (₹)</label>
                    <input required type="number" value={convertForm.amountPaid}
                      onChange={e => setConvertForm(p => ({ ...p, amountPaid: Number(e.target.value) }))}
                      className="w-full bg-white border border-gray-100 text-xs py-2 px-2.5 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
                  <p className="font-bold mb-0.5">Commission Summary</p>
                  <p className="text-[10px]">
                    {convertForm.commissionPercentage}% of ₹{convertForm.amountPaid.toLocaleString()} = 
                    <strong> ₹{Math.round((convertForm.amountPaid * convertForm.commissionPercentage) / 100).toLocaleString()}</strong>
                    {" "}+ flat bonus — split across {lead.contributors.length} contributor(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5">
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    Activate & Split Commission
                  </button>
                  <button type="button" onClick={() => setActiveSection(null)}
                    className="px-4 bg-white border border-gray-100 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Trial Credentials (if trial is active) ── */}
        {lead.trialMonitoring && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> Trial Sandbox
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-xl p-2.5">
                <span className="block text-[9px] text-gray-400 uppercase font-bold">Health</span>
                <span className="font-black text-gray-800">{lead.trialMonitoring.healthScore}</span>
              </div>
              <div className="bg-white rounded-xl p-2.5">
                <span className="block text-[9px] text-gray-400 uppercase font-bold">Logins (7d)</span>
                <span className="font-black text-gray-800">{lead.trialMonitoring.loginFrequency}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Contacts ── */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Contacts
          </h3>
          {lead.contacts.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-xs py-1">
              <div>
                <p className="font-bold text-gray-800">{c.name}
                  <span className="ml-1.5 text-[9px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.role}</span>
                </p>
                <p className="text-gray-500 mt-0.5">{c.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(c.phone, c.phone)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                {copiedText === c.phone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>

        {/* ── Attribution Split ── */}
        {lead.contributors.length > 0 && (
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Commission Attribution
            </h3>
            <div className="space-y-1">
              {lead.contributors.map(c => (
                <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b border-emerald-100/50 last:border-0">
                  <div>
                    <span className="font-bold text-gray-800">{c.user?.name ?? "—"}</span>
                    <span className="ml-1.5 text-[9px] text-gray-400">{c.role.replace(/_/g, " ")}</span>
                  </div>
                  <span className="font-black text-emerald-800">{c.percentage}%</span>
                </div>
              ))}
              <p className="text-[9px] text-gray-400 pt-1">Total commission rate: {lead.commissionPercentage ?? 20}%</p>
            </div>
          </div>
        )}

        {/* ── Onboarding Checklist ── */}
        {lead.onboardingProject && (
          <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
              Onboarding — {Math.round(lead.onboardingProject.progress)}%
            </h3>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${lead.onboardingProject.progress}%` }} />
            </div>
            <div className="space-y-1 pt-1">
              {lead.onboardingProject.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs py-1">
                  <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                    item.status === "COMPLETED" ? "bg-emerald-500" : "border-2 border-gray-200"
                  )}>
                    {item.status === "COMPLETED" && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={cn("flex-1", item.status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-700")}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity Timeline ── */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Activity Timeline</h3>
          {lead.timeline.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No activity logged yet.</p>
          )}
          {lead.timeline.map(item => (
            <div key={item.id} className="flex gap-3 text-xs">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div className="w-px flex-1 bg-gray-100 mt-1" />
              </div>
              <div className="pb-3 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{item.type}</span>
                  <span className="text-[9px] text-gray-400">{new Date(item.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{item.notes}</p>
                {item.followUpDate && (
                  <p className="text-[9px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Follow-up: {new Date(item.followUpDate).toLocaleDateString()}
                  </p>
                )}
                <p className="text-[9px] text-gray-400 mt-0.5">by {item.user?.name ?? "System"}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            type="button"
            onClick={() => handleDeleteLead(lead.id)}
            className="w-full py-2.5 text-rose-600 border border-rose-100 rounded-2xl text-xs font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
          >
            <Trash className="w-3.5 h-3.5" /> Delete Lead
          </button>
        )}
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Leads Pipeline</h1>
            <p className="text-gray-400 text-xs mt-0.5">Manage client pipeline · {leads.length} total leads</p>
          </div>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {/* Toast messages */}
        <AnimatePresence>
          {(successMsg || error) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "rounded-2xl p-3.5 mb-4 text-sm flex items-start justify-between gap-3",
                error ? "bg-rose-50 border border-rose-200 text-rose-800" : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              )}
            >
              <span className="leading-snug">{error || successMsg}</span>
              <button onClick={() => { setError(null); setSuccessMsg(null); }} className="shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Stage Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, place, district..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {[{ key: "ALL", label: "All", count: leads.length }, ...LEAD_STATUSES.map(s => ({
              key: s, label: s.replace(/_/g, " "), count: leads.filter(l => l.status === s).length
            }))].map(item => (
              <button key={item.key} type="button"
                onClick={() => setActiveStage(item.key)}
                className={cn(
                  "shrink-0 px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5",
                  activeStage === item.key
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                )}
              >
                {item.label}
                <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                  activeStage === item.key ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-400"
                )}>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <p className="text-gray-400 text-xs">Loading leads...</p>
          </div>
        )}

        {/* Split Workspace */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Left — Lead List */}
            <div className={cn(
              "md:col-span-4 lg:col-span-4 flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm",
              "h-[75vh]"
            )}>
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  {activeStage === "ALL" ? "All Leads" : activeStage.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                  {filteredLeads.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {filteredLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
                    <p className="text-xs text-gray-400">No leads in this stage.</p>
                    <button onClick={() => setShowAddDrawer(true)}
                      className="text-[10px] font-bold text-emerald-600 hover:underline">+ Add a lead</button>
                  </div>
                )}
                {filteredLeads.map(l => {
                  const isSelected = selectedLeadId === l.id;
                  return (
                    <motion.div
                      key={l.id}
                      onClick={() => selectLead(l.id)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all space-y-2",
                        isSelected
                          ? "bg-emerald-50/40 border-emerald-400 shadow-sm"
                          : "bg-white border-gray-100 hover:border-emerald-300 hover:shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-800 truncate leading-tight">{l.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">{l.place}{l.district ? `, ${l.district}` : ""}</p>
                        </div>
                        {renderScoreBadge(l.score)}
                      </div>
                      <div className="flex items-center justify-between">
                        {renderStatusBadge(l.status)}
                        {l.nextFollowUpDate && (
                          <span className="text-[9px] text-amber-600 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(l.nextFollowUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right — Detail Workspace (desktop only) */}
            <div className="hidden md:flex md:col-span-8 lg:col-span-8 bg-white border border-gray-100 rounded-2xl shadow-sm h-[75vh] flex-col overflow-hidden">
              {selectedLeadId && detailLoading && (
                <div className="flex-1 flex items-center justify-center gap-2 flex-col">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <p className="text-xs text-gray-400">Loading lead details...</p>
                </div>
              )}
              {selectedLeadId && !detailLoading && selectedLead && (
                <>
                  {/* Detail header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-gray-50/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-gray-800">{selectedLead.name}</h2>
                        {renderStatusBadge(selectedLead.status)}
                        {renderScoreBadge(selectedLead.score)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {selectedLead.type} · {selectedLead.place}{selectedLead.district ? `, ${selectedLead.district}` : ""}
                        · {selectedLead.studentCount} students
                      </p>
                    </div>
                    <button onClick={closeLead} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-all shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                    {renderDetailContent()}
                  </div>
                </>
              )}
              {!selectedLeadId && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-gray-700">Select a Lead</h3>
                    <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                      Click any lead from the list to view contacts, log follow-ups, schedule demos, and track conversions.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2 border-t border-gray-100">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Active</p>
                      <p className="text-xl font-black text-gray-700">{leads.filter(l => !["WON","LOST"].includes(l.status)).length}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-[9px] text-emerald-700 uppercase font-bold">Won</p>
                      <p className="text-xl font-black text-emerald-800">{leads.filter(l => l.status === "WON").length}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl text-center">
                      <p className="text-[9px] text-rose-700 uppercase font-bold">Lost</p>
                      <p className="text-xl font-black text-rose-700">{leads.filter(l => l.status === "LOST").length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile Detail Drawer ── */}
        <AnimatePresence>
          {showMobileDetail && selectedLeadId && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={closeLead}
                className="fixed inset-0 bg-black z-40 md:hidden"
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 250 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 md:hidden"
                style={{ maxHeight: "90vh" }}
              >
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-0.5" />
                {detailLoading && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  </div>
                )}
                {!detailLoading && selectedLead && (
                  <div className="flex flex-col" style={{ maxHeight: "calc(90vh - 20px)" }}>
                    {/* Mobile header */}
                    <div className="px-5 pt-3 pb-3 border-b border-gray-100 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-sm font-black text-gray-800">{selectedLead.name}</h2>
                          {renderStatusBadge(selectedLead.status)}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {selectedLead.type} · {selectedLead.place} · {selectedLead.studentCount} students
                        </p>
                      </div>
                      <button onClick={closeLead} className="p-1.5 text-gray-400 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4">
                      {renderDetailContent()}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Add Lead Drawer ── */}
        <AnimatePresence>
          {showAddDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                onClick={() => setShowAddDrawer(false)}
                className="fixed inset-0 bg-black z-40"
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 250 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
              >
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h3 className="text-lg font-black text-gray-800">Add New Lead</h3>
                    <button onClick={() => setShowAddDrawer(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateLead} className="space-y-4">
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Madrasa Name *</label>
                      <input required type="text" value={newLeadForm.name}
                        onChange={e => setNewLeadForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Darul Uloom Kozhikode"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Syllabus Type</label>
                        <select value={newLeadForm.type} onChange={e => setNewLeadForm(p => ({ ...p, type: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none">
                          {["Samastha", "AP", "Fadhila", "Other"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Lead Source</label>
                        <select value={newLeadForm.source} onChange={e => setNewLeadForm(p => ({ ...p, source: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none">
                          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">District</label>
                        <select required value={newLeadForm.districtId}
                          onChange={e => {
                            const d = districts.find(d => d.id === e.target.value);
                            setNewLeadForm(p => ({ ...p, districtId: e.target.value, district: d?.name ?? "" }));
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none">
                          <option value="">Select District</option>
                          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Place *</label>
                        <input required type="text" value={newLeadForm.place}
                          onChange={e => setNewLeadForm(p => ({ ...p, place: e.target.value }))}
                          placeholder="Town / Village"
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Students</label>
                        <input type="number" value={newLeadForm.studentCount}
                          onChange={e => setNewLeadForm(p => ({ ...p, studentCount: Number(e.target.value) }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold">Teachers</label>
                        <input type="number" value={newLeadForm.teacherCount}
                          onChange={e => setNewLeadForm(p => ({ ...p, teacherCount: Number(e.target.value) }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Primary Contact */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-gray-600">Primary Contact Person</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1">Full Name *</label>
                          <input required type="text" value={newLeadForm.contactName}
                            onChange={e => setNewLeadForm(p => ({ ...p, contactName: e.target.value }))}
                            className="w-full bg-white border border-gray-100 rounded-lg p-2 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1">Phone *</label>
                          <input required type="tel" value={newLeadForm.contactPhone}
                            onChange={e => setNewLeadForm(p => ({ ...p, contactPhone: e.target.value }))}
                            className="w-full bg-white border border-gray-100 rounded-lg p-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-1">Role / Designation</label>
                        <select value={newLeadForm.contactRole}
                          onChange={e => setNewLeadForm(p => ({ ...p, contactRole: e.target.value }))}
                          className="w-full bg-white border border-gray-100 rounded-lg p-2 text-xs focus:outline-none">
                          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Attribution Split (managers only) */}
                    {isSuperOrManager && (
                      <div className="bg-emerald-50/50 p-4 rounded-2xl space-y-3 border border-emerald-100">
                        <h4 className="text-xs font-bold text-emerald-800">Attribution & Commission Split</h4>
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1">Total Commission Rate (%)</label>
                          <input type="number" value={newLeadForm.commissionPercentage} min={1} max={100}
                            onChange={e => setNewLeadForm(p => ({ ...p, commissionPercentage: Number(e.target.value) }))}
                            className="w-full bg-white border border-gray-100 rounded-lg p-2 text-xs focus:outline-none font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          {newLeadForm.contributors.map((c, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <select value={c.userId}
                                onChange={e => {
                                  const copy = [...newLeadForm.contributors];
                                  copy[idx].userId = e.target.value;
                                  setNewLeadForm(p => ({ ...p, contributors: copy }));
                                }}
                                className="bg-white border border-gray-100 text-xs p-2 rounded-lg flex-1 focus:outline-none"
                              >
                                <option value="">Select person...</option>
                                {teamUsers.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} — {u.role.replace(/_/g, " ")}
                                  </option>
                                ))}
                              </select>
                              <input type="number" value={c.percentage} min={0} max={100}
                                onChange={e => {
                                  const copy = [...newLeadForm.contributors];
                                  copy[idx].percentage = Number(e.target.value);
                                  setNewLeadForm(p => ({ ...p, contributors: copy }));
                                }}
                                placeholder="%"
                                className="w-16 bg-white border border-gray-100 text-xs p-2 rounded-lg font-bold text-center focus:outline-none"
                              />
                              {newLeadForm.contributors.length > 1 && (
                                <button type="button" onClick={() => setNewLeadForm(p => ({
                                  ...p, contributors: p.contributors.filter((_, i) => i !== idx)
                                }))} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Split total indicator */}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">Split total:</span>
                          <span className={cn(
                            "font-bold",
                            Math.abs(newLeadForm.contributors.reduce((s, c) => s + Number(c.percentage), 0) - newLeadForm.commissionPercentage) < 0.01
                              ? "text-emerald-700" : "text-rose-600"
                          )}>
                            {newLeadForm.contributors.reduce((s, c) => s + Number(c.percentage), 0)}% / {newLeadForm.commissionPercentage}%
                          </span>
                        </div>
                        {newLeadForm.contributors.length < 3 && (
                          <button type="button"
                            onClick={() => setNewLeadForm(p => ({ ...p, contributors: [...p.contributors, { userId: "", percentage: 0 }] }))}
                            className="text-[10px] font-bold text-emerald-600 hover:underline"
                          >
                            + Add Contributor
                          </button>
                        )}
                      </div>
                    )}

                    <button type="submit" disabled={actionLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Create Lead
                    </button>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
