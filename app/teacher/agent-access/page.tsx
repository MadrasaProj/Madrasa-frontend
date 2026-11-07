import { useEffect, useState } from 'react';
import { Bot, Check, ClipboardCopy, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import {
  createTeacherMcpKey,
  getTeacherMcpKeys,
  revokeTeacherMcpKey,
  teacherMcpEndpoint,
  type CreatedTeacherMcpKey,
  type TeacherMcpKey,
} from '@/lib/teacher-mcp-api';

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeacherAgentAccessPage() {
  const { user, accessToken } = useAuthStore();
  const [keys, setKeys] = useState<TeacherMcpKey[]>([]);
  const [name, setName] = useState('My chat agent');
  const [created, setCreated] = useState<CreatedTeacherMcpKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'key' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.actorType !== 'TEACHER') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getTeacherMcpKeys(accessToken)
      .then((value) => { if (!cancelled) setKeys(value); })
      .catch((cause) => { if (!cancelled) setError((cause as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, user?.actorType]);

  const copy = async (value: string, type: 'url' | 'key') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('Copy failed. Select and copy the value manually.');
    }
  };

  const createKey = async () => {
    if (!accessToken || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createTeacherMcpKey(accessToken, name.trim());
      setCreated(result);
      setKeys((current) => [result, ...current]);
      setName('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (key: TeacherMcpKey) => {
    if (!accessToken || !window.confirm(`Revoke “${key.name}”? Connected agents using this key will stop working.`)) return;
    setRevoking(key.id);
    setError(null);
    try {
      await revokeTeacherMcpKey(accessToken, key.id);
      setKeys((current) => current.map((item) => item.id === key.id ? { ...item, revokedAt: new Date().toISOString() } : item));
      if (created?.id === key.id) setCreated(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const activeKeys = keys.filter((key) => !key.revokedAt && new Date(key.expiresAt) > new Date());

  return (
    <DashboardLayout>
      <PageHeader title="Chat agent access" icon={Bot} />
      <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 sm:px-6">
        <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-700" />
            <div>
              <h2 className="font-semibold text-gray-900">Your attendance, from your chat agent</h2>
              <p className="mt-1 text-sm text-gray-600">Connect a supported MCP client to view your assigned classes, inspect a day’s attendance, filter reports, and mark attendance. Your agent can access only classes assigned to you.</p>
            </div>
          </div>
        </div>

        {user?.actorType !== 'TEACHER' ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">MCP keys are available for teacher accounts.</div>
        ) : (
          <>
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary-600" />
                <h2 className="font-semibold text-gray-900">Connection key</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">Create a separate key for each chat client. Keys expire after 90 days and can be revoked here at any time. You can have up to five active keys.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input aria-label="Key name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this connection" className="sm:max-w-sm" />
                <Button onClick={createKey} disabled={creating || !name.trim()}>
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Create key
                </Button>
              </div>
              {created && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-950">Copy this key now. It will not be shown again.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input aria-label="New MCP key" readOnly value={created.key} className="min-w-0 font-mono text-xs" onFocus={(event) => event.target.select()} />
                    <Button variant="outline" onClick={() => copy(created.key, 'key')}>
                      {copied === 'key' ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
                      {copied === 'key' ? 'Copied' : 'Copy key'}
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Connect your client</h2>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="mcp-endpoint">MCP server URL</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input id="mcp-endpoint" readOnly value={teacherMcpEndpoint} className="min-w-0 font-mono text-xs" onFocus={(event) => event.target.select()} />
                <Button variant="outline" onClick={() => copy(teacherMcpEndpoint, 'url')}>
                  {copied === 'url' ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
                  {copied === 'url' ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900">Claude custom connector</h3>
                  <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-gray-600">
                    <li>Add a custom web connector and paste the MCP server URL.</li>
                    <li>Choose no sign-in and add a request header named <code className="rounded bg-gray-100 px-1">Authorization</code>.</li>
                    <li>Set the header value to <code className="rounded bg-gray-100 px-1">Bearer YOUR_KEY</code>, replacing <code>YOUR_KEY</code> with the key above.</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900">Other MCP clients</h3>
                  <p className="mt-2 text-sm text-gray-600">Use Streamable HTTP with the same URL and <code className="rounded bg-gray-100 px-1">Authorization: Bearer YOUR_KEY</code> on every request. Keep the key in your client’s secret storage.</p>
                </div>
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ChatGPT does not accept a manually generated API key for a custom MCP connection. It requires an OAuth sign-in flow, which is not configured for this portal yet.</p>
              <p className="mt-4 text-sm text-gray-600">Try asking: “Show attendance for my class today,” “Report absences for last week,” or “Mark these three students present after showing me the changes.”</p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Your keys <span className="font-normal text-gray-500">({activeKeys.length} active)</span></h2>
              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Loading keys…</div>
              ) : keys.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No keys yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-gray-100">
                  {keys.map((key) => {
                    const expired = new Date(key.expiresAt) <= new Date();
                    const state = key.revokedAt ? 'Revoked' : expired ? 'Expired' : 'Active';
                    return (
                      <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{key.name} <span className="ml-1 text-xs font-normal text-gray-500">{state}</span></p>
                          <p className="text-xs text-gray-500">Created {dateLabel(key.createdAt)} · Expires {dateLabel(key.expiresAt)}{key.lastUsedAt ? ` · Last used ${dateLabel(key.lastUsedAt)}` : ''}</p>
                        </div>
                        {!key.revokedAt && !expired && (
                          <Button variant="outline" size="sm" disabled={revoking === key.id} onClick={() => revokeKey(key)}>
                            {revoking === key.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
