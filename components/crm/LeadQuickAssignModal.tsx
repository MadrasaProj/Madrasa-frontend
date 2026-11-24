import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Loader2, Sparkles, ChevronDown } from "lucide-react";
import type { LeadDetail, InternalUserItem } from "@/lib/crm-api";

interface LeadQuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDetail | null;
  assigneeOptions: InternalUserItem[];
  selectedUserId: string;
  onSelectUserId: (id: string) => void;
  onConfirm: (userId: string) => void;
  isLoading: boolean;
  effectiveUserId?: string;
}

export const LeadQuickAssignModal: React.FC<LeadQuickAssignModalProps> = ({
  isOpen,
  onClose,
  lead,
  assigneeOptions,
  selectedUserId,
  onSelectUserId,
  onConfirm,
  isLoading,
  effectiveUserId,
}) => {
  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                <span>Reassign Lead</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{lead.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reassignment modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Sales Representative *
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => onSelectUserId(e.target.value)}
                  className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{"\u00A0\u00A0"}-- Choose Sales Rep / Admin --</option>
                  {assigneeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {"\u00A0\u00A0"}{u.id === effectiveUserId ? `⭐ ${u.name} (You)` : `${u.name} (${u.role?.replace(/_/g, " ")})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {effectiveUserId && (
              <button
                type="button"
                onClick={() => onSelectUserId(effectiveUserId)}
                className="w-full min-h-[36px] px-3.5 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assign to Me</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[38px] sm:min-h-[40px] flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading || !selectedUserId}
                onClick={() => onConfirm(selectedUserId)}
                className="min-h-[38px] sm:min-h-[40px] flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
