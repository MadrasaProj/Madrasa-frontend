import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  logActivity,
  scheduleDemo,
  provisionTrial,
  convertLead,
  listDistricts,
  bulkImportLeads,
  updateActivity,
  deleteActivity,
  updateFollowUpDate,
  listInternalUsers,
  type LeadListItem,
  type LeadDetail,
  type DistrictItem,
  type BulkImportLeadItem,
  type InternalUserItem,
} from "@/lib/crm-api";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import { ImportModal, type ImportConfig } from "@/components/ui/ImportModal";
import {
  Plus,
  Search,
  Phone,
  MessageSquare,
  Play,
  CheckCircle,
  X,
  Loader2,
  DollarSign,
  Calendar,
  Users,
  Award,
  Trash,
  Clock,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Pencil,
  CalendarClock,
  Building2,
  Upload,
  Sparkles,
  Zap,
  TrendingUp,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Pipeline stage config ────────────────────────────────────────────────────
export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow-up",
  TRIAL_SHARED: "Trial Shared",
  OFFLINE_DEMO_SCHEDULED: "Demo Scheduled",
  OFFLINE_DEMO_COMPLETED: "Demo Completed",
  NEGOTIATION: "Negotiation",
  DATA_COLLECTION: "Data Collection",
  PAYMENT_PENDING: "Payment Pending",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On Hold",
  // Backward compatibility
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  TRIAL_CREATED: "Trial Shared",
};

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "TRIAL_SHARED",
  "OFFLINE_DEMO_SCHEDULED",
  "OFFLINE_DEMO_COMPLETED",
  "NEGOTIATION",
  "DATA_COLLECTION",
  "PAYMENT_PENDING",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

