import React from "react";
import {
  Phone,
  MessageSquare,
  Clock,
  ChevronDown,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
  Sparkles,
} from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  STAGE_LUCIDE_ICONS,
  STATUS_COLORS,
  SCORE_COLORS,
  type LeadStatus,
} from "./crm-types";
import {
  getFollowUpStatus,
  calculateLeadSmartPriority,
  isLeadAssignedToUser,
  isLeadUnassigned,
  formatLocalDateForInput,
} from "./crm-utils";
import type { LeadListItem } from "@/lib/crm-api";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: LeadListItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  myIdentifiers: Set<string>;
  effectiveUserId?: string;
  onFastUpdateStatus: (status: string, leadId: string) => void;
  onFastScheduleFollowUp: (date: string | null, leadId: string) => void;
  onSelfClaim: (leadId: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  myIdentifiers,
  effectiveUserId,
  onFastUpdateStatus,
  onFastScheduleFollowUp,
  onSelfClaim,
}) => {
  const primaryC = lead.contacts?.find((c) => c.isPrimary) || lead.contacts?.[0];
  const cleanPhone = primaryC?.phone?.replace(/[^0-9]/g, "") || "";
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const cleanAltPhone = primaryC?.secondaryPhone?.replace(/[^0-9]/g, "") || "";
  const waAltPhone = cleanAltPhone.length === 10 ? `91${cleanAltPhone}` : cleanAltPhone;

  const fuStatus = getFollowUpStatus(lead.nextFollowUpDate);
  const priority = calculateLeadSmartPriority(lead, myIdentifiers, effectiveUserId);

  const isMine = isLeadAssignedToUser(lead, myIdentifiers, effectiveUserId);
  const isUnassignedLead = isLeadUnassigned(lead);
  const StageIcon = STAGE_LUCIDE_ICONS[lead.status as LeadStatus] || Sparkles;

  return (
    <div
      onClick={() => onSelect(lead.id)}
      className={cn(
        "p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 select-none relative",
        isSelected
          ? "bg-primary-50/50 border-primary-500 shadow-xs ring-1 ring-primary-500/30"
          : isChecked
          ? "bg-amber-50/40 border-amber-300 hover:shadow-2xs"
          : "bg-white border-gray-200/90 hover:border-primary-300 hover:shadow-2xs"
      )}
    >
      {/* Top: Checkbox, Name, Score, Location */}
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={isChecked}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleCheck(lead.id, e.target.checked)}
          className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-snug">
              {lead.name}
            </h3>
            {lead.score && (
              <span
                className={cn(
                  "text-[10px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0",
                  SCORE_COLORS[lead.score] || "bg-gray-100 text-gray-700 border-gray-200"
                )}
              >
                {lead.score}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">
              {lead.place || "Place"}{lead.district ? `, ${lead.district}` : ""}
            </span>
            <span className="text-gray-300 mx-1">•</span>
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{lead.studentCount || 0}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span
              className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1",
                priority.badgeColor
              )}
            >
              {priority.primaryReason}
            </span>
            {priority.daysSinceLastContact > 0 && (
              <span className="text-[10px] font-semibold text-gray-400">
                {priority.daysSinceLastContact}d ago
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Contact Person & Quick 1-Tap Buttons */}
      {primaryC && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {primaryC.name || "Contact"}
              {primaryC.role ? ` (${primaryC.role})` : ""}
            </p>
            {primaryC.phone && (
              <p className="text-xs font-mono font-medium text-gray-600 mt-0.5">
                {primaryC.phone}
              </p>
            )}
          </div>

          {primaryC.phone && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${primaryC.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="min-h-[34px] px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 border border-gray-200 active:scale-95"
                title={`Call ${primaryC.phone}`}
              >
                <Phone className="w-3.5 h-3.5 text-gray-600" />
                <span>Call</span>
              </a>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="min-h-[34px] px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 border border-emerald-200/80 active:scale-95"
                title="WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Footer: Native OS Stage Picker & Native Follow-up Selector (Zero Nested Scroll Traps) */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Native OS Stage Picker */}
          <div
            className={cn(
              "relative min-h-[28px] px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer",
              STATUS_COLORS[lead.status as LeadStatus] || "bg-gray-100 text-gray-700 border-gray-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <StageIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span className="truncate max-w-[105px]">
              {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            <select
              value={lead.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onFastUpdateStatus(e.target.value, lead.id);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Change Stage"
            >
              {LEAD_STATUSES.map((st, idx) => (
                <option key={st} value={st}>
                  {idx + 1}. {LEAD_STATUS_LABELS[st] ?? st}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee pill */}
          {isMine ? (
            <span className="min-h-[28px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-black flex items-center gap-1 shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-700" />
              <span>You</span>
            </span>
          ) : isUnassignedLead ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelfClaim(lead.id);
              }}
              className="min-h-[28px] px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95"
            >
              <UserPlus className="w-3 h-3 text-amber-700" />
              <span>Claim</span>
            </button>
          ) : (
            <span className="min-h-[28px] px-2 py-0.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 truncate max-w-[100px]">
              {lead.contributors?.[0]?.user?.name || "Assigned"}
            </span>
          )}
        </div>

        {/* Follow-up Native Selector (Zero popovers) */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <div
            className={cn(
              "relative min-h-[28px] px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer",
              fuStatus.badgeClass
            )}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[95px]">{fuStatus.label}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
            <select
              value=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                const val = e.target.value;
                if (!val) return;
                if (val === "CLEAR") {
                  onFastScheduleFollowUp(null, lead.id);
                } else {
                  onFastScheduleFollowUp(val, lead.id);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Reschedule Follow-up"
            >
              <option value="">Reschedule Follow-up...</option>
              <option value={formatLocalDateForInput(new Date())}>Today</option>
              <option value={formatLocalDateForInput(new Date(Date.now() + 86400000))}>Tomorrow</option>
              <option value={formatLocalDateForInput(new Date(Date.now() + 3 * 86400000))}>In 3 Days</option>
              <option value={formatLocalDateForInput(new Date(Date.now() + 7 * 86400000))}>In 1 Week</option>
              {lead.nextFollowUpDate && <option value="CLEAR">Clear Follow-up</option>}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
