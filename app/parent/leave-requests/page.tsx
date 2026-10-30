import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/DatePickerInput";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import type { LeaveReasonType, LeaveRequest, LeaveRequestStatus } from "@/lib/leave-requests-api";
import { useMyLeaveRequests, useCreateLeaveRequest } from "@/lib/queries";
import {
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  HeartPulse,
  Search,
  UserCheck,
  Plus,
} from "lucide-react";

type StatusFilter = LeaveRequestStatus | "ALL";
const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

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
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [reasonType, setReasonType] = useState<LeaveReasonType>("LEAVE");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, error, refetch } = useMyLeaveRequests(
    { clientId: cid, token },
    { studentId, status: filter === "ALL" ? undefined : filter },
  );
  const requests = data?.requests ?? [];
  const query = search.trim().toLocaleLowerCase();
  const filtered = query
    ? requests.filter((request) =>
        [
          request.student.name,
          request.student.adno,
          request.description,
          t("parentPages", REASON_CONFIG[request.reasonType].labelKey as any, lang),
        ].some((value) => value.toLocaleLowerCase().includes(query)),
      )
    : requests;

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
      <div className="mx-auto px-0 py-4 sm:py-6">
        <PageHeader title={t("parentPages", "leaveRequestsTitle", lang)} />

        {errorMessage && <ApiErrorBanner message={errorMessage} />}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as StatusFilter);
              setSelectedRequest(null);
            }}
            className="w-full overflow-x-auto sm:w-auto"
          >
            <TabsList className="min-w-full w-max sm:min-w-0">
              {STATUS_FILTERS.map((status) => (
                <TabsTrigger key={status} value={status} className="flex-1 shrink-0 px-3">
                  {status === "ALL"
                    ? t("parentPages", "allRequests", lang)
                    : t("parentPages", STATUS_CONFIG[status].labelKey as any, lang)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("parentPages", "searchLeaveRequests", lang)}
              aria-label={t("parentPages", "searchLeaveRequests", lang)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center text-gray-400">
            <img
              src="/imgs/leave-request/1.png"
              alt=""
              aria-hidden="true"
              className="mb-4 h-40 w-44 object-contain"
            />
            <p className="text-sm">
              {requests.length === 0 && filter === "ALL" && !query
                ? t("parentPages", "noLeaveRequests", lang)
                : t("parentPages", "noMatchingLeaveRequests", lang)}
            </p>
          </div>
        ) : (
          <div className="card rounded-2xl bg-background *:px-4 ">
            {filtered.map((request) => {
              const reason = REASON_CONFIG[request.reasonType];
              const status = STATUS_CONFIG[request.status];
              const StatusIcon = status.icon;
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedRequest(request)}
                  className="flex h-auto w-full flex-wrap items-center justify-start gap-2 border-b border-gray-200 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-primary-500 sm:gap-3"
                >
                  <span className="min-w-0 flex-1 basis-full sm:basis-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{request.student.name}</span>
                    <span className="block text-xs text-gray-500">{new Date(request.startDate).toLocaleDateString()}{request.endDate && ` – ${new Date(request.endDate).toLocaleDateString()}`}</span>
                  </span>
                  {request.student.class && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {request.student.class.name}
                    </span>
                  )}
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", reason.bg, reason.color)}>
                    {t("parentPages", reason.labelKey as any, lang)}
                  </span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status.bg, status.color)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {t("parentPages", status.labelKey as any, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2  rounded-full   shadow-lg lg:bottom-6 lg:right-8"
      >
        <Plus className="size-4" />
        {t("parentPages", "newRequest", lang)}
      </Button>

      <ResponsivePopover
        open={selectedRequest !== null}
        onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
        title={selectedRequest?.student.name}
        description={selectedRequest?.student.class?.name}
      >
        {selectedRequest && (() => {
          const request = selectedRequest;
          const status = STATUS_CONFIG[request.status];
          const reason = REASON_CONFIG[request.reasonType];
          const StatusIcon = status.icon;
          return (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  #{request.student.adno}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", reason.bg, reason.color)}>
                  {t("parentPages", reason.labelKey as any, lang)}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status.bg, status.color)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {t("parentPages", status.labelKey as any, lang)}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("parentPages", "leavePeriod", lang)}</p>
                <p className="mt-1 text-sm text-gray-700">
                  {new Date(request.startDate).toLocaleDateString()}
                  {request.endDate && <> – {new Date(request.endDate).toLocaleDateString()}</>}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("parentPages", "descriptionLabel", lang)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.description}</p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                <span>{t("parentPages", "submittedLabel", lang)}: {new Date(request.createdAt).toLocaleDateString()}</span>
                {request.reviewedAt && (
                  <span>{t("parentPages", "reviewedLabel", lang)}: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                )}
              </div>
              {request.reviewedBy && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserCheck className="h-3.5 w-3.5" />
                  {t("parentPages", "reviewedByLabel", lang)} {request.reviewedBy.name}
                </div>
              )}
              {request.reviewNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("parentPages", "reviewNote", lang)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{request.reviewNote}</p>
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
