import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Drawer } from "@/components/ui/drawerView";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Icon } from "@iconify/react";
import type { DateRange } from "react-day-picker";
import {
  Loader2,
  MapPin,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

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
  const [sessionTab, setSessionTab] = useState<"today" | "history">("today");
  const [historyRange, setHistoryRange] = useState<DateRange | undefined>();
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
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
  const filteredHistoryGrouped = historyGrouped
    .map((group) => ({
      ...group,
      sessions: group.sessions.filter((session) => {
        const date = dateKey(session.date);
        const from = historyRange?.from ? dateKey(historyRange.from.toISOString()) : "";
        const to = historyRange?.to ? dateKey(historyRange.to.toISOString()) : from;
        return (!from || date >= from) && (!to || date <= to);
      }),
    }))
    .filter((group) => group.sessions.length > 0);

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "checkInTitle", lang)} />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div
          className={cn(
            "mx-auto space-y-6",
            sessionTab === "today" && todaySessions.length === 0
              ? "w-full"
              : "max-w-md",
          )}
        >
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
            <Button
              onClick={handleCheckOut}
              disabled={actionLoading}
              size="lg"
              className="fixed bottom-12 left-4 rounded-full right-4 z-30 mx-auto w-max max-w-md lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-80"
            >
              {actionLoading && <Loader2 className="animate-spin" />}
              {!actionLoading && <Icon icon="solar:logout-2-linear" className="h-4 w-4" />}
              {t("teacherPages", "checkOutBtn", lang)}
            </Button>
          ) : (
            <Button
              onClick={() =>
                location ? handleCheckIn() : setLocationDrawerOpen(true)
              }
              disabled={actionLoading || locLoading}
              size={"lg"}
              className={cn(
                "group flex items-center gap-2 shadow-lg transition-all fixed bottom-12 left-4 right-4 z-30 mx-auto w-max max-w-full rounded-full   lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-80",
                location
                  ? ""
                  : "   bg-red-600 text-white ",
                !activeSession && todaySessions.length === 0 && "hidden",
              )}
            >
              {location ? (
                <>
                  <Icon icon="solar:login-2-linear" className="h-4 w-4" />
                  {t("teacherPages", "checkInBtn", lang)}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 " />
                  <span>{t("teacherPages", "locationRequired", lang)}</span>
                  <ChevronRight className="h-5 w-5  " />
                </>
              )}
            </Button>
          )}

          <Drawer
            open={locationDrawerOpen}
            onOpenChange={setLocationDrawerOpen}
            side="bottom"
            title={t("teacherPages", "locationRequired", lang)}
          >
            <div className="space-y-4 px-5 pb-8">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <iframe
                  className="aspect-video w-full"
                  src="https://www.youtube-nocookie.com/embed/88FQrJoL21o"
                  title="How to enable location access"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <Button
                onClick={fetchLocation}
                disabled={locLoading}
                size="lg"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {locLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}{" "}
                Retry location
              </Button>
            </div>
          </Drawer>

          <div>
            {(todaySessions.length > 0 || history.length > 0) && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 rounded-xl bg-gray-100 p-1">
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className={cn(
                    "flex-1",
                    sessionTab === "today" && "bg-white shadow-sm",
                  )}
                  onClick={() => setSessionTab("today")}
                >
                  {t("teacherPages", "todaySessions", lang)}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className={cn(
                    "flex-1",
                    sessionTab === "history" && "bg-white shadow-sm",
                  )}
                  onClick={() => setSessionTab("history")}
                >
                  {t("teacherPages", "historyLabel", lang)}
                </Button>
                </div>
                {sessionTab === "history" && (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="shrink-0 px-3"
                    onClick={() => {
                      setHistoryPickerOpen(true);
                    }}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">{historyRange?.from ? "Date range" : "Filter"}</span>
                  </Button>
                )}
              </div>
            )}

            <DateRangePicker
              open={historyPickerOpen}
              onOpenChange={setHistoryPickerOpen}
              value={historyRange}
              onApply={setHistoryRange}
            />

            {(sessionTab === "today" ? todaySessions : filteredHistoryGrouped).length === 0 ? (
              sessionTab === "today" ? (
                <div
                  className="-mx-4 flex min-h-[calc(100dvh-11rem)] w-[calc(100%+2rem)] items-center justify-center px-6 py-8 text-center lg:-mx-8 lg:w-[calc(100%+4rem)]"
                >
                  <div className="w-full max-w-sm">
                    <img src="/imgs/checkin/1.png" alt="" className="mx-auto h-24 w-24 object-contain opacity-80" />
                    <h3 className="mt-3 text-base font-bold text-gray-900">
                      {t("teacherPages", "notCheckedIn", lang)}
                    </h3>
                    <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
                      {t("teacherPages", "sessionsDesc", lang)}
                    </p>
                    <Button
                      onClick={() => location ? handleCheckIn() : setLocationDrawerOpen(true)}
                      disabled={actionLoading || locLoading}
                      size="lg"
                      className={cn(
                        "mt-5 w-max rounded-full",
                        !location && "bg-red-600 text-white hover:bg-red-700",
                      )}
                    >
                      {location ? <Icon icon="solar:login-2-linear" className="h-4 w-4" /> : <AlertTriangle className="h-5 w-5" />}
                      {location ? t("teacherPages", "checkInBtn", lang) : t("teacherPages", "locationRequired", lang)}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-gray-400">
                  {t("teacherPages", "noSessionHistory", lang)}
                </p>
              )
            ) : (
              <div>
                {(sessionTab === "today"
                  ? [{ date: "", sessions: todaySessions }]
                  : filteredHistoryGrouped
                ).map(
                  ({ date, sessions: daySessions }) => (
                    <div key={date}>
                      {date && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{fmtDate(date)}</p>}
                      {daySessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between border-b border-gray-100 px-1 py-3"
                        >
                          <p className="text-sm text-gray-600">
                            {fmtTime(s.checkInTime)} – {s.checkOutTime ? fmtTime(s.checkOutTime) : t("teacherPages", "ongoingLabel", lang)}
                          </p>
                          <span className={cn(
                            "text-xs font-semibold",
                            s.status === "CHECKED_IN" ? "text-emerald-600" : "text-gray-400",
                          )}>
                            {s.status === "CHECKED_IN" ? t("teacherPages", "activeLabel", lang) : t("teacherPages", "outLabel", lang)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
