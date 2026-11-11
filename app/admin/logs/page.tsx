import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrawerSelector } from "@/components/DrawerSelector";
import { getActivityLogs, type ActivityLogItem } from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/Skeleton";

const ACTOR_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-blue-100 text-blue-700",
  CLIENT_ADMIN: "bg-blue-100 text-blue-700",
  TEACHER: "bg-primary-100 text-primary-700",
  PARENT: "bg-amber-100 text-amber-700",
  COMMITTEE: "bg-pink-100 text-pink-700",
};

const ACTION_ICONS: Record<string, string> = {
  AUTH_LOGIN: "mdi:lock-open-outline",
  AUTH_IMPERSONATE: "mdi:account-switch-outline",
  ATTENDANCE_BULK_UPSERT: "mdi:clipboard-check-outline",
  ATTENDANCE_UPDATE: "mdi:pencil-outline",
  HOMEWORK_CREATE: "mdi:note-plus-outline",
  HOMEWORK_UPDATE: "mdi:pencil-outline",
  HOMEWORK_DELETE: "mdi:delete-outline",
  HOMEWORK_SUBMISSIONS_UPDATE: "mdi:check-circle-outline",
  DIARY_UPSERT: "mdi:book-open-page-variant-outline",
  DIARY_UPDATE: "mdi:pencil-outline",
  DIARY_DELETE: "mdi:delete-outline",
  IBADAH_BULK_UPSERT: "mdi:hands-pray",
  FEE_TYPE_CREATE: "mdi:cash-plus",
  FEE_TYPE_UPDATE: "mdi:pencil-outline",
  FEE_TYPE_DELETE: "mdi:delete-outline",
  FEE_PAYMENT_RECORD: "mdi:credit-card-check-outline",
  FEE_PAYMENT_UPDATE: "mdi:pencil-outline",
  FEE_PAYMENTS_GENERATE: "mdi:lightning-bolt-outline",
  NOTIFICATION_CREATE: "mdi:bell-outline",
  NOTIFICATION_DELETE: "mdi:delete-outline",
  CLIENT_UPDATE: "mdi:cog-outline",
  SUBSCRIPTION_PAYMENT_RECORD: "mdi:credit-card-check-outline",
};

const ACTION_GRADIENTS: Record<string, string> = {
  AUTH: "from-violet-500 to-fuchsia-600",
  ATTENDANCE: "from-sky-500 to-blue-600",
  HOMEWORK: "from-indigo-500 to-violet-600",
  DIARY: "from-amber-400 to-orange-600",
  IBADAH: "from-emerald-500 to-teal-600",
  FEE: "from-green-500 to-emerald-700",
  NOTIFICATION: "from-rose-500 to-pink-600",
  CLIENT: "from-slate-500 to-slate-700",
  SUBSCRIPTION: "from-cyan-500 to-blue-600",
};

const ALL_ACTORS = [
  "",
  "SUPER_ADMIN",
  "CLIENT_ADMIN",
  "TEACHER",
  "PARENT",
  "COMMITTEE",
];
const TAKE = 30;

export default function ActivityLogsPage() {
  const { accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(() => {
    if (!cid || !token) return;
    setLoading(true);
    getActivityLogs(cid, token, {
      actorType: actorType || undefined,
      action: action || undefined,
      skip: page * TAKE,
      take: TAKE,
    })
      .then((r) => {
        setLogs(r.data);
        setTotal(r.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid, token, actorType, action, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / TAKE);

  return (
    <DashboardLayout>
      <PageHeader title="Activity Logs" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DrawerSelector
          title="Role"
          options={ALL_ACTORS.map((value) => ({
            value,
            label: value ? value.replace(/_/g, " ") : "All roles",
          }))}
          value={actorType}
          onChange={(value) => {
            setActorType(value);
            setPage(0);
          }}
          className="w-auto min-w-36 shadow-none"
        />
        <Input
          type="text"
          value={action}
          onChange={(e) => {
            setAction(e.target.value.toUpperCase());
            setPage(0);
          }}
          placeholder="Filter by action…"
          aria-label="Filter by action"
          size="lg"
          className="w-full min-w-[180px] flex-1 bg-white sm:max-w-64"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setActorType("");
            setAction("");
            setPage(0);
          }}
          className="shadow-none"
        >
          Clear
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
        <div className="min-w-0 border-r border-gray-100 p-2.5 sm:p-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Icon icon="mdi:format-list-bulleted" className="size-4 text-primary-600" aria-hidden="true" />
            {actorType || action ? "Matching entries" : "Total entries"}
          </span>
          <span className="mt-1.5 block text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]">
            {total}
          </span>
        </div>
        <div className="min-w-0 p-2.5 sm:p-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Icon icon="mdi:eye-outline" className="size-4 text-primary-600" aria-hidden="true" />
            On this page
          </span>
          <span className="mt-1.5 block text-xl font-medium leading-none tabular-nums text-gray-950 sm:text-[22px]">
            {logs.length}
          </span>
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <SkeletonList count={4} />
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon icon="mdi:history" className="mx-auto mb-3 size-10 opacity-30" aria-hidden="true" />
          <p className="font-semibold">No activity found</p>
          <p className="text-xs mt-1">
            Mutations and logins are recorded here.
          </p>
        </div>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-2xl !p-0 bg-white">
          <div className="min-w-[620px] divide-y divide-gray-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                      ACTION_GRADIENTS[log.action.split("_")[0]] ?? "from-primary-500 to-primary-700",
                    )}
                    aria-hidden="true"
                  >
                    <Icon icon={ACTION_ICONS[log.action] ?? "mdi:pin-outline"} className="size-5" />
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold text-gray-900" title={log.action}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm text-gray-600" title={log.actorName ?? log.actorId}>
                    {log.actorName ?? log.actorId.slice(0, 20)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                      ACTOR_COLORS[log.actorType] ?? "bg-gray-100 text-gray-500",
                    )}
                  >
                    {log.actorType.replace(/_/g, " ")}
                  </span>
                </div>
                <time dateTime={log.createdAt} className="whitespace-nowrap text-right text-xs tabular-nums text-gray-500">
                  {new Date(log.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                  {" · "}
                  {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pb-24">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="shadow-none"
          >
            <Icon icon="mdi:chevron-left" className="size-4" aria-hidden="true" /> Prev
          </Button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="shadow-none"
          >
            Next <Icon icon="mdi:chevron-right" className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
