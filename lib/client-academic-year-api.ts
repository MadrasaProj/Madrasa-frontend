import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";

export function getClientCurrentAcademicYearId(clientId: string, token: string, signal?: AbortSignal) {
  return apiFetch<{ currentAcademicYearId: string | null }>(
    `${API_ORIGIN}/api/client/${clientId}`,
    token,
    { signal },
  ).then((client) => client.currentAcademicYearId ?? "");
}
