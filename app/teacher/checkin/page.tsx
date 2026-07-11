import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
 checkIn, checkOut, getTodaySession, getSessionHistory,
 type TeacherSession,
} from "@/lib/teacher-session-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
 LogIn, LogOut, Loader2, Clock, MapPin, CheckCircle2, History, Plus,
 MapPinOff, ExternalLink,
} from "lucide-react";

const LOCATION_HOWTO_VIDEO_URL = "https://www.youtube.com/watch?v=88FQrJoL21o";

function fmtTime(d: string) {
 return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
 return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dateKey(d: string) {
 return d.split("T")[0];
}

function groupByDate(sessions: TeacherSession[]) {
 const map = new Map<string, TeacherSession[]>();
 for (const s of sessions) {
 const key = dateKey(s.date);
 if (!map.has(key)) map.set(key, []);
 map.get(key)!.push(s);
 }
 return [...map.entries()]
 .sort(([a], [b]) => b.localeCompare(a))
 .map(([date, list]) => ({ date, sessions: list }));
}

export default function TeacherCheckinPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
 const cid = activeClientId ?? "";
 const token = accessToken ?? "";

 const [todaySessions, setTodaySessions] = useState<TeacherSession[]>([]);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
 const [locError, setLocError] = useState<string | null>(null);
 const [locLoading, setLocLoading] = useState(false);

 const [history, setHistory] = useState<TeacherSession[]>([]);
 const wasHiddenRef = useRef(false);

 const activeSession = todaySessions.find((s) => s.status === "CHECKED_IN") ?? null;

 const load = () => {
 if (!cid || !token) return;
 setLoading(true);
 Promise.all([
 getTodaySession(cid, token),
 getSessionHistory(cid, token, { limit: 30 }),
 ])
 .then(([sessions, h]) => { setTodaySessions(sessions); setHistory(h.data ?? []); })
 .catch((e) => setError((e as Error).message))
 .finally(() => setLoading(false));
 };

 useEffect(() => { load(); }, [cid, token]); // eslint-disable-line

 const fetchLocation = useCallback(async () => {
 if (!navigator.geolocation) {
 setLocError("Geolocation is not supported by your browser");
 return;
 }

 if (navigator.permissions?.query) {
 try {
 const perm = await navigator.permissions.query({ name: "geolocation" });
 if (perm.state === "denied") {
 setLocError(
 "Location access is blocked for this app. Open your phone Settings → Apps → Madrasa → Permissions → Location, set to \"Allow only while using the app\", then come back and tap Retry.",
 );
 setLocLoading(false);
 return;
 }
 } catch {
 }
 }

 setLocLoading(true);
 setLocError(null);
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
 setLocError(null);
 setLocLoading(false);
 },
 (err) => {
 if (err.code === err.PERMISSION_DENIED) {
 setLocError(
 "Location access is blocked for Madrasa. Open your phone Settings → Apps → Madrasa → Permissions → Location, set it to “Allow only while using the app”, then come back and tap Check In again.",
 );
 } else if (err.code === err.TIMEOUT) {
 setLocError("We couldn’t find your location in time. Make sure GPS is on, then tap Check In again.");
 } else if (err.code === err.POSITION_UNAVAILABLE) {
 setLocError("Your location is currently unavailable. Step near a window or go outside for a stronger GPS signal, then try again.");
 } else {
 setLocError("Something went wrong while getting your location. Please try again in a moment.");
 }
 setLocation(null);
 setLocLoading(false);
 },
 { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
 );
 }, []);

 useEffect(() => { fetchLocation(); }, [fetchLocation]);

 useEffect(() => {
 const onVisibility = () => {
 if (document.hidden) {
 wasHiddenRef.current = true;
 } else if (wasHiddenRef.current) {
 wasHiddenRef.current = false;
 if (!location) fetchLocation();
 }
 };
 document.addEventListener("visibilitychange", onVisibility);
 return () => document.removeEventListener("visibilitychange", onVisibility);
 }, [fetchLocation, location]);

 const handleCheckIn = async () => {
 if (!location) {
 setLocError("We need your location to check you in. Please allow location access and try again.");
 fetchLocation();
 return;
 }
 setActionLoading(true); setError(null);
 try {
 const s = await checkIn(cid, token, location);
 setTodaySessions((prev) => [s, ...prev]);
 } catch (e) { setError((e as Error).message); }
 finally { setActionLoading(false); }
 };

 const handleCheckOut = async () => {
 setActionLoading(true); setError(null);
 try {
 const s = await checkOut(cid, token);
 setTodaySessions((prev) => prev.map((sess) => sess.id === s.id ? s : sess));
 } catch (e) { setError((e as Error).message); }
 finally { setActionLoading(false); }
 };

 const historyGrouped = groupByDate(history);
 const todayCount = todaySessions.length;

 return (
 <DashboardLayout>
  <PageHeader title={t("teacherPages", "checkInTitle", lang)} icon={Clock} />

 {error && <ApiErrorBanner message={error} onRetry={load} />}

 {loading ? (
 <div className="max-w-md mx-auto space-y-6 px-4">
 <Skeleton className="h-64 rounded-3xl" />
 <div className="space-y-2">
 <Skeleton className="h-5 w-36" />
 {Array.from({ length: 2 }).map((_, i) => (
 <Skeleton key={i} className="h-16 rounded-2xl" />
 ))}
 </div>
 <div className="space-y-3">
 <Skeleton className="h-5 w-20" />
 <Skeleton className="h-32 rounded-2xl" />
 </div>
 </div>
 ) : (
 <div className="max-w-md mx-auto space-y-6 px-4">
 {/* Status card */}
 {activeSession ? (
 <div className="rounded-3xl p-8 text-center border-2 bg-emerald-50 border-emerald-300 transition-all">
 <div className="w-20 h-20 mx-auto rounded-full bg-emerald-200 flex items-center justify-center mb-4">
 <LogIn className="w-10 h-10 text-emerald-700" />
 </div>
  <h2 className="text-xl font-bold text-emerald-700">{t("teacherPages", "checkedIn", lang)}</h2>
  <p className="text-sm text-emerald-600 mt-2">
  {t("teacherPages", "sinceLabel", lang)} {fmtTime(activeSession.checkInTime)}
 </p>
 {activeSession?.location && (
 <p className="text-xs text-emerald-500 mt-1 flex items-center justify-center gap-1">
 <MapPin className="w-3 h-3" />
 {activeSession.location.address ?? `${activeSession.location.lat?.toFixed(4)}, ${activeSession.location.lng?.toFixed(4)}`}
 </p>
 )}
 <button onClick={handleCheckOut} disabled={actionLoading}
 className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50 transition-colors shadow-lg">
 {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
  {t("teacherPages", "checkOutBtn", lang)}
 </button>
 </div>
 ) : (
 <div className="rounded-3xl p-8 text-center border-2 bg-white border-gray-200 transition-all">
 <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
 <Clock className="w-10 h-10 text-blue-600" />
 </div>
  <h2 className="text-xl font-bold text-gray-800">
  {todayCount > 0 ? t("teacherPages", "sessionsEnded", lang) : t("teacherPages", "notCheckedIn", lang)}
  </h2>
  <p className="text-sm text-gray-400 mt-2">
  {todayCount > 0
  ? t("teacherPages", "youHadSessions", lang).replace("{n}", String(todayCount))
  : t("teacherPages", "sessionsDesc", lang)}
  </p>

 {/* Location status */}
 <div className="mt-4">
 {locLoading ? (
 <div className="flex items-center justify-center gap-2 text-xs text-blue-500">
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
  {t("teacherPages", "gettingLocation", lang)}
 </div>
 ) : location ? (
 <div className="flex items-center justify-center gap-2 text-xs text-emerald-600">
 <MapPin className="w-3.5 h-3.5" />
  {t("teacherPages", "locationReady", lang)}
 </div>
 ) : (
 <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-left">
 <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
<MapPinOff className="w-3.5 h-3.5" />
  {t("teacherPages", "locationRequired", lang)}
 </p>
 <p className="text-[11px] text-red-600 mt-1 leading-relaxed">
 {locError ?? t("teacherPages", "locationHelp", lang)}
 </p>
 <a
 href={LOCATION_HOWTO_VIDEO_URL}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 mt-2"
 >
 <ExternalLink className="w-3 h-3" />
  {t("teacherPages", "howToTurnOn", lang)}
 </a>
 </div>
 )}
 </div>

  <button onClick={handleCheckIn} disabled={actionLoading || locLoading}
  className={cn(
  "mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-bold text-sm transition-colors shadow-lg",
  location
  ? "bg-emerald-600 hover:bg-emerald-700 shadow disabled:opacity-50"
  : "bg-gray-300 cursor-not-allowed shadow",
 )}>
 {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
  {t("teacherPages", "checkInBtn", lang)}
  </button>
 </div>
 )}

 {/* Today's sessions */}
 {todaySessions.length > 0 && (
 <div>
 <div className="flex items-center gap-2 mb-3">
 <Clock className="w-4 h-4 text-gray-400" />
  <h3 className="text-sm font-semibold text-gray-600">{t("teacherPages", "todaySessions", lang)} ({todayCount})</h3>
 </div>
 <div className="space-y-2">
 {todaySessions.map((s) => {
 const isActive = s.status === "CHECKED_IN";
 return (
 <div key={s.id}
 className={cn(
 "flex items-center justify-between rounded-2xl border px-4 py-3",
 isActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100",
 )}>
 <div>
 <p className="text-sm font-semibold text-gray-900">
  {fmtTime(s.checkInTime)} – {s.checkOutTime ? fmtTime(s.checkOutTime) : t("teacherPages", "ongoingLabel", lang)}
 </p>
 </div>
 <span className={cn(
 "text-xs font-bold px-2.5 py-1 rounded-lg",
 isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
 )}>
  {isActive ? t("teacherPages", "activeLabel", lang) : t("teacherPages", "outLabel", lang)}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* History */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <History className="w-4 h-4 text-gray-400" />
  <h3 className="text-sm font-semibold text-gray-600">{t("teacherPages", "historyLabel", lang)}</h3>
 </div>
 {historyGrouped.length === 0 ? (
 <p className="text-xs text-gray-400 text-center py-4">{t("teacherPages", "noSessionHistory", lang)}</p>
 ) : (
 <div className="space-y-3">
 {historyGrouped.map(({ date, sessions: daySessions }) => (
 <div key={date} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
 <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
 <p className="text-sm font-semibold text-gray-900">{fmtDate(date)}</p>
 <span className="text-xs text-gray-400">{daySessions.length} session{daySessions.length > 1 ? "s" : ""}</span>
 </div>
 <div className="divide-y divide-gray-50">
 {daySessions.map((s) => (
 <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
 <p className="text-xs text-gray-500">
 {fmtTime(s.checkInTime)} – {s.checkOutTime ? fmtTime(s.checkOutTime) : "—"}
 </p>
 <span className={cn(
 "text-[10px] font-bold px-2 py-0.5 rounded-lg",
 s.status === "CHECKED_IN" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
 )}>
 {s.status === "CHECKED_IN" ? t("teacherPages", "activeLabel", lang) : t("teacherPages", "outLabel", lang)}
 </span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </DashboardLayout>
 );
}
