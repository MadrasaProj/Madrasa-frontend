import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Drawer } from "@/components/ui/drawerView";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  checkIn,
  checkOut,
  getTodaySession,
  getSessionHistory,
  type TeacherSession,
} from "@/lib/teacher-session-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Loader2,
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const LOCATION_HOWTO_VIDEO_URL = "https://www.youtube.com/watch?v=88FQrJoL21o";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);

  const [history, setHistory] = useState<TeacherSession[]>([]);
  const wasHiddenRef = useRef(false);

  const activeSession =
    todaySessions.find((s) => s.status === "CHECKED_IN") ?? null;

  const load = () => {
    if (!cid || !token) return;
    setLoading(true);
    Promise.all([
      getTodaySession(cid, token),
      getSessionHistory(cid, token, { limit: 30 }),
    ])
      .then(([sessions, h]) => {
        setTodaySessions(sessions);
        setHistory(h.data ?? []);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [cid, token]); // eslint-disable-line

  const fetchLocation = useCallback(async () => {
    // Secure context required for geolocation in production (HTTPS)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocError(
        `Location requires HTTPS. You are on ${window.location.protocol}//${window.location.host} which is not secure. Please open the site via https:// or contact admin.`,
      );
      setLocLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocError(
        "Geolocation is not supported by your browser. Try Chrome on Android or Safari on iPhone.",
      );
      return;
    }

    // If Permissions-Policy blocks geolocation, navigator.permissions.query will
    // report "denied" even before user is prompted. Detect insecure embedding.
    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        if (perm.state === "denied") {
          // Don't silently return — show diagnostics to distinguish header-block
          // vs user-block. In production, a header like geolocation=() causes this.
          const diag =
            typeof window !== "undefined"
              ? ` (secure=${String(window.isSecureContext)}, proto=${window.location.protocol}, host=${window.location.host})`
              : "";
          setLocError(
            `Location access is blocked for this page${diag}. If you previously denied, reset: browser Settings → Site settings → Location → Allow. If this just deployed, hard-refresh (Ctrl+Shift+R) or reinstall the PWA. Admin: verify response header Permissions-Policy contains geolocation=(self).`,
          );
          // Still attempt getCurrentPosition — on some browsers it will re-prompt
          // after user changes site setting. Don't early-return on denied.
        }
      } catch {
        // Firefox throws on unknown permission name when gated
      }
    }

    setLocLoading(true);
    setLocError(null);

    const requestPosition = (
      opts: PositionOptions,
    ): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, opts),
      );

    try {
      // First try high-accuracy (GPS) — best for check-in
      let pos: GeolocationPosition;
      try {
        pos = await requestPosition({
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        });
      } catch (e: unknown) {
        const err = e as GeolocationPositionError;
        // On TIMEOUT or POSITION_UNAVAILABLE, retry once with low accuracy (network)
        if (
          err?.code === err.TIMEOUT ||
          err?.code === err.POSITION_UNAVAILABLE
        ) {
          pos = await requestPosition({
            enableHighAccuracy: false,
            timeout: 15_000,
            maximumAge: 30_000,
          });
        } else {
          throw e;
        }
      }
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setLocationDrawerOpen(false);
      setLocError(null);
    } catch (err: unknown) {
      const e = err as GeolocationPositionError;
      const code = (e as unknown as { code?: number })?.code;
      const msg = (e as unknown as { message?: string })?.message ?? "";
      // Diagnostic suffix helps admin confirm prod headers vs device
      const diag =
        typeof window !== "undefined" && !window.isSecureContext
          ? " [insecure context]"
          : "";
      if (code === 1 /* PERMISSION_DENIED */) {
        setLocError(
          `Location permission denied${diag}. Allow location for this site: tap the lock icon in address bar → Site settings → Location → Allow, then tap Retry. On PWA: uninstall & reinstall after admin fixes Permissions-Policy header.${msg ? ` (${msg})` : ""}`,
        );
      } else if (code === 3 /* TIMEOUT */) {
        setLocError(
          `We couldn’t find your location in time${diag}. Ensure GPS/Location is ON, go near a window, then tap Retry.${msg ? ` (${msg})` : ""}`,
        );
      } else if (code === 2 /* POSITION_UNAVAILABLE */) {
        setLocError(
          `Your location is currently unavailable${diag}. Check GPS/data, try outdoors, then tap Retry.${msg ? ` (${msg})` : ""}`,
        );
      } else {
        setLocError(
          `Something went wrong while getting your location${diag}. Please tap Retry. ${msg || ""}`.trim(),
        );
      }
      setLocation(null);
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

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
    let coords = location;
    // If no cached location, acquire fresh one inline and use it directly
    // (React state is async, so don't rely on fetchLocation's setLocation)
    if (!coords) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setLocError(
          `Location requires HTTPS (${window.location.protocol}//${window.location.host}). Open via https://`,
        );
        return;
      }
      if (!navigator.geolocation) {
        setLocError("Geolocation not supported by this browser.");
        return;
      }
      setActionLoading(true);
      setLocLoading(true);
      setLocError(null);
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 12_000,
            maximumAge: 0,
          }),
        ).catch(async (err: GeolocationPositionError) => {
          if (
            err.code === err.TIMEOUT ||
            err.code === err.POSITION_UNAVAILABLE
          ) {
            return await new Promise<GeolocationPosition>((res2, rej2) =>
              navigator.geolocation.getCurrentPosition(res2, rej2, {
                enableHighAccuracy: false,
                timeout: 15_000,
                maximumAge: 30_000,
              }),
            );
          }
          throw err;
        });
        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);
      } catch (err: unknown) {
        const e = err as GeolocationPositionError & { message?: string };
        if (e.code === 1)
          setLocError(
            `Permission denied — allow location in site settings then retry. ${e.message ?? ""}`.trim(),
          );
        else if (e.code === 3)
          setLocError("Location timeout — ensure GPS is ON and retry.");
        else
          setLocError(
            `Location unavailable — try outdoors then retry. ${e.message ?? ""}`.trim(),
          );
        setActionLoading(false);
        setLocLoading(false);
        return;
      } finally {
        setLocLoading(false);
      }
      // actionLoading already true from above; keep it true for the API call
    } else {
      setActionLoading(true);
    }
    setError(null);
    try {
      const s = await checkIn(cid, token, coords!);
      setTodaySessions((prev) => [s, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const s = await checkOut(cid, token);
      setTodaySessions((prev) =>
        prev.map((sess) => (sess.id === s.id ? s : sess)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const historyGrouped = groupByDate(history);
  const todayCount = todaySessions.length;

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "checkInTitle", lang)} />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="max-w-md mx-auto space-y-6 ">
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
        <div className="max-w-md mx-auto space-y-6 ">
          {/* Status card */}
          {activeSession ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="group flex w-full items-center gap-4 rounded-3xl border-2 border-amber-500 bg-white p-4 text-left transition-all hover:border-amber-600 hover:shadow-md disabled:opacity-60"
            >
              <img
                src="/imgs/checkin/1.png"
                alt=""
                className="h-10 w-10 shrink-0 object-contain opacity-75"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-gray-900">
                  {t("teacherPages", "checkOutBtn", lang)}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {t("teacherPages", "sinceLabel", lang)}{" "}
                  {fmtTime(activeSession.checkInTime)}
                </span>
              </span>
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-amber-600 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          ) : (
            <button
              onClick={() =>
                location ? handleCheckIn() : setLocationDrawerOpen(true)
              }
              disabled={actionLoading || locLoading}
              style={
                {
                  background:location?'linear-gradient(45deg, #70c78b26, transparent, #70c78b1f, transparent, #70c78b29, transparent)':''
                }
              }
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border-[2.5px] shadow-lg   p-2 text-left transition-all hover:shadow-md disabled:opacity-70",
                location ? "border-white" : "border-red-400",
              )}
            >
              <span
                className={cn(
                  "flex  shrink-0 items-center justify-center rounded-2xl",
                 )}
              >
                {locLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                ) : location ? (
                  <img
                    src="/imgs/checkin/1.png"
                    alt=""
                    className="h-12 w-12 object-contain opacity-75"
                  />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </span>
              <span className="min-w-0 flex-1  ">
                <span className="block  text-base font-bold text-gray-900">
                  {location
                    ? t("teacherPages", "checkInBtn", lang)
                    : t("teacherPages", "locationRequired", lang)}
                </span>
                <span className=" block text-xs  text-gray-500">
                  {location
                    ? t("teacherPages", "sessionsDesc", lang)
                    : (locError ?? t("teacherPages", "locationHelp", lang))}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "h-5 w-5 transition-transform group-hover:translate-x-0.5",
                  location ? "text-emerald-600" : "text-red-600",
                )}
              />
            </button>
          )}

          <Drawer
            open={locationDrawerOpen}
            onOpenChange={setLocationDrawerOpen}
            side="bottom"
            title={t("teacherPages", "locationRequired", lang)}
            description={t("teacherPages", "locationHelp", lang)}
          >
            <div className="space-y-4 px-5 pb-8">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700">
                {locError ?? t("teacherPages", "locationHelp", lang)}
              </div>
              <button
                onClick={fetchLocation}
                disabled={locLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {locLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}{" "}
                Retry location
              </button>
              <a
                href={LOCATION_HOWTO_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-red-700 underline underline-offset-2"
              >
                <ExternalLink className="h-4 w-4" />{" "}
                {t("teacherPages", "howToTurnOn", lang)}
              </a>
            </div>
          </Drawer>

          {/* Today's sessions */}
          {todaySessions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600">
                  {t("teacherPages", "todaySessions", lang)} ({todayCount})
                </h3>
              </div>
              <div className="space-y-2">
                {todaySessions.map((s) => {
                  const isActive = s.status === "CHECKED_IN";
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3",
                        isActive
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-white border-gray-100",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {fmtTime(s.checkInTime)} –{" "}
                          {s.checkOutTime
                            ? fmtTime(s.checkOutTime)
                            : t("teacherPages", "ongoingLabel", lang)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-lg",
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {isActive
                          ? t("teacherPages", "activeLabel", lang)
                          : t("teacherPages", "outLabel", lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-700">
                {t("teacherPages", "historyLabel", lang)}
              </h3>
              {historyGrouped.length > 0 && (
                <span className="text-xs text-gray-400">
                  {history.length} sessions
                </span>
              )}
            </div>
            {historyGrouped.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {t("teacherPages", "noSessionHistory", lang)}
              </p>
            ) : (
              <div className="space-y-3">
                {historyGrouped.map(({ date, sessions: daySessions }) => (
                  <div
                    key={date}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-900">
                        {fmtDate(date)}
                      </p>
                      <span className="text-xs text-gray-400">
                        {daySessions.length} session
                        {daySessions.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {daySessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <p className="text-xs text-gray-500">
                            {fmtTime(s.checkInTime)} –{" "}
                            {s.checkOutTime ? fmtTime(s.checkOutTime) : "—"}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                              s.status === "CHECKED_IN"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {s.status === "CHECKED_IN"
                              ? t("teacherPages", "activeLabel", lang)
                              : t("teacherPages", "outLabel", lang)}
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
