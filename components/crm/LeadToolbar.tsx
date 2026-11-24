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
} from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadSortOption,
} from "./crm-types";
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
    <div className="bg-white rounded-3xl p-3 sm:p-4 border border-gray-200/90 shadow-2xs space-y-2.5">
      {/* ── Row 1: Scope Segmented Pill & Quick Urgency Chips ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Segmented Scope Pill: Assigned to Me / All / Unassigned */}
        <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedAssignee("ME")}
            className={cn(
              "flex-1 sm:flex-none min-h-[34px] px-3 py-1 rounded-xl transition-all flex items-center justify-center gap-1.5",
              selectedAssignee === "ME"
                ? "bg-emerald-600 text-white shadow-2xs font-black"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Assigned</span>
            <span className="hidden sm:inline">Assigned to Me</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
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
              "flex-1 sm:flex-none min-h-[34px] px-3 py-1 rounded-xl transition-all flex items-center justify-center gap-1.5",
              selectedAssignee === "ALL"
                ? "bg-white text-gray-900 shadow-2xs font-black border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">All</span>
            <span className="hidden sm:inline">All Leads</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 font-bold">
              {assigneeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAssignee("UNASSIGNED")}
            className={cn(
              "flex-1 sm:flex-none min-h-[34px] px-3 py-1 rounded-xl transition-all flex items-center justify-center gap-1.5",
              selectedAssignee === "UNASSIGNED"
                ? "bg-amber-600 text-white shadow-2xs font-black"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span>Unassigned</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                selectedAssignee === "UNASSIGNED"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              )}
            >
              {assigneeCounts.unassigned}
            </span>
          </button>
        </div>

        {/* Quick Follow-up Alerts & Reset Pill */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {smartCounts.overdue > 0 && (
            <button
              type="button"
              onClick={() => setSmartPreset((p: string) => (p === "OVERDUE" ? "ALL" : "OVERDUE"))}
              className={cn(
                "min-h-[30px] px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border active:scale-95",
                smartPreset === "OVERDUE"
                  ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
              title="Show overdue follow-ups"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{smartCounts.overdue} Overdue</span>
            </button>
          )}

          {smartCounts.today > 0 && (
            <button
              type="button"
              onClick={() => setSmartPreset((p: string) => (p === "TODAY" ? "ALL" : "TODAY"))}
              className={cn(
                "min-h-[30px] px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border active:scale-95",
                smartPreset === "TODAY"
                  ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
              title="Show follow-ups due today"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{smartCounts.today} Due Today</span>
            </button>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="min-h-[30px] px-2.5 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-gray-200"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Unified Filter & Search Bar (Single Sleek Tier) ── */}
      <div className="grid grid-cols-12 gap-2">
        {/* Search Input */}
        <div className="relative col-span-12 sm:col-span-6 lg:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search madrasa, place, phone..."
            className="w-full min-h-[38px] pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 font-medium text-gray-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pipeline Stage Dropdown */}
        <div className="col-span-6 sm:col-span-6 lg:col-span-2">
          <select
            value={activeStage}
            onChange={(e) => setActiveStage(e.target.value)}
            className={cn(
              "w-full min-h-[38px] border text-xs sm:text-sm font-semibold py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20",
              activeStage !== "ALL"
                ? "bg-primary-50/80 border-primary-300 text-primary-900 font-bold"
                : "bg-gray-50 border-gray-200 text-gray-800"
            )}
          >
            <option value="ALL">All Stages ({stageCounts.ALL ?? 0})</option>
            {LEAD_STATUSES.map((st, idx) => (
              <option key={st} value={st}>
                {idx + 1}. {LEAD_STATUS_LABELS[st] ?? st} ({stageCounts[st] ?? 0})
              </option>
            ))}
          </select>
        </div>

        {/* Queue / Daily Preset Selector */}
        <div className="col-span-6 sm:col-span-6 lg:col-span-2">
          <select
            value={smartPreset}
            onChange={(e) => setSmartPreset(e.target.value)}
            className={cn(
              "w-full min-h-[38px] border text-xs sm:text-sm font-semibold py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20",
              smartPreset !== "ALL"
                ? "bg-amber-50/80 border-amber-300 text-amber-900 font-bold"
                : "bg-gray-50 border-gray-200 text-gray-800"
            )}
          >
            <option value="ALL">All Accounts ({smartCounts.all})</option>
            <option value="AI_PRIORITY">AI Next Up ({smartCounts.aiPriority})</option>
            <option value="CLOSING_FOCUS">Closing Focus ({smartCounts.closingFocus})</option>
            <option value="OVERDUE">Overdue ({smartCounts.overdue})</option>
            <option value="TODAY">Due Today ({smartCounts.today})</option>
            <option value="UNTREATED">Never Contacted ({smartCounts.untreated})</option>
            <option value="STALE">Stale (&gt;7d) ({smartCounts.stale})</option>
            <option value="HOT_WARM">Hot &amp; Warm ({smartCounts.hotWarm})</option>
            <option value="QUALITY">Quality Leads ({smartCounts.quality})</option>
            <option value="NO_FOLLOWUP">Needs Follow-up Date ({smartCounts.noFollowup})</option>
          </select>
        </div>

        {/* District Filter */}
        <div className="col-span-6 sm:col-span-3 lg:col-span-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full min-h-[38px] bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-gray-800"
          >
            <option value="ALL">Districts ({availableDistricts.length})</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order Selector */}
        <div className="col-span-4 sm:col-span-3 lg:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as LeadSortOption)}
            className="w-full min-h-[38px] bg-gray-50 border border-gray-200 text-xs sm:text-sm font-semibold py-1.5 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-gray-800 truncate"
          >
            <option value="SMART_PRIORITY">AI Priority</option>
            <option value="URGENT">Overdue First</option>
            <option value="FOLLOWUP_ASC">Earliest Due</option>
            <option value="FOLLOWUP_DESC">Latest Due</option>
            <option value="LAST_FOLLOWUP_ASC">Oldest Contact</option>
            <option value="LAST_FOLLOWUP_DESC">Recent Contact</option>
            <option value="STATUS_CHANGED_DESC">Status Newest</option>
            <option value="SCORE_DESC">Hot to Cold</option>
            <option value="STUDENTS">Size (Highest)</option>
            <option value="NEWEST">Newest Added</option>
            <option value="NAME">Name (A-Z)</option>
          </select>
        </div>

        {/* More Filters Toggle */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex items-center">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((p) => !p)}
            className={cn(
              "w-full min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 active:scale-95",
              showAdvancedFilters || isAdvancedFiltered
                ? "bg-primary-50 text-primary-900 border-primary-300 font-black shadow-2xs"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
            title="Additional granular filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
            <span className="sm:hidden text-[11px]">Filter</span>
            {isAdvancedFiltered && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            )}
          </button>
        </div>
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
            <div className="pt-3 pb-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/70">
              {/* Due Date Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Follow-up Due:
                </label>
                <select
                  value={dueDateFilter}
                  onChange={(e) => setDueDateFilter(e.target.value)}
                  className="w-full min-h-[36px] bg-white border border-gray-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl text-gray-800"
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
                      className="bg-white border border-gray-200 text-xs p-1 rounded-lg"
                    />
                    <input
                      type="date"
                      value={dueDateTo}
                      onChange={(e) => setDueDateTo(e.target.value)}
                      placeholder="To"
                      className="bg-white border border-gray-200 text-xs p-1 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Last Followed Up */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3 text-blue-600" /> Last Interaction:
                </label>
                <select
                  value={lastContactedFilter}
                  onChange={(e) => setLastContactedFilter(e.target.value)}
                  className="w-full min-h-[36px] bg-white border border-gray-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl text-gray-800"
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
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-600" /> Lead Score:
                </label>
                <select
                  value={leadScoreFilter}
                  onChange={(e) => setLeadScoreFilter(e.target.value)}
                  className="w-full min-h-[36px] bg-white border border-gray-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl text-gray-800"
                >
                  <option value="ALL">All Priority Levels</option>
                  <option value="HOT">Hot Deals</option>
                  <option value="WARM">Warm Prospects</option>
                  <option value="COLD">Cold Leads</option>
                </select>
              </div>

              {/* Institution Size */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-600" /> Madrasa Size:
                </label>
                <select
                  value={institutionSizeFilter}
                  onChange={(e) => setInstitutionSizeFilter(e.target.value)}
                  className="w-full min-h-[36px] bg-white border border-gray-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl text-gray-800"
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
