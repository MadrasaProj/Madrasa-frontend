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
import { CrmChipDropdown } from "./CrmChipDropdown";
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
        "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border cursor-pointer transition-all space-y-1.5 select-none relative",
        isSelected
          ? "bg-primary-50/50 border-primary-500 shadow-xs ring-1 ring-primary-500/30"
          : isChecked
          ? "bg-amber-50/40 border-amber-300 hover:shadow-2xs"
          : "bg-white border-gray-200/90 hover:border-primary-300 hover:shadow-2xs"
      )}
    >
      {/* Top: Checkbox, Name, Score, Location */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isChecked}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleCheck(lead.id, e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center gap-1.5">
            <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">
              {lead.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {lead.score && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider",
                    SCORE_COLORS[lead.score] || "bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  {lead.score}
                </span>
              )}
              {isUnassignedLead ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelfClaim(lead.id);
                  }}
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all active:scale-95 flex items-center gap-0.5"
                >
                  <UserPlus className="w-2.5 h-2.5 text-amber-700" />
                  <span>Claim</span>
                </button>
              ) : !isMine && lead.contributors?.[0]?.user?.name ? (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-gray-200 bg-gray-50 text-gray-600 truncate max-w-[85px]">
                  {lead.contributors[0].user.name}
                </span>
              ) : null}
            </div>
          </div>

          {/* Location & Student Count */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">
              {lead.place || "Place"}{lead.district ? `, ${lead.district}` : ""}
            </span>
            {lead.studentCount ? (
              <>
                <span className="text-gray-300 mx-0.5">•</span>
                <Users className="w-3 h-3 text-gray-400 shrink-0" />
                <span>{lead.studentCount} students</span>
              </>
            ) : null}
            {priority.daysSinceLastContact > 0 && (
              <>
                <span className="text-gray-300 mx-0.5">•</span>
                <span className="text-gray-400">{priority.daysSinceLastContact}d ago</span>
              </>
            )}
          </div>

          {/* Contact Person Name & Role if present */}
          {primaryC?.name && (
            <div className="text-xs text-gray-600 truncate mt-0.5 font-medium flex items-center gap-1">
              <span>{primaryC.name}</span>
              {primaryC.role && <span className="text-gray-400">({primaryC.role})</span>}
              {primaryC.phone && <span className="text-gray-400 font-mono text-[11px]">• {primaryC.phone}</span>}
            </div>
          )}
        </div>
      </div>



      {/* Footer: Compact Metadata Bar (Stage & Follow-up Left, Actions Right) */}
      <div className="pt-1.5 border-t border-gray-100/80 flex items-center justify-between gap-1.5">
        {/* Left: Stage + Follow-up aligned cleanly side-by-side */}
        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Stage Dropdown */}
          <CrmChipDropdown
            label={LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
            value={lead.status}
            icon={<StageIcon className="w-2.5 h-2.5 shrink-0 opacity-80" />}
            options={LEAD_STATUSES.map((st, idx) => ({
              value: st,
              label: `${idx + 1}. ${LEAD_STATUS_LABELS[st] ?? st}`,
            }))}
            onChange={(st) => onFastUpdateStatus(st, lead.id)}
            isActive={true}
            activeClassName={cn(
              "h-6 px-2 text-[11px] font-medium rounded-md border shadow-2xs",
              STATUS_COLORS[lead.status as LeadStatus] || "bg-gray-100 text-gray-700 border-gray-200"
            )}
            minWidth="min-w-[190px]"
          />

          {/* Follow-up Reschedule Dropdown */}
          <CrmChipDropdown
            label={fuStatus.label}
            value=""
            icon={<Clock className="w-2.5 h-2.5 shrink-0" />}
            options={[
              { value: formatLocalDateForInput(new Date()), label: "Today" },
              { value: formatLocalDateForInput(new Date(Date.now() + 86400000)), label: "Tomorrow" },
              { value: formatLocalDateForInput(new Date(Date.now() + 3 * 86400000)), label: "In 3 Days" },
              { value: formatLocalDateForInput(new Date(Date.now() + 7 * 86400000)), label: "In 1 Week" },
              ...(lead.nextFollowUpDate ? [{ value: "CLEAR", label: "Clear Follow-up" }] : []),
            ]}
            onChange={(val) => {
              if (val === "CLEAR") onFastScheduleFollowUp(null, lead.id);
              else onFastScheduleFollowUp(val, lead.id);
            }}
            isActive={true}
            activeClassName={cn(
              "h-6 px-1.5 text-[11px] font-medium rounded-md border shadow-2xs",
              fuStatus.badgeClass
            )}
            minWidth="min-w-[160px]"
          />
        </div>

        {/* Right side: 1-Tap Call & WA Icon Buttons (if phone present) */}
        {primaryC?.phone && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={`tel:${primaryC.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200 transition-all active:scale-95"
              title={`Call ${primaryC.phone}`}
            >
              <Phone className="w-2.5 h-2.5 text-gray-600" />
            </a>
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200/80 transition-all active:scale-95"
              title="WhatsApp"
            >
              <MessageSquare className="w-2.5 h-2.5 text-emerald-700" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
