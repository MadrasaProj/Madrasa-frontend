import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { ResponsivePopover } from '@/components/ui/responsivePopover';
import { DatePickerDrawer } from '@/components/DatePickerDrawer';
import { DrawerSelector } from '@/components/DrawerSelector';
import { useAuthStore } from '@/store/auth';
import { useLanguageStore } from '@/store/language';
import { getClientCurrentAcademicYearId } from '@/lib/client-academic-year-api';
import { getAllClasses, type ClassRecord } from '@/lib/classes-api';
import { getHolidayCalendar, saveHolidayCalendar, WEEKDAYS, type HolidayEntry, type Weekday } from '@/lib/holidays-api';
import { t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertCircle,
  CalendarDays,
  CalendarOff,
  Check,
  ChevronDown,
  List,
  Loader2,
  Pencil,
  Plus,
  School,
  Trash2,
} from 'lucide-react';

const DAY_LABEL_KEYS: Record<Weekday, 'weekdayMonday' | 'weekdayTuesday' | 'weekdayWednesday' | 'weekdayThursday' | 'weekdayFriday' | 'weekdaySaturday' | 'weekdaySunday'> = {
  MONDAY: 'weekdayMonday',
  TUESDAY: 'weekdayTuesday',
  WEDNESDAY: 'weekdayWednesday',
  THURSDAY: 'weekdayThursday',
  FRIDAY: 'weekdayFriday',
  SATURDAY: 'weekdaySaturday',
  SUNDAY: 'weekdaySunday',
};
const WEEKDAY_BY_JS_DAY: Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

type View = 'calendar' | 'list';
type SyncState = 'idle' | 'saving' | 'error';

interface HolidayForm {
  date: string;
  title: string;
  desc: string;
  classIds: string[];
}

const EMPTY_FORM: HolidayForm = { date: '', title: '', desc: '', classIds: [] };

const HOLIDAY_PRESETS = [
  {
    value: 'rain-red-alert',
    labelKey: 'presetRainLabel',
    titleKey: 'presetRainTitle',
    descKey: 'presetRainDesc',
  },
  {
    value: 'range-meeting',
    labelKey: 'presetRangeLabel',
    titleKey: 'presetRangeTitle',
    descKey: 'presetRangeDesc',
  },
] as const;

