import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth';
import { getClientCurrentAcademicYearId } from '@/lib/client-academic-year-api';
import { getHolidayCalendar, saveHolidayCalendar, WEEKDAYS, type HolidayEntry, type Weekday } from '@/lib/holidays-api';
import { CalendarDays, Plus, Trash2, Save, Loader2, CalendarOff } from 'lucide-react';
import { DatePickerDrawer } from '@/components/DatePickerDrawer';
import { toast } from 'sonner';

const DAY_LABELS: Record<Weekday, string> = { MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday' };

export default function AdminHolidaysPage() {
  const { accessToken, activeClientId, user } = useAuthStore();
  const clientId = activeClientId ?? '';
  const token = accessToken ?? '';
  const [yearId, setYearId] = useState(user?.defaultAcademicYearId ?? '');
  const [weekly, setWeekly] = useState<Weekday[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<HolidayEntry>({ date: '', title: '', desc: '' });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !token) return;
    setLoading(true);
    try {
      const activeYear = yearId || user?.defaultAcademicYearId || await getClientCurrentAcademicYearId(clientId, token);
      setYearId(activeYear);
      if (!activeYear) { setWeekly([]); setHolidays([]); return; }
      const calendar = await getHolidayCalendar(clientId, token, activeYear);
      setWeekly(calendar.weeklyHolidays ?? []);
      setHolidays(calendar.holidays ?? []);
    } catch (error) { toast.error((error as Error).message || 'Could not load holidays'); }
    finally { setLoading(false); }
  }, [clientId, token, user?.defaultAcademicYearId, yearId]);

  useEffect(() => { void load(); }, [load]);

  const toggleDay = (day: Weekday) => setWeekly((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const addHoliday = () => {
    if (!draft.date || !draft.title.trim()) { toast.error('Enter a date and holiday title'); return; }
    if (holidays.some((holiday) => holiday.date === draft.date)) { toast.error('A holiday already exists on this date'); return; }
    setHolidays((current) => [...current, { ...draft, title: draft.title.trim(), desc: draft.desc?.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setDraft({ date: '', title: '', desc: '' });
  };
  const save = async () => {
    if (!yearId) { toast.error('Set a current academic year first'); return; }
    setSaving(true);
    try {
      await saveHolidayCalendar(clientId, token, { academicYearId: yearId, weeklyHolidays: weekly, holidays });
      toast.success('Holiday calendar saved');
    } catch (error) { toast.error((error as Error).message || 'Could not save holiday calendar'); }
    finally { setSaving(false); }
  };

  return <DashboardLayout><div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
    <PageHeader title="Holidays" />
    <p className="text-sm text-gray-500">Set weekly closed days and holidays for this academic year.</p>
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3"><CalendarOff className="mt-1 size-5 text-primary-600" /><div><h2 className="font-semibold text-gray-900">Weekly holidays</h2><p className="text-sm text-gray-500">Select the regular days when the madrasa is closed.</p></div></div>
      <div className="flex flex-wrap gap-2">{WEEKDAYS.map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${weekly.includes(day) ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`} aria-pressed={weekly.includes(day)}>{DAY_LABELS[day]}</button>)}</div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="mb-1 font-semibold text-gray-900">Academic year holidays</h2><p className="mb-4 text-sm text-gray-500">Add holidays with a title, date, and optional description.</p>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <Button type="button" variant="outline" className="justify-start font-normal" onClick={() => setDatePickerOpen(true)} aria-label="Choose holiday date"><CalendarDays className="size-4" />{draft.date ? new Date(`${draft.date}T00:00:00`).toLocaleDateString() : 'Choose date'}</Button>
        <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Holiday title" aria-label="Holiday title" />
        <Textarea className="md:col-span-2" value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} placeholder="Description (optional)" aria-label="Holiday description" />
        <div className="md:col-span-2"><Button type="button" onClick={addHoliday}><Plus className="mr-2 size-4" />Add holiday</Button></div>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
        {holidays.map((holiday) => <div key={holiday.date} className="flex items-start justify-between gap-4 px-4 py-4"><div><p className="font-medium text-gray-900">{holiday.title}</p><p className="mt-1 text-sm text-gray-500">{new Date(`${holiday.date}T00:00:00`).toLocaleDateString()}</p>{holiday.desc && <p className="mt-1 text-sm text-gray-600">{holiday.desc}</p>}</div><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${holiday.title}`} onClick={() => setHolidays((current) => current.filter((item) => item.date !== holiday.date))}><Trash2 className="size-4 text-red-600" /></Button></div>)}
        {!loading && holidays.length === 0 && <p className="py-5 text-center text-sm text-gray-500">No dated holidays added for this academic year.</p>}
      </div>
    </section>
    <div className="flex justify-end"><Button type="button" onClick={save} disabled={loading || saving || !yearId}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Save holiday calendar</Button></div>
    <DatePickerDrawer open={datePickerOpen} onOpenChange={setDatePickerOpen} date={draft.date} onDateChange={(date) => setDraft((current) => ({ ...current, date }))} title="Choose holiday date" disableFuture={false} />
  </div></DashboardLayout>;
}
