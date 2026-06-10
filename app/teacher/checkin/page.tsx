import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  checkIn, checkOut, getTodaySession, getSessionHistory,
  type TeacherSession,
} from "@/lib/teacher-session-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  LogIn, LogOut, Loader2, Clock, MapPin, CheckCircle2, History,
} from "lucide-react";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function hr(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / 3_600_000);
}

export default function TeacherCheckinPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [session, setSession]       = useState<TeacherSession | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [location, setLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [locError, setLocError]     = useState<string | null>(null);

  const [history, setHistory]       = useState<TeacherSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const now = Date.now();

  useEffect(() => {
    if (!cid || !token) return;
    setLoading(true);
    Promise.all([
      getTodaySession(cid, token),
      getSessionHistory(cid, token, { limit: 10 }),
    ])
      .then(([s, h]) => { setSession(s); setHistory(h.data ?? []); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [cid, token]);

  useEffect(() => {
    if (!navigator.geolocation) { setLocError("Location not available"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setLocError("Could not get location"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true); setError(null);
    try {
      const s = await checkIn(cid, token, location ?? undefined);
      setSession(s);
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true); setError(null);
    try {
      const s = await checkOut(cid, token);
      setSession(s);
    } catch (e) { setError((e as Error).message); }
    finally { setActionLoading(false); }
  };

  const checkedIn = session?.status === "CHECKED_IN";
  const checkedOut = session?.status === "CHECKED_OUT";
  const hoursSinceCheckin = session?.checkInTime ? hr(session.checkInTime) : 0;
  const autoCheckout = checkedIn && hoursSinceCheckin >= 3;

  return (
    <DashboardLayout>
      <PageHeader title="Check In / Out" icon={Clock} />

      {error && <ApiErrorBanner message={error} onRetry={() => window.location.reload()} />}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="max-w-md mx-auto space-y-6 px-4">
          {/* Status card */}
          <div className={cn(
            "rounded-3xl p-8 text-center border-2 transition-all",
            autoCheckout || checkedOut
              ? "bg-gray-50 border-gray-200"
              : checkedIn
                ? "bg-emerald-50 border-emerald-300"
                : "bg-white border-gray-200",
          )}>
            {autoCheckout || checkedOut ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-700">Checked Out</h2>
                {session?.checkInTime && (
                  <p className="text-sm text-gray-400 mt-2">
                    Checked in at {fmtTime(session.checkInTime)}
                    {session.checkOutTime && <> · Checked out at {fmtTime(session.checkOutTime)}</>}
                  </p>
                )}
                {autoCheckout && (
                  <p className="text-xs text-amber-600 mt-2 font-medium">Auto-checked out after 3 hours</p>
                )}
              </>
            ) : checkedIn ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-200 flex items-center justify-center mb-4">
                  <LogIn className="w-10 h-10 text-emerald-700" />
                </div>
                <h2 className="text-xl font-bold text-emerald-700">Checked In</h2>
                <p className="text-sm text-emerald-600 mt-2">
                  Since {fmtTime(session.checkInTime)} · {hoursSinceCheckin}h {60 - (new Date().getMinutes() - new Date(session.checkInTime).getMinutes()) % 60 || 0}m ago
                </p>
                {session?.location && (
                  <p className="text-xs text-emerald-500 mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.location.address ?? `${session.location.lat?.toFixed(4)}, ${session.location.lng?.toFixed(4)}`}
                  </p>
                )}
                <button onClick={handleCheckOut} disabled={actionLoading}
                  className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50 transition-colors shadow-lg shadow-amber-200">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Check Out
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Clock className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Not Checked In</h2>
                <p className="text-sm text-gray-400 mt-2">Tap below to start your session</p>
                {locError && (
                  <p className="text-xs text-amber-500 mt-2">{locError}</p>
                )}
                <button onClick={handleCheckIn} disabled={actionLoading}
                  className="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Check In Now
                </button>
              </>
            )}
          </div>

          {/* History */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-600">Recent Sessions</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No session history</p>
            ) : (
              <div className="space-y-2">
                {history.map((s) => {
                  const h = hr(s.checkInTime);
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fmtDate(s.date)}</p>
                        <p className="text-xs text-gray-400">
                          {fmtTime(s.checkInTime)} – {s.checkOutTime ? fmtTime(s.checkOutTime) : `${h}h+`}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-lg",
                        s.status === "CHECKED_IN" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                      )}>
                        {s.status === "CHECKED_IN" ? (h >= 3 ? "Auto Out" : "Active") : "Out"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
