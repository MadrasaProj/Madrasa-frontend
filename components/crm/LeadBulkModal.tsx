import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Sparkles, CalendarClock, Trash, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "./crm-types";
import { formatLocalDateForInput } from "./crm-utils";
import type { InternalUserItem } from "@/lib/crm-api";
import { cn } from "@/lib/utils";

export type BulkModalType = "ASSIGN" | "STATUS" | "FOLLOW_UP" | "DELETE" | null;

interface LeadBulkModalProps {
  isOpen: boolean;
  bulkModalType: BulkModalType;
  onClose: () => void;
  selectedLeadCount: number;
  assigneeOptions: InternalUserItem[];
  effectiveUserId?: string;
  bulkSelectedUserId: string;
  onSelectUserId: (id: string) => void;
  bulkSelectedStatus: LeadStatus;
  onSelectStatus: (status: LeadStatus) => void;
  bulkFollowUpDate: string;
  onSelectFollowUpDate: (date: string) => void;
  bulkRemarks: string;
  onChangeRemarks: (remarks: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const LeadBulkModal: React.FC<LeadBulkModalProps> = ({
  isOpen,
  bulkModalType,
  onClose,
  selectedLeadCount,
  assigneeOptions,
  effectiveUserId,
  bulkSelectedUserId,
  onSelectUserId,
  bulkSelectedStatus,
  onSelectStatus,
  bulkFollowUpDate,
  onSelectFollowUpDate,
  bulkRemarks,
  onChangeRemarks,
  onConfirm,
  isLoading,
}) => {
  if (!isOpen || !bulkModalType || selectedLeadCount === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => !isLoading && onClose()}
          className="fixed inset-0 bg-black backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                {bulkModalType === "ASSIGN" && <Users className="w-5 h-5 text-blue-600" />}
                {bulkModalType === "STATUS" && <Sparkles className="w-5 h-5 text-amber-600" />}
                {bulkModalType === "FOLLOW_UP" && <CalendarClock className="w-5 h-5 text-emerald-600" />}
                {bulkModalType === "DELETE" && <Trash className="w-5 h-5 text-rose-600" />}
                <span>
                  {bulkModalType === "ASSIGN" && "Bulk Assign Leads"}
                  {bulkModalType === "STATUS" && "Bulk Move Pipeline Stage"}
                  {bulkModalType === "FOLLOW_UP" && "Bulk Schedule Follow-up"}
                  {bulkModalType === "DELETE" && "Bulk Delete Leads"}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Applying changes to <strong className="text-gray-800">{selectedLeadCount}</strong> selected lead(s)
              </p>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              aria-label="Close bulk action modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* ASSIGN MODE */}
            {bulkModalType === "ASSIGN" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Select Sales Representative *
                </label>
                <div className="relative">
                  <select
                    value={bulkSelectedUserId}
                    onChange={(e) => onSelectUserId(e.target.value)}
                    className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">{"\u00A0\u00A0"}-- Choose Team Member --</option>
                    {assigneeOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {"\u00A0\u00A0"}{u.id === effectiveUserId ? `⭐ ${u.name} (You)` : `${u.name} (${u.role?.replace(/_/g, " ")})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* STATUS MODE */}
            {bulkModalType === "STATUS" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Target Pipeline Stage (12 Funnel Stages) *
                  </label>
                  <div className="relative">
                    <select
                      value={bulkSelectedStatus}
                      onChange={(e) => onSelectStatus(e.target.value as LeadStatus)}
                      className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {LEAD_STATUSES.map((s, idx) => (
                        <option key={s} value={s}>
                          {"\u00A0\u00A0"}{idx + 1}. {LEAD_STATUS_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Activity Remarks / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bulkRemarks}
                    onChange={(e) => onChangeRemarks(e.target.value)}
                    placeholder="Reason or activity note (e.g., Campaign outreach, status migration)..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 resize-none"
                  />
                </div>
              </div>
            )}

            {/* FOLLOW_UP MODE */}
            {bulkModalType === "FOLLOW_UP" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={bulkFollowUpDate}
                    onChange={(e) => onSelectFollowUpDate(e.target.value)}
                    className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {[
                    { label: "Today", days: 0 },
                    { label: "Tomorrow", days: 1 },
                    { label: "+3 Days", days: 3 },
                    { label: "+1 Week", days: 7 },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + q.days);
                        onSelectFollowUpDate(formatLocalDateForInput(d));
                      }}
                      className="min-h-[34px] px-3 py-1 text-xs font-bold rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all active:scale-95"
                    >
                      {q.label}
                    </button>
                  ))}
                  {bulkFollowUpDate && (
                    <button
                      type="button"
                      onClick={() => onSelectFollowUpDate("")}
                      className="min-h-[34px] px-3 py-1 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all ml-auto active:scale-95"
                    >
                      Clear Date
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Follow-up Agenda / Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bulkRemarks}
                    onChange={(e) => onChangeRemarks(e.target.value)}
                    placeholder="Discussion agenda, questions to ask, or note..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 resize-none"
                  />
                </div>
              </div>
            )}

            {/* DELETE MODE */}
            {bulkModalType === "DELETE" && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 text-rose-900">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Irreversible Danger Action</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Are you sure you want to permanently delete these <strong>{selectedLeadCount}</strong> leads? All associated activities, follow-up timeline entries, and contact info will be erased immediately.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="min-h-[38px] sm:min-h-[40px] flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading || (bulkModalType === "ASSIGN" && !bulkSelectedUserId)}
                onClick={onConfirm}
                className={cn(
                  "min-h-[38px] sm:min-h-[40px] flex-1 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] disabled:opacity-50",
                  bulkModalType === "DELETE"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : bulkModalType === "DELETE" ? (
                  <Trash className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {bulkModalType === "DELETE"
                    ? "Delete Selected"
                    : bulkModalType === "ASSIGN"
                    ? "Confirm Assignment"
                    : bulkModalType === "STATUS"
                    ? "Update Stage"
                    : "Update Follow-up"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
