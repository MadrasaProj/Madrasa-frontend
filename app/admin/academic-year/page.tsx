import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import {
  getClientCurrentAcademicYearId,
} from "@/lib/client-academic-year-api";
import {
  createAcademicYear,
  deleteAcademicYear,
  getAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
  type AcademicYearRecord,
} from "@/lib/academic-years-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  History,
  Plus,
  Trash2,
} from "lucide-react";

/** Numeric year used to order years that do not have explicit dates. */
function yearOrderValue(year: AcademicYearRecord): number | null {
  const dateOnly = toDateOnly(year.startDate);
  if (dateOnly) {
    const [yearPart, monthPart] = dateOnly.split("-").map(Number);
    if (yearPart && monthPart) {
      return yearPart + (monthPart >= 7 ? 0.5 : 0);
    }
  }
  const match = year.name.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/** API dates arrive as ISO timestamps; keep the calendar date part for display and editing. */
function toDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : "";
}

function formatDateValue(value: string | null | undefined, lang: Lang): string {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return "—";
  const date = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRange(year: AcademicYearRecord, lang: Lang): string {
  if (year.startDate && year.endDate) {
    return `${formatDateValue(year.startDate, lang)} – ${formatDateValue(year.endDate, lang)}`;
  }
  if (year.startDate) {
    return `${t("academicYears", "startsOn", lang)} ${formatDateValue(year.startDate, lang)}`;
  }
  if (year.endDate) {
    return `${t("academicYears", "endsOn", lang)} ${formatDateValue(year.endDate, lang)}`;
  }
  return t("academicYears", "noDateRange", lang);
}

/** Compact two-column stats grid, styled after the daily Ibadah stats. */
function AcademicYearStats({
  years,
  currentYearId,
  lang,
}: {
  years: AcademicYearRecord[];
  currentYearId: string;
  lang: Lang;
}) {
  const current = years.find((year) => year.id === currentYearId) ?? null;
  const currentOrder = current ? yearOrderValue(current) : null;
  const past = years.filter((year) => {
    const order = yearOrderValue(year);
    return order !== null && currentOrder !== null && order < currentOrder;
  }).length;
  const upcoming = years.filter((year) => {
    const order = yearOrderValue(year);
    return order !== null && currentOrder !== null && order > currentOrder;
  }).length;

  const stats = [
    {
      label: t("academicYears", "totalYears", lang),
      value: String(years.length),
      icon: CalendarRange,
      isText: false,
    },
    {
      label: t("academicYears", "currentYear", lang),
      value: current?.name ?? "—",
      icon: CalendarCheck2,
      isText: true,
    },
    {
      label: t("academicYears", "pastYears", lang),
      value: String(past),
      icon: History,
      isText: false,
    },
    {
      label: t("academicYears", "upcomingYears", lang),
      value: String(upcoming),
      icon: CalendarClock,
      isText: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "min-w-0 p-2.5 sm:p-3",
              index < 2 && "border-b border-gray-100",
              index % 2 === 0 && "border-r border-gray-100",
            )}
          >
            <div className="flex gap-1.5">
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-800" />
              <span className="block text-sm font-medium leading-4 text-gray-700">
                {stat.label}
              </span>
            </div>
            <span
              title={stat.value}
              className={cn(
                "mt-1.5 block font-medium leading-none tabular-nums text-gray-950",
                stat.isText ? "truncate text-base sm:text-lg" : "text-[22px]",
              )}
            >
              {stat.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function suggestYearForm(years: AcademicYearRecord[]): {
  name: string;
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  let start = now.getFullYear();
  if (now.getMonth() >= 5) start += 1;
  for (const year of years) {
    const value = yearOrderValue(year);
    if (value !== null && Math.floor(value) >= start) start = Math.floor(value) + 1;
  }
  return {
    name: `${start}-${String(start + 1).slice(-2)}`,
    startDate: `${start}-06-01`,
    endDate: `${start + 1}-03-31`,
  };
}

export default function AdminAcademicYearPage() {
  const { user, accessToken, activeClientId, updateUser } = useAuthStore();
  const { lang } = useLanguageStore();
  const clientId = activeClientId ?? "";
  const token = accessToken ?? "";

  const [years, setYears] = useState<AcademicYearRecord[]>([]);
  const [currentYearId, setCurrentYearId] = useState(
    user?.defaultAcademicYearId ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const loadRequest = useRef<AbortController | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingCurrent, setSettingCurrent] = useState(false);

  const load = useCallback(async () => {
    loadRequest.current?.abort();
    if (!clientId || !token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoading(true);
    setError(null);
    try {
      const [result, currentId] = await Promise.all([
        getAcademicYears(clientId, token, {
          limit: 200,
          sortBy: "startDate",
          sortOrder: "desc",
          signal: controller.signal,
        }),
        getClientCurrentAcademicYearId(clientId, token),
      ]);
      if (controller.signal.aborted) return;
      setYears(result.data ?? []);
      setCurrentYearId(currentId);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (loadRequest.current === controller) setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    void load();
    return () => loadRequest.current?.abort();
  }, [load]);

  const sortedYears = useMemo(
    () =>
      [...years].sort((a, b) => {
        const aOrder = yearOrderValue(a);
        const bOrder = yearOrderValue(b);
        if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
          return bOrder - aOrder;
        }
        return b.name.localeCompare(a.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }),
    [years],
  );
  const visibleYears = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedYears;
    return sortedYears.filter((year) =>
      year.name.toLowerCase().includes(query),
    );
  }, [sortedYears, search]);

  const editingYear = years.find((year) => year.id === editingId) ?? null;
  const isEditingCurrent = Boolean(
    editingYear && editingYear.id === currentYearId,
  );

  const closeForm = () => {
    setFormOpen(false);
    setConfirmDelete(false);
    setFormError(null);
    setStartPickerOpen(false);
    setEndPickerOpen(false);
  };

  const openCreate = () => {
    const suggestion = suggestYearForm(years);
    setEditingId(null);
    setFormName(suggestion.name);
    setFormStartDate(suggestion.startDate);
    setFormEndDate(suggestion.endDate);
    setFormError(null);
    setConfirmDelete(false);
    setFormOpen(true);
  };

  const openEdit = (year: AcademicYearRecord) => {
    setEditingId(year.id);
    setFormName(year.name);
    setFormStartDate(toDateOnly(year.startDate));
    setFormEndDate(toDateOnly(year.endDate));
    setFormError(null);
    setConfirmDelete(false);
    setFormOpen(true);
  };

  const save = async () => {
    const name = formName.trim();
    if (!name) {
      setFormError(t("academicYears", "nameRequired", lang));
      return;
    }
    if (
      years.some(
        (year) =>
          year.id !== editingId &&
          year.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setFormError(t("academicYears", "duplicateName", lang));
      return;
    }
    if (formStartDate && formEndDate && formStartDate > formEndDate) {
      setFormError(t("academicYears", "invalidDateRange", lang));
      return;
    }
    setSaving(true);
    setFormError(null);
    const data = {
      name,
      startDate: formStartDate || null,
      endDate: formEndDate || null,
    };
    try {
      if (editingId) {
        await updateAcademicYear(clientId, token, editingId, data);
        toast.success(t("academicYears", "updated", lang));
      } else {
        await createAcademicYear(clientId, token, data);
        toast.success(t("academicYears", "created", lang));
      }
      closeForm();
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const makeCurrent = async () => {
    if (!editingId) return;
    setSettingCurrent(true);
    setFormError(null);
    try {
      await setCurrentAcademicYear(clientId, token, editingId);
      updateUser({ defaultAcademicYearId: editingId });
      setCurrentYearId(editingId);
      toast.success(t("academicYears", "currentSet", lang));
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSettingCurrent(false);
    }
  };

  const remove = async () => {
    if (!editingYear) return;
    if (editingYear.id === currentYearId) {
      setFormError(t("academicYears", "deleteBlockedCurrent", lang));
      setConfirmDelete(false);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await deleteAcademicYear(clientId, token, editingYear.id);
      toast.success(t("academicYears", "deleted", lang));
      closeForm();
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="space-y-2 border-t border-gray-100 p-4">
      {editingYear && !confirmDelete && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isEditingCurrent || saving || settingCurrent}
          onClick={() => void makeCurrent()}
        >
          <CalendarCheck2 className="size-4" />
          {isEditingCurrent
            ? t("academicYears", "currentYearBadge", lang)
            : t("academicYears", "setCurrent", lang)}
        </Button>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={saving || settingCurrent}
          onClick={
            confirmDelete
              ? () => setConfirmDelete(false)
              : () => setFormOpen(false)
          }
        >
          {confirmDelete ? t("common", "back", lang) : t("common", "cancel", lang)}
        </Button>
        <Button
          type="button"
          size="lg"
          variant={confirmDelete ? "destructive" : "default"}
          className="flex-1"
          disabled={saving || settingCurrent}
          onClick={() => void (confirmDelete ? remove() : save())}
        >
          {confirmDelete
            ? t("common", "delete", lang)
            : editingYear
              ? t("common", "save", lang)
              : t("academicYears", "addYear", lang)}
        </Button>
      </div>
      {editingYear && !confirmDelete && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" /> {t("common", "delete", lang)}
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-0! pb-24! lg:pb-8!">
        <PageHeader title={t("academicYears", "title", lang)} />

        <div className="px-3 pb-3 pt-4">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("academicYears", "searchPlaceholder", lang)}
              aria-label={t("academicYears", "searchPlaceholder", lang)}
              className="h-10 min-w-0 flex-1 rounded-lg bg-white"
            />
            <Button
              type="button"
              onClick={openCreate}
              disabled={!clientId || !token}
              className="hidden shadow-none sm:inline-flex"
            >
              <Plus className="size-4" /> {t("academicYears", "addYear", lang)}
            </Button>
          </div>
        </div>

        {error && <ApiErrorBanner message={error} onRetry={() => void load()} />}

        {loading ? (
          <>
            <div
              className="mx-3 mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-white"
              aria-busy="true"
              aria-label={t("academicYears", "title", lang)}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-none" />
              ))}
            </div>
            <div className="mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 px-4 py-4">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mx-3 mb-3">
              <AcademicYearStats
                years={years}
                currentYearId={currentYearId}
                lang={lang}
              />
            </div>
            <section className="mx-3">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold text-gray-700">
                  {t("academicYears", "allYears", lang)}
                </h2>
                <span className="text-xs tabular-nums text-gray-400">
                  {visibleYears.length}
                </span>
              </div>
              <div
                data-ui-style="classic"
                className="card divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none"
              >
                {visibleYears.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-500">
                    {search.trim()
                      ? t("academicYears", "noResults", lang)
                      : t("academicYears", "noYears", lang)}
                  </p>
                ) : (
                  visibleYears.map((year) => {
                    const isCurrent = year.id === currentYearId;
                    return (
                      <button
                        key={year.id}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => openEdit(year)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500",
                          isCurrent && "bg-primary-50/40",
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                          <CalendarRange aria-hidden="true" className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">
                            {year.name}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {formatRange(year, lang)}
                          </span>
                        </span>
                        {isCurrent && (
                          <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
                            {t("academicYears", "currentYearBadge", lang)}
                          </span>
                        )}
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-gray-400"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {!loading && !error && (
        <Button
          type="button"
          size="lg"
          onClick={openCreate}
          disabled={!clientId || !token}
          className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2 rounded-full px-5 shadow-lg sm:hidden"
        >
          <Plus className="size-5" /> {t("academicYears", "addYear", lang)}
        </Button>
      )}

      <ResponsivePopover
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        desktopView="right-drawer"
        compact
        title={
          confirmDelete
            ? t("academicYears", "deleteTitle", lang)
            : editingYear
              ? t("academicYears", "editYear", lang)
              : t("academicYears", "addYear", lang)
        }
        description={
          confirmDelete
            ? undefined
            : editingYear
              ? t("academicYears", "editDesc", lang)
              : t("academicYears", "addDesc", lang)
        }
        footer={footer}
      >
        <div className="space-y-4 py-3">
          {formError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </p>
          )}
          {confirmDelete ? (
            <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
              {t("academicYears", "deleteConfirm", lang).replace(
                "{name}",
                editingYear?.name ?? "",
              )}
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="academic-year-name"
                  className="mb-1.5 block text-xs font-semibold text-gray-600"
                >
                  {t("academicYears", "nameLabel", lang)} *
                </label>
                <Input
                  id="academic-year-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="2026-27"
                  size="lg"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  {t("academicYears", "nameHint", lang)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 block text-xs font-semibold text-gray-600">
                    {t("academicYears", "startDate", lang)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full justify-start gap-1.5 px-2.5 font-normal"
                    aria-haspopup="dialog"
                    onClick={() => setStartPickerOpen(true)}
                  >
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 shrink-0  "
                    />
                    <span
                      className={cn(
                        "truncate",
                        formStartDate ? "text-gray-800" : "text-gray-400",
                      )}
                    >
                      {formStartDate
                        ? formatDateValue(formStartDate, lang)
                        : t("academicYears", "chooseStartDate", lang)}
                    </span>
                  </Button>
                </div>
                <div>
                  <p className="mb-1.5 block text-xs font-semibold text-gray-600">
                    {t("academicYears", "endDate", lang)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full justify-start gap-1.5 px-2.5 font-normal"
                    aria-haspopup="dialog"
                    onClick={() => setEndPickerOpen(true)}
                  >
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 shrink-0  "
                    />
                    <span
                      className={cn(
                        "truncate",
                        formEndDate ? "text-gray-800" : "text-gray-400",
                      )}
                    >
                      {formEndDate
                        ? formatDateValue(formEndDate, lang)
                        : t("academicYears", "chooseEndDate", lang)}
                    </span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ResponsivePopover>

      <DatePickerDrawer
        open={startPickerOpen}
        onOpenChange={setStartPickerOpen}
        date={formStartDate}
        onDateChange={setFormStartDate}
        title={t("academicYears", "chooseStartDate", lang)}
        disableFuture={false}
        allowClear
        clearLabel={t("academicYears", "clearStartDate", lang)}
      />
      <DatePickerDrawer
        open={endPickerOpen}
        onOpenChange={setEndPickerOpen}
        date={formEndDate}
        onDateChange={setFormEndDate}
        title={t("academicYears", "chooseEndDate", lang)}
        disableFuture={false}
        minDate={formStartDate || undefined}
        allowClear
        clearLabel={t("academicYears", "clearEndDate", lang)}
      />
    </DashboardLayout>
  );
}
