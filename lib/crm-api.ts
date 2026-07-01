import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

function getJson<T>(path: string, token: string): Promise<T> {
  return apiFetch<T>(`${API_BASE}${path}`, token);
}

function mutateJson<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  return apiFetch<T>(`${API_BASE}${path}`, token, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Dashboard Metrics & Daily Operations ──────────────────────────────────────

export interface GlobalMetrics {
  totalLeads: number;
  activeTrials: number;
  activeMadrasas: number;
  openTickets: number;
  revenueThisMonth: number;
  mrr: number;
  arr: number;
  conversionRate: number;
}

export interface DailyOperations {
  followUpsToday: Array<{
    id: string;
    name: string;
    place: string;
    status: string;
    nextFollowUpDate?: string;
  }>;
  missedFollowUps: Array<{
    id: string;
    name: string;
    place: string;
    status: string;
    nextFollowUpDate?: string;
  }>;
  tasksToday: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    dueDate: string;
    lead?: { name: string };
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    dueDate: string;
    lead?: { name: string };
  }>;
  activeTickets: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    slaBreached: boolean;
    client: { name: string };
  }>;
  criticalCustomers: Array<{
    id: string;
    riskReason?: string;
    client: { name: string };
  }>;
}

export function getGlobalMetrics(token: string) {
  return getJson<GlobalMetrics>("/crm/metrics", token);
}

export function getDailyOperations(token: string) {
  return getJson<DailyOperations>("/crm/daily-operations", token);
}

// ── Leads CRM ─────────────────────────────────────────────────────────────────

export interface LeadContact {
  id?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  role: string;
  isPrimary?: boolean;
}

export interface LeadContributor {
  id?: string;
  userId: string;
  percentage: number;
  notes?: string;
  role: string;
  user?: { name: string };
}

export interface LeadListItem {
  id: string;
  name: string;
  type: string;
  district: string;
  place: string;
  address?: string;
  clientId?: string;
  studentCount: number;
  teacherCount: number;
  existingSoftware?: string;
  source: string;
  status: string;
  score: string;
  nextFollowUpDate?: string;
  commissionPercentage?: number;
  contacts: LeadContact[];
  contributors: LeadContributor[];
  createdAt: string;
}

export interface LeadDetail extends LeadListItem {
  timeline: Array<{
    id: string;
    type: string;
    notes: string;
    createdAt: string;
    followUpDate?: string;
    user: { name: string };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    priority: string;
    status: string;
    dueDate: string;
    assignedUser: { name: string };
  }>;
  demos: Array<{
    id: string;
    date: string;
    type: string;
    attendees: string[];
    notes?: string;
    outcome: string;
    recordingUrl?: string;
  }>;
  trialMonitoring?: {
    id: string;
    loginFrequency: number;
    activeTeachers: number;
    attendanceUsage: boolean;
    feeUsage: boolean;
    examUsage: boolean;
    parentUsage: boolean;
    healthScore: string;
    riskStatus: string;
  };
  onboardingProject?: {
    id: string;
    progress: number;
    status: string;
    checklist: Array<{
      id: string;
      stage: string;
      title: string;
      description?: string;
      status: string;
    }>;
  };
  customerSuccess?: {
    id: string;
    healthScore: string;
    riskAlertActive: boolean;
    riskReason?: string;
  };
  renewalProfile?: {
    id: string;
    expiryDate: string;
    daysRemaining: number;
    amount: string;
    status: string;
  };
}

export function listLeads(token: string, params: { status?: string; search?: string; type?: string } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.type) q.set("type", params.type);
  const qs = q.toString() ? `?${q}` : "";
  return getJson<LeadListItem[]>(`/crm/leads${qs}`, token);
}

export function getLead(id: string, token: string) {
  return getJson<LeadDetail>(`/crm/leads/${id}`, token);
}

export function createLead(dto: Partial<LeadListItem>, token: string) {
  return mutateJson<LeadListItem>("POST", "/crm/leads", dto, token);
}

export function updateLead(id: string, dto: Partial<LeadListItem>, token: string) {
  return mutateJson<LeadListItem>("PATCH", `/crm/leads/${id}`, dto, token);
}

export function deleteLead(id: string, token: string) {
  return mutateJson<{ success: boolean }>("DELETE", `/crm/leads/${id}`, null, token);
}

// ── Activities & Demo & Trial ────────────────────────────────────────────────

export function logActivity(leadId: string, dto: { type: string; notes: string; followUpDate?: string }, token: string) {
  return mutateJson<any>("POST", `/crm/leads/${leadId}/activity`, dto, token);
}

export function scheduleDemo(leadId: string, dto: { date: string; type: string; attendees: string[]; notes?: string; outcome: string; recordingUrl?: string }, token: string) {
  return mutateJson<any>("POST", `/crm/leads/${leadId}/demo`, dto, token);
}

export function provisionTrial(leadId: string, token: string) {
  return mutateJson<any>("POST", `/crm/leads/${leadId}/trial`, null, token);
}

