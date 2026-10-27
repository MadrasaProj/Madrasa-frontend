import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HomeworkStatus, StudentHomeworkItem } from "@/lib/homework-api";
import { useParentSubmitHomework, useStudentHomework } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AlertCircle, BookOpen, CalendarDays, CheckCircle2, Loader2, RefreshCw, Search, User } from "lucide-react";

const statuses = ["all", "NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const;
type StatusFilter = (typeof statuses)[number];

const statusStyles: Record<HomeworkStatus, string> = {
  NOT_SUBMITTED: "bg-amber-50 text-amber-800 ring-amber-200",
  SUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  CHECKED: "bg-primary-50 text-primary-800 ring-primary-200",
};

const statusGradients: Record<HomeworkStatus, string> = {
  NOT_SUBMITTED: "from-amber-100/20 via-amber-50/10 to-white",
  SUBMITTED: "from-sky-100/20 via-sky-50/10 to-white",
  CHECKED: "from-primary-100/20 via-primary-50/10 to-white",
};

const statusLabelKeys = {
  NOT_SUBMITTED: "pendingLabel",
  SUBMITTED: "submittedLabel",
  CHECKED: "checkedLabel",
} as const;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ParentHomeworkPage() {
  const { user, accessToken, activeStudentId } = useAuthStore();
  const { lang } = useLanguageStore();
  const clientId = user?.clientId ?? "";
  const token = accessToken ?? "";
  const studentId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentHomeworkItem | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const { data, isLoading, error, refetch } = useStudentHomework(
    { clientId, token },
    studentId,
  );
  const submitMutation = useParentSubmitHomework({ clientId, token });
  const homework = data?.homework ?? [];
  const statusFiltered = filter === "all"
    ? homework
    : homework.filter((item) => item.submission.status === filter);
  const query = search.trim().toLocaleLowerCase();
  const filtered = query
    ? statusFiltered.filter((item) =>
        [item.title, item.subject?.name ?? "", item.description ?? ""].some((value) =>
          value.toLocaleLowerCase().includes(query),
        ),
      )
    : statusFiltered;
  const pendingCount = homework.filter((item) => item.submission.status === "NOT_SUBMITTED").length;

  const closeDetails = () => {
    setSelected(null);
    setConfirmSubmit(false);
    submitMutation.reset();
  };

  const submitHomework = async () => {
    if (!selected) return;
    try {
      await submitMutation.mutateAsync({
        studentId,
        submissionId: selected.submission.id,
      });
      closeDetails();
    } catch {
      // The mutation error is shown in the popover.
    }
  };

  return (
    <DashboardLayout>
      <div className="  px-4">
      <PageHeader title={t("parentPages", "homeworkPageTitle", lang)} />

      <div className="mx-auto pt-2 max-w-5xl space-y-6 pb-12">
        {!studentId ? (
          <div className="py-20 text-center text-muted-foreground">
            <User className="mx-auto mb-3 size-10 opacity-40" />
            <p className="font-medium">{t("parentPages", "noChildrenLinked", lang)}</p>
          </div>
        ) : error ? (
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="mb-2 size-4 text-destructive" />
            <AlertTitle>{t("parentPages", "noHomeworkFound", lang)}</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : String(error)}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </Alert>
        ) : (
          <>
            {pendingCount > 0 && !isLoading && (
              <Alert className="border-primary/15 bg-primary/5">
                <AlertTitle className="flex items-center gap-2 text-primary">
                  <AlertCircle className="size-4" />
                  {pendingCount} {t("parentPages", "pendingHomeworks", lang)}
                </AlertTitle>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Tabs
                value={filter}
                onValueChange={(value) => {
                  setFilter(value as StatusFilter);
                  closeDetails();
                }}
                className="w-full overflow-x-auto sm:w-auto"
              >
                <TabsList className="min-w-full w-max sm:min-w-0">
                  {statuses.map((status) => (
                    <TabsTrigger key={status} value={status} className="flex-1 shrink-0 px-3">
                      {status === "all"
                        ? t("parentPages", "allFilterTab", lang)
                        : t("parentPages", statusLabelKeys[status], lang)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("parentPages", "searchHomework", lang)}
                  aria-label={t("parentPages", "searchHomework", lang)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                />
              </div>
            </div>

            {isLoading ? (
              <SkeletonList count={4} />
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-card px-6 py-16 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 size-9 opacity-40" />
                <p className="font-medium">
                  {homework.length === 0 && filter === "all" && !query
                    ? t("parentPages", "noHomeworkFound", lang)
                    : t("parentPages", "noHomeworkCategory", lang)}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={cn(
                      "flex w-full flex-wrap items-center gap-2 border-b border-border/70 bg-gradient-to-r p-4 text-left transition-colors last:border-b-0 hover:brightness-[0.98] focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary-500 sm:gap-3",
                      statusGradients[item.submission.status],
                    )}
                  >
                    <span className="min-w-0 flex-1 basis-full sm:basis-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{item.subject?.name ?? "—"}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {t("parentPages", "dueDateCol", lang)}: {formatDate(item.dueDate)}
                        </span>
                      </span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusStyles[item.submission.status])}>
                      {t("parentPages", statusLabelKeys[item.submission.status], lang)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      <ResponsivePopover
        open={!!selected}
        onOpenChange={(open) => { if (!open) closeDetails(); }}
        drawerOnDesktop
        title={selected?.title}
        description={selected?.subject?.name}
      >
        {selected && (
          <div className="space-y-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", statusStyles[selected.submission.status])}>
                {t("parentPages", statusLabelKeys[selected.submission.status], lang)}
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" />
                {formatDate(selected.dueDate)}
              </span>
            </div>

            {selected.description && (
              <section className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                <p className="text-sm leading-relaxed text-foreground">{selected.description}</p>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="mt-1 font-medium">{selected.class?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="mt-1 font-medium">{selected.subject?.name ?? "—"}</p>
              </div>
            </div>

            {selected.submission.submittedAt && (
              <p className="inline-flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="size-4" />
                Submitted {formatDate(selected.submission.submittedAt)}
              </p>
            )}

            {selected.submission.teacherNote && (
              <Alert className="border-primary/15 bg-primary/5">
                <AlertTitle>Teacher note</AlertTitle>
                <AlertDescription>{selected.submission.teacherNote}</AlertDescription>
              </Alert>
            )}

            {selected.submission.status === "NOT_SUBMITTED" && (
              <div className="border-t border-border/70 pt-5">
                {confirmSubmit ? (
                  <div className="space-y-3">
                    <Alert className="border-primary/15 bg-primary/5">
                      <AlertTitle>Confirm submission</AlertTitle>
                      <AlertDescription>Confirm that your child has completed this homework.</AlertDescription>
                    </Alert>
                    {submitMutation.error && (
                      <Alert className="border-destructive/20 bg-destructive/5">
                        <AlertDescription>{submitMutation.error.message}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setConfirmSubmit(false)} disabled={submitMutation.isPending}>Cancel</Button>
                      <Button className="flex-1" onClick={submitHomework} disabled={submitMutation.isPending}>
                        {submitMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                        Confirm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setConfirmSubmit(true)}>
                    Mark as submitted
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </ResponsivePopover>
    </DashboardLayout>
  );
}
