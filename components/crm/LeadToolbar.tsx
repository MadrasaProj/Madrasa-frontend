import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  History,
  Flame,
  Building2,
  AlertTriangle,
  UserCheck,
  Users,
  UserX,
  ChevronDown,
} from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadSortOption,
  type LeadStatus,
} from "./crm-types";
import { CrmChipDropdown } from "./CrmChipDropdown";
import { cn } from "@/lib/utils";

interface LeadToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  selectedAssignee: "ME" | "ALL" | "UNASSIGNED";
  setSelectedAssignee: (a: "ME" | "ALL" | "UNASSIGNED") => void;
  assigneeCounts: { me: number; all: number; unassigned: number };
  activeStage: string;
  setActiveStage: (s: string) => void;
  stageCounts: Record<string, number>;
  smartPreset: string;
  setSmartPreset: (p: any) => void;
  smartCounts: {
    all: number;
    aiPriority: number;
    closingFocus: number;
    overdue: number;
    today: number;
    untreated: number;
    stale: number;
    hotWarm: number;
    quality: number;
    noFollowup: number;
  };
  selectedDistrict: string;
  setSelectedDistrict: (d: string) => void;
  availableDistricts: string[];
  sortBy: LeadSortOption;
  setSortBy: (s: LeadSortOption) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  dueDateFilter: string;
  setDueDateFilter: (f: any) => void;
  dueDateFrom: string;
  setDueDateFrom: (d: string) => void;
  dueDateTo: string;
  setDueDateTo: (d: string) => void;
  lastContactedFilter: string;
  setLastContactedFilter: (f: any) => void;
  leadScoreFilter: string;
  setLeadScoreFilter: (f: string) => void;
  institutionSizeFilter: string;
  setInstitutionSizeFilter: (f: any) => void;
}