const PIPELINE_STEPS = [
  { key: "intake", label: "Contact & Interest", statuses: ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP"] },
  { key: "trial", label: "Trial Shared", statuses: ["TRIAL_SHARED", "TRIAL_CREATED"] },
  {
    key: "demo",
    label: "Demo Session",
    statuses: ["OFFLINE_DEMO_SCHEDULED", "OFFLINE_DEMO_COMPLETED", "DEMO_SCHEDULED", "DEMO_COMPLETED"],
  },
  { key: "closing", label: "Negotiation & Data", statuses: ["NEGOTIATION", "DATA_COLLECTION", "PAYMENT_PENDING"] },
  { key: "won", label: "Closed Won", statuses: ["WON"] },
];

const ACTIVITY_TYPES = [
  { value: "CALL", label: "📞 Phone Call" },
  { value: "WHATSAPP", label: "💬 WhatsApp Message" },
  { value: "MEETING", label: "🤝 Committee Meeting" },
  { value: "SITE_VISIT", label: "🏫 Campus / Site Visit" },
  { value: "PROPOSAL_SENT", label: "📄 Proposal / Quote Sent" },
];

const LEAD_SOURCES = [
  "REFERRAL",
  "WHATSAPP",
  "FACEBOOK",
  "WEBSITE",
  "DIRECT_VISIT",
  "WEBINAR",
  "CAMPAIGN",
  "COLD_OUTREACH",
  "EXISTING_CUSTOMER",
];

const CONTACT_ROLES = ["Sadr Usthad", "Secretary", "President", "Manager", "Muhtamim", "Other"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-800 border-slate-200",
  CONTACTED: "bg-blue-50 text-blue-800 border-blue-200",
  INTERESTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  FOLLOW_UP: "bg-cyan-50 text-cyan-800 border-cyan-200",
  TRIAL_SHARED: "bg-amber-50 text-amber-800 border-amber-200",
  OFFLINE_DEMO_SCHEDULED: "bg-violet-50 text-violet-800 border-violet-200",
  OFFLINE_DEMO_COMPLETED: "bg-indigo-50 text-indigo-800 border-indigo-200",
  NEGOTIATION: "bg-orange-50 text-orange-800 border-orange-200",
  DATA_COLLECTION: "bg-purple-50 text-purple-800 border-purple-200",
  PAYMENT_PENDING: "bg-rose-50 text-rose-800 border-rose-200",
  WON: "bg-emerald-100 text-emerald-900 border-emerald-300",
  LOST: "bg-red-50 text-red-800 border-red-200",
  ON_HOLD: "bg-gray-100 text-gray-700 border-gray-200",
  // Compatibility
  DEMO_SCHEDULED: "bg-violet-50 text-violet-800 border-violet-200",
  DEMO_COMPLETED: "bg-indigo-50 text-indigo-800 border-indigo-200",
  TRIAL_CREATED: "bg-amber-50 text-amber-800 border-amber-200",
};

const SCORE_COLORS: Record<string, string> = {
  COLD: "bg-slate-100 text-slate-700 border-slate-200",
  WARM: "bg-amber-50 text-amber-800 border-amber-200",
  HOT: "bg-orange-50 text-orange-800 border-orange-200",
  READY_TO_CLOSE: "bg-emerald-50 text-emerald-900 border-emerald-200",
};

export default function CrmLeadsPage() {
  const { accessToken, user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [teamUsers, setTeamUsers] = useState<InternalUserItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);

  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>("ALL");
  const [smartPreset, setSmartPreset] = useState<
    "ALL" | "OVERDUE" | "TODAY" | "HOT_WARM" | "ACTIVE_TRIALS" | "NO_FOLLOWUP"
  >("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"URGENT" | "NEWEST" | "STUDENTS" | "NAME">("URGENT");
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inline forms in lead detail
  const [activeSection, setActiveSection] = useState<"followup" | "demo" | "convert" | null>(null);

  // Drawers and modals
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editLeadSaving, setEditLeadSaving] = useState(false);

  // Forms
  const [activityForm, setActivityForm] = useState({ type: "CALL", notes: "", followUpDate: "" });
  const [demoForm, setDemoForm] = useState({
    date: "",
    type: "Online",
    attendees: "",
    notes: "",
    outcome: "INTERESTED",
  });
  const [convertForm, setConvertForm] = useState({
    subdomain: "",
    adminName: "",
    adminIdentifier: "",
    adminPassword: "",
    amountPaid: 12000,
    commissionPercentage: 20,
  });

  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    type: "Samastha",
    districtId: "",
    district: "",
    place: "",
    status: "NEW",
    studentCount: 150,
    teacherCount: 8,
    existingSoftware: "",
    source: "WHATSAPP",
    contactName: "",
    contactPhone: "",
    contactSecondaryPhone: "",
    contactRole: "",
    enableCommission: false,
    commissionPercentage: 20,
    contributors: [{ userId: "", percentage: 20 }],
  });

  const [editLeadForm, setEditLeadForm] = useState({
    name: "",
    type: "Samastha",
    districtId: "",
    district: "",
    place: "",
    address: "",
    studentCount: 0,
    teacherCount: 0,
    existingSoftware: "",
    source: "WHATSAPP",
    status: "NEW",
    commissionPercentage: 20,
    contactName: "",
    contactPhone: "",
    contactSecondaryPhone: "",
    contactRole: "",
  });

  // Timeline item editing
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [editTimelineForm, setEditTimelineForm] = useState<{
    type: string;
    notes: string;
    followUpDate: string;
  }>({ type: "CALL", notes: "", followUpDate: "" });
  const [timelineActionLoading, setTimelineActionLoading] = useState(false);

  // Follow-up quick picker
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);
  const [quickFollowUpDate, setQuickFollowUpDate] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [cardFollowUpPickerId, setCardFollowUpPickerId] = useState<string | null>(null);

  // Detail tab
  const [activeLeadTab, setActiveLeadTab] = useState<"activity" | "details" | "pipeline">("activity");

  const isSuperOrManager = ["SUPER_ADMIN", "SALES_MANAGER"].includes(user?.actorType ?? "");
  const canDelete = ["SUPER_ADMIN", "SALES_MANAGER"].includes(user?.actorType ?? "");

  const toast = (msg: string, isErr = false) => {
    if (isErr) setError(msg);
    else setSuccessMsg(msg);
    setTimeout(() => {
      setError(null);
      setSuccessMsg(null);
    }, 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadData = async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setLoading(true);
    try {
      const [list, dList] = await Promise.all([
        listLeads(accessToken, { search }),
        listDistricts(accessToken),
      ]);
      setLeads(list || []);
      setDistricts(dList || []);
      if (isSuperOrManager) {
        const users = await listInternalUsers(accessToken);
        setTeamUsers(users || []);
        if (users.length > 0 && !newLeadForm.contributors[0]?.userId) {
          setNewLeadForm((prev) => ({
            ...prev,
            contributors: [
              { userId: user?.id || users[0].id, percentage: prev.commissionPercentage },
            ],
          }));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadLeadDetail = async (id: string) => {
    if (!accessToken) return;
    setDetailLoading(true);
    try {
      const detail = await getLead(id, accessToken);
      setSelectedLead(detail);
      setConvertForm((prev) => ({
        ...prev,
        subdomain: detail.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 15),
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

  useEffect(() => {
    loadData();
  }, [accessToken, search]); // eslint-disable-line

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && idParam !== selectedLeadId) {
      setSelectedLeadId(idParam);
      setShowMobileDetail(true);
    }
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      const upper = filterParam.toUpperCase();
      if (["ALL", "OVERDUE", "TODAY", "HOT_WARM", "ACTIVE_TRIALS", "NO_FOLLOWUP"].includes(upper)) {
        setSmartPreset(upper as any);
      }
    }
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    if (selectedLeadId) loadLeadDetail(selectedLeadId);
    else setSelectedLead(null);
  }, [selectedLeadId]); // eslint-disable-line

  const selectLead = (id: string) => {
    setSelectedLeadId(id);
    setShowMobileDetail(true);
    setActiveSection(null);
    setShowFollowUpPicker(false);
  };

  const closeLead = () => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setShowMobileDetail(false);
  };

  const handleStartEditTimeline = (item: {
    id: string;
    type: string;
    notes: string;
    followUpDate?: string;
  }) => {
    setEditingTimelineId(item.id);
    setEditTimelineForm({
      type: item.type,
      notes: item.notes,
      followUpDate: item.followUpDate ? item.followUpDate.split("T")[0] : "",
    });
  };

  const handleSaveEditTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !editingTimelineId || !accessToken) return;
    setTimelineActionLoading(true);
    try {
      await updateActivity(
        selectedLead.id,
        editingTimelineId,
        {
          type: editTimelineForm.type,
          notes: editTimelineForm.notes.trim(),
          followUpDate: editTimelineForm.followUpDate ? editTimelineForm.followUpDate : null,
        },
        accessToken
      );
      toast("Interaction entry updated successfully!");
      setEditingTimelineId(null);
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setTimelineActionLoading(false);
    }
  };

  const handleDeleteTimeline = async (timelineId: string) => {
    if (!selectedLead || !accessToken) return;
    if (!window.confirm("Are you sure you want to delete this interaction log?")) return;
    setTimelineActionLoading(true);
    try {
      await deleteActivity(selectedLead.id, timelineId, accessToken);
      toast("Interaction log deleted.");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setTimelineActionLoading(false);
    }
  };

  const handleQuickUpdateFollowUp = async (newDate: string | null, targetLeadId?: string) => {
    const targetId = targetLeadId || selectedLead?.id;
    if (!targetId || !accessToken) return;
    setFollowUpSaving(true);
    try {
      await updateFollowUpDate(targetId, newDate, accessToken);
      toast(
        newDate
          ? `Next follow-up set for ${new Date(newDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
          : "Follow-up schedule cleared"
      );
      setShowFollowUpPicker(false);
      setCardFollowUpPickerId(null);
      if (selectedLead?.id === targetId) {
        await loadLeadDetail(targetId);
      }
      await loadData(true);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setFollowUpSaving(false);
    }
  };

  const handleStartEditLead = (lead: LeadDetail) => {
    const primaryContact = lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];
    setEditLeadForm({
      name: lead.name || "",
      type: lead.type || "Samastha",
      districtId: lead.district
        ? districts.find((d) => d.name.toLowerCase() === lead.district.toLowerCase())?.id || ""
        : "",
      district: lead.district || "",
      place: lead.place || "",
      address: lead.address || "",
      studentCount: lead.studentCount ?? 0,
      teacherCount: lead.teacherCount ?? 0,
      existingSoftware: lead.existingSoftware || "",
      source: lead.source || "WHATSAPP",
      status: lead.status || "NEW",
      commissionPercentage: lead.commissionPercentage ?? 20,
      contactName: primaryContact?.name || "",
      contactPhone: primaryContact?.phone || "",
      contactSecondaryPhone: primaryContact?.secondaryPhone || "",
      contactRole: primaryContact?.role || "",
    });
    setShowEditDrawer(true);
  };

  const handleSaveEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !accessToken) return;
    if (!editLeadForm.name.trim()) {
      toast("Madrasa name is required", true);
      return;
    }
    if (!editLeadForm.district.trim() && !editLeadForm.districtId) {
      toast("District is required", true);
      return;
    }

    setEditLeadSaving(true);
    try {
      const targetDist = editLeadForm.districtId
        ? districts.find((d) => d.id === editLeadForm.districtId)?.name || editLeadForm.district
        : editLeadForm.district;

      const contacts: any[] = [];
      if (
        editLeadForm.contactName.trim() ||
        editLeadForm.contactPhone.trim() ||
        editLeadForm.contactSecondaryPhone.trim()
      ) {
        contacts.push({
          name: editLeadForm.contactName.trim() || undefined,
          phone: editLeadForm.contactPhone.trim() || undefined,
          secondaryPhone: editLeadForm.contactSecondaryPhone.trim() || undefined,
          role: editLeadForm.contactRole.trim() || undefined,
          isPrimary: true,
        });
      }

      await updateLead(
        selectedLead.id,
        {
          name: editLeadForm.name.trim(),
          type: editLeadForm.type,
          district: targetDist.trim(),
          place: editLeadForm.place.trim(),
          address: editLeadForm.address.trim() || undefined,
          studentCount: Number(editLeadForm.studentCount) || 0,
          teacherCount: Number(editLeadForm.teacherCount) || 0,
          existingSoftware: editLeadForm.existingSoftware.trim() || undefined,
          source: editLeadForm.source as any,
          status: editLeadForm.status as any,
          commissionPercentage: Number(editLeadForm.commissionPercentage) || 0,
          contacts,
        },
        accessToken
      );

      toast("Lead details updated successfully!");
      setShowEditDrawer(false);
      loadLeadDetail(selectedLead.id);
      loadData();
    } catch (err: any) {
      toast((err as Error).message || "Failed to update lead", true);
    } finally {
      setEditLeadSaving(false);
    }
  };

  // Bulk import configuration
  const importConfig: ImportConfig<BulkImportLeadItem> = useMemo(() => {
    return {
      entityName: "Contacts / Leads",
      templateFilename: "crm-contacts-template",
      columns: [
        {
          header: "Madrasa Name",
          field: "name",
          required: false,
          example: "Darul Huda Islamic Academy",
          validate: (val, row) => {
            if (!val && !row.contactName) {
              return "Either Madrasa Name or Contact Name must be provided";
            }
            return null;
          },
        },
        {
          header: "District",
          field: "district",
          required: true,
          example: "Malappuram",
          validate: (val) => (!val || !String(val).trim() ? "District is required" : null),
        },
        { header: "Place / Town", field: "place", required: false, example: "Chemmad" },
        { header: "Primary Contact Person", field: "contactName", required: false, example: "Usthad Ahmad Kabeer" },
        { header: "Primary Phone", field: "contactPhone", required: false, example: "9876543210" },
        { header: "Secondary / Alt Number", field: "secondaryPhone", required: false, example: "9876543211" },
        { header: "Role / Designation", field: "contactRole", required: false, example: "Sadr Usthad" },
        {
          header: "Status",
          field: "status",
          required: false,
          example: "New",
          parse: (raw) => {
            if (!raw) return "NEW";
            const normalized = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");
            for (const [key, label] of Object.entries(LEAD_STATUS_LABELS)) {
              if (
                key === normalized ||
                label.toUpperCase().replace(/[\s-]+/g, "_") === normalized
              ) {
                return key;
              }
            }
            return normalized;
          },
        },
        { header: "Syllabus Type", field: "type", required: false, example: "Samastha" },
        {
          header: "Student Count",
          field: "studentCount",
          required: false,
          example: "180",
          parse: (raw) => (raw ? parseInt(String(raw), 10) || 0 : 0),
        },
        {
          header: "Teacher Count",
          field: "teacherCount",
          required: false,
          example: "12",
          parse: (raw) => (raw ? parseInt(String(raw), 10) || 0 : 0),
        },
        {
          header: "Commission %",
          field: "commissionPercentage",
          required: false,
          example: "20",
          parse: (raw) => (raw ? parseFloat(String(raw)) || 0 : 0),
        },
      ],
      templateSamples: [
        {
          "Madrasa Name": "Darul Uloom Central Madrasa",
          District: "Kozhikode",
          "Place / Town": "Koduvally",
          "Primary Contact Person": "Usthad Abdul Hameed",
          "Primary Phone": "9447123456",
          "Secondary / Alt Number": "9847654321",
          "Role / Designation": "Sadr Usthad",
          Status: "New",
          "Syllabus Type": "Samastha",
          "Student Count": "220",
          "Teacher Count": "14",
          "Commission %": "20",
        },
        {
          "Madrasa Name": "Al-Manar Public Madrasa",
          District: "Malappuram",
          "Place / Town": "Manjeri",
          "Primary Contact Person": "K. Mohammed Ali",
          "Primary Phone": "9895012345",
          "Secondary / Alt Number": "9895987654",
          "Role / Designation": "Secretary",
          Status: "Interested",
          "Syllabus Type": "AP",
          "Student Count": "150",
          "Teacher Count": "8",
          "Commission %": "0",
        },
      ],
      createRow: async (row) => bulkImportLeads([row], accessToken!),
      createBulk: async (rows) => bulkImportLeads(rows, accessToken!),
    };
  }, [accessToken]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) {
      toast("Madrasa name is required", true);
      return;
    }
    if (!newLeadForm.district.trim()) {
      toast("District is required", true);
      return;
    }

    if (newLeadForm.enableCommission) {
      const splitTotal = newLeadForm.contributors.reduce(
        (sum, c) => sum + Number(c.percentage),
        0
      );
      if (Math.abs(splitTotal - newLeadForm.commissionPercentage) > 0.01) {
        toast(
          `Contributor split total (${splitTotal}%) must equal the Commission percentage (${newLeadForm.commissionPercentage}%).`,
          true
        );
        return;
      }
    }

    setActionLoading(true);
    try {
      const contacts = [];
      if (newLeadForm.contactName || newLeadForm.contactPhone || newLeadForm.contactSecondaryPhone) {
        contacts.push({
          name: newLeadForm.contactName || undefined,
          phone: newLeadForm.contactPhone || undefined,
          secondaryPhone: newLeadForm.contactSecondaryPhone || undefined,
          role: newLeadForm.contactRole || undefined,
          isPrimary: true,
        });
      }

      const contributors = newLeadForm.enableCommission
        ? newLeadForm.contributors
            .filter((c) => c.userId && c.percentage > 0)
            .map((c) => ({
              userId: c.userId,
              percentage: Number(c.percentage),
              role: "Commission Split",
            }))
        : [];

      const created = await createLead(
        {
          name: newLeadForm.name.trim(),
          type: newLeadForm.type,
          district: newLeadForm.district.trim(),
          place: newLeadForm.place.trim(),
          status: newLeadForm.status as any,
          studentCount: Number(newLeadForm.studentCount) || 0,
          teacherCount: Number(newLeadForm.teacherCount) || 0,
          existingSoftware: newLeadForm.existingSoftware.trim() || undefined,
          source: newLeadForm.source as any,
          commissionPercentage: newLeadForm.enableCommission
            ? Number(newLeadForm.commissionPercentage)
            : 0,
          contacts,
          contributors,
        },
        accessToken!
      );

      toast("Lead added to pipeline successfully!");
      setShowAddDrawer(false);
      setNewLeadForm({
        name: "",
        type: "Samastha",
        districtId: "",
        district: "",
        place: "",
        status: "NEW",
        studentCount: 150,
        teacherCount: 8,
        existingSoftware: "",
        source: "WHATSAPP",
        contactName: "",
        contactPhone: "",
        contactSecondaryPhone: "",
        contactRole: "",
        enableCommission: false,
        commissionPercentage: 20,
        contributors: [{ userId: user?.id || teamUsers[0]?.id || "", percentage: 20 }],
      });
      loadData();
      selectLead(created.id);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityForm.notes.trim()) return;
    setActionLoading(true);
    try {
      await logActivity(
        selectedLead.id,
        {
          type: activityForm.type,
          notes: activityForm.notes.trim(),
          followUpDate: activityForm.followUpDate || undefined,
        },
        accessToken!
      );
      toast("Interaction logged successfully!");
      setActivityForm({ type: "CALL", notes: "", followUpDate: "" });
      setActiveSection(null);
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !demoForm.date) return;
    setActionLoading(true);
    try {
      await scheduleDemo(
        selectedLead.id,
        {
          date: demoForm.date,
          type: demoForm.type,
          attendees: demoForm.attendees
            ? demoForm.attendees.split(",").map((a) => a.trim())
            : [],
          notes: demoForm.notes || undefined,
          outcome: demoForm.outcome,
        },
        accessToken!
      );
      toast("Demo session recorded!");
      setDemoForm({
        date: "",
        type: "Online",
        attendees: "",
        notes: "",
        outcome: "INTERESTED",
      });
      setActiveSection(null);
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProvisionTrial = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await provisionTrial(selectedLead.id, accessToken!);
      toast("Trial workspace successfully created and activated!");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !convertForm.subdomain || !convertForm.adminIdentifier) return;
    setActionLoading(true);
    try {
      await convertLead(selectedLead.id, convertForm, accessToken!);
      toast("🎉 Madrasa converted to active paying subscription!");
      setActiveSection(null);
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStage = async (newStatus: string, targetLeadId?: string) => {
    const leadId = targetLeadId || selectedLead?.id;
    if (!leadId || !accessToken) return;
    setActionLoading(true);
    try {
      await updateLead(leadId, { status: newStatus as any }, accessToken);
      toast(`Lead moved to ${LEAD_STATUS_LABELS[newStatus] ?? newStatus}`);
      if (selectedLead?.id === leadId) {
        await loadLeadDetail(leadId);
      }
      await loadData(true);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this lead?")) return;
    try {
      await deleteLead(id, accessToken!);
      toast("Lead deleted successfully.");
      closeLead();
      loadData();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    districts.forEach((d) => set.add(d.name));
    leads.forEach((l) => {
      if (l.district) set.add(l.district);
    });
    return Array.from(set).sort();
  }, [districts, leads]);

  const smartCounts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let overdue = 0;
    let today = 0;
    let hotWarm = 0;
    let activeTrials = 0;
    let noFollowup = 0;

    for (const l of leads) {
      if (l.score === "HOT" || l.score === "WARM") hotWarm++;
      if (l.status === "TRIAL_SHARED" || l.status === "TRIAL_CREATED" || l.status.includes("TRIAL"))
        activeTrials++;

      if (l.status !== "WON" && l.status !== "LOST") {
        if (!l.nextFollowUpDate) {
          noFollowup++;
        } else {
          const d = new Date(l.nextFollowUpDate);
          d.setHours(0, 0, 0, 0);
          const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) overdue++;
          else if (diff === 0) today++;
        }
      }
    }

    return {
      all: leads.length,
      overdue,
      today,
      hotWarm,
      activeTrials,
      noFollowup,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return leads
      .filter((l) => {
        if (activeStage !== "ALL" && l.status !== activeStage) return false;

        if (selectedDistrict !== "ALL") {
          const dName = l.district || "";
          if (dName.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
        }

        if (smartPreset === "OVERDUE") {
          if (l.status === "WON" || l.status === "LOST" || !l.nextFollowUpDate) return false;
          const d = new Date(l.nextFollowUpDate);
          d.setHours(0, 0, 0, 0);
          return d.getTime() < now.getTime();
        }
        if (smartPreset === "TODAY") {
          if (l.status === "WON" || l.status === "LOST" || !l.nextFollowUpDate) return false;
          const d = new Date(l.nextFollowUpDate);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === now.getTime();
        }
        if (smartPreset === "HOT_WARM") {
          return l.score === "HOT" || l.score === "WARM";
        }
        if (smartPreset === "ACTIVE_TRIALS") {
          return (
            l.status === "TRIAL_SHARED" ||
            l.status === "TRIAL_CREATED" ||
            l.status.includes("TRIAL")
          );
        }
        if (smartPreset === "NO_FOLLOWUP") {
          return !l.nextFollowUpDate && l.status !== "WON" && l.status !== "LOST";
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "URGENT") {
          const isAClosed = a.status === "WON" || a.status === "LOST";
          const isBClosed = b.status === "WON" || b.status === "LOST";
          if (isAClosed && !isBClosed) return 1;
          if (!isAClosed && isBClosed) return -1;

          const dateA = a.nextFollowUpDate ? new Date(a.nextFollowUpDate).getTime() : Infinity;
          const dateB = b.nextFollowUpDate ? new Date(b.nextFollowUpDate).getTime() : Infinity;
          return dateA - dateB;
        }
        if (sortBy === "NEWEST") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "STUDENTS") {
          return (b.studentCount || 0) - (a.studentCount || 0);
        }
        if (sortBy === "NAME") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [leads, activeStage, selectedDistrict, smartPreset, sortBy]);

  const getSmartSuggestion = (lead: LeadDetail) => {
    const isWon = lead.status === "WON";
    const isLost = lead.status === "LOST";
    const nextDate = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate) : null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let diffDays: number | null = null;
    if (nextDate) {
      const nextZero = new Date(nextDate);
      nextZero.setHours(0, 0, 0, 0);
      diffDays = Math.round((nextZero.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (isWon) {
      return {
        tone: "positive" as const,
        title: "Successfully Converted & Active",
        actionLabel: "View Madrasa Portal",
        badge: "Closed Won",
        description: "Ensure teacher rosters and class divisions are configured. Check initial attendance.",
        onAction: () => navigate(`/admin/madrasas?search=${encodeURIComponent(lead.name)}`),
      };
    }

    if (isLost) {
      return {
        tone: "neutral" as const,
        title: "Deal Closed / Inactive",
        actionLabel: "Re-engage Prospect",
        badge: "Lost",
        description: "Schedule a 30-day touchpoint or send syllabus exam updates to revive interest.",
        onAction: () => setActiveSection("followup"),
      };
    }

    if (diffDays !== null && diffDays < 0) {
      return {
        tone: "critical" as const,
        title: `Follow-up Overdue (${Math.abs(diffDays)}d delayed)`,
        actionLabel: "Log Call / Update",
        badge: "Urgent Priority",
        description: "Prospect is cooling down. Reach out via call or WhatsApp immediately to keep interest active.",
        onAction: () => setActiveSection("followup"),
      };
    }

    if (diffDays !== null && diffDays === 0) {
      return {
        tone: "urgent" as const,
        title: "Action Scheduled for Today",
        actionLabel: "Log Outcome",
        badge: "Due Today",
        description: "Scheduled discussion planned for today. Complete call and record next steps.",
        onAction: () => setActiveSection("followup"),
      };
    }

    if (lead.score === "HOT" || lead.score === "READY_TO_CLOSE") {
      return {
        tone: "high_intent" as const,
        title: "High Intent Deal (Hot)",
        actionLabel: "Launch Demo / Convert",
        badge: "High Intent",
        description: "Prospect shows strong buying signals. Propose a product demo or subscription setup.",
        onAction: () => setActiveSection("convert"),
      };
    }

    if (!lead.nextFollowUpDate) {
      return {
        tone: "warning" as const,
        title: "No Next Follow-up Scheduled",
        actionLabel: "Schedule Follow-up",
        badge: "Needs Schedule",
        description: "Deals without next dates get lost. Set a target date for the next touchpoint.",
        onAction: () => setShowFollowUpPicker(true),
      };
    }

    return {
      tone: "neutral" as const,
      title: "Pipeline On Track",
      actionLabel: "Log Interaction",
      badge: "In Progress",
      description: `Next outreach scheduled for ${nextDate ? nextDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "future"}.`,
      onAction: () => setActiveSection("followup"),
    };
  };

  const getFollowUpStatus = (dateStr?: string) => {
    if (!dateStr) return { label: "No Date Set", urgency: "none", badgeClass: "bg-gray-100 text-gray-600 border-gray-200" };
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue ${Math.abs(diffDays)}d`,
        urgency: "overdue",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200 font-bold",
      };
    }
    if (diffDays === 0) {
      return {
        label: "Due Today",
        urgency: "today",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
      };
    }
    if (diffDays === 1) {
      return {
        label: "Tomorrow",
        urgency: "upcoming",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    }
    return {
      label: `In ${diffDays} days`,
      urgency: "upcoming",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  const renderStatusBadge = (status: string) => (
    <span
      className={cn(
        "text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-block",
        STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-200"
      )}
    >
      {LEAD_STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );

  const renderScoreBadge = (score: string) => (
    <span
      className={cn(
        "text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-flex items-center gap-1",
        SCORE_COLORS[score] || "bg-gray-100 text-gray-700 border-gray-200"
      )}
    >
      {score === "HOT" && "🔥"}
      {score === "WARM" && "⚡"}
      {score === "COLD" && "❄️"}
      {score || "COLD"}
    </span>
  );

  // ── Render Detail View Content (Desktop right pane & Mobile Sheet) ─────────
  const renderDetailContent = () => {
    if (!selectedLead) return null;
    const lead = selectedLead;
    const isWon = lead.status === "WON";
    const currentStepIdx = PIPELINE_STEPS.findIndex((s) => s.statuses.includes(lead.status));
    const latestActivity = lead.timeline && lead.timeline.length > 0 ? lead.timeline[0] : null;
    const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate);
    const primaryContact = lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];

    const cleanPrimaryPhone = primaryContact?.phone?.replace(/[^0-9]/g, "") || "";
    const waPrimaryPhone =
      cleanPrimaryPhone.length === 10 ? `91${cleanPrimaryPhone}` : cleanPrimaryPhone;

    const cleanAltPhone = primaryContact?.secondaryPhone?.replace(/[^0-9]/g, "") || "";
    const waAltPhone = cleanAltPhone.length === 10 ? `91${cleanAltPhone}` : cleanAltPhone;

    return (
      <div className="space-y-5 pb-8">
        {/* ── Institutional Header & Stage Stepper ── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {lead.name}
                </h2>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                  {lead.type || "Madrasa"}
                </span>
                {lead.place && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                    📍 {lead.place}
                    {lead.district ? `, ${lead.district}` : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200/90 rounded-xl px-3 py-1.5 shadow-2xs min-h-[40px]">
                <span className="text-xs uppercase font-bold text-gray-500">Stage:</span>
                <select
                  value={lead.status}
                  onChange={(e) => handleUpdateStage(e.target.value, lead.id)}
                  disabled={actionLoading}
                  className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              {renderScoreBadge(lead.score)}

              <button
                type="button"
                onClick={() => handleStartEditLead(lead)}
                className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
                title="Edit Lead Details"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Lead</span>
              </button>
            </div>
          </div>

          {/* Pipeline Stepper */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
              Pipeline Stage:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = step.statuses.includes(lead.status);
                const isDone = i < currentStepIdx || (isWon && step.key === "won");
                return (
                  <div key={step.key} className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateStage(step.statuses[0])}
                      className={cn(
                        "min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all border shrink-0 flex items-center gap-1.5",
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : isDone
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {isDone && !isActive && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {step.label}
                    </button>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Stage Override Selector */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider shrink-0">
                Direct Stage:
              </span>
              <select
                value={lead.status}
                onChange={(e) => handleUpdateStage(e.target.value, lead.id)}
                disabled={actionLoading}
                className="min-h-[40px] text-xs sm:text-sm font-semibold bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer hover:bg-gray-50 transition-all"
                title="Change pipeline stage directly"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Strip for Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {/* Box 1: Primary Contact */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
              <span className="text-xs uppercase font-bold text-gray-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Primary Contact
              </span>
              {primaryContact ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {primaryContact.name || "Name not specified"}
                    </p>
                    {primaryContact.role && (
                      <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                        {primaryContact.role}
                      </span>
                    )}
                  </div>

                  {primaryContact.phone ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs sm:text-sm text-gray-900">
                        {primaryContact.phone}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${primaryContact.phone}`}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                          title="Call Phone"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${waPrimaryPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(primaryContact.phone!, primaryContact.phone!)}
                          className="p-2 text-gray-400 hover:text-gray-700"
                          title="Copy phone"
                        >
                          {copiedText === primaryContact.phone ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">No primary phone recorded</p>
                  )}

                  {primaryContact.secondaryPhone && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Alt Phone:</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-gray-800">
                          {primaryContact.secondaryPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${primaryContact.secondaryPhone}`}
                          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-all active:scale-95"
                          title="Call Alt Phone"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${waAltPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-200 transition-all active:scale-95"
                          title="WhatsApp Alt Phone"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(primaryContact.secondaryPhone!, primaryContact.secondaryPhone!)}
                          className="p-1.5 text-gray-400 hover:text-gray-700"
                          title="Copy alt phone"
                        >
                          {copiedText === primaryContact.secondaryPhone ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No contacts added yet</p>
              )}
            </div>

            {/* Box 2: Institutional Size */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
              <span className="text-xs uppercase font-bold text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Institution Profile
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="bg-white rounded-xl p-2 border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Students</span>
                  <span className="text-sm font-black text-gray-900">{lead.studentCount || "—"}</span>
                </div>
                <div className="bg-white rounded-xl p-2 border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Teachers</span>
                  <span className="text-sm font-black text-gray-900">{lead.teacherCount || "—"}</span>
                </div>
                <div className="bg-white rounded-xl p-2 border border-gray-200/80 truncate">
                  <span className="block text-xs uppercase font-bold text-gray-400">Software</span>
                  <span className="text-xs font-bold text-gray-700 truncate block">
                    {lead.existingSoftware ? lead.existingSoftware.substring(0, 8) : "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 3: Next Follow-up Schedule */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Next Follow-up
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowFollowUpPicker(!showFollowUpPicker);
                    setQuickFollowUpDate(
                      lead.nextFollowUpDate ? lead.nextFollowUpDate.split("T")[0] : ""
                    );
                  }}
                  className="min-h-[36px] text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>{lead.nextFollowUpDate ? "Change Date" : "+ Set Date"}</span>
                </button>
              </div>

              <div>
                <span
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border inline-flex items-center gap-2 w-full justify-between font-bold",
                    followUpStatus.badgeClass
                  )}
                >
                  <span className="truncate">{followUpStatus.label}</span>
                  {followUpStatus.urgency === "overdue" && (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  {followUpStatus.urgency === "today" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  )}
                  {followUpStatus.urgency === "upcoming" && (
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Inline Follow-up Date Picker Popover */}
          <AnimatePresence>
            {showFollowUpPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4 text-emerald-600" /> Update Next Follow-up Date
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFollowUpPicker(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "Today", days: 0 },
                      { label: "Tomorrow", days: 1 },
                      { label: "In 3 Days", days: 3 },
                      { label: "Next Week", days: 7 },
                      { label: "In 2 Weeks", days: 14 },
                    ].map((preset) => {
                      const target = new Date();
                      target.setDate(target.getDate() + preset.days);
                      const isoDate = target.toISOString().split("T")[0];
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={followUpSaving}
                          onClick={() => {
                            setQuickFollowUpDate(isoDate);
                            handleQuickUpdateFollowUp(isoDate);
                          }}
                          className={cn(
                            "min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 disabled:opacity-50",
                            quickFollowUpDate === isoDate
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}

                    {lead.nextFollowUpDate && (
                      <button
                        type="button"
                        onClick={() => handleQuickUpdateFollowUp(null)}
                        disabled={followUpSaving}
                        className="min-h-[38px] px-3 py-1 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-all ml-auto"
                      >
                        Clear Schedule
                      </button>
                    )}
                  </div>

                  {/* Custom Date Input & Submit */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="date"
                      value={quickFollowUpDate}
                      onChange={(e) => setQuickFollowUpDate(e.target.value)}
                      className="min-h-[44px] flex-1 bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:border-emerald-600 font-semibold"
                    />
                    <button
                      type="button"
                      disabled={followUpSaving || !quickFollowUpDate}
                      onClick={() => handleQuickUpdateFollowUp(quickFollowUpDate)}
                      className="min-h-[44px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                    >
                      {followUpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Date
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Tabs Navigation Bar ── */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveLeadTab("activity")}
            className={cn(
              "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2",
              activeLeadTab === "activity"
                ? "bg-white text-gray-900 shadow-xs font-black border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Activity &amp; Notes</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold">
              {lead.timeline?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeadTab("details")}
            className={cn(
              "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2",
              activeLeadTab === "details"
                ? "bg-white text-gray-900 shadow-xs font-black border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Institution Profile</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">
              {lead.contacts?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLeadTab("pipeline")}
            className={cn(
              "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2",
              activeLeadTab === "pipeline"
                ? "bg-white text-gray-900 shadow-xs font-black border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <span>Pipeline &amp; Setup</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: ACTIVITY & FOLLOW-UPS                                           */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeLeadTab === "activity" && (
          <div className="space-y-4">
            {/* AI Suggestion Banner */}
            {(() => {
              const suggestion = getSmartSuggestion(lead);
              const toneClasses = {
                critical: "bg-rose-50 border-rose-200 text-rose-900",
                urgent: "bg-amber-50 border-amber-200 text-amber-900",
                high_intent: "bg-violet-50 border-violet-200 text-violet-900",
                warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
                positive: "bg-emerald-50 border-emerald-200 text-emerald-900",
                neutral: "bg-blue-50 border-blue-200 text-blue-900",
              }[suggestion.tone];

              const toneBtn = {
                critical: "bg-rose-600 hover:bg-rose-700 text-white",
                urgent: "bg-amber-600 hover:bg-amber-700 text-white",
                high_intent: "bg-violet-600 hover:bg-violet-700 text-white",
                warning: "bg-amber-600 hover:bg-amber-700 text-white",
                positive: "bg-emerald-600 hover:bg-emerald-700 text-white",
                neutral: "bg-blue-600 hover:bg-blue-700 text-white",
              }[suggestion.tone];

              return (
                <div
                  className={cn(
                    "p-5 rounded-3xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all",
                    toneClasses
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs uppercase font-black tracking-wider text-gray-500">
                        Operational Intelligence
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-gray-200">
                        {suggestion.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-gray-900">{suggestion.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-700 max-w-xl leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={suggestion.onAction}
                    className={cn(
                      "min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all shadow-xs active:scale-95 flex items-center gap-2",
                      toneBtn
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    <span>{suggestion.actionLabel}</span>
                  </button>
                </div>
              );
            })()}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "followup" ? null : "followup")}
                className={cn(
                  "min-h-[48px] flex flex-col items-center justify-center p-3 rounded-2xl border text-center gap-1 transition-all active:scale-[0.98]",
                  activeSection === "followup"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                )}
              >
                <Phone className="w-4 h-4" />
                <span className="text-xs font-bold">Log Follow-up</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "demo" ? null : "demo")}
                disabled={isWon}
                className={cn(
                  "min-h-[48px] flex flex-col items-center justify-center p-3 rounded-2xl border text-center gap-1 transition-all active:scale-[0.98] disabled:opacity-40",
                  activeSection === "demo"
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100"
                )}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold">Log Demo</span>
              </button>

              {!isWon ? (
                <button
                  type="button"
                  onClick={handleProvisionTrial}
                  disabled={actionLoading || lead.status === "TRIAL_CREATED"}
                  className="min-h-[48px] flex flex-col items-center justify-center p-3 rounded-2xl border text-center gap-1 transition-all bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 active:scale-[0.98] disabled:opacity-40"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    {lead.status === "TRIAL_CREATED" ? "Trial Active" : "Launch Trial"}
                  </span>
                </button>
              ) : (
                <div className="min-h-[48px] flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Won Account ✓</span>
                </div>
              )}
            </div>

            {/* Convert to Paying Client Button */}
            {!isWon && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === "convert" ? null : "convert")}
                className={cn(
                  "w-full min-h-[48px] flex items-center justify-center gap-2 py-3 rounded-2xl border font-black text-sm sm:text-base transition-all active:scale-[0.98] shadow-xs",
                  activeSection === "convert"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                )}
              >
                <DollarSign className="w-5 h-5 text-indigo-700" />
                <span>Convert to Paying Madrasa Subscription</span>
              </button>
            )}

            {/* ── Inline Follow-up Form ── */}
            <AnimatePresence>
              {activeSection === "followup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form
                    onSubmit={handleLogActivity}
                    className="bg-blue-50/60 border border-blue-200 rounded-3xl p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-blue-900">Record Outreach &amp; Follow-up</h4>
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Channel / Type
                        </label>
                        <select
                          value={activityForm.type}
                          onChange={(e) => setActivityForm((p) => ({ ...p, type: e.target.value }))}
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
                        >
                          {ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Next Follow-up Date
                        </label>
                        <input
                          type="date"
                          value={activityForm.followUpDate}
                          onChange={(e) =>
                            setActivityForm((p) => ({ ...p, followUpDate: e.target.value }))
                          }
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 font-semibold"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[
                            { label: "Tomorrow", days: 1 },
                            { label: "In 3 Days", days: 3 },
                            { label: "Next Week", days: 7 },
                          ].map((p) => {
                            const t = new Date();
                            t.setDate(t.getDate() + p.days);
                            const dStr = t.toISOString().split("T")[0];
                            return (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => setActivityForm((prev) => ({ ...prev, followUpDate: dStr }))}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95",
                                  activityForm.followUpDate === dStr
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                                )}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                          {activityForm.followUpDate && (
                            <button
                              type="button"
                              onClick={() => setActivityForm((prev) => ({ ...prev, followUpDate: "" }))}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 ml-auto"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Discussion Summary &amp; Key Notes *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={activityForm.notes}
                        onChange={(e) => setActivityForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="What happened? Key points discussed with Sadr Usthad or Committee..."
                        className="w-full bg-white border border-gray-200 text-xs sm:text-sm p-3.5 rounded-xl focus:outline-none focus:border-blue-600 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="min-h-[44px] px-5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="min-h-[44px] flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Follow-up Log
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Inline Demo Form ── */}
            <AnimatePresence>
              {activeSection === "demo" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form
                    onSubmit={handleLogDemo}
                    className="bg-violet-50/60 border border-violet-200 rounded-3xl p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-violet-900">Record Demo Session</h4>
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Demo Date &amp; Time *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={demoForm.date}
                          onChange={(e) => setDemoForm((p) => ({ ...p, date: e.target.value }))}
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:border-violet-600 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Mode
                        </label>
                        <select
                          value={demoForm.type}
                          onChange={(e) => setDemoForm((p) => ({ ...p, type: e.target.value }))}
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none font-semibold"
                        >
                          <option value="Online">Online Video Call / Remote</option>
                          <option value="Site-Visit">In-Person Campus Site Visit</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Outcome / Decision
                      </label>
                      <select
                        value={demoForm.outcome}
                        onChange={(e) => setDemoForm((p) => ({ ...p, outcome: e.target.value }))}
                        className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none font-bold"
                      >
                        <option value="INTERESTED">✅ Highly Interested — Moving Forward</option>
                        <option value="NEED_FOLLOW_UP">🔁 Needs Another Touchpoint</option>
                        <option value="NEED_COMMITTEE_APPROVAL">📋 Committee Review Pending</option>
                        <option value="TRIAL_REQUESTED">🧪 Requested Sandbox Trial</option>
                        <option value="NOT_INTERESTED">❌ Not Moving Forward</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Attendees (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={demoForm.attendees}
                        onChange={(e) => setDemoForm((p) => ({ ...p, attendees: e.target.value }))}
                        placeholder="e.g. Sadr Usthad, Secretary, 4 Teachers"
                        className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Demo Notes
                      </label>
                      <textarea
                        rows={2}
                        value={demoForm.notes}
                        onChange={(e) => setDemoForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Features shown, reactions, questions raised..."
                        className="w-full bg-white border border-gray-200 text-xs sm:text-sm p-3.5 rounded-xl focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="min-h-[44px] px-5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="min-h-[44px] flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Demo Details
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Inline Convert Form ── */}
            <AnimatePresence>
              {activeSection === "convert" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form
                    onSubmit={handleConvertLead}
                    className="bg-indigo-50/60 border border-indigo-200 rounded-3xl p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-indigo-900">
                        Convert to Paying Client &amp; Allocate Splits
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Subdomain Slug *
                      </label>
                      <input
                        required
                        type="text"
                        value={convertForm.subdomain}
                        onChange={(e) =>
                          setConvertForm((p) => ({
                            ...p,
                            subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                          }))
                        }
                        className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Live Web App: <span className="font-mono font-bold text-indigo-800">{convertForm.subdomain}.smartmadrasa.app</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Admin Name *
                        </label>
                        <input
                          required
                          type="text"
                          value={convertForm.adminName}
                          onChange={(e) => setConvertForm((p) => ({ ...p, adminName: e.target.value }))}
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Admin Login (Phone/ID) *
                        </label>
                        <input
                          required
                          type="text"
                          value={convertForm.adminIdentifier}
                          onChange={(e) =>
                            setConvertForm((p) => ({ ...p, adminIdentifier: e.target.value }))
                          }
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Initial Password *
                        </label>
                        <input
                          required
                          type="text"
                          value={convertForm.adminPassword}
                          onChange={(e) =>
                            setConvertForm((p) => ({ ...p, adminPassword: e.target.value }))
                          }
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl font-mono focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Amount Paid (₹) *
                        </label>
                        <input
                          required
                          type="number"
                          value={convertForm.amountPaid}
                          onChange={(e) =>
                            setConvertForm((p) => ({ ...p, amountPaid: Number(e.target.value) }))
                          }
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl font-bold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Commission %
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={convertForm.commissionPercentage}
                          onChange={(e) =>
                            setConvertForm((p) => ({ ...p, commissionPercentage: Number(e.target.value) }))
                          }
                          className="w-full min-h-[44px] bg-white border border-gray-200 text-xs sm:text-sm py-2 px-3 rounded-xl font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm text-emerald-900 space-y-1">
                      <p className="font-bold">Commission Projection</p>
                      <p className="text-xs">
                        {convertForm.commissionPercentage}% of ₹{convertForm.amountPaid.toLocaleString("en-IN")} ={" "}
                        <strong>
                          ₹{Math.round((convertForm.amountPaid * convertForm.commissionPercentage) / 100).toLocaleString("en-IN")}
                        </strong>
                        {" "}split across {lead.contributors?.length || 1} sales contributor(s)
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSection(null)}
                        className="min-h-[44px] px-5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="min-h-[44px] flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        Activate Subscription
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Chronological Interaction Timeline ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Interaction Logs &amp; Audit
                </h3>
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {lead.timeline?.length ?? 0} log{lead.timeline?.length !== 1 ? "s" : ""}
                </span>
              </div>

              {(!lead.timeline || lead.timeline.length === 0) && (
                <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-bold">No interactions logged yet</p>
                  <p className="text-xs text-gray-400 mt-1">Use the quick actions above to record phone calls, meetings, or notes.</p>
                </div>
              )}

              {lead.timeline?.map((item) => {
                const isEditing = editingTimelineId === item.id;
                return (
                  <div key={item.id} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-2 group">
                    {isEditing ? (
                      <form onSubmit={handleSaveEditTimeline} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editTimelineForm.type}
                            onChange={(e) =>
                              setEditTimelineForm((p) => ({ ...p, type: e.target.value }))
                            }
                            className="bg-gray-50 border border-gray-200 text-xs py-2 px-2.5 rounded-xl font-bold"
                          >
                            {ACTIVITY_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editTimelineForm.followUpDate}
                            onChange={(e) =>
                              setEditTimelineForm((p) => ({ ...p, followUpDate: e.target.value }))
                            }
                            className="bg-gray-50 border border-gray-200 text-xs py-2 px-2.5 rounded-xl font-medium"
                          />
                        </div>
                        <textarea
                          required
                          rows={2}
                          value={editTimelineForm.notes}
                          onChange={(e) =>
                            setEditTimelineForm((p) => ({ ...p, notes: e.target.value }))
                          }
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-3 rounded-xl focus:outline-none resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingTimelineId(null)}
                            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={timelineActionLoading}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg uppercase">
                              {item.type}
                            </span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEditTimeline(item)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTimeline(item.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                          {item.notes}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            By <strong className="text-gray-800">{item.user?.name ?? "System"}</strong>
                          </span>
                          {item.followUpDate && (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Scheduled: {new Date(item.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: INSTITUTION PROFILE & CONTACTS                                  */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeLeadTab === "details" && (
          <div className="space-y-4">
            {/* Institution Profile Card */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Institutional Parameters
                </h3>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {lead.type || "Madrasa"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Total Students</span>
                  <span className="font-black text-gray-900 text-base">{lead.studentCount || "—"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Total Teachers</span>
                  <span className="font-black text-gray-900 text-base">{lead.teacherCount || "—"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Current Software</span>
                  <span className="font-bold text-gray-800 text-xs truncate block" title={lead.existingSoftware || "None"}>
                    {lead.existingSoftware || "None (Registers)"}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">District</span>
                  <span className="font-bold text-gray-900">{lead.district || "—"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Place / Area</span>
                  <span className="font-bold text-gray-900">{lead.place || "—"}</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400">Lead Source</span>
                  <span className="font-bold text-gray-900 uppercase text-xs">
                    {lead.source?.replace(/_/g, " ") || "Direct"}
                  </span>
                </div>
              </div>

              {lead.address && (
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Campus Address</span>
                  <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">{lead.address}</p>
                </div>
              )}
            </div>

            {/* Key Contacts List */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Key Decision Makers &amp; Contacts
                </h3>
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {lead.contacts?.length ?? 0} contact{lead.contacts?.length !== 1 ? "s" : ""}
                </span>
              </div>

              {lead.contacts && lead.contacts.length > 0 ? (
                <div className="space-y-3">
                  {lead.contacts.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-gray-900 text-sm sm:text-base">
                            {c.name || <span className="text-gray-400 italic">No name provided</span>}
                          </span>
                          {c.role && (
                            <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2.5 py-0.5 rounded-full">
                              {c.role}
                            </span>
                          )}
                          {c.isPrimary && (
                            <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>

                        {c.phone && (() => {
                          const cleanPhone = c.phone.replace(/[^0-9]/g, "");
                          const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                          return (
                            <div className="flex items-center gap-3 text-xs sm:text-sm pt-1 flex-wrap">
                              <span className="font-mono font-bold text-gray-900">{c.phone}</span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${c.phone}`}
                                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Call
                                </a>
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(c.phone!, c.phone!)}
                                  className="p-2 text-gray-400 hover:text-gray-700"
                                >
                                  {copiedText === c.phone ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {c.secondaryPhone && (() => {
                          const cleanAlt = c.secondaryPhone.replace(/[^0-9]/g, "");
                          const waAlt = cleanAlt.length === 10 ? `91${cleanAlt}` : cleanAlt;
                          return (
                            <div className="flex items-center gap-3 text-xs sm:text-sm pt-2 border-t border-dashed border-gray-200 flex-wrap">
                              <span className="font-mono font-bold text-gray-700">
                                Alt: {c.secondaryPhone}
                              </span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${c.secondaryPhone}`}
                                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1 border border-blue-200"
                                >
                                  <Phone className="w-3 h-3" /> Call Alt
                                </a>
                                <a
                                  href={`https://wa.me/${waAlt}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1 border border-emerald-200"
                                >
                                  <MessageSquare className="w-3 h-3" /> WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(c.secondaryPhone!, c.secondaryPhone!)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700"
                                >
                                  {copiedText === c.secondaryPhone ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl">
                  <p className="text-xs text-gray-400 italic">No contact persons added yet.</p>
                </div>
              )}
            </div>

            {/* Attribution Split */}
            {lead.contributors && lead.contributors.length > 0 && (
              <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Commission Attribution
                  </h3>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Total: {lead.commissionPercentage ?? 20}%
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {lead.contributors.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-gray-900">{c.user?.name ?? "Sales Rep"}</span>
                      <span className="font-black text-emerald-800 text-sm sm:text-base font-mono">
                        {c.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PIPELINE, DEMOS & SETUP                                         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeLeadTab === "pipeline" && (
          <div className="space-y-4">
            {/* Demos History */}
            {lead.demos && lead.demos.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-600" />
                    Demonstration History
                  </h3>
                  <span className="text-xs font-bold text-violet-800 bg-violet-50 px-2.5 py-1 rounded-lg">
                    {lead.demos.length} session{lead.demos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {lead.demos.map((demo) => (
                    <div key={demo.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-bold text-gray-900">
                          {new Date(demo.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">
                            {demo.type}
                          </span>
                          <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2 py-0.5 rounded">
                            {demo.outcome}
                          </span>
                        </div>
                      </div>
                      {demo.notes && <p className="text-xs text-gray-600 leading-relaxed">{demo.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trial Credentials */}
            {lead.trialMonitoring && (
              <div className="bg-white rounded-3xl border border-amber-200 p-5 sm:p-6 shadow-xs space-y-3">
                <h3 className="text-xs sm:text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-amber-600" />
                  Sandbox Trial Telemetry
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200">
                    <span className="block text-xs uppercase font-bold text-amber-800">Health Score</span>
                    <span className="font-black text-amber-950 text-lg">{lead.trialMonitoring.healthScore}</span>
                  </div>
                  <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200">
                    <span className="block text-xs uppercase font-bold text-amber-800">Active Logins (7d)</span>
                    <span className="font-black text-amber-950 text-lg">{lead.trialMonitoring.loginFrequency}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone: Delete Lead */}
            {canDelete && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(lead.id)}
                  className="w-full min-h-[44px] py-3 text-rose-700 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  <span>Delete Lead Permanently</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Persistent CRM Sub-Navigation */}
        <CrmSubNav />

        {/* ── Main Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Leads &amp; Sales Pipeline
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Active madrasa prospects · {leads.length} total institutional records
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl transition-all shadow-xs active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import Contacts</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddDrawer(true)}
              className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        <AnimatePresence>
          {(successMsg || error) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "rounded-2xl p-4 mb-4 text-sm font-semibold flex items-center justify-between gap-3 shadow-xs",
                error
                  ? "bg-rose-50 border border-rose-200 text-rose-900"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-900"
              )}
            >
              <span>{error || successMsg}</span>
              <button
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search & Filter Suite (Desktop & Mobile Friendly) ── */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3.5 mb-5">
          {/* Top Row: Search Input + Selects */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="relative md:col-span-6 lg:col-span-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by madrasa name, place, district..."
                className="w-full min-h-[44px] pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-medium text-gray-900"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="md:col-span-3 lg:col-span-3">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800"
              >
                <option value="ALL">All Districts ({availableDistricts.length})</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 lg:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-gray-800"
              >
                <option value="URGENT">Sort: Urgency / Deadline</option>
                <option value="NEWEST">Sort: Newest First</option>
                <option value="STUDENTS">Sort: Student Strength</option>
                <option value="NAME">Sort: Name (A to Z)</option>
              </select>
            </div>
          </div>

          {/* Quick Presets Segmented Bar (Thumb-friendly 44px touch targets!) */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1 pb-0.5">
            <span className="text-xs uppercase font-black tracking-wider text-gray-400 shrink-0 flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
            </span>

            {[
              { key: "ALL", label: "All Leads", count: smartCounts.all, activeColor: "bg-gray-900 text-white border-gray-900" },
              { key: "OVERDUE", label: "🚨 Overdue", count: smartCounts.overdue, activeColor: "bg-rose-600 text-white border-rose-600" },
              { key: "TODAY", label: "⏱️ Due Today", count: smartCounts.today, activeColor: "bg-amber-600 text-white border-amber-600" },
              { key: "HOT_WARM", label: "🔥 Warm & Hot", count: smartCounts.hotWarm, activeColor: "bg-orange-600 text-white border-orange-600" },
              { key: "ACTIVE_TRIALS", label: "🚀 Active Trials", count: smartCounts.activeTrials, activeColor: "bg-indigo-600 text-white border-indigo-600" },
              { key: "NO_FOLLOWUP", label: "⚠️ Needs Date", count: smartCounts.noFollowup, activeColor: "bg-slate-700 text-white border-slate-700" },
            ].map((pill) => {
              const isSelected = smartPreset === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setSmartPreset(pill.key as any)}
                  className={cn(
                    "min-h-[40px] shrink-0 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2",
                    isSelected
                      ? cn(pill.activeColor, "shadow-2xs scale-[1.02]")
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <span>{pill.label}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-black",
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}

            {/* Reset Button */}
            {(activeStage !== "ALL" ||
              smartPreset !== "ALL" ||
              selectedDistrict !== "ALL" ||
              search !== "" ||
              sortBy !== "URGENT") && (
              <button
                type="button"
                onClick={() => {
                  setActiveStage("ALL");
                  setSmartPreset("ALL");
                  setSelectedDistrict("ALL");
                  setSearch("");
                  setSortBy("URGENT");
                }}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all shrink-0 ml-auto"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-gray-500 text-xs sm:text-sm font-semibold">Loading pipeline registry...</p>
          </div>
        )}

        {/* ── Split Workspace (List + Detail) ── */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left Column: Lead List Cards */}
            <div
              className={cn(
                "md:col-span-5 lg:col-span-5 flex flex-col bg-white border border-gray-200/90 rounded-3xl overflow-hidden shadow-xs",
                "h-[calc(100vh-280px)] min-h-[500px]"
              )}
            >
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {smartPreset !== "ALL"
                    ? smartPreset.replace(/_/g, " ")
                    : activeStage === "ALL"
                    ? "All Leads"
                    : activeStage.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {filteredLeads.length} records
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
                {filteredLeads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-4">
                    <p className="text-sm text-gray-500 font-medium">No leads match current filters.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddDrawer(true)}
                      className="text-xs font-bold text-emerald-700 hover:underline mt-1"
                    >
                      + Add a new prospect
                    </button>
                  </div>
                )}

                {filteredLeads.map((l) => {
                  const isSelected = selectedLeadId === l.id;
                  const primaryC = l.contacts?.find((c) => c.isPrimary) || l.contacts?.[0];
                  const cleanPhone = primaryC?.phone?.replace(/[^0-9]/g, "") || "";
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const fuStatus = getFollowUpStatus(l.nextFollowUpDate);

                  return (
                    <div
                      key={l.id}
                      onClick={() => selectLead(l.id)}
                      className={cn(
                        "p-4 rounded-2xl border cursor-pointer transition-all space-y-3 select-none",
                        isSelected
                          ? "bg-emerald-50/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                          : "bg-white border-gray-200/90 hover:border-emerald-300 hover:shadow-xs"
                      )}
                    >
                      {/* Top Row: Name, Score & Location */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-gray-900 truncate leading-snug">
                            {l.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            📍 {l.place || "Place"}
                            {l.district ? `, ${l.district}` : ""} • {l.studentCount || 0} students
                          </p>
                        </div>
                        {renderScoreBadge(l.score)}
                      </div>

                      {/* Middle: Contact Person & Quick 1-Tap Call/WA Buttons */}
                      {primaryC && (
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {primaryC.name || "Contact person"}
                                {primaryC.role ? ` (${primaryC.role})` : ""}
                              </p>
                              {primaryC.phone && (
                                <p className="text-xs font-mono font-bold text-gray-600 mt-0.5">
                                  {primaryC.phone}
                                </p>
                              )}
                            </div>

                            {primaryC.phone && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`tel:${primaryC.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="min-h-[38px] px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-blue-200 active:scale-95"
                                  title={`Call: ${primaryC.phone}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Call</span>
                                </a>
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="min-h-[38px] px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-emerald-200 active:scale-95"
                                  title="WhatsApp chat"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">WA</span>
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Secondary / Alternative Contact Number if available */}
                          {primaryC.secondaryPhone && (() => {
                            const cleanAlt = primaryC.secondaryPhone.replace(/[^0-9]/g, "");
                            const waAlt = cleanAlt.length === 10 ? `91${cleanAlt}` : cleanAlt;
                            return (
                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-dashed border-gray-100 text-xs">
                                <span className="font-mono text-gray-500 truncate">
                                  Alt: <strong className="text-gray-800">{primaryC.secondaryPhone}</strong>
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={`tel:${primaryC.secondaryPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="min-h-[32px] px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 flex items-center gap-1 active:scale-95"
                                    title={`Call Alt: ${primaryC.secondaryPhone}`}
                                  >
                                    <Phone className="w-3 h-3 text-blue-600" />
                                    <span>Call</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${waAlt}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="min-h-[32px] px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 flex items-center gap-1 active:scale-95"
                                    title={`WhatsApp Alt: ${primaryC.secondaryPhone}`}
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                    <span>WA</span>
                                  </a>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Footer Row: Status, Next Follow-up & Quick Schedule Trigger */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        {renderStatusBadge(l.status)}

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {l.nextFollowUpDate ? (
                            <span
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 shrink-0 font-bold",
                                fuStatus.badgeClass
                              )}
                            >
                              {fuStatus.urgency === "overdue" && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              {fuStatus.urgency === "today" && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                              )}
                              {fuStatus.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No date set</span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setCardFollowUpPickerId(cardFollowUpPickerId === l.id ? null : l.id)
                            }
                            className="min-h-[32px] px-2 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                            title="Schedule next follow-up directly"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>{l.nextFollowUpDate ? "Change" : "+ Date"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Card-Level Quick Inline Date Scheduler Popover */}
                      <AnimatePresence>
                        {cardFollowUpPickerId === l.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="overflow-hidden"
                          >
                            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5 mt-1">
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  Schedule Follow-up:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCardFollowUpPickerId(null)}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { label: "Today", days: 0 },
                                  { label: "Tomorrow", days: 1 },
                                  { label: "In 3 Days", days: 3 },
                                  { label: "Next Week", days: 7 },
                                ].map((p) => {
                                  const target = new Date();
                                  target.setDate(target.getDate() + p.days);
                                  const isoDate = target.toISOString().split("T")[0];
                                  return (
                                    <button
                                      key={p.label}
                                      type="button"
                                      disabled={followUpSaving}
                                      onClick={() => handleQuickUpdateFollowUp(isoDate, l.id)}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-emerald-600 hover:text-white text-gray-700 border border-gray-200 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                                    >
                                      {p.label}
                                    </button>
                                  );
                                })}

                                {l.nextFollowUpDate && (
                                  <button
                                    type="button"
                                    disabled={followUpSaving}
                                    onClick={() => handleQuickUpdateFollowUp(null, l.id)}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 ml-auto active:scale-95 disabled:opacity-50"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Lead Detail (Desktop Only) */}
            <div
              className={cn(
                "hidden md:flex md:col-span-7 lg:col-span-7 bg-white border border-gray-200/90 rounded-3xl shadow-xs",
                "h-[calc(100vh-280px)] min-h-[500px] flex-col overflow-hidden"
              )}
            >
              {selectedLeadId && detailLoading && (
                <div className="flex-1 flex items-center justify-center gap-3 flex-col">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-xs text-gray-500 font-semibold">Loading lead details...</p>
                </div>
              )}

              {selectedLeadId && !detailLoading && selectedLead && (
                <div className="overflow-y-auto flex-1 p-6 scrollbar-thin">
                  {renderDetailContent()}
                </div>
              )}

              {!selectedLeadId && !detailLoading && (
                <div className="flex-1 flex items-center justify-center p-8 text-center flex-col text-gray-400">
                  <Building2 className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="text-base font-bold text-gray-700">Select a lead from the list</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    Review institutional details, timeline interactions, or schedule product demonstrations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile Full-Screen Detail Sheet (Mobile-First Experience!) ── */}
        <AnimatePresence>
          {showMobileDetail && selectedLeadId && (
            <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="bg-white flex-1 mt-10 rounded-t-3xl overflow-hidden flex flex-col shadow-2xl relative"
              >
                {/* Mobile Header Bar */}
                <div className="px-5 py-4 border-b border-gray-200/90 flex items-center justify-between shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={closeLead}
                    className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 px-2 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Leads</span>
                  </button>

                  {selectedLead && (
                    <button
                      type="button"
                      onClick={() => handleStartEditLead(selectedLead)}
                      className="min-h-[40px] px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {/* Mobile Body Content */}
                <div className="flex-1 overflow-y-auto p-4 pb-28">
                  {detailLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      <p className="text-xs text-gray-500 font-semibold">Loading details...</p>
                    </div>
                  ) : (
                    renderDetailContent()
                  )}
                </div>

                {/* Mobile Sticky Bottom Action Bar (Native App Ergonomics!) */}
                {selectedLead && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 px-4 flex items-center gap-2 z-20 shadow-lg">
                    {(() => {
                      const pContact = selectedLead.contacts?.find((c) => c.isPrimary) || selectedLead.contacts?.[0];
                      const clPhone = pContact?.phone?.replace(/[^0-9]/g, "") || "";
                      const wPhone = clPhone.length === 10 ? `91${clPhone}` : clPhone;

                      return (
                        <>
                          {pContact?.phone && (
                            <>
                              <a
                                href={`tel:${pContact.phone}`}
                                className="min-h-[48px] flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call Now</span>
                              </a>
                              <a
                                href={`https://wa.me/${wPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[48px] flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLeadTab("activity");
                              setActiveSection("followup");
                            }}
                            className="min-h-[48px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Log</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Add Lead Drawer / Sheet ── */}
        <AnimatePresence>
          {showAddDrawer && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddDrawer(false)}
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
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Add New Lead</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Register a new madrasa prospect into the CRM pipeline</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDrawer(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Madrasa Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Darul Uloom Kozhikode"
                      className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Initial Stage
                      </label>
                      <select
                        value={newLeadForm.status}
                        onChange={(e) => setNewLeadForm((p) => ({ ...p, status: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Syllabus Type
                      </label>
                      <select
                        value={newLeadForm.type}
                        onChange={(e) => setNewLeadForm((p) => ({ ...p, type: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {["Samastha", "AP", "Fadhila", "Other"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        District *
                      </label>
                      <select
                        required
                        value={newLeadForm.districtId}
                        onChange={(e) => {
                          const d = districts.find((d) => d.id === e.target.value);
                          setNewLeadForm((p) => ({
                            ...p,
                            districtId: e.target.value,
                            district: d?.name ?? "",
                          }));
                        }}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        <option value="">Select District *</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Place / Town
                      </label>
                      <input
                        type="text"
                        value={newLeadForm.place}
                        onChange={(e) => setNewLeadForm((p) => ({ ...p, place: e.target.value }))}
                        placeholder="e.g. Koduvally, Chemmad"
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Source
                      </label>
                      <select
                        value={newLeadForm.source}
                        onChange={(e) => setNewLeadForm((p) => ({ ...p, source: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                      >
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Students
                      </label>
                      <input
                        type="number"
                        value={newLeadForm.studentCount}
                        onChange={(e) =>
                          setNewLeadForm((p) => ({ ...p, studentCount: Number(e.target.value) }))
                        }
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs sm:text-sm font-bold text-gray-900 text-center focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Teachers
                      </label>
                      <input
                        type="number"
                        value={newLeadForm.teacherCount}
                        onChange={(e) =>
                          setNewLeadForm((p) => ({ ...p, teacherCount: Number(e.target.value) }))
                        }
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs sm:text-sm font-bold text-gray-900 text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Contact Person Details */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Primary Contact Person (Optional)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name</label>
                        <input
                          type="text"
                          value={newLeadForm.contactName}
                          onChange={(e) =>
                            setNewLeadForm((p) => ({ ...p, contactName: e.target.value }))
                          }
                          placeholder="e.g. Usthad Abdul Hameed"
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Primary Phone</label>
                        <input
                          type="tel"
                          value={newLeadForm.contactPhone}
                          onChange={(e) =>
                            setNewLeadForm((p) => ({ ...p, contactPhone: e.target.value }))
                          }
                          placeholder="9876543210"
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Alternative / Secondary Phone</label>
                        <input
                          type="tel"
                          value={newLeadForm.contactSecondaryPhone}
                          onChange={(e) =>
                            setNewLeadForm((p) => ({ ...p, contactSecondaryPhone: e.target.value }))
                          }
                          placeholder="Alternative phone number"
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Role / Designation</label>
                        <select
                          value={newLeadForm.contactRole}
                          onChange={(e) =>
                            setNewLeadForm((p) => ({ ...p, contactRole: e.target.value }))
                          }
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none text-gray-800 font-medium"
                        >
                          <option value="">Select Role / Designation</option>
                          {CONTACT_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Existing Software */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Current Software / System
                    </label>
                    <input
                      type="text"
                      value={newLeadForm.existingSoftware}
                      onChange={(e) =>
                        setNewLeadForm((p) => ({ ...p, existingSoftware: e.target.value }))
                      }
                      placeholder="e.g. Excel, Registers, Custom software"
                      className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  {/* Sales Commission (Toggleable) */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl space-y-3 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Sales Commission
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Enable performance commission and team attribution split
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newLeadForm.enableCommission}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewLeadForm((p) => ({
                              ...p,
                              enableCommission: checked,
                              contributors:
                                checked && p.contributors.length === 0
                                  ? [
                                      {
                                        userId: user?.id || teamUsers[0]?.id || "",
                                        percentage: p.commissionPercentage,
                                      },
                                    ]
                                  : p.contributors,
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {newLeadForm.enableCommission && (
                      <div className="space-y-3 pt-2 border-t border-emerald-200">
                        <div>
                          <label className="block text-xs text-gray-700 font-bold mb-1">
                            Total Commission Rate (%)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={newLeadForm.commissionPercentage}
                            onChange={(e) =>
                              setNewLeadForm((p) => ({
                                ...p,
                                commissionPercentage: Number(e.target.value),
                              }))
                            }
                            className="w-full min-h-[44px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none"
                          />
                        </div>

                        {isSuperOrManager && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-700">Attribution Splits:</span>
                              <span
                                className={cn(
                                  "font-bold",
                                  Math.abs(
                                    newLeadForm.contributors.reduce(
                                      (s, c) => s + Number(c.percentage || 0),
                                      0
                                    ) - newLeadForm.commissionPercentage
                                  ) < 0.01
                                    ? "text-emerald-700"
                                    : "text-rose-600"
                                )}
                              >
                                Split total:{" "}
                                {newLeadForm.contributors.reduce(
                                  (s, c) => s + Number(c.percentage || 0),
                                  0
                                )}
                                % / {newLeadForm.commissionPercentage}%
                              </span>
                            </div>

                            {newLeadForm.contributors.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <select
                                  value={c.userId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewLeadForm((p) => {
                                      const next = [...p.contributors];
                                      next[idx].userId = val;
                                      return { ...p, contributors: next };
                                    });
                                  }}
                                  className="flex-1 min-h-[40px] bg-white border border-gray-200 rounded-xl px-2 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="">Select Team Member</option>
                                  {teamUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name} ({u.role?.replace(/_/g, " ")})
                                    </option>
                                  ))}
                                </select>
                                <div className="relative w-24">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={c.percentage}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setNewLeadForm((p) => {
                                        const next = [...p.contributors];
                                        next[idx].percentage = val;
                                        return { ...p, contributors: next };
                                      });
                                    }}
                                    className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl pr-6 pl-2 text-xs font-bold text-right focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                                    %
                                  </span>
                                </div>
                                {newLeadForm.contributors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewLeadForm((p) => ({
                                        ...p,
                                        contributors: p.contributors.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {newLeadForm.contributors.length < 3 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setNewLeadForm((p) => ({
                                    ...p,
                                    contributors: [
                                      ...p.contributors,
                                      { userId: "", percentage: 0 },
                                    ],
                                  }))
                                }
                                className="text-xs font-bold text-emerald-700 hover:underline pt-1 flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Team Contributor
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Register Lead</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Edit Lead Drawer ── */}
        <AnimatePresence>
          {showEditDrawer && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEditDrawer(false)}
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
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Edit Lead Profile</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Update institution parameters and contact data</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditDrawer(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditLead} className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Madrasa Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={editLeadForm.name}
                      onChange={(e) => setEditLeadForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Pipeline Stage
                      </label>
                      <select
                        value={editLeadForm.status}
                        onChange={(e) => setEditLeadForm((p) => ({ ...p, status: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Syllabus Type
                      </label>
                      <select
                        value={editLeadForm.type}
                        onChange={(e) => setEditLeadForm((p) => ({ ...p, type: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        {["Samastha", "AP", "Fadhila", "Other"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        District
                      </label>
                      <select
                        value={editLeadForm.districtId}
                        onChange={(e) => {
                          const d = districts.find((d) => d.id === e.target.value);
                          setEditLeadForm((p) => ({
                            ...p,
                            districtId: e.target.value,
                            district: d?.name ?? "",
                          }));
                        }}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                      >
                        <option value="">Select District</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Place / Town
                      </label>
                      <input
                        type="text"
                        value={editLeadForm.place}
                        onChange={(e) => setEditLeadForm((p) => ({ ...p, place: e.target.value }))}
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Full Address
                    </label>
                    <textarea
                      rows={2}
                      value={editLeadForm.address}
                      onChange={(e) => setEditLeadForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Complete postal address / landmark"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm text-gray-900 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Lead Acquisition Source
                    </label>
                    <select
                      value={editLeadForm.source}
                      onChange={(e) => setEditLeadForm((p) => ({ ...p, source: e.target.value }))}
                      className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Students Count
                      </label>
                      <input
                        type="number"
                        value={editLeadForm.studentCount}
                        onChange={(e) =>
                          setEditLeadForm((p) => ({ ...p, studentCount: Number(e.target.value) }))
                        }
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Teachers Count
                      </label>
                      <input
                        type="number"
                        value={editLeadForm.teacherCount}
                        onChange={(e) =>
                          setEditLeadForm((p) => ({ ...p, teacherCount: Number(e.target.value) }))
                        }
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Existing Software
                      </label>
                      <input
                        type="text"
                        value={editLeadForm.existingSoftware}
                        onChange={(e) =>
                          setEditLeadForm((p) => ({ ...p, existingSoftware: e.target.value }))
                        }
                        placeholder="e.g. Excel, Custom, None"
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editLeadForm.commissionPercentage}
                        onChange={(e) =>
                          setEditLeadForm((p) => ({
                            ...p,
                            commissionPercentage: Number(e.target.value),
                          }))
                        }
                        className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Primary Contact Person Edit */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Primary Contact Person
                      </h4>
                      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                        Key Decision Maker
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Name</label>
                        <input
                          type="text"
                          value={editLeadForm.contactName}
                          onChange={(e) =>
                            setEditLeadForm((p) => ({ ...p, contactName: e.target.value }))
                          }
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Primary Phone</label>
                        <input
                          type="tel"
                          value={editLeadForm.contactPhone}
                          onChange={(e) =>
                            setEditLeadForm((p) => ({ ...p, contactPhone: e.target.value }))
                          }
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Alternative / Secondary Phone</label>
                        <input
                          type="tel"
                          value={editLeadForm.contactSecondaryPhone}
                          onChange={(e) =>
                            setEditLeadForm((p) => ({
                              ...p,
                              contactSecondaryPhone: e.target.value,
                            }))
                          }
                          placeholder="Alternative phone number"
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Role / Designation</label>
                        <select
                          value={editLeadForm.contactRole}
                          onChange={(e) =>
                            setEditLeadForm((p) => ({ ...p, contactRole: e.target.value }))
                          }
                          className="w-full min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none text-gray-800 font-medium"
                        >
                          <option value="">Select Role / Designation</option>
                          {CONTACT_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditDrawer(false)}
                      className="min-h-[44px] flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLeadSaving}
                      className="min-h-[44px] flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                    >
                      {editLeadSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bulk Import Modal */}
        <ImportModal
          show={showImportModal}
          onClose={() => setShowImportModal(false)}
          onComplete={() => {
            setShowImportModal(false);
            loadData();
          }}
          config={importConfig}
        />
      </div>
    </DashboardLayout>
  );
}
