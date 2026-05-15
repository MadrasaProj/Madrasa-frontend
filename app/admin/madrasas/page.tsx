import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  listClients, listClientPayments, recordClientPayment, updateClient, getClientLogs,
  createClient,
  type ClientListItem, type ClientPayment, type ActivityLogItem,
  type CreateClientDto, type UpdateClientDto,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  Building2, Loader2, LogIn, ChevronDown, ChevronUp, Plus, Activity,
  CheckCircle, XCircle, ClipboardList, X, Pencil, Save, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────────

const isExpired = (d?: string) => !!d && new Date(d) < new Date();
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtCurrency = (n: string | number) => `₹${Number(n).toLocaleString("en-IN")}`;

const STATUS_OPTIONS = ["ACTIVE", "TRIAL", "SUSPENDED", "CANCELLED"] as const;
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  TRIAL: "bg-blue-100 text-blue-700 border-blue-300",
  SUSPENDED: "bg-amber-100 text-amber-700 border-amber-300",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
};

// ── Edit Madrasa Drawer ────────────────────────────────────────────────────────

function EditMadrasaDrawer({
  client,
  token,
  onSaved,
  onClose,
}: {
  client: ClientListItem;
  token: string;
  onSaved: (updated: ClientListItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UpdateClientDto>({
    name: client.name,
    arabicName: client.arabicName ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    status: client.status as UpdateClientDto["status"],
    isLoginEnabled: client.isLoginEnabled,
    attendanceMode: client.attendanceMode as UpdateClientDto["attendanceMode"],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof UpdateClientDto>(k: K, v: UpdateClientDto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const dto: UpdateClientDto = {
        name: form.name?.trim(),
        arabicName: form.arabicName?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        status: form.status,
        isLoginEnabled: form.isLoginEnabled,
        attendanceMode: form.attendanceMode,
      };
      const updated = await updateClient(client.id, dto, token);
      const merged: ClientListItem = { ...client, ...updated };
      setSuccess(true);
      onSaved(merged);
      setTimeout(onClose, 800);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white";
  const labelCls = "text-xs text-gray-500 mb-1.5 block font-medium";
  const sectionCls = "text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Madrasa</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{client.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 pb-6">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Changes saved successfully.
            </div>
          )}

          {/* Basic info */}
          <p className={sectionCls}>Madrasa Info</p>
          <div>
            <label className={labelCls}>Name *</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Madrasa name"
            />
          </div>
          <div>
            <label className={labelCls}>Arabic Name</label>
            <input
              value={form.arabicName ?? ""}
              onChange={(e) => set("arabicName", e.target.value)}
              className={inputCls}
              placeholder="Optional"
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input
                value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Status */}
          <p className={sectionCls}>Account Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => set("status", s)}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left",
                  form.status === s
                    ? STATUS_COLORS[s]
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Settings */}
          <p className={sectionCls}>Settings</p>

          {/* Login toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Login Access</p>
              <p className="text-xs text-gray-400 mt-0.5">Allow users to log in to this madrasa</p>
            </div>
            <button
              onClick={() => set("isLoginEnabled", !form.isLoginEnabled)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0",
                form.isLoginEnabled ? "bg-emerald-500" : "bg-gray-300",
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                form.isLoginEnabled ? "translate-x-6" : "translate-x-0",
              )} />
            </button>
          </div>

          {/* Attendance mode toggle */}
          <div className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-800 mb-2">Attendance Mode</p>
            <div className="flex gap-2">
              {(["CLASS_BASED", "PERIOD_BASED"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => set("attendanceMode", m)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                    form.attendanceMode === m
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {m === "CLASS_BASED" ? "Class Based" : "Period Based"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-60 transition-all"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : success
              ? <><CheckCircle className="w-4 h-4" /> Saved</>
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Client Detail Panel (payments + logs) ─────────────────────────────────────

function ClientDetail({
  client,
  token,
}: {
  client: ClientListItem;
  token: string;
}) {
  const [tab, setTab] = useState<"payments" | "logs">("payments");
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingL, setLoadingL] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    amount: "", paidAt: new Date().toISOString().slice(0, 10),
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    method: "CASH", reference: "", notes: "",
  });

  const loadPayments = useCallback(() => {
    setLoadingP(true);
    listClientPayments(client.id, token)
      .then((r) => setPayments(r.data))
      .catch(() => {})
      .finally(() => setLoadingP(false));
  }, [client.id, token]);

  const loadLogs = useCallback(() => {
    setLoadingL(true);
    getClientLogs(client.id, token)
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoadingL(false));
  }, [client.id, token]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleTabChange = (t: "payments" | "logs") => {
    setTab(t);
    if (t === "logs" && logs.length === 0) loadLogs();
  };

  const handleRecordPayment = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await recordClientPayment(client.id, {
        amount: Number(form.amount),
        paidAt: form.paidAt,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        method: form.method || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      }, token);
      setShowAddPayment(false);
      setForm((f) => ({ ...f, amount: "", reference: "", notes: "" }));
      loadPayments();
    } catch {
      // silent — payment errors shown by lack of new entry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      {/* Subscription status row */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
        Subscription: {fmtDate(client.subscriptionStart)} → {fmtDate(client.subscriptionEnd)}
        {isExpired(client.subscriptionEnd) && (
          <span className="text-red-500 font-semibold">EXPIRED</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["payments", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
              tab === t
                ? "bg-white border border-gray-200 text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600",
            )}
          >
            {t === "payments" ? "Payments" : "Activity Logs"}
          </button>
        ))}
        {tab === "payments" && (
          <button
            onClick={() => setShowAddPayment((s) => !s)}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </button>
        )}
      </div>

      {/* Add payment form */}
      <AnimatePresence>
        {tab === "payments" && showAddPayment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl p-4 border border-emerald-100 mb-3 overflow-hidden"
          >
            <p className="text-xs font-semibold text-gray-600 mb-3">Record Subscription Payment</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (₹) *</label>
                <input type="number" min="0" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="e.g. 2999" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Paid On *</label>
                <input type="date" value={form.paidAt}
                  onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Period Start *</label>
                <input type="date" value={form.periodStart}
                  onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Period End *</label>
                <input type="date" value={form.periodEnd}
                  onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Method</label>
                <select value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                >
                  {["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reference / Receipt #</label>
                <input type="text" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddPayment(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={saving || !form.amount}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Save Payment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments tab */}
      {tab === "payments" && (
        loadingP ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs py-4 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
          </div>
        ) : payments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-emerald-700">{fmtCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.paidAt)} · {p.method ?? "—"}</p>
                  {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-600">{fmtDate(p.periodStart)}</p>
                  <p className="text-xs text-gray-400">to {fmtDate(p.periodEnd)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Logs tab */}
      {tab === "logs" && (
        loadingL ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs py-4 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No activity yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">{log.action}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      {log.actorType}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                    {log.actorName ?? log.actorId.slice(0, 16)} · {new Date(log.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── New Madrasa Drawer ─────────────────────────────────────────────────────────

const emptyForm: CreateClientDto = {
  name: "", slug: "", arabicName: "", city: "", state: "",
  attendanceMode: "CLASS_BASED",
  adminName: "", adminIdentifier: "", adminPassword: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

function NewMadrasaDrawer({
  token,
  onCreated,
  onClose,
}: {
  token: string;
  onCreated: (c: ClientListItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateClientDto>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof CreateClientDto, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name") next.slug = slugify(v);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.adminName || !form.adminIdentifier || !form.adminPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createClient(form, token);
      onCreated(created);
      onClose();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create madrasa.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] overflow-y-auto"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Add New Madrasa</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Madrasa Info</p>
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                className={inputCls} placeholder="e.g. Darul Huda" />
            </div>
            <div>
              <label className={labelCls}>Slug * (URL identifier)</label>
              <input value={form.slug} onChange={(e) => set("slug", e.target.value)}
                className={inputCls} placeholder="e.g. darul-huda" />
            </div>
            <div>
              <label className={labelCls}>Arabic Name</label>
              <input value={form.arabicName} onChange={(e) => set("arabicName", e.target.value)}
                className={inputCls} placeholder="Optional" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input value={form.city} onChange={(e) => set("city", e.target.value)}
                  className={inputCls} placeholder="Optional" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input value={form.state} onChange={(e) => set("state", e.target.value)}
                  className={inputCls} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Attendance Mode</label>
              <div className="flex gap-2">
                {(["CLASS_BASED", "PERIOD_BASED"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, attendanceMode: m }))}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-xl border transition-all",
                      form.attendanceMode === m
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {m === "CLASS_BASED" ? "Class Based" : "Period Based"}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-2">Admin Account</p>
            <div>
              <label className={labelCls}>Admin Name *</label>
              <input value={form.adminName} onChange={(e) => set("adminName", e.target.value)}
                className={inputCls} placeholder="e.g. Muhammad Ali" />
            </div>
            <div>
              <label className={labelCls}>Admin Username *</label>
              <input value={form.adminIdentifier} onChange={(e) => set("adminIdentifier", e.target.value)}
                className={inputCls} placeholder="e.g. admin@darulhuda" />
            </div>
            <div>
              <label className={labelCls}>Admin Password *</label>
              <input type="password" value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)}
                className={inputCls} placeholder="Min 8 characters" />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Madrasa
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminMadrasasPage() {
  const { accessToken, switchToClient } = useAuthStore();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    listClients(accessToken)
      .then((r) => setClients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleEnterClient = (clientId: string, slug: string) => {
    setEntering(clientId);
    switchToClient(clientId, slug);
    navigate(`/m/${slug}/admin`);
  };

  const handleSaved = (updated: ClientListItem) => {
    setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Madrasas"
        icon={Building2}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4" /> New Madrasa
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading madrasas...
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No madrasas registered yet.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all"
          >
            Add First Madrasa
          </button>
        </div>
      ) : (
        <div className="space-y-2 pb-20">
          {clients.map((client) => {
            const expired = isExpired(client.subscriptionEnd);
            const isOpen = expanded === client.id;
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                {/* Client row */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                      <span className="text-xs font-mono text-gray-400">{client.slug}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        client.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
                          : client.status === "TRIAL" ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500",
                      )}>
                        {client.status}
                      </span>
                      {expired && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{client._count.students} students</span>
                      <span>{client._count.users} staff</span>
                      {client.currentAcademicYear && <span>{client.currentAcademicYear.name}</span>}
                      {client.city && <span>{client.city}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.isLoginEnabled
                        ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium"><CheckCircle className="w-3 h-3" /> Login on</span>
                        : <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><XCircle className="w-3 h-3" /> Login off</span>}
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className="text-[10px] text-gray-400">
                        {client.attendanceMode === "PERIOD_BASED" ? "Period-based" : "Class-based"} attendance
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                      title="Edit madrasa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEnterClient(client.id, client.slug)}
                      disabled={entering === client.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-all"
                    >
                      {entering === client.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <LogIn className="w-3.5 h-3.5" />}
                      Enter
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : client.id)}
                      className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: payments + logs */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-50"
                    >
                      <div className="px-4 pb-4">
                        <ClientDetail client={client} token={accessToken!} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit drawer */}
      <AnimatePresence>
        {editingClient && (
          <EditMadrasaDrawer
            key={editingClient.id}
            client={editingClient}
            token={accessToken!}
            onSaved={(updated) => { handleSaved(updated); }}
            onClose={() => setEditingClient(null)}
          />
        )}
      </AnimatePresence>

      {/* New madrasa drawer */}
      <AnimatePresence>
        {showNew && (
          <NewMadrasaDrawer
            token={accessToken!}
            onCreated={(c) => setClients((prev) => [c, ...prev])}
            onClose={() => setShowNew(false)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
