import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Phone,
  MessageSquare,
  Clock,
  Sparkles,
  Pencil,
  Copy,
  Check,
  AlertTriangle,
  CalendarClock,
  X,
  Loader2,
  Play,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Trash,
  ChevronDown,
  MapPin,
  UserCheck,
  UserX,
  UserPlus,
} from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  STAGE_LUCIDE_ICONS,
  STATUS_COLORS,
  SCORE_COLORS,
  ACTIVITY_TYPES,
  OUTCOME_DISPOSITIONS,
  type LeadStatus,
} from "./crm-types";
import {
  getFollowUpStatus,
  isLeadAssignedToUser,
  formatLocalDateForInput,
} from "./crm-utils";
import type { LeadDetail, InternalUserItem } from "@/lib/crm-api";
import { CrmChipDropdown } from "./CrmChipDropdown";
import { cn } from "@/lib/utils";

interface LeadDetailViewProps {
  lead: LeadDetail;
  myIdentifiers: Set<string>;
  effectiveUserId?: string;
  assigneeOptions: InternalUserItem[];
  actionLoading: boolean;
  canDelete?: boolean;
  copiedText: string | null;
  copyToClipboard: (text: string, label: string) => void;
  onUpdateStage: (stage: string, leadId: string) => void;
  onStartEdit: (lead: LeadDetail) => void;
  onSelfClaim: (leadId: string) => void;
  onOpenQuickAssign: () => void;
  onQuickUpdateFollowUp: (date: string | null, leadId: string, remarks?: string) => Promise<void>;
  onLogActivity: (dto: { type: string; notes: string; followUpDate?: string }) => Promise<void>;
  onUpdateActivity: (timelineId: string, dto: { type?: string; notes?: string; followUpDate?: string | null }) => Promise<void>;
  onDeleteActivity: (timelineId: string) => Promise<void>;
  onProvisionTrial: () => Promise<void>;
  onConvertToMadrasa: (dto: { subdomain: string; adminName: string; adminIdentifier: string; adminPassword: string; amountPaid: number; commissionPercentage: number }) => Promise<void>;
  onDeleteLead?: (leadId: string) => Promise<void>;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  myIdentifiers,
  effectiveUserId,
  actionLoading,
  canDelete,
  copiedText,
  copyToClipboard,
  onUpdateStage,
  onStartEdit,
  onSelfClaim,
  onOpenQuickAssign,
  onQuickUpdateFollowUp,
  onLogActivity,
  onUpdateActivity,
  onDeleteActivity,
  onProvisionTrial,
  onConvertToMadrasa,
  onDeleteLead,
}) => {
  // Quick Log Note State
  const [logType, setLogType] = useState("CALL");
  const [logNotes, setLogNotes] = useState("");
  const [logFollowUpDate, setLogFollowUpDate] = useState("");
  const [logSaving, setLogSaving] = useState(false);

  // Edit Timeline Item State
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [editTimelineNotes, setEditTimelineNotes] = useState("");
  const [editTimelineType, setEditTimelineType] = useState("CALL");
  const [editTimelineFollowUp, setEditTimelineFollowUp] = useState("");
  const [timelineUpdating, setTimelineUpdating] = useState(false);

  // Convert Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSubdomain, setConvertSubdomain] = useState(
    lead.name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15)
  );
  const [convertAdminName, setConvertAdminName] = useState(lead.contacts?.[0]?.name || "");
  const [convertAdminPhone, setConvertAdminPhone] = useState(lead.contacts?.[0]?.phone || "");
  const [convertPassword, setConvertPassword] = useState("");
  const [convertAmount, setConvertAmount] = useState(12000);
  const [convertCommission, setConvertCommission] = useState(20);
  const [converting, setConverting] = useState(false);

  const isWon = lead.status === "WON";
  const followUpStatus = getFollowUpStatus(lead.nextFollowUpDate);
  const primaryContact = lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];

  const cleanPrimaryPhone = primaryContact?.phone?.replace(/[^0-9]/g, "") || "";
  const waPrimaryPhone =
    cleanPrimaryPhone.length === 10 ? `91${cleanPrimaryPhone}` : cleanPrimaryPhone;

  const cleanAltPhone = primaryContact?.secondaryPhone?.replace(/[^0-9]/g, "") || "";
  const waAltPhone = cleanAltPhone.length === 10 ? `91${cleanAltPhone}` : cleanAltPhone;

  const isMine = isLeadAssignedToUser(lead as any, myIdentifiers, effectiveUserId);

  // Handle Quick Note Save
  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNotes.trim()) return;
    setLogSaving(true);
    try {
      await onLogActivity({
        type: logType,
        notes: logNotes.trim(),
        followUpDate: logFollowUpDate || undefined,
      });
      setLogNotes("");
      setLogFollowUpDate("");
    } finally {
      setLogSaving(false);
    }
  };

  // Handle Timeline Edit Save
  const handleSaveEditTimeline = async (timelineId: string) => {
    if (!editTimelineNotes.trim()) return;
    setTimelineUpdating(true);
    try {
      await onUpdateActivity(timelineId, {
        type: editTimelineType,
        notes: editTimelineNotes.trim(),
        followUpDate: editTimelineFollowUp || null,
      });
      setEditingTimelineId(null);
    } finally {
      setTimelineUpdating(false);
    }
  };

  // Handle Conversion Submit
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertSubdomain || !convertAdminName || !convertAdminPhone) return;
    setConverting(true);
    try {
      await onConvertToMadrasa({
        subdomain: convertSubdomain,
        adminName: convertAdminName,
        adminIdentifier: convertAdminPhone,
        adminPassword: convertPassword,
        amountPaid: convertAmount,
        commissionPercentage: convertCommission,
      });
      setShowConvertModal(false);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* ── 1. Single Simple Header Line: Name, Contact & Quick Actions ── */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-gray-200/90 shadow-2xs flex items-center justify-between gap-2 select-none flex-wrap sm:flex-nowrap">
        {/* Left: Lead Name, Place, Contact & Score in a single clean line */}
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
            {lead.name}
          </h2>

          {lead.place && (
            <span className="text-xs text-gray-500 truncate flex items-center gap-0.5">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <span>{lead.place}{lead.district ? `, ${lead.district}` : ""}</span>
            </span>
          )}

          {primaryContact?.name && (
            <span className="text-xs text-gray-600 truncate flex items-center gap-1">
              <span className="text-gray-300">•</span>
              <span className="font-semibold text-gray-700">{primaryContact.name}</span>
              {primaryContact.phone && (
                <span className="font-mono text-[11px] text-gray-400">({primaryContact.phone})</span>
              )}
            </span>
          )}

          {lead.score && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0",
                SCORE_COLORS[lead.score] || "bg-gray-100 text-gray-700 border-gray-200"
              )}
            >
              {lead.score}
            </span>
          )}

          {isMine ? (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 flex items-center gap-0.5 shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>You</span>
            </span>
          ) : !isMine && lead.contributors?.[0]?.user?.name ? (
            <span className="text-[11px] font-medium text-gray-600 bg-gray-50 px-1.5 py-0.2 rounded border border-gray-200 shrink-0">
              {lead.contributors[0].user.name}
            </span>
          ) : null}
        </div>

        {/* Right: Quick Stage Dropdown, Call, WhatsApp, Edit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CrmChipDropdown
            label={LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
            value={lead.status}
            icon={React.createElement(STAGE_LUCIDE_ICONS[lead.status as LeadStatus] || Sparkles, {
              className: "w-2.5 h-2.5 shrink-0 opacity-80",
            })}
            options={LEAD_STATUSES.map((st, idx) => ({
              value: st,
              label: `${idx + 1}. ${LEAD_STATUS_LABELS[st] ?? st}`,
            }))}
            onChange={(st) => onUpdateStage(st, lead.id)}
            isActive={true}
            activeClassName={cn(
              "h-7 px-2 text-xs font-semibold rounded-lg border shadow-2xs",
              STATUS_COLORS[lead.status as LeadStatus] || "bg-gray-100 text-gray-700 border-gray-200"
            )}
            minWidth="min-w-[190px]"
          />

          {primaryContact?.phone && (
            <>
              <a
                href={`tel:${cleanPrimaryPhone}`}
                className="h-7 w-7 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200 transition-all active:scale-95"
                title={`Call ${primaryContact.phone}`}
              >
                <Phone className="w-3 h-3 text-gray-600" />
              </a>
              <a
                href={`https://wa.me/${waPrimaryPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 transition-all active:scale-95"
                title="WhatsApp"
              >
                <MessageSquare className="w-3 h-3 text-emerald-700" />
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => onStartEdit(lead)}
            className="h-7 px-2 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all flex items-center gap-1 active:scale-95"
            title="Edit Lead Profile"
          >
            <Pencil className="w-3 h-3 text-gray-500" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* ── 2. Quick Note / Interaction Logger (With Next Follow-up on Top) ── */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-gray-200/90 shadow-2xs space-y-2.5">
        <form onSubmit={handleSaveQuickNote} className="space-y-2.5">
          {/* Header Row: Title & Activity Type Dropdown */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Record Interaction Note</span>
            </span>

            <CrmChipDropdown
              label={ACTIVITY_TYPES.find((t) => t.value === logType)?.label || "Phone Call"}
              value={logType}
              options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              onChange={setLogType}
              minWidth="min-w-[170px]"
            />
          </div>

          {/* Follow-up section MOVED TO THE TOP of the interaction section */}
          <div className="p-2 bg-gray-50/80 rounded-xl border border-gray-200/70 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-gray-700">Next Follow-up:</span>
              <span className={cn("text-[11px] font-bold px-1.5 py-0.2 rounded-md border", followUpStatus.badgeClass)}>
                {followUpStatus.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={logFollowUpDate || (lead.nextFollowUpDate ? lead.nextFollowUpDate.split("T")[0] : "")}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogFollowUpDate(val);
                  if (val) {
                    onQuickUpdateFollowUp(val, lead.id);
                  }
                }}
                className="h-7 text-xs bg-white border border-gray-200 rounded-lg px-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500 font-sans shadow-2xs"
              />
              {(logFollowUpDate || lead.nextFollowUpDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogFollowUpDate("");
                    onQuickUpdateFollowUp(null, lead.id);
                  }}
                  className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-gray-200 rounded-lg bg-white"
                  title="Clear follow-up date"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 1-Tap Quick Outcome Disposition Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {OUTCOME_DISPOSITIONS.map((disp) => (
              <button
                key={disp.label}
                type="button"
                onClick={() =>
                  setLogNotes((prev) => (prev ? `${prev}\n${disp.text}` : disp.text))
                }
                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 active:scale-95 transition-all cursor-pointer"
              >
                {disp.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            rows={2}
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="Type follow-up discussion notes, madrasa feedback, or next action..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm font-normal text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 min-h-[68px]"
          />

          {/* Bottom of Note: Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={logSaving || !logNotes.trim()}
              className="h-8 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              {logSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Note</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 4. Interaction History Timeline (Editable & Deletable) ── */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Activity Timeline</span>
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {lead.timeline?.length ?? 0} notes
          </span>
        </div>

        {lead.timeline && lead.timeline.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {lead.timeline.map((act) => {
              const isEditing = editingTimelineId === act.id;

              return (
                <div
                  key={act.id}
                  className="p-3 sm:p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-all space-y-2 text-xs sm:text-sm"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={editTimelineType}
                          onChange={(e) => setEditTimelineType(e.target.value)}
                          className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2 h-7 text-gray-800 focus:outline-none"
                        >
                          {ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {"\u00A0\u00A0"}{t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editTimelineFollowUp}
                          onChange={(e) => setEditTimelineFollowUp(e.target.value)}
                          className="text-xs bg-white border border-gray-200 rounded-lg px-2 h-7 text-gray-800 font-sans focus:outline-none"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={editTimelineNotes}
                        onChange={(e) => setEditTimelineNotes(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm font-medium"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTimelineId(null)}
                          className="min-h-[36px] px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-600 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={timelineUpdating || !editTimelineNotes.trim()}
                          onClick={() => handleSaveEditTimeline(act.id)}
                          className="min-h-[36px] px-3.5 py-1.5 bg-primary-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5"
                        >
                          {timelineUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                            {act.type}
                          </span>
                          {act.user?.name && (
                            <span className="font-semibold text-gray-800 text-xs sm:text-sm">{act.user.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">
                            {new Date(act.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTimelineId(act.id);
                              setEditTimelineNotes(act.notes || "");
                              setEditTimelineType(act.type || "CALL");
                              setEditTimelineFollowUp(
                                act.followUpDate ? act.followUpDate.split("T")[0] : ""
                              );
                            }}
                            className="p-1 min-h-[30px] min-w-[30px] flex items-center justify-center text-gray-400 hover:text-blue-600 rounded"
                            title="Edit Note"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Delete this interaction note?")) {
                                onDeleteActivity(act.id);
                              }
                            }}
                            className="p-1 min-h-[30px] min-w-[30px] flex items-center justify-center text-gray-400 hover:text-rose-600 rounded"
                            title="Delete Note"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {act.notes && (
                        <p className="text-gray-800 leading-relaxed font-normal whitespace-pre-wrap text-xs sm:text-sm">
                          {act.notes}
                        </p>
                      )}

                      {act.followUpDate && (
                        <div className="pt-1.5 border-t border-dashed border-gray-200/80 text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Follow-up:{" "}
                            {new Date(act.followUpDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 py-3 text-center">
            No notes logged yet. Use the quick logger above to record calls or meetings.
          </p>
        )}
      </div>

      {/* ── 5. Compact Madrasa Profile & Conversion Strip ── */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Institutional Profile &amp; Conversion</span>
          </span>
        </div>

        {/* 1-Line Parameters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs sm:text-sm">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold block">Syllabus</span>
            <span className="font-bold text-gray-900 truncate block mt-0.5">{lead.type || "Samastha"}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold block">Scale</span>
            <span className="font-bold text-gray-900 truncate block mt-0.5">
              {lead.studentCount || 0} students • {lead.teacherCount || 0} staff
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold block">Software</span>
            <span className="font-bold text-gray-900 truncate block mt-0.5">
              {lead.existingSoftware || "None / Paper registers"}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold block">Source</span>
            <span className="font-bold text-gray-900 truncate block mt-0.5">{lead.source || "Direct"}</span>
          </div>
        </div>

        {lead.address && (
          <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-gray-900 font-semibold">Address:</strong> {lead.address}
            </span>
          </p>
        )}

        {/* Action Strip: Launch Trial, Convert to Paid, Delete Lead */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
          {!isWon ? (
            <>
              <button
                type="button"
                onClick={onProvisionTrial}
                disabled={actionLoading || lead.status === "LOGGED_IN"}
                className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{lead.status === "LOGGED_IN" ? "Trial Active" : "Launch Trial"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConvertModal(true)}
                className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                <span>Convert to Paid</span>
              </button>
            </>
          ) : (
            <span className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Converted &amp; Active Paid Madrasa</span>
            </span>
          )}

          {canDelete && onDeleteLead && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Permanently delete "${lead.name}"? This action cannot be undone.`)) {
                  onDeleteLead(lead.id);
                }
              }}
              className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all ml-auto active:scale-95 flex items-center gap-1.5"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Conversion Dialog Modal ── */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !converting && setShowConvertModal(false)}
              className="fixed inset-0 bg-black backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span>Convert to Paid Madrasa</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Portal Slug / Subdomain *
                  </label>
                  <input
                    type="text"
                    required
                    value={convertSubdomain}
                    onChange={(e) =>
                      setConvertSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-mono font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live URL: {convertSubdomain || "slug"}.smartmadrasa.app
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Admin Name *</label>
                    <input
                      type="text"
                      required
                      value={convertAdminName}
                      onChange={(e) => setConvertAdminName(e.target.value)}
                      className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Admin Phone *</label>
                    <input
                      type="tel"
                      required
                      value={convertAdminPhone}
                      onChange={(e) => setConvertAdminPhone(e.target.value)}
                      className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={convertPassword}
                    onChange={(e) => setConvertPassword(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(Number(e.target.value))}
                      className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Commission (%)</label>
                    <input
                      type="number"
                      value={convertCommission}
                      onChange={(e) => setConvertCommission(Number(e.target.value))}
                      className="w-full min-h-[38px] bg-gray-50 border border-gray-200 rounded-xl px-2.5 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={converting || !convertSubdomain || !convertAdminName || !convertAdminPhone}
                    className="min-h-[38px] px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                    <span>Confirm Conversion</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
