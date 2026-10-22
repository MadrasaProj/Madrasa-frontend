import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerInput } from "@/components/DatePickerInput";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import type { LeaveReasonType, LeaveRequest, LeaveRequestStatus } from "@/lib/leave-requests-api";
import { useMyLeaveRequests, useCreateLeaveRequest } from "@/lib/queries";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  HeartPulse,
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
    color: "text-primary-600",
    bg: "bg-primary-50",
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
  { labelKey: string; color: string; bg: string; icon: typeof CalendarDays }
> = {
  LEAVE: {
    labelKey: "leaveLabel",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: CalendarDays,
  },
  SICK: {
    labelKey: "sickLabel",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: HeartPulse,
  },
};

export default function ParentLeaveRequestsPage() {
  const { user, accessToken, activeClientId, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const studentId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";

  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
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
    if (!cid || !token || !studentId || !description.trim() || !startDate || startDate < today || (endDate && endDate < startDate)) return;
    try {
      await createMutation.mutateAsync({
        studentId,
        reasonType,
        description: description.trim(),
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

  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
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
      <div className=" mx-auto ">
        <PageHeader
          title={t("parentPages", "leaveRequestsTitle", lang)}
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              {t("parentPages", "newRequest", lang)}
            </Button>
          }
        />

        {errorMessage && <ApiErrorBanner message={errorMessage} />}

        <div className="space-y-3 pt-5">
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
            />
          ) : (
            <div className="rounded-xl border overflow-hidden border-gray-200 bg-white">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead scope="col" className="px-4">{t("parentPages", "reasonType", lang)}</TableHead>
                    <TableHead scope="col" className="px-4">{t("parentPages", "startDateLabel", lang)}</TableHead>
                    <TableHead scope="col" className="px-4">{t("parentPages", "endDateLabel", lang)}</TableHead>
                    <TableHead scope="col" className="px-4">{t("parentPages", "statusLabel", lang)}</TableHead>
                    <TableHead scope="col" className="px-4">{t("parentPages", "submittedLabel", lang)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const status = STATUS_CONFIG[request.status];
                    const reason = REASON_CONFIG[request.reasonType];
                    const StatusIcon = status.icon;
                    return (
                      <TableRow
                        key={request.id}
                        tabIndex={0}
                        onClick={() => setSelectedRequest(request)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedRequest(request);
                          }
                        }}
                        aria-label={`${t("parentPages", reason.labelKey as any, lang)} — ${new Date(request.startDate).toLocaleDateString()}`}
                        className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500"
                      >
                        <TableCell className="px-4 font-medium text-gray-900">{t("parentPages", reason.labelKey as any, lang)}</TableCell>
                        <TableCell className="px-4 text-gray-600">{new Date(request.startDate).toLocaleDateString()}</TableCell>
                        <TableCell className="px-4 text-gray-600">{request.endDate ? new Date(request.endDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="px-4">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status.bg, status.color)}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {t("parentPages", status.labelKey as any, lang)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 text-gray-600">{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <ResponsivePopover
        open={selectedRequest !== null}
        onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
        title={t("parentPages", "leaveRequestsTitle", lang)}
        description={selectedRequest && [selectedRequest.student.name, selectedRequest.student.class?.name, selectedRequest.student.adno].filter(Boolean).join(" · ")}
      >
        {selectedRequest && (() => {
          const request = selectedRequest;
          const status = STATUS_CONFIG[request.status];
          const reason = REASON_CONFIG[request.reasonType];
          const StatusIcon = status.icon;
          return (
            <div className="space-y-5 p-5 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", reason.bg, reason.color)}>
                  {t("parentPages", reason.labelKey as any, lang)}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status.bg, status.color)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {t("parentPages", status.labelKey as any, lang)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t("parentPages", "startDateLabel", lang)}</p>
                  <p className="mt-1 text-gray-900">{new Date(request.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t("parentPages", "endDateLabel", lang)}</p>
                  <p className="mt-1 text-gray-900">{request.endDate ? new Date(request.endDate).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t("parentPages", "submittedLabel", lang)}</p>
                  <p className="mt-1 text-gray-900">{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{t("parentPages", "reviewedLabel", lang)}</p>
                    <p className="mt-1 text-gray-900">{new Date(request.reviewedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">{t("parentPages", "descriptionLabel", lang)}</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">{request.description}</p>
              </div>
              {request.reviewedBy && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t("parentPages", "reviewedByLabel", lang)}</p>
                  <p className="mt-1 text-gray-900">{request.reviewedBy.name}</p>
                </div>
              )}
              {request.reviewNote && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t("parentPages", "reviewNote", lang)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900">{request.reviewNote}</p>
                </div>
              )}
            </div>
          );
        })()}
      </ResponsivePopover>

      <ResponsivePopover
        open={showForm}
        onOpenChange={setShowForm}
        drawerOnDesktop
        title={t("parentPages", "applyForLeave", lang)}
        footer={
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              {t("parentPages", "cancelLabel", lang)}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !description.trim() || !startDate || startDate < today || Boolean(endDate && endDate < startDate)}
            >
              {t("parentPages", "submitLabel", lang)}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 p-5">
          {createError && <ApiErrorBanner message={createError} />}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("parentPages", "reasonType", lang)}</p>
            <Tabs value={reasonType} onValueChange={(value) => setReasonType(value as LeaveReasonType)}>
              <TabsList className={reasonType === "LEAVE" ? "bg-amber-50" : "bg-orange-50"}>
                {(["LEAVE", "SICK"] as const).map((type) => {
                  const reason = REASON_CONFIG[type];
                  const ReasonIcon = reason.icon;
                  return (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className={type === "LEAVE" ? "gap-1.5 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800" : "gap-1.5 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800"}
                    >
                      <ReasonIcon className="size-4" />
                      {t("parentPages", reason.labelKey as any, lang)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <label htmlFor="leave-description" className="text-sm font-medium">{t("parentPages", "descriptionLabel", lang)}</label>
            <Textarea
              id="leave-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("parentPages", "reasonPlaceholder", lang)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="leave-start-date" className="text-sm font-medium">{t("parentPages", "startDateLabel", lang)}</label>
              <DatePickerInput
                id="leave-start-date"
                title={t("parentPages", "startDateLabel", lang)}
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  if (endDate && endDate < date) setEndDate("");
                }}
                disableFuture={false}
                minDate={today}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="leave-end-date" className="text-sm font-medium">{t("parentPages", "endDateLabel", lang)}</label>
              <DatePickerInput
                id="leave-end-date"
                title={t("parentPages", "endDateLabel", lang)}
                value={endDate}
                onChange={setEndDate}
                disableFuture={false}
                minDate={startDate || today}
                allowClear
                clearLabel={t("parentPages", "clearDateLabel", lang)}
              />
            </div>
          </div>
        </div>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
