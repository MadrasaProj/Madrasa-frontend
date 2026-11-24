import type { LeadListItem, LeadDetail } from "@/lib/crm-api";
import {
  type LeadStatus,
  type SmartPriorityResult,
  LEAD_STATUSES,
} from "./crm-types";

// ─── Smart Priority Scoring Algorithm ─────────────────────────────────────────
export function isLeadUnassigned(lead: LeadListItem): boolean {
  const hasValidContributor = Boolean(
    lead.contributors &&
      lead.contributors.some((c) => Boolean(c.userId || c.user?.id || (c.user?.name && c.user.name.trim())))
  );
  const hasDirectAssignee = Boolean((lead as any).assignedUserId || (lead as any).assignedTo);
  return !hasValidContributor && !hasDirectAssignee;
}

export function calculateLeadSmartPriority(
  lead: LeadListItem,
  myIdentifiers?: Set<string>,
  explicitUserId?: string
): SmartPriorityResult {
  if (lead.status === "WON" || lead.status === "LOST") {
    return {
      score: -1000,
      urgencyLevel: "CLOSED",
      primaryReason: lead.status === "WON" ? "Account Won" : "Lead Closed",
      badgeColor: "bg-gray-100 text-gray-500 border-gray-200",
      isOverdue: false,
      isToday: false,
      isUntreated: false,
      isStale: false,
      daysSinceLastContact: 0,
      dueDaysDiff: null,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Follow-up due calculation
  let dueDaysDiff: number | null = null;
  let isOverdue = false;
  let isToday = false;

  if (lead.nextFollowUpDate) {
    const fDate = new Date(lead.nextFollowUpDate);
    fDate.setHours(0, 0, 0, 0);
    dueDaysDiff = Math.round((fDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (dueDaysDiff < 0) isOverdue = true;
    else if (dueDaysDiff === 0) isToday = true;
  }

  // Last touch / follow-up calculation
  let lastTouchDate: Date | null = null;
  if (lead.timeline && lead.timeline.length > 0) {
    lastTouchDate = new Date(lead.timeline[0].createdAt);
  }

  const daysSinceLastContact = lastTouchDate
    ? Math.floor((now.getTime() - lastTouchDate.getTime()) / (1000 * 60 * 60 * 24))
    : -1;

  const isUntreated = daysSinceLastContact === -1 && (!lead.timeline || lead.timeline.length === 0);
  const isStale = daysSinceLastContact >= 7;

  let score = 50;
  let primaryReason = "Standard Follow-up";
  let urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL" = "NORMAL";
  let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

  // Check if lead is assigned to current user
  let isAssignedToMe = false;
  let isUnassigned = false;

  if (myIdentifiers && myIdentifiers.size > 0) {
    if (lead.contributors && lead.contributors.length > 0) {
      for (const c of lead.contributors) {
        const cId = (c.userId || c.user?.id || "").toLowerCase().trim();
        const cName = (c.user?.name || "").toLowerCase().trim();
        const cUsername = ((c.user as any)?.username || "").toLowerCase().trim();
        const cEmail = ((c.user as any)?.email || "").toLowerCase().trim();

        if (explicitUserId && cId && cId === explicitUserId.toLowerCase().trim()) {
          isAssignedToMe = true;
          break;
        }
        if (cId && myIdentifiers.has(cId)) {
          isAssignedToMe = true;
          break;
        }
        if (cName && myIdentifiers.has(cName)) {
          isAssignedToMe = true;
          break;
        }
        if (cUsername && myIdentifiers.has(cUsername)) {
          isAssignedToMe = true;
          break;
        }
        if (cEmail && myIdentifiers.has(cEmail)) {
          isAssignedToMe = true;
          break;
        }
      }
    }

    if (!isAssignedToMe) {
      const directId = ((lead as any).assignedUserId || (lead as any).assignedTo || "").toLowerCase().trim();
      if (directId && (myIdentifiers.has(directId) || (explicitUserId && directId === explicitUserId.toLowerCase().trim()))) {
        isAssignedToMe = true;
      }
    }

    if (!isAssignedToMe && (!lead.contributors || lead.contributors.length === 0) && lead.createdBy) {
      if (myIdentifiers.has(lead.createdBy.toLowerCase().trim())) {
        isAssignedToMe = true;
      }
    }

    const hasValidContributor = Boolean(
      lead.contributors &&
      lead.contributors.some((c) => Boolean(c.userId || c.user?.id || (c.user?.name && c.user.name.trim())))
    );
    const hasDirectAssignee = Boolean((lead as any).assignedUserId || (lead as any).assignedTo);
    isUnassigned = !hasValidContributor && !hasDirectAssignee;
  }

  // Urgency & Scheduling scoring
  if (isOverdue) {
    const daysOverdue = Math.abs(dueDaysDiff!);
    score += 110 + Math.min(daysOverdue * 6, 50);
    urgencyLevel = "CRITICAL";
    primaryReason = isAssignedToMe
      ? `Your Account • Overdue ${daysOverdue}d`
      : `Overdue by ${daysOverdue}d`;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
  } else if (isToday) {
    score += 95;
    urgencyLevel = "HIGH";
    primaryReason = isAssignedToMe ? "Your Account • Due Today" : "Follow-up Due Today";
    badgeColor = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
  } else if (dueDaysDiff === 1) {
    score += 70;
    urgencyLevel = "MEDIUM";
    primaryReason = isAssignedToMe ? "Your Account • Due Tomorrow" : "Due Tomorrow";
    badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
  } else if (!lead.nextFollowUpDate) {
    if (isUntreated) {
      score += 90;
      urgencyLevel = "HIGH";
      primaryReason = isAssignedToMe ? "Your Account • Untreated (Call)" : "Untreated Lead (Needs Call)";
      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (isStale) {
      score += 80;
      urgencyLevel = "HIGH";
      primaryReason = isAssignedToMe
        ? `Your Account • Stale ${daysSinceLastContact}d`
        : `Stale: Untouched ${daysSinceLastContact}d`;
      badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
    } else {
      score += 45;
      primaryReason = isAssignedToMe ? "Your Account • Needs Follow-up Date" : "Needs Follow-up Date";
      badgeColor = "bg-gray-100 text-gray-600 border-gray-200";
    }
  }

  // If lead is untreated (no timeline at all)
  if (isUntreated && !isOverdue && !isToday) {
    score += 45;
    urgencyLevel = "HIGH";
    primaryReason = isAssignedToMe ? "Your Account • Never Contacted" : "Untreated Lead (Never Contacted)";
    badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  }

  // Personal Assignee Priority Boost (+65 pts)
  if (isAssignedToMe) {
    score += 65;
  } else if (isUnassigned) {
    score += 35;
    if (!isOverdue && !isToday) {
      primaryReason += " • Unassigned (Claim)";
    }
  }

  // Quality & Volume weighting
  if (lead.score === "HOT") {
    score += 35;
    if (!isOverdue) {
      primaryReason += " • Hot Deal";
    }
  } else if (lead.score === "WARM") {
    score += 20;
  }

  // Institutional Student Count (deal size weighting)
  if ((lead.studentCount || 0) >= 400) {
    score += 30;
    if (urgencyLevel !== "CRITICAL") {
      primaryReason += ` • High Volume (${lead.studentCount} stu)`;
    }
  } else if ((lead.studentCount || 0) >= 200) {
    score += 15;
  }

  // Daily Closing Focus Stage weighting (Data Collection, Logged In, Advance, Full Paid)
  if (lead.status === "FULL_PAID" || lead.status === "ADVANCE") {
    score += 55;
    if (!isOverdue && !isToday) primaryReason += " • Closing Deal";
  } else if (lead.status === "DATA_COLLECTION" || lead.status === "LOGGED_IN") {
    score += 45;
    if (!isOverdue && !isToday) primaryReason += " • Active Onboarding";
  } else if (lead.status === "QUALITY_LEAD") {
    score += 30;
  } else if (lead.status === "FOLLOW_UP") {
    score += 15;
  } else if (lead.status === "INTERESTED") {
    score += 10;
  } else if (lead.status === "CONTACTED") {
    score += 5;
  }

  // Deprioritize closed leads from active priority queues
  if (lead.status === "WON" || lead.status === "LOST") {
    score = -100;
  }

  return {
    score,
    urgencyLevel,
    primaryReason,
    badgeColor,
    isOverdue,
    isToday,
    isUntreated,
    isStale,
    daysSinceLastContact,
    dueDaysDiff,
  };
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatLocalDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeLeadStatus(status?: string | null): LeadStatus {
  if (!status || !LEAD_STATUSES.includes(status as any)) return "NEW";
  return status as LeadStatus;
}

export function getLeadFollowUpCategory(dateStr?: string | null): "OVERDUE" | "TODAY" | "FUTURE" | "NONE" {
  if (!dateStr) return "NONE";
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "OVERDUE";
  if (diffDays === 0) return "TODAY";
  return "FUTURE";
}

export function getFollowUpStatus(dateStr?: string | null): {
  label: string;
  urgency: "overdue" | "today" | "upcoming" | "none";
  badgeClass: string;
} {
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
}

export function isLeadAssignedToUser(
  lead: LeadListItem | LeadDetail,
  identifiers?: Set<string>,
  explicitUserId?: string
): boolean {
  if (!identifiers || identifiers.size === 0) return false;

  // 1. Check contributors
  if (lead.contributors && lead.contributors.length > 0) {
    for (const c of lead.contributors) {
      const cId = (c.userId || c.user?.id || "").toLowerCase().trim();
      const cName = (c.user?.name || "").toLowerCase().trim();
      const cUsername = ((c.user as any)?.username || "").toLowerCase().trim();
      const cEmail = ((c.user as any)?.email || "").toLowerCase().trim();

      if (explicitUserId && cId && cId === explicitUserId.toLowerCase().trim()) return true;
      if (cId && identifiers.has(cId)) return true;
      if (cName && identifiers.has(cName)) return true;
      if (cUsername && identifiers.has(cUsername)) return true;
      if (cEmail && identifiers.has(cEmail)) return true;
    }
  }

  // 2. Direct assigned property if present on lead
  const directAssignedId = ((lead as any).assignedUserId || (lead as any).assignedTo || "").toLowerCase().trim();
  if (directAssignedId) {
    if (explicitUserId && directAssignedId === explicitUserId.toLowerCase().trim()) return true;
    if (identifiers.has(directAssignedId)) return true;
  }

  // 3. Fallback: check createdBy if no contributors exist
  if ((!lead.contributors || lead.contributors.length === 0) && lead.createdBy) {
    const createdByLower = lead.createdBy.toLowerCase().trim();
    if (identifiers.has(createdByLower)) return true;
  }

  return false;
}
