import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;

export interface ClientConfig {
  id: string;
  slug?: string | null;
  name: string;
  arabicName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  timezone?: string | null;
  language?: string | null;
  currency?: string | null;
  attendanceMode?: "CLASS_BASED" | "PERIOD_BASED";
  principalName?: string | null;
  principalPhone?: string | null;
  principalEmail?: string | null;
  establishedYear?: number | null;
}

export const getClientConfig = (clientId: string, token: string) =>
  apiFetch<ClientConfig>(`${V2_BASE}/${clientId}/config`, token);

export const updateClientConfig = (
  clientId: string, token: string,
  data: Partial<Omit<ClientConfig, "id">>,
) =>
  apiFetch<ClientConfig>(`${V2_BASE}/${clientId}/config`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
