import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  type LeaveRequest,
  type LeaveReasonType,
  type LeaveRequestStatus,
} from "@/lib/leave-requests-api";
import {
  Loader2, Send, Clock, CheckCircle2, XCircle, AlertCircle, Plus, X,
} from "lucide-react";

const STATUS_CONFIG: Record<LeaveRequestStatus, { label: string; labelMl: string; color: string; bg: string; icon: typeof Clock }> = {
  PENDING:  { label: "Pending",  labelMl: "തീരുമാനമായിട്ടില്ല", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  APPROVED: { label: "Approved", labelMl: "അനുവദിച്ചു",       color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", labelMl: "നിരസിച്ചു",        color: "text-red-600",    bg: "bg-red-50",    icon: XCircle },
};

const REASON_CONFIG: Record<LeaveReasonType, { label: string; labelMl: string; color: string; bg: string }> = {
  LEAVE: { label: "Leave", labelMl: "ലീവ്",  color: "text-amber-600", bg: "bg-amber-50" },
  SICK:  { label: "Sick",  labelMl: "അസുഖം", color: "text-orange-600", bg: "bg-orange-50" },
};

export default function ParentLeaveRequestsPage() {
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const studentId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [reasonType, setReasonType] = useState<LeaveReasonType>("LEAVE");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    if (!cid || !token || !studentId) return;
    setLoading(true);
    try {
      const res = await getMyLeaveRequests(cid, token, { studentId });
      setRequests(res.requests);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [cid, token, studentId]);

  const handleSubmit = async () => {
    if (!cid || !token || !studentId || !description || !startDate) return;
    setSubmitting(true);
    try {
      await createLeaveRequest(cid, token, {
        studentId,
        reasonType,
        description,
        startDate,
        endDate: endDate || undefined,
      });
      setReasonType("LEAVE");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setShowForm(false);
      loadRequests();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-gray-500">No student selected</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="Leave Requests"
            subtitle="Apply for leave or sick leave"
          />
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>

        {error && <ApiErrorBanner message={error} />}

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No leave requests yet</p>
            </div>
          ) : (
            requests.map((r) => {
              const sc = STATUS_CONFIG[r.status];
              const rc = REASON_CONFIG[r.reasonType];
              const Icon = sc.icon;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", rc.bg, rc.color)}>
                        {rc.label}
                      </span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1", sc.bg, sc.color)}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{r.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>From: {new Date(r.startDate).toLocaleDateString()}</span>
                    {r.endDate && <span>To: {new Date(r.endDate).toLocaleDateString()}</span>}
                  </div>
                  {r.reviewNote && (
                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                      <span className="font-semibold">Review note:</span> {r.reviewNote}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New request modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="font-bold text-gray-900">Apply for Leave</p>
                  <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Reason Type</label>
                    <div className="flex gap-2">
                      {(["LEAVE", "SICK"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setReasonType(r)}
                          className={cn("flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-2",
                            reasonType === r
                              ? r === "LEAVE" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-500"
                          )}
                        >
                          {REASON_CONFIG[r].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Reason for leave..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={today}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">End Date (optional)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || today}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !description || !startDate}
                    className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
