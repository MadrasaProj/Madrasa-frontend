import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HomeworkStatus, StudentHomeworkItem } from "@/lib/homework-api";
import { useParentSubmitHomework, useStudentHomework } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AlertCircle, BookOpen, CalendarDays, CheckCircle2, Loader2, RefreshCw, User } from "lucide-react";

const statuses = ["all", "NOT_SUBMITTED", "SUBMITTED", "CHECKED"] as const;
type StatusFilter = (typeof statuses)[number];

const statusStyles: Record<HomeworkStatus, string> = {
  NOT_SUBMITTED: "bg-amber-50 text-amber-800 ring-amber-200",
  SUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  CHECKED: "bg-primary-50 text-primary-800 ring-primary-200",
};

const statusGradients: Record<HomeworkStatus, string> = {
  NOT_SUBMITTED: "from-amber-100/60 via-amber-50/30 to-white",
  SUBMITTED: "from-sky-100/60 via-sky-50/30 to-white",
  CHECKED: "from-primary-100/60 via-primary-50/30 to-white",
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
  const [selected, setSelected] = useState<StudentHomeworkItem | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const { data, isLoading, error, refetch } = useStudentHomework(
    { clientId, token },
    studentId,
  );
  const submitMutation = useParentSubmitHomework({ clientId, token });
  const homework = data?.homework ?? [];
  const filtered = filter === "all"
    ? homework
    : homework.filter((item) => item.submission.status === filter);
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
      <div className="-mx-4 -mt-4 min-h-[100svh] bg-muted/30 px-4 pt-4 pb-28 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 lg:pb-8">
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

            <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
              <div className="max-w-full overflow-x-auto pb-1">
                <TabsList className="w-max">
                  {statuses.map((status) => (
                    <TabsTrigger key={status} value={status}>
                      {status === "all"
                        ? t("parentPages", "allFilterTab", lang)
                        : t("parentPages", statusLabelKeys[status], lang)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-36 rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-card px-6 py-16 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 size-9 opacity-40" />
                <p className="font-medium">{t("parentPages", "noHomeworkFound", lang)}</p>
              </div>
            ) : (
              <div className="grid items-start gap-4 sm:grid-cols-2">
                {filtered.map((item) => (
                  <Card
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={item.title}
                    onClick={() => setSelected(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(item);
                      }
                    }}
                    className={cn("w-full cursor-pointer gap-0 rounded-2xl bg-gradient-to-br py-0 shadow-lg shadow-gray-500/10 ring-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", statusGradients[item.submission.status])}
                  >
                    <CardContent className="flex flex-col px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 text-base font-semibold leading-snug text-foreground">
                          {item.title}
                        </h2>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", statusStyles[item.submission.status])}>
                          {t("parentPages", statusLabelKeys[item.submission.status], lang)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{item.subject?.name ?? "—"}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          Due {formatDate(item.dueDate)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
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
