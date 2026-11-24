import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Loader2, Sparkles, Building2, Check, Percent } from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SOURCES,
  CONTACT_ROLES,
  type LeadStatus,
} from "./crm-types";
import type { DistrictItem, InternalUserItem } from "@/lib/crm-api";
import { cn } from "@/lib/utils";

export interface LeadFormData {
  name: string;
  type: string;
  districtId: string;
  district: string;
  place: string;
  address: string;
  studentCount: number;
  teacherCount: number;
  existingSoftware: string;
  source: string;
  status: string;
  enableCommission: boolean;
  commissionPercentage: number;
  contributors: Array<{ userId: string; percentage: number; notes?: string }>;
  primaryContactId?: string;
  contactName: string;
  contactPhone: string;
  contactSecondaryPhone: string;
  contactRole: string;
}

interface LeadFormDrawerProps {
  isOpen: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  formData: LeadFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  districts: DistrictItem[];
  assigneeOptions: InternalUserItem[];
  effectiveUserId?: string;
}

export const LeadFormDrawer: React.FC<LeadFormDrawerProps> = ({
  isOpen,
  mode,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSaving,
  districts,
  assigneeOptions,
  effectiveUserId,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSaving && onClose()}
          className="fixed inset-0 bg-black backdrop-blur-xs"
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="relative bg-white w-full max-w-lg h-full max-h-[100dvh] overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6 shadow-2xl z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-600" />
                <span>{mode === "create" ? "Add New Lead" : "Edit Lead Details"}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === "create"
                  ? "Register a new madrasa prospect into the CRM funnel"
                  : "Update institutional profile, contacts, and stage"}
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              aria-label="Close form drawer"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5 flex-1 pb-6">
            {/* Madrasa Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Madrasa Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Darul Uloom Kozhikode"
                className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600"
              />
            </div>

            {/* Stage & Syllabus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Pipeline Stage
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                >
                  {LEAD_STATUSES.map((s, idx) => (
                    <option key={s} value={s}>
                      {idx + 1}. {LEAD_STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Syllabus / Board Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                >
                  {["Samastha", "AP", "Fadhila", "Other"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* District & Place */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  District *
                </label>
                <select
                  required
                  value={formData.districtId}
                  onChange={(e) => {
                    const d = districts.find((dist) => dist.id === e.target.value);
                    setFormData((p) => ({
                      ...p,
                      districtId: e.target.value,
                      district: d?.name ?? "",
                    }));
                  }}
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                >
                  <option value="">Select District *</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Place / Town
                </label>
                <input
                  type="text"
                  value={formData.place}
                  onChange={(e) => setFormData((p) => ({ ...p, place: e.target.value }))}
                  placeholder="e.g. Koduvally, Chemmad"
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Full Address
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Complete postal address / landmark"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs sm:text-sm text-gray-900 focus:outline-none resize-none"
              />
            </div>

            {/* Source, Students, Teachers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Lead Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value }))}
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold focus:outline-none"
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Students
                </label>
                <input
                  type="number"
                  value={formData.studentCount || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, studentCount: Number(e.target.value) }))
                  }
                  placeholder="0"
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs sm:text-sm font-bold text-gray-900 text-center focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Teachers
                </label>
                <input
                  type="number"
                  value={formData.teacherCount || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, teacherCount: Number(e.target.value) }))
                  }
                  placeholder="0"
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs sm:text-sm font-bold text-gray-900 text-center focus:outline-none"
                />
              </div>
            </div>

            {/* Primary Contact Person */}
            <div className="bg-gray-50 p-3.5 sm:p-4 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Primary Contact Person
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData((p) => ({ ...p, contactName: e.target.value }))}
                    placeholder="e.g. Usthad Abdul Hameed"
                    className="w-full min-h-[38px] sm:min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Primary Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                    placeholder="9876543210"
                    className="w-full min-h-[38px] sm:min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Secondary Phone</label>
                  <input
                    type="tel"
                    value={formData.contactSecondaryPhone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, contactSecondaryPhone: e.target.value }))
                    }
                    placeholder="Alternative phone number"
                    className="w-full min-h-[38px] sm:min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Role / Title</label>
                  <select
                    value={formData.contactRole}
                    onChange={(e) => setFormData((p) => ({ ...p, contactRole: e.target.value }))}
                    className="w-full min-h-[38px] sm:min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none text-gray-800 font-medium"
                  >
                    <option value="">Select Role / Title</option>
                    {CONTACT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Current Software */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Current Software / System
              </label>
              <input
                type="text"
                value={formData.existingSoftware}
                onChange={(e) => setFormData((p) => ({ ...p, existingSoftware: e.target.value }))}
                placeholder="e.g. Excel, Registers, Custom software"
                className="w-full min-h-[38px] sm:min-h-[40px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs sm:text-sm focus:outline-none"
              />
            </div>

            {/* Lead Ownership & Assignee */}
            <div className="bg-emerald-50/50 p-3.5 sm:p-4 rounded-2xl space-y-3 border border-emerald-200">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    Lead Assignment &amp; Ownership
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Assign lead ownership to sales team member
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Assigned Sales Representative *
                </label>
                <select
                  value={formData.contributors[0]?.userId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((p) => {
                      const next = [...p.contributors];
                      if (next.length === 0) {
                        next.push({ userId: val, percentage: p.commissionPercentage });
                      } else {
                        next[0] = { ...next[0], userId: val };
                      }
                      return { ...p, contributors: next };
                    });
                  }}
                  className="w-full min-h-[38px] sm:min-h-[40px] bg-white border border-gray-200 rounded-xl px-3 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none"
                >
                  <option value="">Select Team Member to Assign</option>
                  {assigneeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === effectiveUserId ? `⭐ ${u.name} (You)` : `${u.name} (${u.role?.replace(/_/g, " ")})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commission toggle */}
              <div className="pt-2 border-t border-emerald-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">Enable Commission Tracking</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableCommission}
                    onChange={(e) => setFormData((p) => ({ ...p, enableCommission: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                {formData.enableCommission && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-600">Base Commission:</span>
                    <input
                      type="number"
                      value={formData.commissionPercentage}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, commissionPercentage: Number(e.target.value) }))
                      }
                      className="w-20 min-h-[34px] bg-white border border-gray-200 rounded-xl px-2 text-xs font-bold text-center"
                    />
                    <span className="text-xs font-bold text-gray-600">%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="min-h-[38px] sm:min-h-[40px] flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[38px] sm:min-h-[40px] flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{mode === "create" ? "Create Lead" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
