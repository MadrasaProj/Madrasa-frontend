import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getNotifications,
  markNotificationRead,
  type NotificationRecord,
  type NotificationType,
} from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Bell,
  ExternalLink,
  BookOpen,
  ClipboardList,
  GraduationCap,
  CreditCard,
  Search,
  SlidersHorizontal,
  CircleCheck,
  Clock3,
  Calendar,
  CheckCheck,
  Loader2,
  Inbox,
} from "lucide-react";

interface TypeConfigItem {
  id: NotificationType | "ALL";
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  chartColor: string;
}

const NOTIFICATION_TYPES: TypeConfigItem[] = [
  { id: "ALL",               label: "All Types",  icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100 border-gray-200",     chartColor: "#9ca3af" },
  { id: "ANNOUNCEMENT",      label: "Announce",   icon: Bell,          color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100",  chartColor: "#4f46e5" },
  { id: "ATTENDANCE_ALERT",  label: "Attendance", icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", chartColor: "#059669" },
  { id: "FEE_REMINDER",      label: "Fees",       icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-50 border-amber-100",    chartColor: "#f59e0b" },
  { id: "HOMEWORK_REMINDER", label: "Homework",   icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-50 border-blue-100",      chartColor: "#2563eb" },
  { id: "EXAM_NOTICE",       label: "Exam",       icon: GraduationCap, color: "text-purple-700",  bg: "bg-purple-50 border-purple-100",  chartColor: "#9333ea" },
  { id: "GENERAL",           label: "General",    icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100 border-gray-200",     chartColor: "#6b7280" },
];

const TYPE_CONFIG: Record<string, TypeConfigItem> = {
  ANNOUNCEMENT:      NOTIFICATION_TYPES[1],
  ATTENDANCE_ALERT:  NOTIFICATION_TYPES[2],
  FEE_REMINDER:      NOTIFICATION_TYPES[3],
  HOMEWORK_REMINDER: NOTIFICATION_TYPES[4],
  EXAM_NOTICE:       NOTIFICATION_TYPES[5],
  GENERAL:           NOTIFICATION_TYPES[6],
};

function notificationPageItems(current: number, total: number): Array<number | "ellipsis"> {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous === 2) items.push(previous + 1);
    if (previous && page - previous > 2) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

function NotificationSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { value: number; color: string }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let position = 0;
  const point = (fraction: number) => {
    const angle = Math.PI * (1 - fraction);
    return [100 + 78 * Math.cos(angle), 94 - 78 * Math.sin(angle)];
  };

  return (
    <svg viewBox="0 0 200 108" role="img" aria-label={description} className="mx-auto h-24 w-full max-w-52 sm:h-28">
      <path d="M 22 94 A 78 78 0 0 1 178 94" fill="none" stroke="#e5e7eb" strokeWidth="17" strokeLinecap="round" />
      {total > 0 && segments.map((segment, index) => {
        const start = position;
        position += segment.value / total;
        if (segment.value <= 0) return null;
        const [x1, y1] = point(start);
        const [x2, y2] = point(position);
        return (
          <path
            key={index}
            d={`M ${x1} ${y1} A 78 78 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={segment.color}
            strokeWidth="17"
          />
        );
      })}
      <text x="100" y="72" textAnchor="middle" className="fill-gray-950 text-[23px] font-semibold">{value}</text>
      <text x="100" y="89" textAnchor="middle" className="fill-gray-500 text-[10px] font-medium">{label}</text>
    </svg>
  );
}

function NotificationStats({
  notifications,
  total,
  activeTypeName,
  statusName,
  search,
  lang,
  onMarkAllRead,
  markingAll,
}: {
  notifications: NotificationRecord[];
  total: number;
  activeTypeName: string;
  statusName: string;
  search: string;
  lang: Lang;
  onMarkAllRead: () => void;
  markingAll: boolean;
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;
  const readRate = notifications.length > 0
    ? Math.round((readCount / notifications.length) * 100)
    : 100;

  const announcements = notifications.filter((n) => n.type === "ANNOUNCEMENT" || n.type === "GENERAL").length;
  const alerts = notifications.filter((n) => n.type === "ATTENDANCE_ALERT" || n.type === "FEE_REMINDER").length;
  const academic = notifications.filter((n) => n.type === "HOMEWORK_REMINDER" || n.type === "EXAM_NOTICE").length;

  const typeCounts = {
    ANNOUNCEMENT: notifications.filter((n) => n.type === "ANNOUNCEMENT").length,
    HOMEWORK_REMINDER: notifications.filter((n) => n.type === "HOMEWORK_REMINDER").length,
    EXAM_NOTICE: notifications.filter((n) => n.type === "EXAM_NOTICE").length,
    ATTENDANCE_ALERT: notifications.filter((n) => n.type === "ATTENDANCE_ALERT").length,
    FEE_REMINDER: notifications.filter((n) => n.type === "FEE_REMINDER").length,
    GENERAL: notifications.filter((n) => n.type === "GENERAL").length,
  };

  const stats = [
    {
      label: t("notif", "unread", lang) || "Unread",
      value: unreadCount,
      detail: unreadCount === 0 ? (t("notif", "allCaughtUp", lang) || "All caught up") : `${unreadCount} unread`,
      icon: Clock3,
      color: "text-amber-600",
    },
    {
      label: t("teacherPages", "notifRead", lang) || "Read",
      value: readCount,
      detail: `${readRate}% read rate`,
      icon: CircleCheck,
      color: "text-emerald-600",
    },
    {
      label: "Announcements",
      value: announcements,
      detail: "General & school notices",
      icon: Bell,
      color: "text-indigo-600",
    },
    {
      label: "Academic",
      value: academic,
      detail: "Homework & exam notices",
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      label: "Alerts & Fees",
      value: alerts,
      detail: "Attendance & fee alerts",
      icon: ClipboardList,
      color: "text-teal-600",
    },
    {
      label: "Filtered Items",
      value: notifications.length,
      detail: `Out of ${total} total`,
      icon: Inbox,
      color: "text-gray-600",
    },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums text-gray-950">{total}</span>
            <span className="text-xs font-medium text-gray-600">
              {t("notif", "total", lang) || "Total"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onMarkAllRead}
                disabled={markingAll}
                className="h-7 px-2.5 rounded-full border border-primary-200 bg-white text-xs font-medium text-primary-700 hover:bg-primary-50"
              >
                {markingAll ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1 h-3 w-3 text-primary-600" />
                )}
                {t("notif", "markAllRead", lang) || "Mark all read"}
              </Button>
            )}
            <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              <strong className="tabular-nums">{notifications.length}</strong>{" "}
              {t("teacherPages", "feeResultsShown", lang) || "shown"}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
            Type: {activeTypeName}
          </span>
          <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
            {t("common", "status", lang) || "Status"}: {statusName}
          </span>
          {search.trim() && (
            <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
              {t("teacherPages", "feeResultsSearch", lang) || "Search"}: {search.trim()}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">Read Status</h3>
          <NotificationSemiCircle
            segments={[
              { value: readCount, color: "#059669" },
              { value: unreadCount, color: "#f59e0b" },
            ]}
            value={`${readRate}%`}
            label={t("teacherPages", "notifRead", lang) || "Read"}
            description={`Read Rate: ${readRate}%`}
          />
          <div className="flex justify-center gap-3 text-[11px] text-gray-600">
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />
              {t("teacherPages", "notifRead", lang) || "Read"}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />
              {t("notif", "unread", lang) || "Unread"}
            </span>
          </div>
        </div>
        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">Categories</h3>
          <NotificationSemiCircle
            segments={[
              { value: typeCounts.ANNOUNCEMENT, color: "#4f46e5" },
              { value: typeCounts.HOMEWORK_REMINDER, color: "#2563eb" },
              { value: typeCounts.EXAM_NOTICE, color: "#9333ea" },
              { value: typeCounts.ATTENDANCE_ALERT, color: "#059669" },
              { value: typeCounts.FEE_REMINDER, color: "#f59e0b" },
              { value: typeCounts.GENERAL, color: "#6b7280" },
            ]}
            value={String(notifications.length)}
            label="Items"
            description="Notification categories"
          />
          <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 text-[11px] text-gray-600">
            {[
              ["Announce", "bg-indigo-600"],
              ["Homework", "bg-blue-600"],
              ["Exam", "bg-purple-600"],
              ["Attendance", "bg-emerald-600"],
              ["Fees", "bg-amber-500"],
            ].map(([label, color]) => (
              <span key={label}>
                <span className={cn("mr-1 inline-block size-2 rounded-full", color)} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", stat.color)} />
                <span>{stat.label}</span>
              </div>
              <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 truncate">{stat.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TeacherNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";
  const { activeClassId } = useActiveClass();
  const navigate = useNavigate();

  const [notifs, setNotifs]             = useState<NotificationRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [search, setSearch]             = useState("");
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen]   = useState(false);

  const [skip, setSkip]                 = useState(0);
  const pageSize                        = 20;

  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [markingAll, setMarkingAll]           = useState(false);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setNotifs([]);
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(cid, token, { take: 100 });
      setNotifs(
        (data.notifications ?? []).filter(
          (item) => item.targetClassIds.length === 0 || item.targetClassIds.includes(activeClassId)
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, activeClassId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectNotification = async (n: NotificationRecord) => {
    setSelectedNotifId(n.id);
    if (!n.isRead) {
      markNotificationRead(cid, token, n.id).catch(() => {});
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifs.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.allSettled(unread.map((n) => markNotificationRead(cid, token, n.id)));
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifs.filter((n) => {
      if (activeTypeId && n.type !== activeTypeId) return false;
      if (statusFilter === "UNREAD" && n.isRead) return false;
      if (statusFilter === "READ" && !n.isRead) return false;
      if (q) {
        const titleMatch = n.title?.toLowerCase().includes(q);
        const bodyMatch = n.body?.toLowerCase().includes(q);
        const creatorMatch = n.creator?.name?.toLowerCase().includes(q);
        if (!titleMatch && !bodyMatch && !creatorMatch) return false;
      }
      return true;
    });
  }, [notifs, activeTypeId, statusFilter, search]);

  const visibleNotifs = filtered.slice(skip, skip + pageSize);
  const currentPage = Math.floor(skip / pageSize) + 1;
  const pageCount = Math.ceil(filtered.length / pageSize);

  useEffect(() => {
    if (!loading && skip >= filtered.length && skip > 0) {
      setSkip(Math.max(0, Math.ceil(filtered.length / pageSize) - 1) * pageSize);
    }
  }, [filtered.length, loading, skip, pageSize]);

  const selectedNotif = selectedNotifId
    ? notifs.find((n) => n.id === selectedNotifId) ?? null
    : null;

  const activeTypeName = activeTypeId
    ? (TYPE_CONFIG[activeTypeId]?.label ?? activeTypeId)
    : "All Types";

  const statusName =
    statusFilter === "all"
      ? (t("common", "all", lang) || "All")
      : statusFilter === "UNREAD"
      ? (t("notif", "unread", lang) || "Unread")
      : (t("teacherPages", "notifRead", lang) || "Read");

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "notifTitle", lang) || "Notifications"} />

      {/* Search and Filters Trigger Drawer */}
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <div className="pt-4! pb-2!">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 p-1.5">
            <InputGroup className="h-10 flex-1 rounded-lg bg-white">
              <InputGroupInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSkip(0);
                }}
                placeholder="Search notifications..."
                aria-label="Search notifications"
                className="h-full text-sm"
              />
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4 text-gray-400" />
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="outline"
              type="button"
              size="icon-lg"
              onClick={() => setFiltersOpen(true)}
              className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DrawerContent
          className="max-h-[85dvh] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          aria-label="Notification filters"
        >
          <div className="flex items-center justify-between mb-6">
            <DrawerTitle className="text-lg font-bold text-gray-900">Filters</DrawerTitle>
          </div>

          <section className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Notification Type
            </h3>
            <div className="-mx-5 overflow-x-auto px-5">
              <div className="flex w-max gap-2">
                {NOTIFICATION_TYPES.map((type) => {
                  const isSelected = type.id === "ALL" ? activeTypeId === null : activeTypeId === type.id;
                  return (
                    <Button
                      variant="ghost"
                      key={type.id}
                      onClick={() => {
                        setActiveTypeId(type.id === "ALL" ? null : type.id);
                        setSkip(0);
                      }}
                      className={cn(
                        "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              {t("common", "status", lang) || "Status"}
            </h3>
            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setSkip(0);
              }}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="all" className="px-2 py-2 text-xs">
                  {t("common", "all", lang) || "All"} ({notifs.length})
                </TabsTrigger>
                <TabsTrigger value="UNREAD" className="px-2 py-2 text-xs">
                  {t("notif", "unread", lang) || "Unread"} ({notifs.filter((n) => !n.isRead).length})
                </TabsTrigger>
                <TabsTrigger value="READ" className="px-2 py-2 text-xs">
                  {t("teacherPages", "notifRead", lang) || "Read"} ({notifs.filter((n) => n.isRead).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </section>

          <DrawerClose className="mt-8 w-full h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold">
            Done
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div
          data-ui-style="classic"
          className="card p-0! mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-2/3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="p-0! px-4! pt-2!">
            {/* <NotificationStats
              notifications={filtered}
              total={notifs.length}
              activeTypeName={activeTypeName}
              statusName={statusName}
              search={search}
              lang={lang}
              onMarkAllRead={handleMarkAllRead}
              markingAll={markingAll}
            /> */}
          </div>

          <div
            data-ui-style="classic"
            className="card mx-3 divide-y p-0! divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                <Inbox className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="font-medium text-gray-700">
                  {notifs.length === 0
                    ? (t("teacherPages", "allCaughtUp", lang) || "All caught up!")
                    : "No matching notifications"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {search || activeTypeId || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "You have reviewed all notifications"}
                </p>
                {(search || activeTypeId || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setActiveTypeId(null);
                      setStatusFilter("all");
                      setSkip(0);
                    }}
                    className="mt-4 rounded-xl text-xs"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            ) : (
              visibleNotifs.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
                const Icon = cfg.icon;
                return (
                  <button
                    type="button"
                    key={n.id}
                    aria-label={`${n.title}, ${cfg.label}, ${n.isRead ? "read" : "unread"}`}
                    onClick={() => handleSelectNotification(n)}
                    className={cn(
                      "w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
                      !n.isRead && "bg-blue-50/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            cfg.bg
                          )}
                        >
                          <Icon className={cn("h-4 w-4", cfg.color)} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "truncate text-sm font-semibold",
                                !n.isRead ? "text-gray-950 font-bold" : "text-gray-900"
                              )}
                            >
                              {n.title}
                            </span>
                            {n.actionUrl && (
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                            {n.body}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          n.isRead
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {!n.isRead && <span className="size-1.5 rounded-full bg-blue-600" />}
                        {n.isRead
                          ? (t("teacherPages", "notifRead", lang) || "Read")
                          : (t("notif", "unread", lang) || "Unread")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-gray-50 pt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-600">
                          {n.creator?.name
                            ? `${t("teacherPages", "notifFrom", lang) || "From"}: ${n.creator.name}`
                            : "Madrasa"}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            cfg.bg,
                            cfg.color
                          )}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] tabular-nums text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {filtered.length > pageSize && (
            <div className="mx-3 mt-4 mb-20 rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-center text-xs tabular-nums text-gray-500">
                {t("teacherPages", "pageOfTotal", lang)
                  .replace("{start}", String(skip + 1))
                  .replace("{end}", String(Math.min(skip + pageSize, filtered.length)))
                  .replace("{total}", String(filtered.length))}
              </p>
              <Pagination className="mt-2" aria-label="Notification pagination">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t("teacherPages", "prevBtn", lang) || "Previous"}
                      aria-label="Previous page"
                      aria-disabled={currentPage === 1}
                      tabIndex={currentPage === 1 ? -1 : undefined}
                      className={cn(
                        "rounded-lg",
                        currentPage === 1 && "pointer-events-none opacity-40"
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage > 1) setSkip((currentPage - 2) * pageSize);
                      }}
                    />
                  </PaginationItem>
                  {notificationPageItems(currentPage, pageCount).map((item, index) => (
                    <PaginationItem
                      key={item === "ellipsis" ? `ellipsis-${index}` : item}
                      className={
                        item !== "ellipsis" &&
                        pageCount > 5 &&
                        item !== 1 &&
                        item !== currentPage &&
                        item !== pageCount
                          ? "hidden sm:block"
                          : undefined
                      }
                    >
                      {item === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          aria-label={`Go to page ${item}`}
                          className={cn(
                            "rounded-lg",
                            item === currentPage &&
                              "border-primary-200 bg-primary-50 text-primary-700"
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            setSkip((item - 1) * pageSize);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t("teacherPages", "nextBtn", lang) || "Next"}
                      aria-label="Next page"
                      aria-disabled={currentPage === pageCount}
                      tabIndex={currentPage === pageCount ? -1 : undefined}
                      className={cn(
                        "rounded-lg",
                        currentPage === pageCount && "pointer-events-none opacity-40"
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage < pageCount) setSkip(currentPage * pageSize);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Notification Detail Drawer */}
      <Drawer
        open={selectedNotif !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNotifId(null);
        }}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[88dvh] bg-background">
          {selectedNotif && (() => {
            const cfg = TYPE_CONFIG[selectedNotif.type] ?? TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return (
              <>
                <div className="shrink-0 border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        cfg.bg
                      )}
                    >
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <DrawerTitle className="text-base font-semibold text-gray-900 truncate">
                        {selectedNotif.title}
                      </DrawerTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {selectedNotif.creator?.name
                          ? `${t("teacherPages", "notifFrom", lang) || "From"} ${selectedNotif.creator.name}`
                          : "Madrasa"} ·{" "}
                        {new Date(selectedNotif.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {selectedNotif.body}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="mt-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border",
                            cfg.bg,
                            cfg.color
                          )}
                        >
                          {cfg.label}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        {t("common", "status", lang) || "Status"}
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            selectedNotif.isRead
                              ? "bg-gray-100 text-gray-600"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {selectedNotif.isRead
                            ? (t("teacherPages", "notifRead", lang) || "Read")
                            : (t("notif", "unread", lang) || "Unread")}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        {t("teacherPages", "notifFrom", lang) || "From"}
                      </dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {selectedNotif.creator?.name ?? "Admin"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        {t("teacherPages", "notifDate", lang) || "Date"}
                      </dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {new Date(selectedNotif.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </dd>
                    </div>

                    {selectedNotif.eventDate && (
                      <div>
                        <dt className="text-muted-foreground">Event Date</dt>
                        <dd className="mt-1 font-medium text-gray-900">
                          {new Date(selectedNotif.eventDate).toLocaleDateString("en-GB")}
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-muted-foreground">Target Audience</dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {selectedNotif.targetRoles?.length > 0
                          ? selectedNotif.targetRoles.join(", ")
                          : "All"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <DrawerFooter className="shrink-0 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <ButtonGroup className="w-full [&>button]:flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setSelectedNotifId(null)}
                    >
                      {t("common", "close", lang) || "Close"}
                    </Button>
                    {selectedNotif.actionUrl && (
                      <Button
                        type="button"
                        size="lg"
                        className="bg-primary-600 text-white hover:bg-primary-700"
                        onClick={() => {
                          const url = selectedNotif.actionUrl!;
                          setSelectedNotifId(null);
                          navigate(url);
                        }}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Go to Page
                      </Button>
                    )}
                  </ButtonGroup>
                </DrawerFooter>
              </>
            );
          })()}
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
}

