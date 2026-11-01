import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { authorizeMcpConnection } from "@/lib/teacher-agent";

export default function TeacherAgentAuthorizePage() {
  const location = useLocation();
  const { slug } = useParams();
  const { user, accessToken } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const params = new URLSearchParams(location.search);
  const resource = params.get("resource") ?? "";
  const appName = params.get("app_name") ?? "AI assistant";
  const callbackHost = (() => { try { return new URL(params.get("redirect_uri") ?? "").host; } catch { return "Unknown"; } })();
  const loginPath = `/m/${encodeURIComponent(slug ?? "")}/teacher/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;

  async function approve() {
    if (!accessToken) return;
    setBusy(true); setError("");
    try { const result = await authorizeMcpConnection(accessToken, params); window.location.assign(result.redirect_uri); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not authorize connection"); setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm"><ShieldCheck className="h-8 w-8 text-primary" /><h1 className="mt-3 text-2xl font-bold">Connect {appName}</h1><p className="mt-2 text-sm text-muted-foreground">Connection callback: {callbackHost}</p><p className="mt-3 text-sm text-muted-foreground">This app requests read-only access to your assigned classes, students, subjects, attendance, homework, diary, ibadah, fees, exams, reports, performance, leave requests, notifications, and teacher check-in.</p><p className="mt-3 break-all rounded-lg bg-muted p-3 font-mono text-xs">{resource}</p>{user?.role === "teacher" && accessToken ? <button type="button" onClick={approve} disabled={busy} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? "Connecting…" : "Approve connection"}</button> : <Link to={loginPath} className="mt-5 block rounded-lg bg-primary px-4 py-2 text-center text-primary-foreground">Sign in as teacher</Link>}<Link to={`/m/${encodeURIComponent(slug ?? "")}/teacher/agent`} className="mt-3 block text-center text-sm text-muted-foreground">Cancel</Link>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</section></main>;
}
