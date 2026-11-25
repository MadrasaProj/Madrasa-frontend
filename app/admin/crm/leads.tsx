import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CrmSubNav } from "@/components/crm/CrmSubNav";
import { useAuthStore } from "@/store/auth";
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  bulkLeadAction,
  assignLead,
  logActivity,
  updateActivity,
  deleteActivity,
  scheduleDemo,
  provisionTrial,
  convertLead,
  listDistricts,
  listInternalUsers,
  bulkImportLeads,
  updateFollowUpDate,
  type LeadListItem,
  type LeadDetail,
  type DistrictItem,
  type InternalUserItem,
} from "@/lib/crm-api";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
  type LeadSortOption,
} from "@/components/crm/crm-types";
import {
  calculateLeadSmartPriority,
  getFollowUpStatus,
  isLeadAssignedToUser,
  isLeadUnassigned,
  formatLocalDateForInput,
} from "@/components/crm/crm-utils";
import { LeadToolbar } from "@/components/crm/LeadToolbar";
import { LeadCard } from "@/components/crm/LeadCard";
import { LeadDetailView } from "@/components/crm/LeadDetailView";
import {
  LeadFormDrawer,
  type LeadFormData,
} from "@/components/crm/LeadFormDrawer";
import { LeadQuickAssignModal } from "@/components/crm/LeadQuickAssignModal";
import {
  LeadBulkModal,
  type BulkModalType,
} from "@/components/crm/LeadBulkModal";
import { createCrmImportConfig } from "@/components/crm/crm-import-config";
import { ImportModal } from "@/components/ui/ImportModal";
import {
  Plus,
  Upload,
  Users,
  Sparkles,
  CalendarClock,
  Trash,
  ArrowLeft,
  Pencil,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeadsCrmPage() {
  const { accessToken, user } = useAuthStore();

  // Core Data
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [teamUsers, setTeamUsers] = useState<InternalUserItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>("ALL");
  const [smartPreset, setSmartPreset] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedAssignee, setSelectedAssignee] = useState<
    "ME" | "ALL" | "UNASSIGNED"
  >("ME");
  const [sortBy, setSortBy] = useState<LeadSortOption>("SMART_PRIORITY");

  // Granular Filters
  const [dueDateFilter, setDueDateFilter] = useState<string>("ALL");
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");
  const [lastContactedFilter, setLastContactedFilter] = useState<string>("ALL");
  const [leadScoreFilter, setLeadScoreFilter] = useState<string>("ALL");
  const [institutionSizeFilter, setInstitutionSizeFilter] =
    useState<string>("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination & Mobile View
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Selection & Bulk
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkModalType, setBulkModalType] = useState<BulkModalType>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkSelectedUserId, setBulkSelectedUserId] = useState("");
  const [bulkSelectedStatus, setBulkSelectedStatus] =
    useState<LeadStatus>("FOLLOW_UP");
  const [bulkFollowUpDate, setBulkFollowUpDate] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  // Modals & Drawers
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [quickAssignUserId, setQuickAssignUserId] = useState("");
  const [quickAssignLoading, setQuickAssignLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // UI Feedback
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const toast = useCallback((text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast(`Copied: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Bulletproof mobile body scroll lock when mobile detail sheet is open
  useEffect(() => {
    if (showMobileDetail) {
      const scrollY = window.scrollY;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalOverflow = document.body.style.overflow;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [showMobileDetail]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    activeStage,
    smartPreset,
    selectedDistrict,
    selectedAssignee,
    sortBy,
  ]);

  // User Identifiers
  const myTeamUser = useMemo(() => {
    if (!user) return null;
    return (
      teamUsers.find((u) => u.id === user.id) ||
      teamUsers.find(
        (u) =>
          u.name &&
          u.name.trim().toLowerCase() === user.name?.trim().toLowerCase(),
      ) ||
      null
    );
  }, [teamUsers, user]);

  const effectiveUserId = myTeamUser?.id || user?.id || "";

  const myIdentifiers = useMemo(() => {
    const set = new Set<string>();
    if (user?.id) set.add(user.id.toLowerCase().trim());
    if (effectiveUserId) set.add(effectiveUserId.toLowerCase().trim());
    if (user?.name) set.add(user.name.trim().toLowerCase());
    if ((user as any)?.username)
      set.add(
        String((user as any).username)
          .trim()
          .toLowerCase(),
      );
    if ((user as any)?.email)
      set.add(
        String((user as any).email)
          .trim()
          .toLowerCase(),
      );
    if (myTeamUser?.id) set.add(myTeamUser.id.toLowerCase().trim());
    if (myTeamUser?.name) set.add(myTeamUser.name.trim().toLowerCase());
    return set;
  }, [user, effectiveUserId, myTeamUser]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, InternalUserItem>();
    if (effectiveUserId) {
      map.set(effectiveUserId, {
        id: effectiveUserId,
        name: user?.name || "Current User",
        role: user?.actorType || "STAFF",
      } as InternalUserItem);
    }
    teamUsers.forEach((u) => {
      if (u.id && !map.has(u.id)) map.set(u.id, u);
    });
    leads.forEach((l) => {
      l.contributors?.forEach((c) => {
        const cId = c.userId || c.user?.id;
        if (cId && !map.has(cId)) {
          map.set(cId, {
            id: cId,
            name: c.user?.name || "Team Member",
            role: c.role || c.user?.role || "STAFF",
          } as InternalUserItem);
        }
      });
    });
    return Array.from(map.values());
  }, [teamUsers, user, effectiveUserId, leads]);

  // Form States
  const [formData, setFormData] = useState<LeadFormData>({
    name: "",
    type: "Samastha",
    districtId: "",
    district: "",
    place: "",
    address: "",
    studentCount: 150,
    teacherCount: 8,
    existingSoftware: "",
    source: "WHATSAPP",
    status: "NEW",
    enableCommission: false,
    commissionPercentage: 20,
    contributors: [{ userId: effectiveUserId, percentage: 20 }],
    contactName: "",
    contactPhone: "",
    contactSecondaryPhone: "",
    contactRole: "",
  });

  // Data Loading
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!accessToken) return;
      if (!isSilent) setLoading(true);
      try {
        const [leadsRes, teamRes, districtsRes] = await Promise.allSettled([
          listLeads(accessToken, {}),
          listInternalUsers(accessToken),
          listDistricts(accessToken),
        ]);

        if (leadsRes.status === "fulfilled") setLeads(leadsRes.value || []);
        if (teamRes.status === "fulfilled") setTeamUsers(teamRes.value || []);
        if (districtsRes.status === "fulfilled")
          setDistricts(districtsRes.value || []);
      } catch (err: any) {
        toast(err.message || "Failed to load CRM data", true);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [accessToken, toast],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadLeadDetail = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setDetailLoading(true);
      try {
        const res = await getLead(id, accessToken);
        setSelectedLead(res);
      } catch (err: any) {
        toast(err.message || "Failed to load lead details", true);
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken, toast],
  );

  const selectLead = (id: string) => {
    setSelectedLeadId(id);
    loadLeadDetail(id);
    if (window.innerWidth < 1024) setShowMobileDetail(true);
  };

  const closeLead = () => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setShowMobileDetail(false);
  };

  // Stage & Follow-up Actions
  const handleUpdateStage = async (newStage: string, leadId: string) => {
    if (!accessToken) return;
    setActionLoading(true);
    try {
      await updateLead(leadId, { status: newStage as LeadStatus }, accessToken);
      toast(
        `Moved to ${LEAD_STATUS_LABELS[newStage as LeadStatus] ?? newStage}`,
      );
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: newStage as LeadStatus } : l,
        ),
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) =>
          prev ? { ...prev, status: newStage as LeadStatus } : null,
        );
        loadLeadDetail(leadId);
      }
    } catch (err: any) {
      toast(err.message || "Failed to update stage", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickUpdateFollowUp = async (
    targetDate: string | null,
    leadId: string,
    remarks?: string,
  ) => {
    if (!accessToken) return;
    try {
      await updateFollowUpDate(leadId, targetDate, accessToken, remarks);
      toast(
        targetDate
          ? `Follow-up scheduled for ${targetDate}`
          : "Follow-up schedule cleared",
      );
      const nextDate = targetDate || undefined;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, nextFollowUpDate: nextDate } : l,
        ),
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) =>
          prev ? { ...prev, nextFollowUpDate: nextDate } : null,
        );
        loadLeadDetail(leadId);
      }
    } catch (err: any) {
      toast(err.message || "Failed to update follow-up", true);
    }
  };

  const handleSelfClaim = async (leadId: string) => {
    if (!accessToken || !effectiveUserId) return;
    setActionLoading(true);
    try {
      await assignLead(
        leadId,
        [{ userId: effectiveUserId, percentage: 100 }],
        accessToken,
      );
      toast("Lead claimed successfully! ⭐");
      await loadData(true);
      if (selectedLead?.id === leadId) await loadLeadDetail(leadId);
    } catch (err: any) {
      toast(err.message || "Failed to claim lead", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickAssign = async (userId: string) => {
    if (!selectedLead || !accessToken) return;
    setQuickAssignLoading(true);
    try {
      await assignLead(
        selectedLead.id,
        [{ userId, percentage: 100 }],
        accessToken,
      );
      toast("Lead reassigned successfully");
      setShowQuickAssignModal(false);
      await loadData(true);
      await loadLeadDetail(selectedLead.id);
    } catch (err: any) {
      toast(err.message || "Failed to reassign lead", true);
    } finally {
      setQuickAssignLoading(false);
    }
  };

  // Create & Edit Handlers
  const handleOpenCreateDrawer = () => {
    setFormData({
      name: "",
      type: "Samastha",
      districtId: districts[0]?.id || "",
      district: districts[0]?.name || "",
      place: "",
      address: "",
      studentCount: 150,
      teacherCount: 8,
      existingSoftware: "",
      source: "WHATSAPP",
      status: "NEW",
      enableCommission: false,
      commissionPercentage: 20,
      contributors: [{ userId: effectiveUserId, percentage: 20 }],
      contactName: "",
      contactPhone: "",
      contactSecondaryPhone: "",
      contactRole: "",
    });
    setShowCreateDrawer(true);
  };

  const handleStartEditLead = (lead: LeadDetail) => {
    const primaryC =
      lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];
    const initialContributors =
      lead.contributors && lead.contributors.length > 0
        ? lead.contributors.map((c) => ({
            userId: c.userId,
            percentage: Number(c.percentage || 0),
            notes: c.notes || "",
          }))
        : [
            {
              userId: effectiveUserId,
              percentage: Number(lead.commissionPercentage ?? 20),
            },
          ];

    setFormData({
      name: lead.name || "",
      type: lead.type || "Samastha",
      districtId:
        lead.districtId ||
        districts.find(
          (d) => d.name.toLowerCase() === (lead.district || "").toLowerCase(),
        )?.id ||
        "",
      district: lead.district || "",
      place: lead.place || "",
      address: lead.address || "",
      studentCount: lead.studentCount ?? 0,
      teacherCount: lead.teacherCount ?? 0,
      existingSoftware: lead.existingSoftware || "",
      source: lead.source || "WHATSAPP",
      status: (lead.status as LeadStatus) || "NEW",
      enableCommission: Number(lead.commissionPercentage ?? 0) > 0,
      commissionPercentage: Number(lead.commissionPercentage ?? 20),
      contributors: initialContributors,
      primaryContactId: primaryC?.id || "",
      contactName: primaryC?.name || "",
      contactPhone: primaryC?.phone || "",
      contactSecondaryPhone: primaryC?.secondaryPhone || "",
      contactRole: primaryC?.role || "",
    });
    setShowEditDrawer(true);
  };

  const handleSaveLead = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!formData.name.trim()) return toast("Madrasa name is required", true);
    if (!formData.district.trim() && !formData.districtId)
      return toast("District is required", true);

    setFormSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        districtId: formData.districtId || undefined,
        district: formData.district,
        place: formData.place,
        address: formData.address,
        studentCount: Number(formData.studentCount) || 0,
        teacherCount: Number(formData.teacherCount) || 0,
        existingSoftware: formData.existingSoftware,
        source: formData.source,
        status: formData.status as LeadStatus,
        commissionPercentage: formData.enableCommission
          ? Number(formData.commissionPercentage)
          : 0,
        contributors: formData.contributors.filter((c) => Boolean(c.userId)),
      };

      if (formData.contactName || formData.contactPhone) {
        payload.contact = {
          name: formData.contactName,
          phone: formData.contactPhone,
          secondaryPhone: formData.contactSecondaryPhone,
          role: formData.contactRole,
        };
      }

      if (isEdit && selectedLead) {
        await updateLead(selectedLead.id, payload, accessToken);
        toast("Madrasa lead updated successfully!");
        setShowEditDrawer(false);
        await loadLeadDetail(selectedLead.id);
      } else {
        const created = await createLead(payload, accessToken);
        toast("New lead created successfully!");
        setShowCreateDrawer(false);
        if (created?.id) selectLead(created.id);
      }
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to save lead", true);
    } finally {
      setFormSaving(false);
    }
  };

  // Detail Action Handlers
  const handleLogActivity = async (dto: {
    type: string;
    notes: string;
    followUpDate?: string;
  }) => {
    if (!selectedLead || !accessToken || !dto.notes.trim()) return;
    setActionLoading(true);
    try {
      await logActivity(
        selectedLead.id,
        {
          type: dto.type,
          notes: dto.notes,
          followUpDate: dto.followUpDate || undefined,
        },
        accessToken,
      );
      toast("Interaction logged successfully");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to log activity", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateActivity = async (
    timelineId: string,
    dto: { type?: string; notes?: string; followUpDate?: string | null },
  ) => {
    if (!selectedLead || !accessToken) return;
    setActionLoading(true);
    try {
      await updateActivity(selectedLead.id, timelineId, dto, accessToken);
      toast("Interaction updated successfully");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to update interaction", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteActivity = async (timelineId: string) => {
    if (!selectedLead || !accessToken) return;
    if (
      !window.confirm("Are you sure you want to delete this interaction note?")
    )
      return;
    setActionLoading(true);
    try {
      await deleteActivity(selectedLead.id, timelineId, accessToken);
      toast("Interaction removed.");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to remove interaction", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!accessToken) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this madrasa lead record? This action cannot be undone.",
      )
    )
      return;
    setActionLoading(true);
    try {
      await deleteLead(leadId, accessToken);
      toast("Lead deleted permanently.");
      closeLead();
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to delete lead", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProvisionTrial = async () => {
    if (!selectedLead || !accessToken) return;
    setActionLoading(true);
    try {
      await provisionTrial(selectedLead.id, accessToken);
      toast("Trial credentials created! Stage moved to Logged In.");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to provision trial", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToMadrasa = async (dto: {
    subdomain: string;
    adminName: string;
    adminIdentifier: string;
    adminPassword: string;
    amountPaid: number;
    commissionPercentage: number;
  }) => {
    if (!selectedLead || !accessToken) return;
    setActionLoading(true);
    try {
      await convertLead(selectedLead.id, dto, accessToken);
      toast("Madrasa converted to active subscription!");
      await loadLeadDetail(selectedLead.id);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || "Failed to convert madrasa", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleExecuteBulkAction = async () => {
    if (selectedLeadIds.size === 0 || !bulkModalType || !accessToken) return;
    setBulkActionLoading(true);
    const ids = Array.from(selectedLeadIds);
    try {
      if (bulkModalType === "DELETE") {
        await Promise.all(ids.map((id) => deleteLead(id, accessToken)));
        toast(`Permanently deleted ${ids.length} leads.`);
      } else if (bulkModalType === "ASSIGN") {
        await bulkLeadAction(
          {
            leadIds: ids,
            action: "ASSIGN",
            contributors: [{ userId: bulkSelectedUserId, percentage: 100 }],
          },
          accessToken,
        );
        toast(`Reassigned ${ids.length} leads successfully.`);
      } else if (bulkModalType === "STATUS") {
        await bulkLeadAction(
          {
            leadIds: ids,
            action: "STATUS",
            status: bulkSelectedStatus,
            remarks: bulkRemarks || undefined,
          },
          accessToken,
        );
        toast(`Updated stage for ${ids.length} leads.`);
      } else if (bulkModalType === "FOLLOW_UP") {
        await bulkLeadAction(
          {
            leadIds: ids,
            action: "FOLLOW_UP",
            followUpDate: bulkFollowUpDate || null,
            remarks: bulkRemarks || undefined,
          },
          accessToken,
        );
        toast(`Updated follow-up for ${ids.length} leads.`);
      }
      setSelectedLeadIds(new Set());
      setBulkModalType(null);
      await loadData(true);
      if (selectedLeadId && ids.includes(selectedLeadId))
        await loadLeadDetail(selectedLeadId);
    } catch (err: any) {
      toast(err.message || "Failed to execute bulk action", true);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filter Computation
  const baseFilteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (selectedAssignee === "ME") {
        if (!isLeadAssignedToUser(l, myIdentifiers, effectiveUserId))
          return false;
      } else if (selectedAssignee === "UNASSIGNED") {
        if (!isLeadUnassigned(l)) return false;
      }
      return true;
    });
  }, [leads, selectedAssignee, myIdentifiers, effectiveUserId]);

  const assigneeCounts = useMemo(() => {
    let me = 0;
    let unassigned = 0;
    leads.forEach((l) => {
      if (isLeadAssignedToUser(l, myIdentifiers, effectiveUserId)) me++;
      if (isLeadUnassigned(l)) unassigned++;
    });
    return { me, all: leads.length, unassigned };
  }, [leads, myIdentifiers, effectiveUserId]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: baseFilteredLeads.length };
    LEAD_STATUSES.forEach((st) => (counts[st] = 0));
    baseFilteredLeads.forEach((l) => {
      if (counts[l.status] !== undefined) counts[l.status]++;
    });
    return counts;
  }, [baseFilteredLeads]);

  const smartCounts = useMemo(() => {
    let aiPriority = 0;
    let closingFocus = 0;
    let overdue = 0;
    let today = 0;
    let untreated = 0;
    let stale = 0;
    let hotWarm = 0;
    let quality = 0;
    let noFollowup = 0;

    baseFilteredLeads.forEach((l) => {
      const p = calculateLeadSmartPriority(l, myIdentifiers, effectiveUserId);
      if (p.urgencyLevel === "CRITICAL" || p.urgencyLevel === "HIGH")
        aiPriority++;
      if (
        ["DATA_COLLECTION", "LOGGED_IN", "ADVANCE", "FULL_PAID"].includes(
          l.status,
        )
      )
        closingFocus++;
      if (p.isOverdue) overdue++;
      if (p.isToday) today++;
      if (p.isUntreated) untreated++;
      if (p.isStale) stale++;
      if (l.score === "HOT" || l.score === "WARM") hotWarm++;
      if (l.status === "QUALITY_LEAD") quality++;
      if (!l.nextFollowUpDate && !["WON", "LOST"].includes(l.status))
        noFollowup++;
    });

    return {
      all: baseFilteredLeads.length,
      aiPriority,
      closingFocus,
      overdue,
      today,
      untreated,
      stale,
      hotWarm,
      quality,
      noFollowup,
    };
  }, [baseFilteredLeads, myIdentifiers, effectiveUserId]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    districts.forEach((d) => set.add(d.name));
    leads.forEach((l) => {
      if (l.district) set.add(l.district);
    });
    return Array.from(set).sort();
  }, [districts, leads]);

  const filteredLeads = useMemo(() => {
    return baseFilteredLeads.filter((l) => {
      if (activeStage !== "ALL" && l.status !== activeStage) return false;
      if (selectedDistrict !== "ALL" && l.district !== selectedDistrict)
        return false;

      const priority = calculateLeadSmartPriority(
        l,
        myIdentifiers,
        effectiveUserId,
      );

      if (
        smartPreset === "AI_PRIORITY" &&
        priority.urgencyLevel !== "CRITICAL" &&
        priority.urgencyLevel !== "HIGH"
      )
        return false;
      if (
        smartPreset === "CLOSING_FOCUS" &&
        !["DATA_COLLECTION", "LOGGED_IN", "ADVANCE", "FULL_PAID"].includes(
          l.status,
        )
      )
        return false;
      if (smartPreset === "OVERDUE" && !priority.isOverdue) return false;
      if (smartPreset === "TODAY" && !priority.isToday) return false;
      if (smartPreset === "UNTREATED" && !priority.isUntreated) return false;
      if (smartPreset === "STALE" && !priority.isStale && !priority.isUntreated)
        return false;
      if (smartPreset === "HOT_WARM" && l.score !== "HOT" && l.score !== "WARM")
        return false;
      if (smartPreset === "QUALITY" && l.status !== "QUALITY_LEAD")
        return false;
      if (smartPreset === "NO_FOLLOWUP" && Boolean(l.nextFollowUpDate))
        return false;

      // Granular
      if (dueDateFilter === "OVERDUE" && !priority.isOverdue) return false;
      if (dueDateFilter === "TODAY" && !priority.isToday) return false;
      if (dueDateFilter === "TOMORROW" && priority.dueDaysDiff !== 1)
        return false;
      if (dueDateFilter === "THIS_WEEK") {
        if (
          priority.dueDaysDiff === null ||
          priority.dueDaysDiff < 0 ||
          priority.dueDaysDiff > 7
        )
          return false;
      }
      if (dueDateFilter === "CUSTOM" && dueDateFrom && dueDateTo) {
        if (!l.nextFollowUpDate) return false;
        const d = l.nextFollowUpDate.split("T")[0];
        if (d < dueDateFrom || d > dueDateTo) return false;
      }

      if (lastContactedFilter === "UNTREATED" && !priority.isUntreated)
        return false;
      if (
        lastContactedFilter === "STALE_7D" &&
        !priority.isStale &&
        !priority.isUntreated
      )
        return false;
      if (
        lastContactedFilter === "RECENT_48H" &&
        priority.daysSinceLastContact > 2
      )
        return false;

      if (leadScoreFilter !== "ALL" && l.score !== leadScoreFilter)
        return false;

      if (institutionSizeFilter === "LARGE" && (l.studentCount || 0) < 300)
        return false;
      if (
        institutionSizeFilter === "MEDIUM" &&
        ((l.studentCount || 0) < 100 || (l.studentCount || 0) >= 300)
      )
        return false;
      if (institutionSizeFilter === "SMALL" && (l.studentCount || 0) >= 100)
        return false;

      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const primaryC =
          l.contacts?.find((c) => c.isPrimary) || l.contacts?.[0];
        const matchName = l.name?.toLowerCase().includes(q);
        const matchPlace = l.place?.toLowerCase().includes(q);
        const matchDistrict = l.district?.toLowerCase().includes(q);
        const matchContact = primaryC?.name?.toLowerCase().includes(q);
        const matchPhone = primaryC?.phone
          ?.replace(/[^0-9]/g, "")
          .includes(q.replace(/[^0-9]/g, ""));
        if (
          !matchName &&
          !matchPlace &&
          !matchDistrict &&
          !matchContact &&
          !matchPhone
        )
          return false;
      }

      return true;
    });
  }, [
    baseFilteredLeads,
    activeStage,
    selectedDistrict,
    smartPreset,
    dueDateFilter,
    dueDateFrom,
    dueDateTo,
    lastContactedFilter,
    leadScoreFilter,
    institutionSizeFilter,
    debouncedSearch,
    myIdentifiers,
    effectiveUserId,
  ]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      if (sortBy === "SMART_PRIORITY") {
        const scoreA = calculateLeadSmartPriority(
          a,
          myIdentifiers,
          effectiveUserId,
        ).score;
        const scoreB = calculateLeadSmartPriority(
          b,
          myIdentifiers,
          effectiveUserId,
        ).score;
        return scoreB - scoreA;
      }
      if (sortBy === "URGENT") {
        const diffA = a.nextFollowUpDate
          ? new Date(a.nextFollowUpDate).getTime()
          : Infinity;
        const diffB = b.nextFollowUpDate
          ? new Date(b.nextFollowUpDate).getTime()
          : Infinity;
        return diffA - diffB;
      }
      if (sortBy === "FOLLOWUP_ASC") {
        const diffA = a.nextFollowUpDate
          ? new Date(a.nextFollowUpDate).getTime()
          : Infinity;
        const diffB = b.nextFollowUpDate
          ? new Date(b.nextFollowUpDate).getTime()
          : Infinity;
        return diffA - diffB;
      }
      if (sortBy === "FOLLOWUP_DESC") {
        const diffA = a.nextFollowUpDate
          ? new Date(a.nextFollowUpDate).getTime()
          : -Infinity;
        const diffB = b.nextFollowUpDate
          ? new Date(b.nextFollowUpDate).getTime()
          : -Infinity;
        return diffB - diffA;
      }
      if (sortBy === "STUDENTS")
        return (b.studentCount || 0) - (a.studentCount || 0);
      if (sortBy === "NEWEST")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === "NAME") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [filteredLeads, sortBy, myIdentifiers, effectiveUserId]);

  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  const hasActiveFilters =
    search.trim() !== "" ||
    activeStage !== "ALL" ||
    smartPreset !== "ALL" ||
    selectedDistrict !== "ALL" ||
    dueDateFilter !== "ALL" ||
    lastContactedFilter !== "ALL" ||
    leadScoreFilter !== "ALL" ||
    institutionSizeFilter !== "ALL";

  const handleResetFilters = () => {
    setSearch("");
    setActiveStage("ALL");
    setSmartPreset("ALL");
    setSelectedDistrict("ALL");
    setDueDateFilter("ALL");
    setDueDateFrom("");
    setDueDateTo("");
    setLastContactedFilter("ALL");
    setLeadScoreFilter("ALL");
    setInstitutionSizeFilter("ALL");
  };

  const importConfig = useMemo(() => {
    return createCrmImportConfig(async (items) => {
      if (!accessToken) return;
      await bulkImportLeads(items, accessToken);
      toast(`Successfully imported ${items.length} records!`);
      loadData(true);
    });
  }, [accessToken, toast, loadData]);

  const canDelete = user?.actorType === "SUPER_ADMIN" || user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-3 pb-28 sm:pb-12">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border",
                toastMessage.isError
                  ? "bg-rose-50 border-rose-300 text-rose-900"
                  : "bg-emerald-50 border-emerald-300 text-emerald-950",
              )}
            >
              {toastMessage.isError ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CRM Sub Navigation */}
        {/* <CrmSubNav /> */}

        {/* ── Top Header: Single Row Compact Header ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                Leads &amp; Sales Funnel
              </h1>
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-primary-50 text-primary-700 border border-primary-200 shrink-0">
                {leads.length}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 truncate">
              Portfolio: <span className="font-medium text-gray-700">{user?.name || "Representative"}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="h-8 px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateDrawer}
              className="h-8 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* ── Streamlined Single Toolbar (No Heavy Chip Tracks) ── */}
        <LeadToolbar
          search={search}
          setSearch={setSearch}
          selectedAssignee={selectedAssignee}
          setSelectedAssignee={setSelectedAssignee}
          assigneeCounts={assigneeCounts}
          activeStage={activeStage}
          setActiveStage={setActiveStage}
          stageCounts={stageCounts}
          smartPreset={smartPreset}
          setSmartPreset={setSmartPreset}
          smartCounts={smartCounts}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          availableDistricts={availableDistricts}
          sortBy={sortBy}
          setSortBy={setSortBy}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          dueDateFilter={dueDateFilter}
          setDueDateFilter={setDueDateFilter}
          dueDateFrom={dueDateFrom}
          setDueDateFrom={setDueDateFrom}
          dueDateTo={dueDateTo}
          setDueDateTo={setDueDateTo}
          lastContactedFilter={lastContactedFilter}
          setLastContactedFilter={setLastContactedFilter}
          leadScoreFilter={leadScoreFilter}
          setLeadScoreFilter={setLeadScoreFilter}
          institutionSizeFilter={institutionSizeFilter}
          setInstitutionSizeFilter={setInstitutionSizeFilter}
        />

        {/* ── Split Layout: Master List & Detail Panel (Zero Nested Scroll Traps) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Lead List Cards */}
          <div className="w-full lg:col-span-5 xl:col-span-4 2xl:col-span-4 relative flex flex-col bg-white border border-gray-200/90 rounded-2xl sm:rounded-3xl shadow-2xs">
            {/* Header: Select All & Counts */}
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-100 bg-gray-50/70 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    paginatedLeads.length > 0 &&
                    paginatedLeads.every((l) => selectedLeadIds.has(l.id))
                  }
                  onChange={(e) => {
                    const next = new Set(selectedLeadIds);
                    if (e.target.checked)
                      paginatedLeads.forEach((l) => next.add(l.id));
                    else paginatedLeads.forEach((l) => next.delete(l.id));
                    setSelectedLeadIds(next);
                  }}
                  className="w-3.5 h-3.5 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer"
                  title="Select all on this page"
                />
                <span className="text-xs font-bold text-gray-800 tracking-tight">
                  {smartPreset !== "ALL"
                    ? smartPreset.replace(/_/g, " ")
                    : activeStage === "ALL"
                      ? "All Leads"
                      : (LEAD_STATUS_LABELS[activeStage as LeadStatus] ??
                        activeStage)}
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                {filteredLeads.length} records
              </span>
            </div>

            {/* List Container: Natural document flow with zero scroll limits */}
            <div className="p-2.5 sm:p-3.5 space-y-2 sm:space-y-3">
              {loading && (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  <span className="text-xs font-semibold">
                    Loading prospects...
                  </span>
                </div>
              )}

              {!loading && filteredLeads.length === 0 && (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    No leads match criteria
                  </p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Try clearing filters or switching scope to view all
                    prospects.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-primary-600 underline"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              )}

              {!loading &&
                paginatedLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedLeadId === lead.id}
                    isChecked={selectedLeadIds.has(lead.id)}
                    onSelect={selectLead}
                    onToggleCheck={(id, checked) => {
                      const next = new Set(selectedLeadIds);
                      if (checked) next.add(id);
                      else next.delete(id);
                      setSelectedLeadIds(next);
                    }}
                    myIdentifiers={myIdentifiers}
                    effectiveUserId={effectiveUserId}
                    onFastUpdateStatus={handleUpdateStage}
                    onFastScheduleFollowUp={handleQuickUpdateFollowUp}
                    onSelfClaim={handleSelfClaim}
                  />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-gray-100 bg-white rounded-b-2xl sm:rounded-b-3xl flex items-center justify-between shrink-0 text-xs">
                <span className="text-gray-500 font-medium">
                  Page <strong className="text-gray-800">{currentPage}</strong>{" "}
                  of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Detail View (Clean Sticky Panel, Zero Double Scroll Traps) */}
          <div
            className={cn(
              "hidden lg:flex lg:col-span-7 xl:col-span-8 2xl:col-span-8 relative flex-col bg-white border border-gray-200/90 rounded-3xl shadow-xs",
              "lg:sticky lg:top-6",
            )}
          >
            {selectedLeadId && detailLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="text-xs font-bold">
                  Loading lead dossier...
                </span>
              </div>
            )}

            {selectedLeadId && !detailLoading && selectedLead && (
              <div className="p-5 sm:p-6">
                <LeadDetailView
                  lead={selectedLead}
                  myIdentifiers={myIdentifiers}
                  effectiveUserId={effectiveUserId}
                  assigneeOptions={assigneeOptions}
                  actionLoading={actionLoading}
                  canDelete={canDelete}
                  copiedText={copiedText}
                  copyToClipboard={copyToClipboard}
                  onUpdateStage={handleUpdateStage}
                  onStartEdit={handleStartEditLead}
                  onSelfClaim={handleSelfClaim}
                  onOpenQuickAssign={() => {
                    setQuickAssignUserId(
                      selectedLead.contributors?.[0]?.userId ||
                        effectiveUserId ||
                        assigneeOptions[0]?.id ||
                        "",
                    );
                    setShowQuickAssignModal(true);
                  }}
                  onQuickUpdateFollowUp={handleQuickUpdateFollowUp}
                  onLogActivity={handleLogActivity}
                  onUpdateActivity={handleUpdateActivity}
                  onDeleteActivity={handleDeleteActivity}
                  onProvisionTrial={handleProvisionTrial}
                  onConvertToMadrasa={handleConvertToMadrasa}
                  onDeleteLead={handleDeleteLead}
                />
              </div>
            )}

            {!selectedLeadId && !detailLoading && (
              <div className="py-24 flex flex-col items-center justify-center text-center gap-3 px-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  Select a Prospect
                </h3>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  Click any lead from the list to view institutional parameters,
                  outreach timeline, and manage stage progressions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile Slide-Up Bottom Drawer Sheet (True Mobile-Native UX) ── */}
        <AnimatePresence>
          {showMobileDetail && selectedLeadId && (
            <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
              {/* Semi-transparent backdrop blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeLead}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              />

              {/* Bottom Sheet Drawer Panel */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="relative z-10 w-full max-h-[calc(100dvh-2rem)] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-gray-200"
              >
                {/* Pull handle bar */}
                <div className="pt-3 pb-1 flex justify-center shrink-0 cursor-grab">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Mobile Drawer Accessible Header */}
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      {selectedLead?.name || "Lead Details"}
                    </h3>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {selectedLead?.place ? `${selectedLead.place} • ` : ""}
                      {selectedLead?.district || ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedLead && (
                      <button
                        type="button"
                        onClick={() => handleStartEditLead(selectedLead)}
                        className="h-7.5 px-2.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Pencil className="w-3 h-3 text-gray-600" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeLead}
                      className="h-7.5 w-7.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all active:scale-95"
                      aria-label="Close details drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Single, Smooth, Native Drawer Scroll Container */}
                <div
                  className="flex-1 overflow-y-auto overscroll-contain p-4 pb-28"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {detailLoading || !selectedLead ? (
                    <div className="py-20 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                      <p className="text-xs font-medium text-gray-500 mt-2">
                        Loading details...
                      </p>
                    </div>
                  ) : (
                    <LeadDetailView
                      lead={selectedLead}
                      myIdentifiers={myIdentifiers}
                      effectiveUserId={effectiveUserId}
                      assigneeOptions={assigneeOptions}
                      actionLoading={actionLoading}
                      canDelete={canDelete}
                      copiedText={copiedText}
                      copyToClipboard={copyToClipboard}
                      onUpdateStage={handleUpdateStage}
                      onStartEdit={handleStartEditLead}
                      onSelfClaim={handleSelfClaim}
                      onOpenQuickAssign={() => {
                        setQuickAssignUserId(
                          selectedLead.contributors?.[0]?.userId ||
                            effectiveUserId ||
                            assigneeOptions[0]?.id ||
                            "",
                        );
                        setShowQuickAssignModal(true);
                      }}
                      onQuickUpdateFollowUp={handleQuickUpdateFollowUp}
                      onLogActivity={handleLogActivity}
                      onUpdateActivity={handleUpdateActivity}
                      onDeleteActivity={handleDeleteActivity}
                      onProvisionTrial={handleProvisionTrial}
                      onConvertToMadrasa={handleConvertToMadrasa}
                      onDeleteLead={handleDeleteLead}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Floating Bulk Action Toolbar ── */}
        <AnimatePresence>
          {selectedLeadIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-3 right-3 lg:bottom-8 lg:left-auto lg:right-8 z-40 bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-gray-700 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold bg-primary-600 text-white px-2 py-0.5 rounded-full">
                  {selectedLeadIds.size}
                </span>
                <span className="text-xs font-semibold text-gray-200 hidden sm:inline">
                  selected
                </span>
                {selectedLeadIds.size < filteredLeads.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLeadIds(
                        new Set(filteredLeads.map((l) => l.id)),
                      )
                    }
                    className="text-xs font-bold text-primary-400 hover:text-primary-300 underline ml-1"
                  >
                    Select All ({filteredLeads.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setBulkSelectedUserId(
                      effectiveUserId || assigneeOptions[0]?.id || "",
                    );
                    setBulkModalType("ASSIGN");
                  }}
                  className="min-h-[36px] sm:min-h-[34px] px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Assign</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkSelectedStatus("FOLLOW_UP");
                    setBulkRemarks("");
                    setBulkModalType("STATUS");
                  }}
                  className="min-h-[36px] sm:min-h-[34px] px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Stage</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkFollowUpDate(formatLocalDateForInput(new Date()));
                    setBulkRemarks("");
                    setBulkModalType("FOLLOW_UP");
                  }}
                  className="min-h-[36px] sm:min-h-[34px] px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4 text-emerald-400" />
                  <span>Follow-up</span>
                </button>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setBulkModalType("DELETE")}
                    className="min-h-[36px] sm:min-h-[34px] px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedLeadIds(new Set())}
                  className="min-h-[36px] min-w-[36px] bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all ml-1 flex items-center justify-center"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Drawers and Modals ── */}
        <LeadFormDrawer
          isOpen={showCreateDrawer}
          mode="create"
          onClose={() => setShowCreateDrawer(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={(e) => handleSaveLead(e, false)}
          isSaving={formSaving}
          districts={districts}
          assigneeOptions={assigneeOptions}
          effectiveUserId={effectiveUserId}
        />

        <LeadFormDrawer
          isOpen={showEditDrawer}
          mode="edit"
          onClose={() => setShowEditDrawer(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={(e) => handleSaveLead(e, true)}
          isSaving={formSaving}
          districts={districts}
          assigneeOptions={assigneeOptions}
          effectiveUserId={effectiveUserId}
        />

        <LeadQuickAssignModal
          isOpen={showQuickAssignModal}
          onClose={() => setShowQuickAssignModal(false)}
          lead={selectedLead}
          assigneeOptions={assigneeOptions}
          selectedUserId={quickAssignUserId}
          onSelectUserId={setQuickAssignUserId}
          onConfirm={handleQuickAssign}
          isLoading={quickAssignLoading}
          effectiveUserId={effectiveUserId}
        />

        <LeadBulkModal
          isOpen={Boolean(bulkModalType)}
          bulkModalType={bulkModalType}
          onClose={() => setBulkModalType(null)}
          selectedLeadCount={selectedLeadIds.size}
          assigneeOptions={assigneeOptions}
          effectiveUserId={effectiveUserId}
          bulkSelectedUserId={bulkSelectedUserId}
          onSelectUserId={setBulkSelectedUserId}
          bulkSelectedStatus={bulkSelectedStatus}
          onSelectStatus={setBulkSelectedStatus}
          bulkFollowUpDate={bulkFollowUpDate}
          onSelectFollowUpDate={setBulkFollowUpDate}
          bulkRemarks={bulkRemarks}
          onChangeRemarks={setBulkRemarks}
          onConfirm={handleExecuteBulkAction}
          isLoading={bulkActionLoading}
        />

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
