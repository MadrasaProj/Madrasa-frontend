import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  getPendingLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
  type LeaveReasonType,
} from "@/lib/leave-requests-api";
import {
  Loader2,
  Check,
  X,
  Search,
  UserCheck,
} from "lucide-react";

const REASON_CONFIG: Record<
  LeaveReasonType,
  { labelKey: string; color: string; bg: string }
> = {
  LEAVE: { labelKey: "leaveLabel", color: "text-amber-600", bg: "bg-amber-50" },
  SICK: { labelKey: "sickLabel", color: "text-orange-600", bg: "bg-orange-50" },
};

export default function TeacherLeaveRequestsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
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
      setSelectedRequest(null);
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

  const statusLabel = (s: string) => {
    if (s === "PENDING") return t("teacherPages", "pendingLabel", lang);
    if (s === "APPROVED") return t("teacherPages", "approvedLabel", lang);
    return t("teacherPages", "rejectedLabel", lang);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 mx-auto px-0">
        <PageHeader
          title={t("teacherPages", "leaveRequests", lang)}
        />

        {error && <ApiErrorBanner message={error} />}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                size="lg"
                variant="ghost"
                onClick={() => {
                  setFilter(s);
                  setSelectedRequest(null);
                }}
                className={cn(
                  "flex-1",
                  filter === s && "bg-white shadow-sm",
                )}
              >
                {statusLabel(s)}
              </Button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("teacherPages", "searchNameAdmNo", lang)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center text-gray-400">
            <img
              src="/imgs/leave-request/1.png"
              alt=""
              aria-hidden="true"
              className="mb-4 h-40 w-44 object-contain"
            />
            <p className="text-sm">{t("teacherPages", "noLeaveRequests", lang)}</p>
          </div>
        ) : (
          <div>
            {filtered.map((r) => {
              const rc = REASON_CONFIG[r.reasonType];
              return (
                <Button
                  key={r.id}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setReviewNote("");
                    setSelectedRequest(r);
                  }}
                  className="h-auto w-full justify-start gap-3 rounded-none border-x-0 border-t-0 border-b border-gray-200 bg-transparent p-4 text-left shadow-none transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-sm text-gray-900">
                    {r.student.name}
                  </span>
                  {r.student.class && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {r.student.class.name}
                    </span>
                  )}
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", rc.bg, rc.color)}>
                    {t("teacherPages", rc.labelKey as any, lang)}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        <ResponsivePopover
          open={selectedRequest !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedRequest(null);
          }}
          title={selectedRequest?.student.name}
          description={selectedRequest?.student.class?.name}
        >
          {selectedRequest && (() => {
            const request = selectedRequest;
            const reason = REASON_CONFIG[request.reasonType];
            return (
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    #{request.student.adno}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", reason.bg, reason.color)}>
                    {t("teacherPages", reason.labelKey as any, lang)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {statusLabel(request.status)}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{lang === "ml" ? "കാലയളവ്" : "Leave period"}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {new Date(request.startDate).toLocaleDateString()}
                    {request.endDate && <> – {new Date(request.endDate).toLocaleDateString()}</>}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {t("teacherPages", "descriptionLabel", lang)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.description}</p>
                </div>

                {request.reviewedBy && request.status !== "PENDING" && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <UserCheck className="h-3.5 w-3.5" />
                    {t("teacherPages", "reviewedBy", lang)} {request.reviewedBy.name}
                  </div>
                )}

                {request.reviewNote && request.status !== "PENDING" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("parentPages", "reviewNote", lang)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.reviewNote}</p>
                  </div>
                )}

                {request.status === "PENDING" && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder={t("teacherPages", "addNoteOptional", lang)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        onClick={() => handleReview(request.id, "REJECTED")}
                        disabled={reviewingSave}
                        className="  flex-1   bg-red-500   text-white hover:bg-red-600"
                      >
                        {reviewingSave ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><X className="h-4 w-4" />{t("teacherPages", "rejectLabel", lang)}</span>}
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => handleReview(request.id, "APPROVED")}
                        disabled={reviewingSave}
                        className="  flex-1   bg-emerald-600   text-white hover:bg-emerald-700"
                      >
                        {reviewingSave ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />{t("teacherPages", "approveLabel", lang)}</span>}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
