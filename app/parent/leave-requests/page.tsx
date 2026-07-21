import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import type { LeaveReasonType, LeaveRequestStatus } from "@/lib/leave-requests-api";
import { useMyLeaveRequests, useCreateLeaveRequest } from "@/lib/queries";
import {
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X,
  FilePen,
} from "lucide-react";

const STATUS_CONFIG: Record<
  LeaveRequestStatus,
  {
    labelKey: string;
    color: string;
    bg: string;
    icon: typeof Clock;
  }
> = {
  PENDING: {
    labelKey: "pendingLabel",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: Clock,
  },
  APPROVED: {
    labelKey: "approvedLabel",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
  REJECTED: {
    labelKey: "rejectedLabel",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: XCircle,
  },
};

const REASON_CONFIG: Record<
  LeaveReasonType,
  { labelKey: string; color: string; bg: string }
> = {
  LEAVE: {
    labelKey: "leaveLabel",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  SICK: {
    labelKey: "sickLabel",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
};

export default function ParentLeaveRequestsPage() {
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const studentId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";

  const [showForm, setShowForm] = useState(false);
  const [reasonType, setReasonType] = useState<LeaveReasonType>("LEAVE");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error, refetch } = useMyLeaveRequests(
    { clientId: cid, token },
    { studentId },
  );
  const requests = data?.requests ?? [];

  const createMutation = useCreateLeaveRequest({ clientId: cid, token });

  const handleSubmit = async () => {
    if (!cid || !token || !studentId || !description || !startDate) return;
    try {
      await createMutation.mutateAsync({
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
      refetch();
    } catch {
      // surfaced via mutation state
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const errorMessage = error instanceof Error ? error.message : null;
  const createError = createMutation.error instanceof Error ? createMutation.error.message : null;

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-gray-500">{t("parentPages", "noStudentSelected", lang)}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 mx-auto">
        <PageHeader
          title={t("parentPages", "leaveRequestsTitle", lang)}
          subtitle={t("parentPages", "leaveRequestsSub", lang)}
          icon={FilePen}
          back
          backHref="/parent"
        />

        {(errorMessage || createError) && <ApiErrorBanner message={errorMessage ?? createError ?? ""} />}

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title={t("parentPages", "noLeaveRequests", lang)}
              description={t("parentPages", "leaveRequestsSub", lang)}
              action={
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("parentPages", "newRequest", lang)}
                </button>
              }
            />
          ) : (
            requests.map((r) => {
              const sc = STATUS_CONFIG[r.status];
              const rc = REASON_CONFIG[r.reasonType];
              const Icon = sc.icon;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          rc.bg,
                          rc.color,
                        )}
                      >
                        {t("parentPages", rc.labelKey as any, lang)}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1",
                          sc.bg,
                          sc.color,
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {t("parentPages", sc.labelKey as any, lang)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{r.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>
                      From: {new Date(r.startDate).toLocaleDateString()}
                    </span>
                    {r.endDate && (
                      <span>
                        To: {new Date(r.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {r.reviewNote && (
                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                      <span className="font-semibold">Review note:</span>{" "}
                      {r.reviewNote}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB — New Request */}
      <AnimatePresence>
        {!showForm && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setShowForm(true)}
            className="fixed z-30 bottom-24 right-4 md:bottom-8 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-label={t("parentPages", "newRequest", lang)}
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

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
                  <p className="font-bold text-gray-900">{t("parentPages", "applyForLeave", lang)}</p>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                      {t("parentPages", "reasonType", lang)}
                    </label>
                    <div className="flex gap-2">
                      {(["LEAVE", "SICK"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setReasonType(r)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-2 active:scale-[0.98]",
                            reasonType === r
                              ? r === "LEAVE"
                                ? "border-amber-500 bg-amber-50 text-amber-700"
                                : "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
                          )}
                        >
                          {t("parentPages", REASON_CONFIG[r].labelKey as any, lang)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                      {t("parentPages", "descriptionLabel", lang)}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("parentPages", "reasonPlaceholder", lang)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                        {t("parentPages", "startDateLabel", lang)}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={today}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                        {t("parentPages", "endDateLabel", lang)}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || today}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
                  >
                    {t("parentPages", "cancelLabel", lang)}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || !description || !startDate}
                    className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {t("parentPages", "submitLabel", lang)}
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
