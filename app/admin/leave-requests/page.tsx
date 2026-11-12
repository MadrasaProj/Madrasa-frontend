import { REQUEST_REASON_SCHEMA as REASON_CONFIG, getRequestConfigSummary } from "@/lib/request-reasons";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { IllustratedEmptyState } from "@/components/ui/IllustratedEmptyState";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { cn } from "@/lib/utils";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { useAuthStore } from "@/store/auth";
import {
  getPendingLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
} from "@/lib/leave-requests-api";
import {
  Loader2,
  Check,
  X,
  Search,
  UserCheck,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";



export default function AdminLeaveRequestsPage() {
  const { accessToken, activeClientId } = useAuthStore();
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
      setError(null);
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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 px-0 mx-auto">
        <PageHeader title="Leave Requests" />

        {error && <ApiErrorBanner message={error} />}

        <div className="flex flex-col gap-3 mb-6 sm:flex-row">
          <Tabs value={filter} onValueChange={(value) => {
            setFilter(value);
            setSelectedRequest(null);
          }} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="flex-1">
                {s === "PENDING"
                  ? "Pending"
                  : s === "APPROVED"
                    ? "Approved"
                    : "Rejected"}
              </TabsTrigger>
            ))}
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission no..."
              className="w-full rounded-xl pl-10"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : filtered.length === 0 ? (
          <IllustratedEmptyState
            image="/images/teacher/leave-requests-empty.webp"
            title={`No ${filter.toLowerCase()} requests`}
            description="Leave requests will appear here when submitted."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-background divide-y divide-gray-100">
            {filtered.map((r) => {
              const rc = REASON_CONFIG[r.reasonType];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setReviewNote("");
                    setSelectedRequest(r);
                  }}
                  className="flex h-auto w-full items-center justify-start gap-3 rounded-none border-x-0 border-t-0 border-b last:border-b-0 border-gray-200 p-2 text-left shadow-none transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-sm text-gray-900">{r.student.name}</span>
                  {r.student.class && <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{r.student.class.name}</span>}
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", rc.bg, rc.color)}>{rc.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <ResponsivePopover
          open={selectedRequest !== null}
          desktopView="right-drawer"
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
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">#{request.student.adno}</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", reason.bg, reason.color)}>{reason.label}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{request.status}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Leave period</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {new Date(request.startDate).toLocaleDateString()}
                    {request.endDate && <> – {new Date(request.endDate).toLocaleDateString()}</>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.description}</p>
                  {getRequestConfigSummary(request.reasonType, request.config ?? {}, "en") && (
                    <p className="mt-2 text-sm text-gray-600">Days: {getRequestConfigSummary(request.reasonType, request.config ?? {}, "en")}</p>
                  )}
                </div>
                {request.reviewedBy && request.status !== "PENDING" && (
                  <div className="flex items-center gap-2 text-xs text-gray-500"><UserCheck className="h-3.5 w-3.5" />Reviewed by {request.reviewedBy.name}</div>
                )}
                {request.reviewNote && request.status !== "PENDING" && (
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review note</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.reviewNote}</p></div>
                )}
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a note (optional)..." rows={3} className="resize-none" />
                  <div className="flex gap-2">
                    <Button type="button" variant="destructive" size="lg" onClick={() => handleReview(request.id, "REJECTED")} disabled={reviewingSave || request.status === "REJECTED"} className="flex-1 bg-red-500 text-white hover:bg-red-600">
                      {reviewingSave ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><X className="h-4 w-4" />Reject</span>}
                    </Button>
                    <Button type="button" size="lg" onClick={() => handleReview(request.id, "APPROVED")} disabled={reviewingSave || request.status === "APPROVED"} className="flex-1 bg-primary-600 text-white hover:bg-primary-700">
                      {reviewingSave ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />Approve</span>}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </ResponsivePopover>
      </div>
    </DashboardLayout>
  );
}
