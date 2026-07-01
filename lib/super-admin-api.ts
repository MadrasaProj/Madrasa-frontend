import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

function getJson<T>(path: string, token: string): Promise<T> {
  return apiFetch<T>(`${API_BASE}${path}`, token);
}

function mutateJson<T>(
  method: "POST" | "PATCH" | "PUT",
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  return apiFetch<T>(`${API_BASE}${path}`, token, {
    method,
    body: JSON.stringify(body),
  });
}

// ── Clients ───────────────────────────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  arabicName?: string;
  city?: string;
  state?: string;
  status: string;
  isLoginEnabled: boolean;
  attendanceMode: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  lastLoginAt?: string;
  createdAt: string;
  currentAcademicYear?: { id: string; name: string } | null;
  loginEmail?: string;
  loginPhone?: string;
  _count: { users: number; students: number };
}

export function listClients(token: string) {
  return getJson<{ data: ClientListItem[]; total: number }>("/super-admin/clients", token);
}

export interface UpdateClientDto {
  name?: string;
  arabicName?: string;
  city?: string;
  state?: string;
  status?: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";
  isLoginEnabled?: boolean;
  attendanceMode?: "CLASS_BASED" | "PERIOD_BASED";
  adminIdentifier?: string;
  password?: string;
  committieUsername?: string;
  committiePassword?: string;
  classLevels?: number[];
  divisions?: Record<string, string[]>;
}

export function updateClient(clientId: string, dto: UpdateClientDto, token: string) {
  return mutateJson<Partial<ClientListItem>>("PATCH", `/super-admin/clients/${clientId}`, dto, token);
}

// ── Subscription Payments ────────────────────────────────────────────────────

export interface ClientPayment {
  id: string;
  clientId: string;
  amount: string;    // Decimal comes as string from Prisma JSON
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  method?: string;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  amount: number;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  method?: string;
  reference?: string;
  notes?: string;
}

export function listClientPayments(clientId: string, token: string) {
  return getJson<{ data: ClientPayment[]; total: number }>(
    `/super-admin/clients/${clientId}/payments`,
    token,
  );
}

export function recordClientPayment(clientId: string, dto: CreatePaymentDto, token: string) {
  return mutateJson<ClientPayment>("POST", `/super-admin/clients/${clientId}/payments`, dto, token);
}

// ── Activity Logs ─────────────────────────────────────────────────────────────

export interface ActivityLogItem {
  id: string;
  clientId: string;
  actorId: string;
  actorName?: string;
  actorType: string;
  action: string;
  resource: string;
  resourceId?: string;
  meta?: unknown;
  ip?: string;
  createdAt: string;
}

export function getClientLogs(clientId: string, token: string, skip = 0, take = 100) {
  return getJson<{ data: ActivityLogItem[]; total: number }>(
    `/super-admin/clients/${clientId}/logs?skip=${skip}&take=${take}`,
    token,
  );
}

function deleteJson(path: string, token: string): Promise<void> {
  return apiFetch<void>(`${API_BASE}${path}`, token, { method: "DELETE" });
}

// ── Super Admin Users ─────────────────────────────────────────────────────────

export interface SuperAdminUser {
  id: string;
  name: string;
  identifier: string;
  role?: string;
  isPrimary: boolean;
  createdAt: string;
}

export function listSuperAdminUsers(token: string) {
  return getJson<{ data: SuperAdminUser[]; total: number }>("/super-admin/users", token);
}

export function createSuperAdminUser(
  dto: { name: string; identifier: string; password: string; role?: string },
  token: string,
) {
  return mutateJson<SuperAdminUser>("POST", "/super-admin/users", dto, token);
}

export function updateSuperAdminUser(
  userId: string,
  dto: { name?: string; password?: string; role?: string },
  token: string,
) {
  return mutateJson<SuperAdminUser>("PATCH", `/super-admin/users/${userId}`, dto, token);
}

export function deleteSuperAdminUser(userId: string, token: string) {
  return deleteJson(`/super-admin/users/${userId}`, token);
}

// ── Create Madrasa ────────────────────────────────────────────────────────────

export interface CreateClientDto {
  name: string;
  slug: string;
  arabicName?: string;
  city?: string;
  state?: string;
  attendanceMode?: "CLASS_BASED" | "PERIOD_BASED";
  adminName: string;
  adminIdentifier: string;
  adminPassword: string;
  committieUsername?: string;
  committiePassword?: string;
  status?: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";
  isLoginEnabled?: boolean;
  classLevels?: number[];
  divisions?: Record<string, string[]>;
}

export function createClient(dto: CreateClientDto, token: string) {
  return mutateJson<ClientListItem>("POST", "/super-admin/clients", dto, token);
}

// ── Platform Report ───────────────────────────────────────────────────────────

export interface PlatformStats {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  suspendedClients: number;
  totalStudents: number;
  totalStaff: number;
  totalRevenue: number;
  clientSummaries: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    students: number;
    staff: number;
    lastLoginAt?: string;
    subscriptionEnd?: string;
  }>;
}

export function getPlatformStats(token: string) {
  return getJson<PlatformStats>("/super-admin/reports/platform", token);
}

// ── Profile Update (all user types) ──────────────────────────────────────────

export interface UpdateProfileDto {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export function updateProfile(token: string, dto: UpdateProfileDto) {
  return mutateJson<{ id: string; name: string }>("PATCH", "/auth/profile", dto, token);
}

// Client-scoped log (for admin/committee viewing own logs)
export function getActivityLogs(
  clientId: string,
  token: string,
  params: { actorType?: string; action?: string; skip?: number; take?: number } = {},
) {
  const q = new URLSearchParams();
  if (params.actorType) q.set("actorType", params.actorType);
  if (params.action) q.set("action", params.action);
  if (params.skip) q.set("skip", String(params.skip));
  if (params.take) q.set("take", String(params.take));
  const qs = q.toString() ? `?${q}` : "";
  return getJson<{ data: ActivityLogItem[]; total: number }>(
    `/${clientId}/reports/activity-logs${qs}`,
    token,
  );
}
