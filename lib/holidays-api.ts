import { apiFetch } from '@/lib/fetch';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const API_BASE = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? '/api/v2'}`;

export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export type Weekday = typeof WEEKDAYS[number];
export interface HolidayEntry { date: string; title: string; desc?: string }
export interface HolidayCalendar { id?: string; clientId: string; academicYearId: string; holidays: HolidayEntry[]; weeklyHolidays: Weekday[] }

export const getHolidayCalendar = (clientId: string, token: string, academicYearId: string, signal?: AbortSignal) =>
  apiFetch<HolidayCalendar>(`${API_BASE}/${clientId}/holidays?academicYearId=${encodeURIComponent(academicYearId)}`, token, { signal });

export const saveHolidayCalendar = (clientId: string, token: string, data: Pick<HolidayCalendar, 'academicYearId' | 'holidays' | 'weeklyHolidays'>) =>
  apiFetch<HolidayCalendar>(`${API_BASE}/${clientId}/holidays`, token, { method: 'PUT', body: JSON.stringify(data) });