export function convertLead(leadId: string, dto: { subdomain: string; adminName: string; adminIdentifier: string; adminPassword: string; amountPaid: number; commissionPercentage?: number }, token: string) {
  return mutateJson<any>("POST", `/crm/leads/${leadId}/convert`, dto, token);
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  reminderDate?: string;
  completionNotes?: string;
  lead?: { id: string; name: string };
  client?: { id: string; name: string };
  assignedUser: { id: string; name: string };
}

export function listTasks(token: string, status?: string) {
  const path = status ? `/crm/tasks?status=${status}` : "/crm/tasks";
  return getJson<TaskItem[]>(path, token);
}

export function createTask(dto: Partial<TaskItem>, token: string) {
  return mutateJson<TaskItem>("POST", "/crm/tasks", dto, token);
}

export function updateTask(id: string, dto: Partial<TaskItem>, token: string) {
  return mutateJson<TaskItem>("PATCH", `/crm/tasks/${id}`, dto, token);
}

// ── Support Tickets ───────────────────────────────────────────────────────────

export interface TicketItem {
  id: string;
  clientId: string;
  leadId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  slaBreached: boolean;
  client?: { name: string };
}

export function createTicket(dto: { clientId: string; leadId?: string; title: string; description: string; category: string; priority: string }, token: string) {
  return mutateJson<TicketItem>("POST", "/crm/support/tickets", dto, token);
}

export function replyToTicket(ticketId: string, content: string, token: string) {
  return mutateJson<any>("POST", `/crm/support/tickets/${ticketId}/replies`, { content }, token);
}

export function updateTicketStatus(ticketId: string, status: string, token: string) {
  return mutateJson<any>("PATCH", `/crm/support/tickets/${ticketId}/status`, { status }, token);
}

export function searchKb(q: string, token: string) {
  return getJson<any[]>(`/crm/support/kb/search?q=${encodeURIComponent(q)}`, token);
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export function updateOnboardingItem(itemId: string, status: string, token: string) {
  return mutateJson<any>("PATCH", `/crm/onboarding/items/${itemId}`, { status }, token);
}

// ── Commissions ───────────────────────────────────────────────────────────────

export interface CommissionRecord {
  id: string;
  lead?: { name: string };
  client: { name: string };
  user: { name: string };
  calculatedOnAmount: string;
  percentage: string;
  amount: string;
  status: string;
  paymentStatus: string;
  paidDate?: string;
  period: string;
  flatBonus?: string;
}

export interface DistrictAllowanceItem {
  districtId: string;
  districtName: string;
  headUserName: string;
  madrasaCount: number;
  threshold: number;
  rate: number;
  payout: number;
}

export interface CommissionsResponse {
  records: CommissionRecord[];
  allowances: DistrictAllowanceItem[];
}

export function getCommissions(token: string) {
  return getJson<CommissionsResponse>("/crm/commissions", token);
}

export function payCommission(id: string, token: string) {
  return mutateJson<any>("POST", `/crm/commissions/${id}/pay`, null, token);
}

export function runChurnCheck(token: string) {
  return mutateJson<any>("POST", "/crm/churn/check", null, token);
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export function getCrmSettings(token: string) {
  return getJson<SystemSetting[]>("/crm/settings", token);
}

export function updateCrmSettings(settings: { key: string; value: string }[], token: string) {
  return mutateJson<SystemSetting[]>("PATCH", "/crm/settings", { settings }, token);
}

// ── Districts ─────────────────────────────────────────────────────────────────
export interface DistrictItem {
  id: string;
  name: string;
  headUserId?: string;
  headUser?: { id: string; name: string; username: string };
  createdAt: string;
}

export function listDistricts(token: string) {
  return getJson<DistrictItem[]>("/crm/districts", token);
}

export function createDistrict(dto: { name: string; headUserId?: string }, token: string) {
  return mutateJson<DistrictItem>("POST", "/crm/districts", dto, token);
}

export function updateDistrict(id: string, dto: { name?: string; headUserId?: string | null }, token: string) {
  return mutateJson<DistrictItem>("PATCH", `/crm/districts/${id}`, dto, token);
}

export function deleteDistrict(id: string, token: string) {
  return mutateJson<any>("DELETE", `/crm/districts/${id}`, null, token);
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export interface ExpenseItem {
  id: string;
  title: string;
  amount: string;
  category: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedBy: { id: string; name: string; username: string };
  approvedBy?: { id: string; name: string; username: string };
  approvedAt?: string;
  createdAt: string;
}

export function listExpenses(token: string) {
  return getJson<ExpenseItem[]>(`/crm/expenses`, token);
}

export function createExpense(dto: { title: string; amount: number; category: string; description?: string }, token: string) {
  return mutateJson<ExpenseItem>("POST", "/crm/expenses", dto, token);
}

export function approveExpense(id: string, token: string) {
  return mutateJson<ExpenseItem>("PATCH", `/crm/expenses/${id}/approve`, null, token);
}

export function rejectExpense(id: string, token: string) {
  return mutateJson<ExpenseItem>("PATCH", `/crm/expenses/${id}/reject`, null, token);
}

export interface InternalUserItem {
  id: string;
  name: string;
  username: string;
  role: string;
}

export function listInternalUsers(token: string) {
  return getJson<InternalUserItem[]>("/crm/internal-users", token);
}
