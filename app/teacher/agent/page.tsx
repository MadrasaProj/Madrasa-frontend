import { useEffect, useState } from "react";
import { Bot, Copy, KeyRound, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { createMcpCredential, listMcpCredentials, revokeMcpCredential, teacherMcpUrl, type McpCredential } from "@/lib/teacher-agent";

function ConnectionDetails({ endpoint }: { endpoint: string }) {
  return <section className="rounded-2xl border bg-card p-5">
    <h2 className="font-semibold">Connect an AI assistant</h2>
    <p className="mt-2 text-sm text-muted-foreground">Add this remote MCP URL in ChatGPT or Claude. Choose OAuth when prompted, then sign in to this madrasa and approve access.</p>
    <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/40 p-3"><code className="min-w-0 flex-1 break-all text-xs">{endpoint}</code><button type="button" aria-label="Copy MCP URL" onClick={() => navigator.clipboard.writeText(endpoint)}><Copy className="h-4 w-4" /></button></div>
    <p className="mt-3 text-sm text-muted-foreground">The server exposes read-only teacher tools. Your assistant receives access only to your assigned classes. Use a public HTTPS deployment for hosted assistants.</p>
    <p className="mt-3 text-xs text-muted-foreground">Tools: classes, students, subjects, attendance, homework, diary, ibadah, fees, exams, attendance reports, performance, leave requests, notifications, check-in.</p>
  </section>;
}

function CredentialManager({ clientId, jwt }: { clientId: string; jwt: string }) {
  const [items, setItems] = useState<McpCredential[]>([]);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; listMcpCredentials(clientId, jwt).then((data) => { if (active) setItems(data); }).catch((cause) => { if (active) setError(cause.message); }); return () => { active = false; }; }, [clientId, jwt]);

  async function create() {
    setBusy(true); setError("");
    try {
      const credential = await createMcpCredential(clientId, jwt, name || "Personal token");
      setNewToken(credential.token); setName("");
      setItems(await listMcpCredentials(clientId, jwt));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create token"); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true); setError("");
    try { await revokeMcpCredential(clientId, jwt, id); setItems(await listMcpCredentials(clientId, jwt)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not revoke token"); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border bg-card p-5">
    <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5" /> Credentials</h2>
    <p className="mt-2 text-sm text-muted-foreground">OAuth connections appear here. For clients that accept a custom Bearer header, create a personal token below. Tokens expire after 90 days and can be revoked at any time.</p>
    <div className="mt-4 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Token name" aria-label="Token name" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" /><button type="button" onClick={create} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Generate token</button></div>
    {newToken && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-medium">Copy this token now. It will not be shown again.</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all">{newToken}</code><button type="button" aria-label="Copy token" onClick={() => navigator.clipboard.writeText(newToken)}><Copy className="h-4 w-4" /></button></div></div>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <ul className="mt-5 divide-y">{items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{item.name || (item.kind === "access" ? "OAuth connection" : "Personal token")}</p><p className="text-muted-foreground">{item.kind === "access" ? "OAuth" : "Personal"} · Created {new Date(item.createdAt).toLocaleDateString()} · {item.revokedAt ? "Revoked" : item.expiresAt && new Date(item.expiresAt) < new Date() ? "Expired" : "Active"}</p></div>{!item.revokedAt && <button type="button" onClick={() => revoke(item.id)} disabled={busy} aria-label="Revoke credential" className="rounded-lg p-2 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>}</li>)}</ul>
  </section>;
}

export default function TeacherAgentPage() {
  const { user, accessToken } = useAuthStore();
  const clientId = user?.role === "teacher" ? user.clientId ?? "" : "";
  return <DashboardLayout><main className="mx-auto max-w-3xl space-y-6 p-4 pb-24 md:p-8"><header><div className="flex items-center gap-3"><Bot className="h-8 w-8 text-primary" /><h1 className="text-2xl font-bold">Teacher MCP</h1></div><p className="mt-2 text-muted-foreground">Connect your teaching data to an AI assistant.</p></header>{clientId && accessToken ? <><ConnectionDetails endpoint={teacherMcpUrl(clientId)} /><CredentialManager clientId={clientId} jwt={accessToken} /></> : <p>Sign in as a teacher to manage MCP connections.</p>}</main></DashboardLayout>;
}
