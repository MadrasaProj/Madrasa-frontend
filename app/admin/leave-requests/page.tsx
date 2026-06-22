import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import {
  getPendingLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
  type LeaveReasonType,
} from "@/lib/leave-requests-api";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  FilePen,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";

const REASON_CONFIG: Record<
  LeaveReasonType,
  { label: string; color: string; bg: string }
> = {
  LEAVE: { label: "Leave", color: "text-amber-600", bg: "bg-amber-50" },
  SICK: { label: "Sick", color: "text-orange-600", bg: "bg-orange-50" },
};

const STATUS_STYLES: Record<string, { border: string }> = {
  PENDING: { border: "border-l-amber-400" },
  APPROVED: { border: "border-l-emerald-400" },
  REJECTED: { border: "border-l-red-400" },
};

export default function AdminLeaveRequestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingSave, setReviewingSave] = useState(false);

  const loadRequests = async () => {
    if (!cid || !token) return;
    setLoading(true);
    try {
      const res = await getPendingLeaveRequests(cid, token, { status: filter });
      setRequests(res.requests);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [cid, token, filter]);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewingSave(true);
    try {
      await reviewLeaveRequest(cid, token, id, {
        status,
        reviewNote: reviewNote || undefined,
      });
      setExpanded(null);
      setReviewNote("");
      loadRequests();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReviewingSave(false);
    }
  };

  const filtered = search
    ? requests.filter(
        (r) =>
          r.student.name.toLowerCase().includes(search.toLowerCase()) ||
          r.student.adno.toLowerCase().includes(search.toLowerCase()),
      )
    : requests;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 mx-auto">
        <PageHeader
          title="Leave Requests"
          subtitle="Review and manage leave applications"
          icon={FilePen}
          back
          backHref="/admin"
        />

        {error && <ApiErrorBanner message={error} />}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setExpanded(null);
                }}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all hover:text-gray-700 active:scale-[0.98]",
                  filter === s
                    ? "bg-white text-emerald-700 shadow-sm font-bold"
                    : "text-gray-500",
                )}
              >
                {s === "PENDING"
                  ? "Pending"
                  : s === "APPROVED"
                    ? "Approved"
                    : "Rejected"}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission no..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No {filter.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const rc = REASON_CONFIG[r.reasonType];
              const isOpen = expanded === r.id;
              const styles = STATUS_STYLES[r.status] ?? {};
              return (
                <div
                  key={r.id}
                  className={cn(
                    "bg-white rounded-2xl border border-gray-200 border-l-4 overflow-hidden transition-shadow",
                    styles.border,
                    isOpen ? "shadow-md" : "shadow-sm",
                  )}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="w-full text-left p-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {r.student.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{r.student.adno}
                        </span>
                        {r.student.class && (
                          <span className="text-xs text-gray-400">
                            ({r.student.class.name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            rc.bg,
                            rc.color,
                          )}
                        >
                          {rc.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(r.startDate).toLocaleDateString()}
                          {r.endDate && (
                            <> - {new Date(r.endDate).toLocaleDateString()}</>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {r.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-gray-400 mt-1">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                          <div className="pt-3 space-y-2">
                            {r.reviewedBy && r.status !== "PENDING" && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <UserCheck className="w-3.5 h-3.5" />
                                Reviewed by {r.reviewedBy.name}
                              </div>
                            )}
                            <textarea
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="Add a note (optional)..."
                              rows={2}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReview(r.id, "REJECTED")}
                                disabled={reviewingSave}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/20"
                              >
                                {reviewingSave ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                              <button
                                onClick={() => handleReview(r.id, "APPROVED")}
                                disabled={reviewingSave}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                {reviewingSave ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
