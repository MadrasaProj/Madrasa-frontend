import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  PhoneCall,
  ThumbsUp,
  CalendarClock,
  Star,
  FolderOpen,
  KeyRound,
  Receipt,
  CheckCircle2,
  Trophy,
  XCircle,
  PauseCircle,
} from "lucide-react";
import type { LeadListItem, LeadDetail, DistrictItem, InternalUserItem } from "@/lib/crm-api";

export type LeadScopeTab = "ALL" | "ME" | "UNASSIGNED";

// ─── Lead Sort Options ────────────────────────────────────────────────────────
export type LeadSortOption =
  | "SMART_PRIORITY"
  | "URGENT"
  | "FOLLOWUP_ASC"
  | "FOLLOWUP_DESC"
  | "LAST_FOLLOWUP_ASC"
  | "LAST_FOLLOWUP_DESC"
  | "STATUS_CHANGED_DESC"
  | "STATUS_CHANGED_ASC"
  | "SCORE_DESC"
  | "STUDENTS"
  | "NEWEST"
  | "OLDEST"
  | "NAME";

// ─── Strictly Core Lead Statuses (Natural Sequence) ────────────────────────
export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "QUALITY_LEAD",
  "DATA_COLLECTION",
  "LOGGED_IN",
  "ADVANCE",
  "FULL_PAID",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ─── Daily Work Sequence (Focus from Data Collection & Closing funnel back to New) ─
export const DAILY_WORK_STAGE_ORDER: LeadStatus[] = [
  "DATA_COLLECTION",
  "LOGGED_IN",
  "ADVANCE",
  "FULL_PAID",
  "QUALITY_LEAD",
  "FOLLOW_UP",
  "INTERESTED",
  "CONTACTED",
  "NEW",
  "WON",
  "ON_HOLD",
  "LOST",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  QUALITY_LEAD: "Quality Lead",
  DATA_COLLECTION: "Data Collection",
  LOGGED_IN: "Logged In",
  ADVANCE: "Advance",
  FULL_PAID: "Full Paid",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On Hold",
};

export const SHORT_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  QUALITY_LEAD: "Quality",
  DATA_COLLECTION: "Data Col",
  LOGGED_IN: "Logged In",
  ADVANCE: "Advance",
  FULL_PAID: "Full Paid",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On Hold",
};

export const STAGE_LUCIDE_ICONS: Record<LeadStatus, LucideIcon> = {
  NEW: Sparkles,
  CONTACTED: PhoneCall,
  INTERESTED: ThumbsUp,
  FOLLOW_UP: CalendarClock,
  QUALITY_LEAD: Star,
  DATA_COLLECTION: FolderOpen,
  LOGGED_IN: KeyRound,
  ADVANCE: Receipt,
  FULL_PAID: CheckCircle2,
  WON: Trophy,
  LOST: XCircle,
  ON_HOLD: PauseCircle,
};

export const STAGE_ICONS: Record<LeadStatus, string> = {
  NEW: "•",
  CONTACTED: "•",
  INTERESTED: "•",
  FOLLOW_UP: "•",
  QUALITY_LEAD: "•",
  DATA_COLLECTION: "•",
  LOGGED_IN: "•",
  ADVANCE: "•",
  FULL_PAID: "•",
  WON: "•",
  LOST: "•",
  ON_HOLD: "•",
};

// ─── Semantic Color Hierarchy (Clean, Focused, Low-Fatigue Palette) ──────────
export const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-gray-100 text-gray-800 border-gray-200/90",
  CONTACTED: "bg-blue-50 text-blue-900 border-blue-200/70",
  INTERESTED: "bg-blue-50 text-blue-900 border-blue-200/70 font-medium",
  FOLLOW_UP: "bg-amber-50 text-amber-900 border-amber-200/80 font-medium",
  QUALITY_LEAD: "bg-slate-100 text-slate-800 border-slate-300 font-semibold",
  DATA_COLLECTION: "bg-purple-50 text-purple-900 border-purple-200/70 font-medium",
  LOGGED_IN: "bg-indigo-50 text-indigo-900 border-indigo-200/70 font-medium",
  ADVANCE: "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold",
  FULL_PAID: "bg-emerald-50 text-emerald-950 border-emerald-400 font-extrabold",
  WON: "bg-emerald-100 text-emerald-950 border-emerald-400 font-black",
  LOST: "bg-gray-100 text-gray-600 border-gray-200/90",
  ON_HOLD: "bg-gray-100 text-gray-700 border-gray-200/90",
};

export const SCORE_COLORS: Record<string, string> = {
  COLD: "bg-gray-100 text-gray-600 border-gray-200",
  WARM: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
  HOT: "bg-rose-50 text-rose-800 border-rose-200 font-bold",
  READY_TO_CLOSE: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold",
};

export const PIPELINE_STEPS = [
  { key: "new", label: "New Lead", statuses: ["NEW"] as LeadStatus[] },
  { key: "contacted", label: "Contacted", statuses: ["CONTACTED"] as LeadStatus[] },
  { key: "interested", label: "Interested", statuses: ["INTERESTED"] as LeadStatus[] },
  { key: "follow_up", label: "Follow Up", statuses: ["FOLLOW_UP"] as LeadStatus[] },
  { key: "quality", label: "Quality Lead", statuses: ["QUALITY_LEAD"] as LeadStatus[] },
  { key: "data_collection", label: "Data Collection", statuses: ["DATA_COLLECTION"] as LeadStatus[] },
  { key: "logged_in", label: "Logged In", statuses: ["LOGGED_IN"] as LeadStatus[] },
  { key: "advance", label: "Advance", statuses: ["ADVANCE"] as LeadStatus[] },
  { key: "full_paid", label: "Full Paid", statuses: ["FULL_PAID"] as LeadStatus[] },
  { key: "won", label: "Won", statuses: ["WON"] as LeadStatus[] },
  { key: "lost", label: "Lost", statuses: ["LOST"] as LeadStatus[] },
  { key: "on_hold", label: "On Hold", statuses: ["ON_HOLD"] as LeadStatus[] },
];

export const ACTIVITY_TYPES = [
  { value: "CALL", label: "Phone Call" },
  { value: "WHATSAPP", label: "WhatsApp Message" },
  { value: "MEETING", label: "Committee Meeting" },
  { value: "SITE_VISIT", label: "Campus / Site Visit" },
  { value: "PROPOSAL_SENT", label: "Proposal / Quote Sent" },
];

export const LEAD_SOURCES = [
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

export const CONTACT_ROLES = ["Sadr Usthad", "Secretary", "President", "Manager", "Muhtamim", "Other"];

export const OUTCOME_DISPOSITIONS = [
  { label: "Interested", text: "Interested in Smart Madrasa. Discussed setup requirements." },
  { label: "Follow-up Needed", text: "Discussion had; follow-up requested for later." },
  { label: "No Answer / Busy", text: "Call unanswered / line busy. Scheduled retry." },
  { label: "WhatsApp Sent", text: "Sent feature brochures & intro via WhatsApp." },
  { label: "Demo Requested", text: "Demo requested for committee members / Usthad." },
  { label: "Pricing Discussed", text: "Discussed fee plans & student count packages." },
  { label: "Not Interested", text: "Not interested currently; review in future." },
];

export interface SmartPriorityResult {
  score: number;
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL" | "CLOSED";
  primaryReason: string;
  badgeColor: string;
  isOverdue: boolean;
  isToday: boolean;
  isUntreated: boolean;
  isStale: boolean;
  daysSinceLastContact: number;
  dueDaysDiff: number | null;
}