const createEntryId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `holiday-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function toLocalISO(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const parseISODate = (iso: string) => new Date(`${iso}T00:00:00`);

function formatFullDate(iso: string, locale: string) {
  return parseISODate(iso).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const formatMonth = (date: Date, locale: string) => date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
const formatMonthKey = (key: string, locale: string) => formatMonth(parseISODate(`${key}-01`), locale);

function SyncBadge({ state, onRetry, lang }: { state: SyncState; onRetry: () => void; lang: Lang }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" /> {t('holidays', 'saving', lang)}
      </span>
    );
  }
  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        <AlertCircle className="size-3.5" /> {t('holidays', 'notSavedRetry', lang)}
      </button>
    );
  }
  return null;
}

export default function AdminHolidaysPage() {
  const { accessToken, activeClientId, user } = useAuthStore();
  const { lang } = useLanguageStore();
  const clientId = activeClientId ?? '';
  const token = accessToken ?? '';
  const locale = lang === 'ml' ? 'ml-IN' : 'en-IN';
  const [weekly, setWeekly] = useState<Weekday[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('calendar');
  const [month, setMonth] = useState<Date>(() => new Date());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HolidayForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const yearIdRef = useRef(user?.defaultAcademicYearId ?? '');
  const holidaysRef = useRef<HolidayEntry[]>([]);
  const savedWeeklyRef = useRef('[]');
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { holidaysRef.current = holidays; }, [holidays]);

  const persist = useCallback((nextWeekly: Weekday[], nextHolidays: HolidayEntry[]) => {
    const academicYearId = yearIdRef.current;
    if (!clientId || !token || !academicYearId) {
      toast.error(t('holidays', 'setAcademicYearFirst', lang));
      return;
    }
    setSyncState('saving');
    queueRef.current = queueRef.current
      .then(() => saveHolidayCalendar(clientId, token, { academicYearId, weeklyHolidays: nextWeekly, holidays: nextHolidays }))
      .then(() => {
        savedWeeklyRef.current = JSON.stringify(nextWeekly);
        setSyncState('idle');
      })
      .catch((error) => {
        setSyncState('error');
        toast.error((error as Error).message || t('holidays', 'saveFailed', lang));
      });
  }, [clientId, token, lang]);

  const load = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const activeYear = yearIdRef.current || await getClientCurrentAcademicYearId(clientId, token);
      yearIdRef.current = activeYear;
      if (!activeYear) { setWeekly([]); setHolidays([]); return; }
      const calendar = await getHolidayCalendar(clientId, token, activeYear);
      const nextWeekly = calendar.weeklyHolidays ?? [];
      const nextHolidays = [...(calendar.holidays ?? [])]
        .map((holiday) => ({ ...holiday, id: holiday.id ?? createEntryId() }))
        .sort((a, b) => a.date.localeCompare(b.date));
      savedWeeklyRef.current = JSON.stringify(nextWeekly);
      setWeekly(nextWeekly);
      setHolidays(nextHolidays);
    } catch (error) {
      toast.error((error as Error).message || t('holidays', 'loadFailed', lang));
    } finally {
      setLoading(false);
    }
  }, [clientId, token, user?.defaultAcademicYearId, lang]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!clientId || !token) return;
    let cancelled = false;
    getAllClasses(clientId, token)
      .then((data) => { if (!cancelled) setClasses(data); })
      .catch(() => { /* Class list is optional; holidays still work without it. */ });
    return () => { cancelled = true; };
  }, [clientId, token]);

  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);

  const classScopeLabel = useCallback((classIds?: string[]) => {
    if (!classIds?.length) return t('holidays', 'allClasses', lang);
    const names = classIds.map((id) => classMap.get(id)).filter((name): name is string => Boolean(name));
    if (names.length === classIds.length) return names.join(', ');
    return `${classIds.length} ${t('holidays', 'classesCount', lang)}`;
  }, [classMap, lang]);

  // Weekly closed days are persisted automatically after a short debounce.
  useEffect(() => {
    const key = JSON.stringify(weekly);
    if (key === savedWeeklyRef.current) return;
    const timer = setTimeout(() => persist(weekly, holidaysRef.current), 900);
    return () => clearTimeout(timer);
  }, [weekly, persist]);

  const toggleDay = (day: Weekday) => {
    setWeekly((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  };

  const holidayDateSet = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays]);
  const holidaySet = useMemo(
    () => new Set(holidays.filter((holiday) => !holiday.classes?.length).map((holiday) => holiday.date)),
    [holidays],
  );
  const classHolidaySet = useMemo(
    () => new Set(holidays.filter((holiday) => holiday.classes?.length).map((holiday) => holiday.date)),
    [holidays],
  );

  const viewMonthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthHolidays = useMemo(
    () => holidays.filter((holiday) => holiday.date.startsWith(viewMonthKey)),
    [holidays, viewMonthKey],
  );

  const groupedHolidays = useMemo(() => {
    const groups = new Map<string, HolidayEntry[]>();
    [...holidays]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((holiday) => {
        const key = holiday.date.slice(0, 7);
        groups.set(key, [...(groups.get(key) ?? []), holiday]);
      });
    return Array.from(groups.entries());
  }, [holidays]);

  const openCreate = (date = '') => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date });
    setFormError(null);
    setClassPickerOpen(false);
    setFormOpen(true);
  };

  const openEdit = (holiday: HolidayEntry) => {
    setEditingId(holiday.id ?? null);
    setForm({
      date: holiday.date,
      title: holiday.title,
      desc: holiday.desc ?? '',
      classIds: holiday.classes ?? [],
    });
    setFormError(null);
    setClassPickerOpen(false);
    setFormOpen(true);
  };

  const handleDayClick = (day: Date) => {
    const iso = toLocalISO(day);
    const onDate = holidays.filter((holiday) => holiday.date === iso);
    if (onDate.length === 1) openEdit(onDate[0]);
    else openCreate(iso);
  };

  const toggleFormClass = (classId: string) => {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((id) => id !== classId)
        : [...current.classIds, classId],
    }));
  };

  const submitForm = () => {
    if (!form.date) { setFormError(t('holidays', 'chooseDateError', lang)); return; }
    if (!form.title.trim()) { setFormError(t('holidays', 'enterTitleError', lang)); return; }

    const classIds = Array.from(new Set(form.classIds));
    const scopesOverlap = (other: HolidayEntry) => {
      const otherClassIds = other.classes ?? [];
      if (!classIds.length || !otherClassIds.length) return true;
      return otherClassIds.some((id) => classIds.includes(id));
    };
    const duplicate = holidays.some((holiday) =>
      holiday.id !== editingId && holiday.date === form.date && scopesOverlap(holiday)
    );
    if (duplicate) {
      setFormError(
        t('holidays', classIds.length ? 'duplicateClasses' : 'duplicateAll', lang),
      );
      return;
    }

    const entry: HolidayEntry = {
      id: holidays.find((holiday) => holiday.id === editingId)?.id ?? createEntryId(),
      date: form.date,
      title: form.title.trim(),
      desc: form.desc.trim() || undefined,
      classes: classIds.length ? classIds : undefined,
    };
    const nextHolidays = (editingId
      ? holidays.map((holiday) => (holiday.id === editingId ? entry : holiday))
      : [...holidays, entry]
    ).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

    setHolidays(nextHolidays);
    holidaysRef.current = nextHolidays;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    persist(weekly, nextHolidays);
    toast.success(t('holidays', editingId ? 'holidayUpdated' : 'holidayAdded', lang));
  };

  const removeHoliday = (id: string) => {
    const nextHolidays = holidays.filter((holiday) => holiday.id !== id);
    setHolidays(nextHolidays);
    holidaysRef.current = nextHolidays;
    if (editingId === id) {
      setFormOpen(false);
      setEditingId(null);
    }
    persist(weekly, nextHolidays);
    toast.success(t('holidays', 'holidayRemoved', lang));
  };

  const retrySave = () => persist(weekly, holidaysRef.current);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
        <PageHeader title={t('holidays', 'title', lang)} action={ <Button type="button" onClick={() => openCreate()}>
                  <Plus className="size-4" /> {t('holidays', 'addHoliday', lang)}
                </Button>}   />

        {loading ? (
          <div className="space-y-5">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-[520px] rounded-2xl" />
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                   <div>
                    <h2 className="font-semibold text-gray-900">{t('holidays', 'weeklyHolidays', lang)}</h2>
                    <p className="text-sm text-gray-500">{t('holidays', 'weeklyHolidaysDesc', lang)}</p>
                  </div>
                </div>
                <SyncBadge state={syncState} onRetry={retrySave} lang={lang} />
              </div>

              <div role="group" aria-label={t('holidays', 'weeklyHolidays', lang)} className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = weekly.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500',
                        selected
                          ? 'border-red-600 bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50/60 hover:text-red-700',
                      )}
                    >
                      {selected && <Check className="size-4" />}
                      {t('holidays', DAY_LABEL_KEYS[day], lang)}
                    </button>
                  );
                })}
              </div>

              
            </section>
             <section className="space-y-4   p-4 pr-6 rounded-lg bg-white  ">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={view} onValueChange={(value) => setView(value as View)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5">
                      <CalendarDays className="size-4" /> {t('holidays', 'calendar', lang)}
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5">
                      <List className="size-4" /> {t('holidays', 'list', lang)}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
               
              </div>

              <div>
                {view === 'calendar' ? (
                  <div className="grid  gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0 border-r border-gray-100 pr-3">
                      <Calendar
                        month={month}
                        onMonthChange={setMonth}
                        onDayClick={handleDayClick}
                        modifiers={{
                          holiday: (date) => holidaySet.has(toLocalISO(date)),
                          classHoliday: (date) => {
                            const iso = toLocalISO(date);
                            return classHolidaySet.has(iso) && !holidaySet.has(iso);
                          },
                          weeklyOff: (date) => weekly.includes(WEEKDAY_BY_JS_DAY[date.getDay()]) && !holidayDateSet.has(toLocalISO(date)),
                        }}
                        modifiersClassNames={{
                          holiday: '[&>button]:bg-red-500! [&>button]:text-white! [&>button]:font-semibold [&>button]:shadow-sm [&>button]:shadow-red-500/30 [&>button:hover]:bg-red-600!',
                          classHoliday: '[&>button]:bg-amber-400! [&>button]:text-white! [&>button]:font-semibold [&>button]:shadow-sm [&>button]:shadow-amber-400/30 [&>button:hover]:bg-amber-500!',
                          weeklyOff: '[&>button]:bg-red-50/70! [&>button]:text-red-500! [&>button:hover]:bg-red-100!',
                        }}
                        className="w-full [--cell-size:2.5rem] sm:[--cell-size:2.75rem]"
                      />
                    </div>

                    <aside className="flex flex-col gap-3">
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{formatMonth(month, locale)}</h3>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                            {monthHolidays.length}
                          </span>
                        </div>
                        {monthHolidays.length > 0 ? (
                          <div className="space-y-1.5">
                            {monthHolidays.map((holiday) => {
                              const date = parseISODate(holiday.date);
                              return (
                                <button
                                  key={holiday.id}
                                  type="button"
                                  onClick={() => openEdit(holiday)}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-gray-100"
                                >
                                  <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-linear-60 from-red-400 to-red-700 text-white">
                                    <span className="text-sm font-bold leading-none tabular-nums">{date.getDate()}</span>
                                    <span className="mt-0.5 text-[8px] leading-none font-semibold uppercase">
                                      {date.toLocaleDateString(locale, { weekday: 'short' })}
                                    </span>
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-gray-800">{holiday.title}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-gray-400">{classScopeLabel(holiday.classes)}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs leading-5 text-gray-500">{t('holidays', 'noHolidaysThisMonth', lang)}</p>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t('holidays', 'howItWorks', lang)}</p>
                        <p className="text-xs leading-5 text-gray-500">{t('holidays', 'howItWorksDesc', lang)}</p>
                        <div className="mt-3 space-y-2 text-xs text-gray-600">
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-red-500" /> {t('holidays', 'holidayAllClasses', lang)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-amber-400" /> {t('holidays', 'classSpecificHoliday', lang)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-red-50 ring-1 ring-red-200" /> {t('holidays', 'weeklyOff', lang)}
                          </span>
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : groupedHolidays.length > 0 ? (
                  <div className="space-y-6">
                    {groupedHolidays.map(([monthKey, entries]) => (
                      <section key={monthKey}>
                        <div className="mb-2 flex items-center gap-2 px-1 ">
                          <h3 className="text-sm font-semibold text-gray-700">{formatMonthKey(monthKey, locale)}</h3>
                          <span className="text-xs text-gray-400">{entries.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100 border-y border-gray-100">
                          {entries.map((holiday) => {
                            const date = parseISODate(holiday.date);
                            return (
                              <div key={holiday.id} className="flex items-center gap-3 px-3 py-3 sm:px-4 hover:bg-gray-50">
                                <button
                                  type="button"
                                  onClick={() => openEdit(holiday)}
                                  className="flex min-w-0 flex-1  items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                >
                                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-r from-red-400 to-red-700 text-white">
                                    <span className="text-lg font-bold leading-none tabular-nums">{date.getDate()}</span>
                                    <span className=" text-[10px] font-semibold uppercase tracking-wide">
                                      {date.toLocaleDateString(locale, { weekday: 'short' })}
                                    </span>
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-gray-900">{holiday.title}</span>
                                     <span className=" flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                        {classScopeLabel(holiday.classes)}
                                      </span>
                                    </span>
                                   </span>
                                </button>
                                <div className="flex shrink-0 items-center">
                                  
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`${t('common', 'delete', lang)} ${holiday.title}`}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => removeHoliday(holiday.id!)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title={t('holidays', 'noHolidaysYet', lang)}
                    description={t('holidays', 'noHolidaysDesc', lang)}
                    action={<Button type="button" onClick={() => openCreate()}><Plus className="size-4" /> {t('holidays', 'addHoliday', lang)}</Button>}
                  />
                )}
              </div>
            </section>
          </>
        )}

        <ResponsivePopover
          open={formOpen}
          onOpenChange={setFormOpen}
          desktopView="right-drawer"
          compact
          title={t('holidays', editingId ? 'editHoliday' : 'addHoliday', lang)}
          description={t('holidays', editingId ? 'editHolidayDesc' : 'addHolidayDesc', lang)}
          footer={
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setFormOpen(false)}>
                {t('common', 'cancel', lang)}
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={submitForm}>
                {t('holidays', editingId ? 'saveChanges' : 'addHoliday', lang)}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-3">
            {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

            <div>
              <p className="mb-1 text-xs font-semibold text-gray-600">{t('holidays', 'quickPresets', lang)}</p>
              <ScrollableTabs
                options={HOLIDAY_PRESETS.map((preset) => ({
                  value: preset.value,
                  label: t('holidays', preset.labelKey, lang),
                }))}
                value={
                  HOLIDAY_PRESETS.find((preset) =>
                    t('holidays', preset.titleKey, lang) === form.title &&
                    t('holidays', preset.descKey, lang) === form.desc,
                  )?.value ?? ''
                }
                onValueChange={(value) => {
                  const preset = HOLIDAY_PRESETS.find((item) => item.value === value);
                  if (preset) {
                    setForm((current) => ({
                      ...current,
                      title: t('holidays', preset.titleKey, lang),
                      desc: t('holidays', preset.descKey, lang),
                    }));
                  }
                }}
                ariaLabel={t('holidays', 'presetsAria', lang)}
                className="-mx-1"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t('common', 'date', lang)} *</label>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full justify-start font-normal"
                onClick={() => setDatePickerOpen(true)}
                aria-label={t('holidays', 'chooseHolidayDate', lang)}
              >
                <CalendarDays className="size-4 text-red-500" />
                {form.date ? formatFullDate(form.date, locale) : t('holidays', 'chooseDate', lang)}
              </Button>
            </div>

            <div>
              <label htmlFor="holiday-title" className="mb-1.5 block text-xs font-semibold text-gray-600">{t('holidays', 'titleLabel', lang)} *</label>
              <Input
                id="holiday-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder={t('holidays', 'titlePlaceholder', lang)}
                size="lg"
              />
            </div>

            <div>
              <label htmlFor="holiday-desc" className="mb-1.5 block text-xs font-semibold text-gray-600">{t('holidays', 'descLabel', lang)}</label>
              <Textarea
                id="holiday-desc"
                value={form.desc}
                onChange={(event) => setForm((current) => ({ ...current, desc: event.target.value }))}
                placeholder={t('holidays', 'descPlaceholder', lang)}
                rows={3}
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-gray-600">
                {t('holidays', 'appliesTo', lang)}
              </legend>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full  justify-between gap-3 font-normal"
                disabled={classes.length === 0}
                onClick={() => setClassPickerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={classPickerOpen}
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <School className="size-4 shrink-0 text-primary-600" />
                  <div className="line-clamp-1 w-full text-left text-sm text-gray-700">
                    {form.classIds.length
                      ? `${form.classIds.length} ${t('holidays', 'classesCount', lang)}`
                      : t('holidays', 'allClasses', lang)}
                  </div>
                </div>
                <ChevronDown className="size-4 shrink-0 text-gray-400" />
              </Button>
              <p className="mt-2 text-xs text-gray-400">
                {form.classIds.length
                  ? `${t('holidays', 'appliesOnlyTo', lang)} ${classScopeLabel(form.classIds)}`
                  : t('holidays', 'appliesAllClasses', lang)}
              </p>
            </fieldset>

            <DrawerSelector
              open={classPickerOpen}
              onOpenChange={setClassPickerOpen}
              title={t('holidays', 'selectClasses', lang)}
              panelClassName="md:min-w-[36rem] "
            >
              <div className="max-h-[55vh] space-y-1 md:px-2! overflow-y-auto ">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, classIds: [] }))}
                  aria-pressed={form.classIds.length === 0}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    form.classIds.length === 0
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <span className="truncate">{t('holidays', 'allClasses', lang)}</span>
                  {form.classIds.length === 0 && <Check className="size-4 shrink-0" />}
                </button>
                {classes.map((cls) => {
                  const selected = form.classIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleFormClass(cls.id)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        selected ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50',
                      )}
                    >
                      <span className="truncate">{cls.name}</span>
                      {selected && <Check className="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </DrawerSelector>

            {editingId && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeHoliday(editingId)}
              >
                <Trash2 className="size-4" /> {t('holidays', 'deleteHoliday', lang)}
              </Button>
            )}
          </div>
        </ResponsivePopover>

        <DatePickerDrawer
          open={datePickerOpen}
          onOpenChange={setDatePickerOpen}
          date={form.date}
          onDateChange={(date) => setForm((current) => ({ ...current, date }))}
          title={t('holidays', 'chooseHolidayDate', lang)}
          disableFuture={false}
        />
      </div>
    </DashboardLayout>
  );
}
