import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/queries";
import type { NotificationRecord, NotificationType } from "@/lib/notifications-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Bell, BookOpen, CheckCheck, ClipboardList, CreditCard, ExternalLink,
  GraduationCap, Inbox, RefreshCw, Search, SlidersHorizontal,
} from "lucide-react";

const PAGE_SIZE = 20;
const NOTIFICATION_TYPES: Array<{
  id: NotificationType | "ALL";
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  { id: "ALL", icon: Bell, color: "text-gray-700", bg: "bg-gray-100 border-gray-200" },
  { id: "ANNOUNCEMENT", icon: Bell, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-100" },
  { id: "ATTENDANCE_ALERT", icon: ClipboardList, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  { id: "FEE_REMINDER", icon: CreditCard, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  { id: "HOMEWORK_REMINDER", icon: BookOpen, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
  { id: "EXAM_NOTICE", icon: GraduationCap, color: "text-purple-700", bg: "bg-purple-50 border-purple-100" },
  { id: "GENERAL", icon: Bell, color: "text-gray-700", bg: "bg-gray-100 border-gray-200" },
];
const TYPE_CONFIG = Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type.id, type])) as Record<string, typeof NOTIFICATION_TYPES[number]>;

const COPY = {
  en: {
    search: "Search notifications...", openFilters: "Open filters", filters: "Filters",
    notificationType: "Notification Type", done: "Done", noMatching: "No matching notifications",
    adjustFilters: "Try adjusting your search or filters", resetFilters: "Reset filters",
    category: "Category", eventDate: "Event Date", goToPage: "Go to Page",
    pagination: "Notification pagination", previousPage: "Previous page", nextPage: "Next page",
    pageNumber: (page: number) => `Go to page ${page}`,
    types: {
      ALL: "All Types", ANNOUNCEMENT: "Announce", ATTENDANCE_ALERT: "Attendance",
      FEE_REMINDER: "Fees", HOMEWORK_REMINDER: "Homework", EXAM_NOTICE: "Exam", GENERAL: "General",
    },
  },
  ml: {
    search: "അറിയിപ്പുകൾ തിരയുക...", openFilters: "ഫിൽട്ടറുകൾ തുറക്കുക", filters: "ഫിൽട്ടറുകൾ",
    notificationType: "അറിയിപ്പ് തരം", done: "പൂർത്തിയായി", noMatching: "പൊരുത്തപ്പെടുന്ന അറിയിപ്പുകളില്ല",
    adjustFilters: "തിരച്ചിലോ ഫിൽട്ടറുകളോ മാറ്റി നോക്കുക", resetFilters: "ഫിൽട്ടറുകൾ മായ്ക്കുക",
    category: "വിഭാഗം", eventDate: "പരിപാടി തീയതി", goToPage: "പേജിലേക്ക് പോകുക",
    pagination: "അറിയിപ്പ് പേജുകൾ", previousPage: "മുൻ പേജ്", nextPage: "അടുത്ത പേജ്",
    pageNumber: (page: number) => `പേജ് ${page} ലേക്ക് പോകുക`,
    types: {
      ALL: "എല്ലാ തരങ്ങളും", ANNOUNCEMENT: "അറിയിപ്പ്", ATTENDANCE_ALERT: "ഹാജർ",
      FEE_REMINDER: "ഫീസ്", HOMEWORK_REMINDER: "ഹോംവർക്ക്", EXAM_NOTICE: "പരീക്ഷ", GENERAL: "പൊതുവായത്",
    },
  },
};

function pageItems(current: number, total: number): Array<number | "ellipsis"> {
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

export default function ParentNotificationsPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const copy = COPY[lang];
  const navigate = useNavigate();
  const ctx = { clientId: user?.clientId ?? "", token: accessToken ?? "" };
  const { data, isLoading, error, refetch, isRefetching } = useNotifications(ctx, { take: 100 });
  const notifs = data?.notifications ?? [];
  const markRead = useMarkNotificationRead(ctx);
  const markAll = useMarkAllNotificationsRead(ctx);

  const [search, setSearch] = useState("");
  const [activeTypeId, setActiveTypeId] = useState<NotificationType | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);

  const unread = notifs.filter((n) => !n.isRead).length;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifs.filter((n) => {
      if (activeTypeId && n.type !== activeTypeId) return false;
      if (statusFilter === "UNREAD" && n.isRead) return false;
      if (statusFilter === "READ" && !n.isRead) return false;
      return !query || [n.title, n.body, n.creator?.name].some((value) => value?.toLowerCase().includes(query));
    });
  }, [notifs, search, activeTypeId, statusFilter]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleNotifs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedNotif = selectedNotifId ? notifs.find((n) => n.id === selectedNotifId) ?? null : null;

  useEffect(() => {
    if (page > Math.max(1, pageCount)) setPage(Math.max(1, pageCount));
  }, [page, pageCount]);

  const selectNotification = (notification: NotificationRecord) => {
    setSelectedNotifId(notification.id);
    if (!notification.isRead) {
      markRead.mutate(notification.id, { onSettled: () => { void refetch(); } });
    }
  };
  const markAllRead = () => {
    const unreadNotifications = notifs.filter((n) => !n.isRead);
    if (unreadNotifications.length) {
      markAll.mutate(unreadNotifications, { onSettled: () => { void refetch(); } });
    }
  };
  const resetFilters = () => {
    setSearch("");
    setActiveTypeId(null);
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "notifPageTitle", lang)} />
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <div className="pt-4! pb-2!">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 p-1.5">
            <InputGroup className="h-10 min-w-0 flex-1 rounded-lg bg-white">
              <InputGroupInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={copy.search} aria-label={copy.search} className="h-full text-sm" />
              <InputGroupAddon align="inline-start"><Search className="h-4 w-4 text-gray-400" /></InputGroupAddon>
            </InputGroup>
            <Button variant="outline" type="button" size="icon-lg" onClick={() => setFiltersOpen(true)} className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100" aria-label={copy.openFilters}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DrawerContent className="max-h-[85dvh] overflow-y-auto bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" aria-label={copy.filters}>
          <DrawerTitle className="mb-6 text-lg font-bold text-gray-900">{copy.filters}</DrawerTitle>
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{copy.notificationType}</h3>
            <div className="-mx-5 overflow-x-auto px-5"><div className="flex w-max gap-2">
              {NOTIFICATION_TYPES.map((type) => {
                const selected = type.id === "ALL" ? activeTypeId === null : activeTypeId === type.id;
                return (
                  <Button key={type.id} type="button" variant="ghost" onClick={() => { setActiveTypeId(type.id === "ALL" ? null : type.id); setPage(1); }} className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")}>{copy.types[type.id]}</Button>
                );
              })}
            </div></div>
          </section>
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{t("parentPages", "statusLabel", lang)}</h3>
            <Tabs value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="all" className="px-2 py-2 text-xs">{t("common", "all", lang)} ({notifs.length})</TabsTrigger>
                <TabsTrigger value="UNREAD" className="px-2 py-2 text-xs">{t("parentPages", "unreadLabel", lang)} ({unread})</TabsTrigger>
                <TabsTrigger value="READ" className="px-2 py-2 text-xs">{t("parentPages", "notifRead", lang)} ({notifs.length - unread})</TabsTrigger>
              </TabsList>
            </Tabs>
          </section>
          <DrawerClose className="mt-8 h-10 w-full rounded-xl bg-primary-600 text-sm font-semibold text-white">{copy.done}</DrawerClose>
        </DrawerContent>
      </Drawer>

      <div className="mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>{unread > 0 ? t("parentPages", "unreadCount", lang).replace("{count}", String(unread)) : t("parentPages", "allCaughtUpMsg", lang)}</span>
        <div className="flex items-center gap-2">
          {unread > 0 && <Button type="button" variant="outline" size="sm" onClick={markAllRead} disabled={markAll.isPending} className="h-8 rounded-full px-3 text-xs text-primary-700" aria-label={t("parentPages", "markAllReadBtn", lang)}><CheckCheck className="mr-1 h-3.5 w-3.5" />{t("parentPages", "markAllReadBtn", lang)}</Button>}
          <Button type="button" variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching} className="h-8 w-8 rounded-full text-gray-600" aria-label={t("parentPages", "notifRefresh", lang)}><RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} /></Button>
        </div>
      </div>
      {error instanceof Error && <ApiErrorBanner message={error.message} onRetry={() => refetch()} />}
      {isLoading ? (
        <div data-ui-style="classic" className="card mx-3 mb-20 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="p-4"><div className="flex items-start justify-between gap-3"><div className="w-2/3 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-16 rounded-full" /></div><Skeleton className="mt-4 h-4 w-1/2" /></div>)}
        </div>
      ) : (
        <>
          <div data-ui-style="classic" className={cn("card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none", filtered.length <= PAGE_SIZE && "mb-20")}>
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">{notifs.length === 0 ? t("parentPages", "noNotificationsYet", lang) : copy.noMatching}</p>
                {(search || activeTypeId || statusFilter !== "all") && <><p className="mt-1 text-xs text-gray-400">{copy.adjustFilters}</p><Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-4 rounded-xl text-xs">{copy.resetFilters}</Button></>}
              </div>
            ) : visibleNotifs.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL;
              const Icon = cfg.icon;
              return (
                <button type="button" key={n.id} aria-label={`${n.title}, ${copy.types[cfg.id]}, ${n.isRead ? t("parentPages", "notifRead", lang) : t("parentPages", "unreadLabel", lang)}`} onClick={() => selectNotification(n)} className={cn("w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500", !n.isRead && "bg-blue-50/40")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", cfg.bg)}><Icon className={cn("h-4 w-4", cfg.color)} /></span>
                      <div className="min-w-0"><div className="flex items-center gap-1.5"><span className={cn("truncate text-sm font-semibold", !n.isRead ? "font-bold text-gray-950" : "text-gray-900")}>{n.title}</span>{n.actionUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500" />}</div><p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p></div>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", n.isRead ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>{!n.isRead && <span className="size-1.5 rounded-full bg-blue-600" />}{n.isRead ? t("parentPages", "notifRead", lang) : t("parentPages", "unreadLabel", lang)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-gray-50 pt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2"><span className="font-medium text-gray-600">{n.creator?.name ? `${t("parentPages", "notifFrom", lang)}: ${n.creator.name}` : "Madrasa"}</span><span className="text-gray-300">·</span><span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", cfg.bg, cfg.color)}>{copy.types[cfg.id]}</span></div>
                    <span className="text-[11px] tabular-nums text-gray-400">{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length > PAGE_SIZE && <div className="mx-3 mb-20 mt-4 rounded-2xl border border-gray-100 px-3 py-3">
            <p className="text-center text-xs tabular-nums text-gray-500">{t("teacherPages", "pageOfTotal", lang).replace("{start}", String((page - 1) * PAGE_SIZE + 1)).replace("{end}", String(Math.min(page * PAGE_SIZE, filtered.length))).replace("{total}", String(filtered.length))}</p>
            <Pagination className="mt-2" aria-label={copy.pagination}><PaginationContent className="gap-1">
              <PaginationItem><PaginationPrevious href="#" text={t("teacherPages", "prevBtn", lang)} aria-label={copy.previousPage} aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined} className={cn("rounded-lg", page === 1 && "pointer-events-none opacity-40")} onClick={(event) => { event.preventDefault(); if (page > 1) setPage(page - 1); }} /></PaginationItem>
              {pageItems(page, pageCount).map((item, index) => <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : item} className={item !== "ellipsis" && pageCount > 5 && item !== 1 && item !== page && item !== pageCount ? "hidden sm:block" : undefined}>{item === "ellipsis" ? <PaginationEllipsis /> : <PaginationLink href="#" isActive={item === page} aria-label={copy.pageNumber(item)} className={cn("rounded-lg", item === page && "border-primary-200 bg-primary-50 text-primary-700")} onClick={(event) => { event.preventDefault(); setPage(item); }}>{item}</PaginationLink>}</PaginationItem>)}
              <PaginationItem><PaginationNext href="#" text={t("teacherPages", "nextBtn", lang)} aria-label={copy.nextPage} aria-disabled={page === pageCount} tabIndex={page === pageCount ? -1 : undefined} className={cn("rounded-lg", page === pageCount && "pointer-events-none opacity-40")} onClick={(event) => { event.preventDefault(); if (page < pageCount) setPage(page + 1); }} /></PaginationItem>
            </PaginationContent></Pagination>
          </div>}
        </>
      )}

      <Drawer open={selectedNotif !== null} onOpenChange={(open) => { if (!open) setSelectedNotifId(null); }} swipeDirection="down">
        <DrawerContent className="max-h-[88dvh] bg-background">
          {selectedNotif && (() => {
            const cfg = TYPE_CONFIG[selectedNotif.type] ?? TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return <>
              <div className="shrink-0 border-b px-5 py-4"><div className="flex items-center gap-3"><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", cfg.bg)}><Icon className={cn("h-4 w-4", cfg.color)} /></span><div className="min-w-0 flex-1"><DrawerTitle className="truncate text-base font-semibold text-gray-900">{selectedNotif.title}</DrawerTitle><p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedNotif.creator?.name ? `${t("parentPages", "notifFrom", lang)} ${selectedNotif.creator.name}` : "Madrasa"} · {new Date(selectedNotif.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div></div></div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"><div className="whitespace-pre-wrap rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm leading-relaxed text-gray-800">{selectedNotif.body}</div><dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div><dt className="text-muted-foreground">{copy.category}</dt><dd className="mt-1"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.color)}>{copy.types[cfg.id]}</span></dd></div>
                <div><dt className="text-muted-foreground">{t("parentPages", "statusLabel", lang)}</dt><dd className="mt-1"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", selectedNotif.isRead ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>{selectedNotif.isRead ? t("parentPages", "notifRead", lang) : t("parentPages", "unreadLabel", lang)}</span></dd></div>
                <div><dt className="text-muted-foreground">{t("parentPages", "notifFrom", lang)}</dt><dd className="mt-1 font-medium text-gray-900">{selectedNotif.creator?.name ?? "Madrasa"}</dd></div>
                <div><dt className="text-muted-foreground">{t("parentPages", "dateLabel", lang)}</dt><dd className="mt-1 font-medium text-gray-900">{new Date(selectedNotif.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
                {selectedNotif.eventDate && <div><dt className="text-muted-foreground">{copy.eventDate}</dt><dd className="mt-1 font-medium text-gray-900">{new Date(selectedNotif.eventDate).toLocaleDateString("en-GB")}</dd></div>}
              </dl></div>
              <DrawerFooter className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><div className="flex w-full gap-2"><Button type="button" variant="outline" size="lg" onClick={() => setSelectedNotifId(null)} className="flex-1">{t("common", "close", lang)}</Button>{selectedNotif.actionUrl && <Button type="button" size="lg" className="flex-1 bg-primary-600 text-white hover:bg-primary-700" onClick={() => { const url = selectedNotif.actionUrl!; setSelectedNotifId(null); navigate(url); }}><ExternalLink className="mr-1.5 h-4 w-4" />{copy.goToPage}</Button>}</div></DrawerFooter>
            </>;
          })()}
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
}
