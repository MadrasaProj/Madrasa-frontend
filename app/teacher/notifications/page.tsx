import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
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
import { t } from "@/lib/i18n";
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
  Inbox,
} from "lucide-react";

interface TypeConfigItem {
  id: NotificationType | "ALL";
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const NOTIFICATION_TYPES: TypeConfigItem[] = [
  { id: "ALL",               label: "All Types",  icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100 border-gray-200" },
  { id: "ANNOUNCEMENT",      label: "Announce",   icon: Bell,          color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100" },
  { id: "ATTENDANCE_ALERT",  label: "Attendance", icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  { id: "FEE_REMINDER",      label: "Fees",       icon: CreditCard,    color: "text-amber-700",   bg: "bg-amber-50 border-amber-100" },
  { id: "HOMEWORK_REMINDER", label: "Homework",   icon: BookOpen,      color: "text-blue-700",    bg: "bg-blue-50 border-blue-100" },
  { id: "EXAM_NOTICE",       label: "Exam",       icon: GraduationCap, color: "text-purple-700",  bg: "bg-purple-50 border-purple-100" },
  { id: "GENERAL",           label: "General",    icon: Bell,          color: "text-gray-700",    bg: "bg-gray-100 border-gray-200" },
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

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "notifTitle", lang) || "Notifications"} />

      {/* Search and Filters Trigger Drawer */}
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
      <ResponsivePopover open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" className="shadow-none" footer={<div className="border-t border-gray-100 p-4"><Button type="button" className="w-full" onClick={() => setFiltersOpen(false)}>Done</Button></div>}>
        <div className="px-5 pb-5 pt-2">
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

        </div>
      </ResponsivePopover>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {!loading && (
        <div className="mx-3 mb-3 mt-2 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
          <div className="border-r border-gray-100 p-2.5 sm:p-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700"><Bell className="size-3.5" />{t("notif", "total", lang) || "Total"}</span>
            <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{notifs.length}</span>
          </div>
          <div className="p-2.5 sm:p-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700"><Inbox className="size-3.5" />{t("notif", "unread", lang) || "Unread"}</span>
            <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{notifs.filter((n) => !n.isRead).length}</span>
          </div>
        </div>
      )}
      {loading ? (
        <div
          className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white"
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
          <div
            className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white"
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
                      "w-full rounded-none px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
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

      <ResponsivePopover
        open={selectedNotif !== null}
        onOpenChange={(open) => { if (!open) setSelectedNotifId(null); }}
        title={selectedNotif?.title}
        description={selectedNotif ? `${selectedNotif.creator?.name ?? "Madrasa"} · ${new Date(selectedNotif.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : undefined}
        desktopView="right-drawer"
        className="shadow-none"
        footer={selectedNotif && <div className="flex gap-2 border-t border-gray-100 p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedNotifId(null)}>{t("common", "close", lang) || "Close"}</Button>
          {selectedNotif.actionUrl && <Button type="button" className="flex-1" onClick={() => { const url = selectedNotif.actionUrl!; setSelectedNotifId(null); navigate(url); }}><ExternalLink className="size-4" />Go to Page</Button>}
        </div>}
      >
        {selectedNotif && (() => {
          const cfg = TYPE_CONFIG[selectedNotif.type] ?? TYPE_CONFIG.GENERAL;
          return <div className="space-y-5 p-5 pt-2">
            <div className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm leading-relaxed text-gray-800">{selectedNotif.body}</div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Category</dt><dd className={cn("mt-1 font-medium", cfg.color)}>{cfg.label}</dd></div>
              <div><dt className="text-gray-500">{t("common", "status", lang) || "Status"}</dt><dd className="mt-1 font-medium text-gray-900">{selectedNotif.isRead ? (t("teacherPages", "notifRead", lang) || "Read") : (t("notif", "unread", lang) || "Unread")}</dd></div>
              <div><dt className="text-gray-500">{t("teacherPages", "notifFrom", lang) || "From"}</dt><dd className="mt-1 font-medium text-gray-900">{selectedNotif.creator?.name ?? "Madrasa"}</dd></div>
              <div><dt className="text-gray-500">{t("teacherPages", "notifDate", lang) || "Date"}</dt><dd className="mt-1 font-medium text-gray-900">{new Date(selectedNotif.createdAt).toLocaleDateString("en-GB")}</dd></div>
              {selectedNotif.eventDate && <div><dt className="text-gray-500">Event Date</dt><dd className="mt-1 font-medium text-gray-900">{new Date(selectedNotif.eventDate).toLocaleDateString("en-GB")}</dd></div>}
              <div><dt className="text-gray-500">Target Audience</dt><dd className="mt-1 font-medium text-gray-900">{selectedNotif.targetRoles?.length ? selectedNotif.targetRoles.join(", ") : "All"}</dd></div>
            </dl>
          </div>;
        })()}
      </ResponsivePopover>
    </DashboardLayout>
  );
}
