import { apiFetch } from "@/lib/fetch";

const origin = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const base = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";

export function teacherMcpUrl(clientId: string) {
  return `${origin}${base}/${encodeURIComponent(clientId)}/mcp`;
}

const credentialsUrl = (clientId: string) => `${origin}${base}/${encodeURIComponent(clientId)}/mcp-credentials`;

export type McpCredential = { id: string; kind: "personal" | "access"; name: string | null; createdAt: string; expiresAt: string | null; revokedAt: string | null };
export type NewMcpCredential = { id: string; token: string; expiresAt: string };

export const listMcpCredentials = (clientId: string, jwt: string) =>
  apiFetch<McpCredential[]>(credentialsUrl(clientId), jwt);

export const createMcpCredential = (clientId: string, jwt: string, name: string) =>
  apiFetch<NewMcpCredential>(credentialsUrl(clientId), jwt, { method: "POST", body: JSON.stringify({ name }) });

export const revokeMcpCredential = (clientId: string, jwt: string, id: string) =>
  apiFetch<{ revoked: boolean }>(`${credentialsUrl(clientId)}/${encodeURIComponent(id)}`, jwt, { method: "DELETE" });

export const authorizeMcpConnection = (jwt: string, parameters: URLSearchParams) =>
  apiFetch<{ redirect_uri: string }>(`${origin}/oauth/authorize`, jwt, { method: "POST", body: JSON.stringify(Object.fromEntries(parameters)) });
