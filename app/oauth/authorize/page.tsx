import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { getTenantSlugSync } from '@/lib/slug-storage';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';

export default function TeacherMcpAuthorizePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken, hasHydrated, bootstrap, syncActiveForPath } = useAuthStore();
  const [slug, setSlug] = useState(getTenantSlugSync().slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!hasHydrated) await bootstrap();
      if (!cancelled) await syncActiveForPath('/teacher/agent-access');
    };
    void restore();
    return () => { cancelled = true; };
  }, [hasHydrated, bootstrap, syncActiveForPath]);

  const params = new URLSearchParams(location.search);
  const clientName = params.get('client_id')?.startsWith('sm_oauth_') ? 'Gemini' : 'ChatGPT';
  const requestedWrite = params.get('scope')?.split(' ').includes('attendance:write') ?? true;
  const returnTo = `${location.pathname}${location.search}`;
  const loginUrl = `/m/${encodeURIComponent(slug.trim())}/teacher/login?returnTo=${encodeURIComponent(returnTo)}`;

  const decide = async (approved: boolean) => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_ORIGIN}/oauth/authorize/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ...Object.fromEntries(params), approved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description ?? 'Could not complete the connection');
      window.location.assign(data.redirectUrl);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-50 p-3 text-primary-700"><Bot className="size-6" /></div>
          <div><h1 className="text-xl font-semibold text-gray-900">Connect {clientName}</h1><p className="text-sm text-gray-500">Smart Madrasa attendance</p></div>
        </div>
        {!hasHydrated ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="size-4 animate-spin" /> Checking your sign-in…</p>
        ) : user?.actorType !== 'TEACHER' || !accessToken ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-700">Sign in to your teacher account to choose whether {clientName} can access attendance.</p>
            <label className="block text-sm font-medium text-gray-700" htmlFor="madrasa-slug">Madrasa URL name</label>
            <Input id="madrasa-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Your madrasa URL name" />
            <Button disabled={!slug.trim()} onClick={() => navigate(loginUrl)}>Sign in as teacher</Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <p className="text-sm text-gray-700">Signed in as <strong>{user.name}</strong>. {clientName} is requesting access to your assigned classes.</p>
            <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-gray-700">
              <div className="flex items-center gap-2 font-medium text-gray-900"><ShieldCheck className="size-4 text-primary-700" /> Permissions requested</div>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>View your assigned classes and attendance reports</li>
                {requestedWrite && <li>Mark attendance for students in your assigned classes</li>}
              </ul>
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void decide(true)}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Allow access</Button>
              <Button variant="outline" disabled={busy} onClick={() => void decide(false)}>Cancel</Button>
            </div>
            <Link className="text-sm text-primary-700 underline" to="/teacher/agent-access">Manage agent access</Link>
          </div>
        )}
      </div>
    </main>
  );
}
