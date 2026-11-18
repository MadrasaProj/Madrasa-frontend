import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { ResponsivePopover } from '@/components/ui/responsivePopover';
import { DatePickerDrawer } from '@/components/DatePickerDrawer';
import { useAuthStore } from '@/store/auth';
import { getClientCurrentAcademicYearId } from '@/lib/client-academic-year-api';
import { getHolidayCalendar, saveHolidayCalendar, WEEKDAYS, type HolidayEntry, type Weekday } from '@/lib/holidays-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertCircle,
  CalendarDays,
  CalendarOff,
  Check,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

const DAY_LABELS: Record<Weekday, string> = { MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday' };
const WEEKDAY_BY_JS_DAY: Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

type View = 'calendar' | 'list';
type SyncState = 'idle' | 'saving' | 'saved' | 'error';

interface HolidayForm {
  date: string;
  title: string;
  desc: string;
}

const EMPTY_FORM: HolidayForm = { date: '', title: '', desc: '' };

function toLocalISO(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const parseISODate = (iso: string) => new Date(`${iso}T00:00:00`);

function formatFullDate(iso: string) {
  return parseISODate(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const formatMonth = (date: Date) => date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const formatMonthKey = (key: string) => formatMonth(parseISODate(`${key}-01`));

function SyncBadge({ state, onRetry }: { state: SyncState; onRetry: () => void }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700" aria-live="polite">
        <Check className="size-3.5" /> Saved
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
        <AlertCircle className="size-3.5" /> Not saved · Retry
      </button>
    );
  }
  return null;
}

export default function AdminHolidaysPage() {
  const { accessToken, activeClientId, user } = useAuthStore();
  const clientId = activeClientId ?? '';
  const token = accessToken ?? '';
  const [weekly, setWeekly] = useState<Weekday[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('calendar');
  const [month, setMonth] = useState<Date>(() => new Date());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [form, setForm] = useState<HolidayForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const yearIdRef = useRef(user?.defaultAcademicYearId ?? '');
  const holidaysRef = useRef<HolidayEntry[]>([]);
  const savedWeeklyRef = useRef('[]');
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { holidaysRef.current = holidays; }, [holidays]);

  const persist = useCallback((nextWeekly: Weekday[], nextHolidays: HolidayEntry[]) => {
    const academicYearId = yearIdRef.current;
    if (!clientId || !token || !academicYearId) {
      toast.error('Set a current academic year first');
      return;
    }
    setSyncState('saving');
    queueRef.current = queueRef.current
      .then(() => saveHolidayCalendar(clientId, token, { academicYearId, weeklyHolidays: nextWeekly, holidays: nextHolidays }))
      .then(() => {
        savedWeeklyRef.current = JSON.stringify(nextWeekly);
        setSyncState('saved');
      })
      .catch((error) => {
        setSyncState('error');
        toast.error((error as Error).message || 'Could not save holiday calendar');
      });
  }, [clientId, token]);

  const load = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const activeYear = yearIdRef.current || await getClientCurrentAcademicYearId(clientId, token);
      yearIdRef.current = activeYear;
      if (!activeYear) { setWeekly([]); setHolidays([]); return; }
      const calendar = await getHolidayCalendar(clientId, token, activeYear);
      const nextWeekly = calendar.weeklyHolidays ?? [];
      const nextHolidays = [...(calendar.holidays ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      savedWeeklyRef.current = JSON.stringify(nextWeekly);
      setWeekly(nextWeekly);
      setHolidays(nextHolidays);
    } catch (error) {
      toast.error((error as Error).message || 'Could not load holidays');
    } finally {
      setLoading(false);
    }
  }, [clientId, token, user?.defaultAcademicYearId]);

  useEffect(() => { void load(); }, [load]);

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

  const holidaySet = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays]);

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
    setEditingDate(null);
    setForm({ ...EMPTY_FORM, date });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (holiday: HolidayEntry) => {
    setEditingDate(holiday.date);
    setForm({ date: holiday.date, title: holiday.title, desc: holiday.desc ?? '' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleDayClick = (day: Date) => {
    const iso = toLocalISO(day);
    const existing = holidays.find((holiday) => holiday.date === iso);
    if (existing) openEdit(existing);
    else openCreate(iso);
  };

  const submitForm = () => {
    if (!form.date) { setFormError('Choose a date for the holiday.'); return; }
    if (!form.title.trim()) { setFormError('Enter a holiday title.'); return; }
    const duplicate = holidays.some((holiday) => holiday.date === form.date && holiday.date !== editingDate);
    if (duplicate) { setFormError('A holiday already exists on this date.'); return; }

    const entry: HolidayEntry = {
      date: form.date,
      title: form.title.trim(),
      desc: form.desc.trim() || undefined,
    };
    const nextHolidays = (editingDate
      ? holidays.map((holiday) => (holiday.date === editingDate ? entry : holiday))
      : [...holidays, entry]
    ).sort((a, b) => a.date.localeCompare(b.date));

    setHolidays(nextHolidays);
    holidaysRef.current = nextHolidays;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setEditingDate(null);
    persist(weekly, nextHolidays);
    toast.success(editingDate ? 'Holiday updated' : 'Holiday added');
  };

  const removeHoliday = (date: string) => {
    const nextHolidays = holidays.filter((holiday) => holiday.date !== date);
    setHolidays(nextHolidays);
    holidaysRef.current = nextHolidays;
    if (editingDate === date) {
      setFormOpen(false);
      setEditingDate(null);
    }
    persist(weekly, nextHolidays);
    toast.success('Holiday removed');
  };

  const retrySave = () => persist(weekly, holidaysRef.current);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
        <PageHeader title="Holidays" action={ <Button type="button" onClick={() => openCreate()}>
                  <Plus className="size-4" /> Add holiday
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
                  <CalendarOff className="mt-0.5 size-5 shrink-0 text-red-500" />
                  <div>
                    <h2 className="font-semibold text-gray-900">Weekly holidays</h2>
                    <p className="text-sm text-gray-500">Select the regular days when the madrasa is closed.</p>
                  </div>
                </div>
                <SyncBadge state={syncState} onRetry={retrySave} />
              </div>

              <div role="group" aria-label="Weekly holidays" className="flex flex-wrap gap-2">
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
                      {DAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400">
                {weekly.length
                  ? `${weekly.length} day${weekly.length === 1 ? '' : 's'} selected · Changes save automatically`
                  : 'No weekly holidays selected · Changes save automatically'}
              </p>
            </section>
             <section className="space-y-4 border-t border-gray-100 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={view} onValueChange={(value) => setView(value as View)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5">
                      <CalendarDays className="size-4" /> Calendar
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5">
                      <List className="size-4" /> List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
               
              </div>

              <div>
                {view === 'calendar' ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                      <Calendar
                        month={month}
                        onMonthChange={setMonth}
                        onDayClick={handleDayClick}
                        modifiers={{
                          holiday: (date) => holidaySet.has(toLocalISO(date)),
                          weeklyOff: (date) => weekly.includes(WEEKDAY_BY_JS_DAY[date.getDay()]) && !holidaySet.has(toLocalISO(date)),
                        }}
                        modifiersClassNames={{
                          holiday: '[&>button]:bg-red-500! [&>button]:text-white! [&>button]:font-semibold [&>button]:shadow-sm [&>button]:shadow-red-500/30 [&>button:hover]:bg-red-600!',
                          weeklyOff: '[&>button]:bg-red-50/70! [&>button]:text-red-500! [&>button:hover]:bg-red-100!',
                        }}
                        className="w-full [--cell-size:2.5rem] sm:[--cell-size:2.75rem]"
                      />
                    </div>

                    <aside className="flex flex-col gap-3">
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{formatMonth(month)}</h3>
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
                                  key={holiday.date}
                                  type="button"
                                  onClick={() => openEdit(holiday)}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-red-50/60"
                                >
                                  <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg bg-red-50 text-red-600">
                                    <span className="text-sm font-bold leading-none tabular-nums">{date.getDate()}</span>
                                    <span className="mt-0.5 text-[9px] font-semibold uppercase">
                                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                    </span>
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{holiday.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs leading-5 text-gray-500">No holidays this month. Tap any date to add one.</p>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">How it works</p>
                        <p className="text-xs leading-5 text-gray-500">Tap a date to add a holiday. Tap a highlighted date to edit it.</p>
                        <div className="mt-3 space-y-2 text-xs text-gray-600">
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-red-500" /> Holiday
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-red-50 ring-1 ring-red-200" /> Weekly off
                          </span>
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : groupedHolidays.length > 0 ? (
                  <div className="space-y-6">
                    {groupedHolidays.map(([monthKey, entries]) => (
                      <section key={monthKey}>
                        <div className="mb-2 flex items-center gap-2 px-1">
                          <h3 className="text-sm font-semibold text-gray-700">{formatMonthKey(monthKey)}</h3>
                          <span className="text-xs text-gray-400">{entries.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100 border-y border-gray-100">
                          {entries.map((holiday) => {
                            const date = parseISODate(holiday.date);
                            return (
                              <div key={holiday.date} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                                <button
                                  type="button"
                                  onClick={() => openEdit(holiday)}
                                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                >
                                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-red-50 text-red-600">
                                    <span className="text-lg font-bold leading-none tabular-nums">{date.getDate()}</span>
                                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">
                                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                    </span>
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-gray-900">{holiday.title}</span>
                                    <span className="mt-0.5 block text-xs text-gray-500">{formatFullDate(holiday.date)}</span>
                                    {holiday.desc && <span className="mt-1 block truncate text-xs text-gray-400">{holiday.desc}</span>}
                                  </span>
                                </button>
                                <div className="flex shrink-0 items-center">
                                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${holiday.title}`} onClick={() => openEdit(holiday)}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove ${holiday.title}`}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => removeHoliday(holiday.date)}
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
                    title="No holidays yet"
                    description="Add a holiday or tap a date in the calendar view."
                    action={<Button type="button" onClick={() => openCreate()}><Plus className="size-4" /> Add holiday</Button>}
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
          title={editingDate ? 'Edit holiday' : 'Add holiday'}
          description={editingDate ? 'Update or remove this holiday.' : 'Pick a date and give the holiday a title.'}
          footer={
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="lg" className="flex-1" onClick={submitForm}>
                {editingDate ? 'Save changes' : 'Add holiday'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-3">
            {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Date *</label>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full justify-start font-normal"
                onClick={() => setDatePickerOpen(true)}
                aria-label="Choose holiday date"
              >
                <CalendarDays className="size-4 text-red-500" />
                {form.date ? formatFullDate(form.date) : 'Choose date'}
              </Button>
            </div>

            <div>
              <label htmlFor="holiday-title" className="mb-1.5 block text-xs font-semibold text-gray-600">Title *</label>
              <Input
                id="holiday-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Eid al-Fitr"
                size="lg"
              />
            </div>

            <div>
              <label htmlFor="holiday-desc" className="mb-1.5 block text-xs font-semibold text-gray-600">Description (optional)</label>
              <Textarea
                id="holiday-desc"
                value={form.desc}
                onChange={(event) => setForm((current) => ({ ...current, desc: event.target.value }))}
                placeholder="Add a note about this holiday…"
                rows={3}
              />
            </div>

            {editingDate && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeHoliday(editingDate)}
              >
                <Trash2 className="size-4" /> Delete this holiday
              </Button>
            )}
          </div>
        </ResponsivePopover>

        <DatePickerDrawer
          open={datePickerOpen}
          onOpenChange={setDatePickerOpen}
          date={form.date}
          onDateChange={(date) => setForm((current) => ({ ...current, date }))}
          title="Choose holiday date"
          disableFuture={false}
        />
      </div>
    </DashboardLayout>
  );
}
