import { apiFetch } from '@/lib/fetch';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const BASE = `${API_ORIGIN}/api/v2/teacher/mcp-keys`;

export interface TeacherMcpKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedTeacherMcpKey extends TeacherMcpKey {
  key: string;
}

export const getTeacherMcpKeys = (token: string) =>
  apiFetch<TeacherMcpKey[]>(BASE, token);

export const createTeacherMcpKey = (token: string, name: string) =>
  apiFetch<CreatedTeacherMcpKey>(BASE, token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const revokeTeacherMcpKey = (token: string, id: string) =>
  apiFetch<{ revoked: true }>(`${BASE}/${encodeURIComponent(id)}`, token, { method: 'DELETE' });

export const teacherMcpEndpoint = `${API_ORIGIN}/mcp`;