export const LeadToolbar: React.FC<LeadToolbarProps> = ({
  search,
  setSearch,
  selectedAssignee,
  setSelectedAssignee,
  assigneeCounts,
  activeStage,
  setActiveStage,
  stageCounts,
  smartPreset,
  setSmartPreset,
  smartCounts,
  selectedDistrict,
  setSelectedDistrict,
  availableDistricts,
  sortBy,
  setSortBy,
  hasActiveFilters,
  onResetFilters,
  showAdvancedFilters,
  setShowAdvancedFilters,
  dueDateFilter,
  setDueDateFilter,
  dueDateFrom,
  setDueDateFrom,
  dueDateTo,
  setDueDateTo,
  lastContactedFilter,
  setLastContactedFilter,
  leadScoreFilter,
  setLeadScoreFilter,
  institutionSizeFilter,
  setInstitutionSizeFilter,
}) => {
  const isAdvancedFiltered =
    dueDateFilter !== "ALL" ||
    lastContactedFilter !== "ALL" ||
    leadScoreFilter !== "ALL" ||
    institutionSizeFilter !== "ALL";

  return (
    <div className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-gray-200/90 shadow-2xs space-y-2">
      {/* ── Row 1: Scope Segmented Pill (Strict 3-Column Equal Grid, Zero Overflow) & Urgency Chips ── */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 w-full text-xs font-bold select-none">
          <button
            type="button"
            onClick={() => setSelectedAssignee("ME")}
            className={cn(
              "h-8 px-1.5 sm:px-3 rounded-lg transition-all flex items-center justify-center gap-1 text-xs truncate",
              selectedAssignee === "ME"
                ? "bg-emerald-600 text-white shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Mine</span>
            <span className="hidden sm:inline truncate">Assigned to Me</span>
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
                selectedAssignee === "ME" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              )}
            >
              {assigneeCounts.me}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAssignee("ALL")}
            className={cn(
              "h-8 px-1.5 sm:px-3 rounded-lg transition-all flex items-center justify-center gap-1 text-xs truncate",
              selectedAssignee === "ALL"
                ? "bg-white text-gray-900 shadow-2xs font-bold border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">All</span>
            <span className="hidden sm:inline truncate">All Leads</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 font-bold shrink-0">
              {assigneeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAssignee("UNASSIGNED")}
            className={cn(
              "h-8 px-1.5 sm:px-3 rounded-lg transition-all flex items-center justify-center gap-1 text-xs truncate",
              selectedAssignee === "UNASSIGNED"
                ? "bg-amber-600 text-white shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Open</span>
            <span className="hidden sm:inline truncate">Unassigned</span>
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
                selectedAssignee === "UNASSIGNED"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              )}
            >
              {assigneeCounts.unassigned}
            </span>
          </button>
        </div>

      </div>

      {/* ── Row 2: Search Input & Advanced Filters Toggle ── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search madrasa, place, phone..."
            className="w-full h-8 pl-7 pr-7 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium text-gray-900 placeholder:text-gray-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedFilters((p) => !p)}
          className={cn(
            "h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0",
            showAdvancedFilters || isAdvancedFiltered
              ? "bg-primary-50 text-primary-900 border-primary-300 font-bold shadow-2xs"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          )}
          title="Additional granular filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
          <span className="hidden sm:inline">Filters</span>
          {isAdvancedFiltered && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
        </button>
      </div>

      {/* ── Row 3: Horizontal Filter Chips Strip (Consistent Sizing, Zero Native OS Styling Quirks) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5 select-none">
        {/* Stage Filter Dropdown */}
        <CrmChipDropdown
          label={
            activeStage === "ALL"
              ? `All Stages (${stageCounts.ALL ?? 0})`
              : `${LEAD_STATUS_LABELS[activeStage as LeadStatus] ?? activeStage} (${stageCounts[activeStage] ?? 0})`
          }
          value={activeStage}
          options={[
            { value: "ALL", label: `All Stages (${stageCounts.ALL ?? 0})` },
            ...LEAD_STATUSES.map((st, idx) => ({
              value: st,
              label: `${idx + 1}. ${LEAD_STATUS_LABELS[st] ?? st} (${stageCounts[st] ?? 0})`,
            })),
          ]}
          onChange={setActiveStage}
          isActive={activeStage !== "ALL"}
          activeClassName="bg-primary-50 text-primary-900 border-primary-300 font-bold"
          minWidth="min-w-[210px]"
        />

        {/* Smart Preset Filter Dropdown */}
        <CrmChipDropdown
          label={
            smartPreset === "ALL"
              ? `All Accounts (${smartCounts.all})`
              : smartPreset === "AI_PRIORITY"
              ? `AI Priority (${smartCounts.aiPriority})`
              : smartPreset === "CLOSING_FOCUS"
              ? `Closing Focus (${smartCounts.closingFocus})`
              : smartPreset === "OVERDUE"
              ? `Overdue (${smartCounts.overdue})`
              : smartPreset === "TODAY"
              ? `Due Today (${smartCounts.today})`
              : smartPreset.replace(/_/g, " ")
          }
          value={smartPreset}
          options={[
            { value: "ALL", label: `All Accounts (${smartCounts.all})` },
            { value: "AI_PRIORITY", label: `AI Next Up (${smartCounts.aiPriority})` },
            { value: "CLOSING_FOCUS", label: `Closing Focus (${smartCounts.closingFocus})` },
            { value: "OVERDUE", label: `Overdue (${smartCounts.overdue})` },
            { value: "TODAY", label: `Due Today (${smartCounts.today})` },
            { value: "UNTREATED", label: `Never Contacted (${smartCounts.untreated})` },
            { value: "STALE", label: `Stale (>7d) (${smartCounts.stale})` },
            { value: "HOT_WARM", label: `Hot & Warm (${smartCounts.hotWarm})` },
            { value: "QUALITY", label: `Quality Leads (${smartCounts.quality})` },
            { value: "NO_FOLLOWUP", label: `Needs Follow-up Date (${smartCounts.noFollowup})` },
          ]}
          onChange={setSmartPreset}
          isActive={smartPreset !== "ALL"}
          activeClassName="bg-amber-50 text-amber-900 border-amber-300 font-bold"
          minWidth="min-w-[210px]"
        />

        {/* District Filter Dropdown */}
        <CrmChipDropdown
          label={
            selectedDistrict === "ALL"
              ? `Districts (${availableDistricts.length})`
              : selectedDistrict
          }
          value={selectedDistrict}
          options={[
            { value: "ALL", label: `Districts (${availableDistricts.length})` },
            ...availableDistricts.map((d) => ({ value: d, label: d })),
          ]}
          onChange={setSelectedDistrict}
          isActive={selectedDistrict !== "ALL"}
          activeClassName="bg-blue-50 text-blue-900 border-blue-300 font-bold"
          minWidth="min-w-[170px]"
        />

        {/* Sort Order Dropdown */}
        <CrmChipDropdown
          label={
            sortBy === "SMART_PRIORITY"
              ? "AI Priority"
              : sortBy === "URGENT"
              ? "Overdue First"
              : sortBy === "FOLLOWUP_ASC"
              ? "Earliest Due"
              : sortBy === "FOLLOWUP_DESC"
              ? "Latest Due"
              : sortBy === "LAST_FOLLOWUP_ASC"
              ? "Oldest Contact"
              : sortBy === "LAST_FOLLOWUP_DESC"
              ? "Recent Contact"
              : sortBy === "STATUS_CHANGED_DESC"
              ? "Status Newest"
              : sortBy === "SCORE_DESC"
              ? "Hot to Cold"
              : sortBy === "STUDENTS"
              ? "Size (Highest)"
              : sortBy === "NEWEST"
              ? "Newest Added"
              : "Name (A-Z)"
          }
          value={sortBy}
          options={[
            { value: "SMART_PRIORITY", label: "AI Priority" },
            { value: "URGENT", label: "Overdue First" },
            { value: "FOLLOWUP_ASC", label: "Earliest Due" },
            { value: "FOLLOWUP_DESC", label: "Latest Due" },
            { value: "LAST_FOLLOWUP_ASC", label: "Oldest Contact" },
            { value: "LAST_FOLLOWUP_DESC", label: "Recent Contact" },
            { value: "STATUS_CHANGED_DESC", label: "Status Newest" },
            { value: "SCORE_DESC", label: "Hot to Cold" },
            { value: "STUDENTS", label: "Size (Highest)" },
            { value: "NEWEST", label: "Newest Added" },
            { value: "NAME", label: "Name (A-Z)" },
          ]}
          onChange={(val) => setSortBy(val as LeadSortOption)}
          isActive={sortBy !== "SMART_PRIORITY"}
          activeClassName="bg-purple-50 text-purple-900 border-purple-300 font-bold"
          minWidth="min-w-[180px]"
        />

        {/* Overdue Quick Chip */}
        {smartCounts.overdue > 0 && (
          <button
            type="button"
            onClick={() => setSmartPreset((p: string) => (p === "OVERDUE" ? "ALL" : "OVERDUE"))}
            className={cn(
              "h-7 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border shrink-0 active:scale-95 shadow-2xs",
              smartPreset === "OVERDUE"
                ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                : "bg-rose-50/60 text-rose-700 border-rose-200/80 hover:bg-rose-100/60"
            )}
          >
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>{smartCounts.overdue} Overdue</span>
          </button>
        )}

        {/* Due Today Quick Chip */}
        {smartCounts.today > 0 && (
          <button
            type="button"
            onClick={() => setSmartPreset((p: string) => (p === "TODAY" ? "ALL" : "TODAY"))}
            className={cn(
              "h-7 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border shrink-0 active:scale-95 shadow-2xs",
              smartPreset === "TODAY"
                ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                : "bg-amber-50/60 text-amber-800 border-amber-200/80 hover:bg-amber-100/60"
            )}
          >
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>{smartCounts.today} Due Today</span>
          </button>
        )}

        {/* Reset Filters Chip */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-7 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-gray-200 shrink-0 shadow-2xs"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3 text-gray-400 shrink-0" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ── Advanced Filters Drawer (Optional Expandable) ── */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-gray-50/70 p-3 rounded-2xl border border-gray-200/70">
              {/* Due Date Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Follow-up Due:
                </label>
                <select
                  value={dueDateFilter}
                  onChange={(e) => setDueDateFilter(e.target.value)}
                  className="w-full min-h-[34px] sm:min-h-[36px] bg-white border border-gray-200 text-xs font-medium py-1.5 px-2.5 rounded-xl text-gray-800"
                >
                  <option value="ALL">All Due Dates</option>
                  <option value="OVERDUE">Overdue Only</option>
                  <option value="TODAY">Due Today</option>
                  <option value="TOMORROW">Due Tomorrow</option>
                  <option value="THIS_WEEK">Due This Week (Next 7d)</option>
                  <option value="NEXT_WEEK">Due Next Week</option>
                  <option value="CUSTOM">Custom Date Range...</option>
                </select>

                {dueDateFilter === "CUSTOM" && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                    <input
                      type="date"
                      value={dueDateFrom}
                      onChange={(e) => setDueDateFrom(e.target.value)}
                      placeholder="From"
                      className="bg-white border border-gray-200 text-xs min-h-[34px] px-2.5 py-1 rounded-xl"
                    />
                    <input
                      type="date"
                      value={dueDateTo}
                      onChange={(e) => setDueDateTo(e.target.value)}
                      placeholder="To"
                      className="bg-white border border-gray-200 text-xs min-h-[34px] px-2.5 py-1 rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Last Followed Up */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-blue-600" /> Last Interaction:
                </label>
                <select
                  value={lastContactedFilter}
                  onChange={(e) => setLastContactedFilter(e.target.value)}
                  className="w-full min-h-[34px] sm:min-h-[36px] bg-white border border-gray-200 text-xs font-medium py-1.5 px-2.5 rounded-xl text-gray-800"
                >
                  <option value="ALL">All Activity</option>
                  <option value="UNTREATED">Never Contacted</option>
                  <option value="STALE_7D">Stale: Untouched &gt; 7 Days</option>
                  <option value="STALE_3D">Untouched &gt; 3 Days</option>
                  <option value="RECENT_48H">Contacted within 48 Hours</option>
                </select>
              </div>

              {/* Lead Priority Score */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-600" /> Lead Score:
                </label>
                <select
                  value={leadScoreFilter}
                  onChange={(e) => setLeadScoreFilter(e.target.value)}
                  className="w-full min-h-[34px] sm:min-h-[36px] bg-white border border-gray-200 text-xs font-medium py-1.5 px-2.5 rounded-xl text-gray-800"
                >
                  <option value="ALL">All Priority Levels</option>
                  <option value="HOT">Hot Deals</option>
                  <option value="WARM">Warm Prospects</option>
                  <option value="COLD">Cold Leads</option>
                </select>
              </div>

              {/* Institution Size */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Madrasa Size:
                </label>
                <select
                  value={institutionSizeFilter}
                  onChange={(e) => setInstitutionSizeFilter(e.target.value)}
                  className="w-full min-h-[34px] sm:min-h-[36px] bg-white border border-gray-200 text-xs font-medium py-1.5 px-2.5 rounded-xl text-gray-800"
                >
                  <option value="ALL">All Sizes</option>
                  <option value="LARGE">Large (300+ Students)</option>
                  <option value="MEDIUM">Medium (100 - 300 Students)</option>
                  <option value="SMALL">Small (&lt; 100 Students)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
