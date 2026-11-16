import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Check, Clock3, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginTeacher } from "@/lib/auth-api";
import { ApiError } from "@/lib/fetch";
import { getTenantSlugSync } from "@/lib/slug-storage";
import { completeTeacherOAuth, deniedTeacherOAuthCallback, parseTeacherOAuthRequest } from "@/lib/teacher-mcp-api";
import { normalizeUserSession, useAuthStore } from "@/store/auth";

const PERMISSIONS = {
  "attendance:read": { icon: BookOpen, title: "Read class attendance", description: "View your assigned classes, student rosters, and attendance reports." },
  "attendance:write": { icon: Check, title: "Record attendance", description: "Record or update attendance for your assigned classes when you ask." },
  "marks:read": { icon: BookOpen, title: "Read exam marks", description: "View exams, subject score limits, and marks for classes and subjects assigned to you." },
  "marks:write": { icon: Check, title: "Enter exam marks", description: "Save or update student scores for your assigned classes and subjects after you approve the changes." },
  "homework:read": { icon: BookOpen, title: "Read homework", description: "View your assignments and student submission and review status." },
  "homework:write": { icon: Check, title: "Manage homework", description: "Create, edit, or remove your assignments after approval. New assignments can notify parents." },
  "leave:read": { icon: BookOpen, title: "Read leave requests", description: "View leave requests for students in your assigned classes." },
  "leave:write": { icon: Check, title: "Review leave requests", description: "Approve or reject requests after confirmation. Reviews can update attendance and notify parents." },
  "fees:read": { icon: BookOpen, title: "Read fees", description: "View fee types and your class students’ dues, payments, and receipts." },
  "fees:write": { icon: Check, title: "Manage fee payments", description: "Record, edit, cancel, or reopen your class students’ payment records after confirmation. Changes can notify parents." },
  offline_access: { icon: Clock3, title: "Stay connected", description: "Keep the approved access without asking you to sign in each time." },
};

export default function TeacherOAuthAuthorizePage() {
  const [params] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const { user, accessToken, login, syncActiveForPath } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [forceLogin, setForceLogin] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [madrasaSlug, setMadrasaSlug] = useState(() => slug ?? getTenantSlugSync().slug);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const authorization = useMemo(() => {
    try { return { value: parseTeacherOAuthRequest(params), error: "" }; }
    catch (err) {
      return { value: null, error: err instanceof Error ? err.message : "Invalid authorization link." };
    }
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    // This public route must restore the teacher session even when another role is active.
    void syncActiveForPath("/teacher").catch(() => {
      if (!cancelled) setForceLogin(true);
    }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [syncActiveForPath]);

  const isTeacher = !forceLogin && user?.actorType === "TEACHER" && Boolean(accessToken);
  const connection = authorization.value;

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !connection) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (!madrasaSlug.trim()) throw new Error("Enter your madrasa code to sign in.");
      const session = await loginTeacher(identifier.trim(), password, madrasaSlug.trim().toLowerCase());
      const normalized = normalizeUserSession(session as import("@/store/auth").AuthSessionPayload);
      if (normalized.user.actorType !== "TEACHER") throw new Error("Sign in with a teacher account to connect.");
      login(normalized);
      setPassword("");
      setForceLogin(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function handleDecision(approved: boolean) {
    if (!connection || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const callback = isTeacher && accessToken
        ? await completeTeacherOAuth(connection.request, accessToken, approved)
        : !approved ? deniedTeacherOAuthCallback(connection.request) : null;
      if (!callback) throw new Error("Sign in as a teacher before connecting.");
      window.location.assign(callback);
    } catch (err) {
      if (err instanceof ApiError && err.code === "401") setForceLogin(true);
      setError(err instanceof Error ? err.message : "Unable to connect. Please try again.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
          <img src="/imgs/onboarding/logo.svg" alt="" className="size-9" />
          Smart Madrasa
        </Link>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="authorize-title">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h1 id="authorize-title" className="text-2xl font-semibold tracking-tight">
            {connection ? `Connect ${connection.clientName}` : "Unable to connect"}
          </h1>
          {!connection ? (
            <>
              <p role="alert" className="mt-3 text-sm text-muted-foreground">{authorization.error}</p>
              <p className="mt-3 text-sm text-muted-foreground">Open your chat app and start a new Smart Madrasa connection.</p>
              <Link to="/" className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4">Back to Smart Madrasa</Link>
            </>
          ) : !ready ? (
            <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your teacher session…</p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isTeacher ? `${connection.clientName} is requesting the following access to your Smart Madrasa account.` : "Sign in with your teacher account, then review the requested access."}
              </p>
              {error && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              {isTeacher ? (
                <>
                  <div className="mt-6 rounded-xl bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground">Connecting as</p>
                    <p className="mt-1 font-medium">{user?.name}</p>
                    {(user?.madrasaName || user?.tenantSlug) && <p className="text-sm text-muted-foreground">{user.madrasaName || user.tenantSlug}</p>}
                    <button type="button" disabled={busy} onClick={() => { setForceLogin(true); setError(""); }} className="mt-2 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50">Use another teacher account</button>
                  </div>
                  <ul className="my-6 space-y-5" aria-label="Requested permissions">
                    {connection.scopes.map((scope) => {
                      const permission = PERMISSIONS[scope as keyof typeof PERMISSIONS];
                      const Icon = permission.icon;
                      return <li key={scope} className="flex gap-3">
                        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div><p className="text-sm font-medium">{permission.title}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{permission.description}</p></div>
                      </li>;
                    })}
                  </ul>
                  <p className="mb-6 text-xs leading-relaxed text-muted-foreground">Access is limited to your assigned classes. Your password is never shared with {connection.clientName}.</p>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void handleDecision(false)} className="flex-1">Cancel</Button>
                    <Button type="button" disabled={busy} onClick={() => void handleDecision(true)} className="flex-1">
                      {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Allow access
                    </Button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="mcp-madrasa" className="text-sm font-medium">Madrasa code</label>
                    <Input id="mcp-madrasa" value={madrasaSlug} onChange={(event) => setMadrasaSlug(event.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="Your madrasa code" required disabled={busy} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="mcp-username" className="text-sm font-medium">Teacher username</label>
                    <Input id="mcp-username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoCapitalize="none" required disabled={busy} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="mcp-password" className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input id="mcp-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={busy} className="pr-11" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground">
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Sign in to continue</Button>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => void handleDecision(false)} className="w-full">Cancel connection</Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
