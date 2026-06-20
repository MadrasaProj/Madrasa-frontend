"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getFeeTypes, createFeeType, generatePayments,
  type FeeType, type CreateFeeTypePayload,
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  CreditCard, Plus, Loader2, Zap, X, RefreshCw, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminFeeTypesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newFee, setNewFee] = useState<Partial<CreateFeeTypePayload>>({
    kind: "ONE_TIME",
    amount: 0,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [types, cls] = await Promise.all([
        getFeeTypes(cid, token, user?.defaultAcademicYearId ?? undefined),
        getAllClasses(cid, token),
      ]);
      setFeeTypes(types);
      setClasses(cls);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token, user?.defaultAcademicYearId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newFee.name || !newFee.amount) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createFeeType(cid, token, newFee as CreateFeeTypePayload);
      setShowCreate(false);
      setNewFee({ kind: "ONE_TIME", amount: 0 });
      load();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (ft: FeeType) => {
    setGenerating(ft.id);
    setError(null);
    try {
      const res = await generatePayments(cid, token, {
        feeTypeId: ft.id,
        academicYearId: user?.defaultAcademicYearId ?? undefined,
      });
      alert(`Generated ${res.generated} payment records${res.message ? ` — ${res.message}` : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Fee Type Management"
        subtitle="Create, manage, and generate payments for fee types"
        icon={CreditCard}
        action={
          <div className="flex items-center gap-2">
            <a
              href="/admin/fees"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Fees
            </a>
            <button
              onClick={() => { setShowCreate(true); setCreateError(null); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> New Fee Type
            </button>
          </div>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl w-full" />
          ))}
        </div>
      ) : feeTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No fee types yet. Create one to start collecting.</p>
          <button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Fee Type
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden md:table-cell">Classes</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hidden lg:table-cell">Records</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {feeTypes.map((ft) => {
                const targetClasses = classes.filter((c) => (ft.targetClassIds ?? []).includes(c.id));
                return (
                  <tr key={ft.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{ft.name}</p>
                      {ft.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]">{ft.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">₹{Number(ft.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-600">
                        {ft.kind === "RECURRING" ? `${ft.frequency ?? "recurring"}` : "one-time"}
                        {ft.dueDay ? ` · day ${ft.dueDay}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {targetClasses.length > 0 ? targetClasses.map((c) => (
                          <span key={c.id} className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-lg">{c.name}</span>
                        )) : <span className="text-[10px] text-gray-400">All</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{ft._count?.payments ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold",
                        ft.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                      )}>
                        {ft.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleGenerate(ft)}
                        disabled={generating === ft.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-semibold hover:bg-amber-100 transition-all disabled:opacity-50"
                      >
                        {generating === ft.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Generate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create fee type modal ── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              key="modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowCreate(false)}
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <p className="font-bold text-gray-900">New Fee Type</p>
                  <button onClick={() => setShowCreate(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {createError && (
                    <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{createError}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name *</label>
                    <input
                      type="text" value={newFee.name ?? ""}
                      placeholder="e.g. Monthly Fee, SKSBV Fund"
                      onChange={(e) => setNewFee((n) => ({ ...n, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount (₹) *</label>
                    <input
                      type="number" value={newFee.amount ?? ""} placeholder="500"
                      onChange={(e) => setNewFee((n) => ({ ...n, amount: Number(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description (optional)</label>
                    <input
                      type="text" value={newFee.description ?? ""} placeholder="Details…"
                      onChange={(e) => setNewFee((n) => ({ ...n, description: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ONE_TIME", "RECURRING"] as const).map((k) => (
                        <label
                          key={k}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                            newFee.kind === k
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-50 text-gray-700",
                          )}
                        >
                          <input
                            type="radio" className="sr-only"
                            checked={newFee.kind === k}
                            onChange={() => setNewFee((n) => ({ ...n, kind: k }))}
                          />
                          {k === "ONE_TIME" ? "One Time" : "Recurring"}
                        </label>
                      ))}
                    </div>
                  </div>
                  {newFee.kind === "RECURRING" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Frequency</label>
                        <select
                          value={newFee.frequency ?? "monthly"}
                          onChange={(e) => setNewFee((n) => ({ ...n, frequency: e.target.value }))}
                          className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm"
                        >
                          {["monthly", "quarterly", "yearly"].map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Due Day</label>
                        <input
                          type="number" min={1} max={31} placeholder="5"
                          value={newFee.dueDay ?? ""}
                          onChange={(e) => setNewFee((n) => ({ ...n, dueDay: Number(e.target.value) }))}
                          className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                  {classes.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Target Classes (leave empty = all classes)</label>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c) => {
                          const selected = (newFee.targetClassIds ?? []).includes(c.id);
                          return (
                            <button
                              key={c.id} type="button"
                              onClick={() =>
                                setNewFee((n) => ({
                                  ...n,
                                  targetClassIds: selected
                                    ? (n.targetClassIds ?? []).filter((id) => id !== c.id)
                                    : [...(n.targetClassIds ?? []), c.id],
                                }))
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                                selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600",
                              )}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newFee.name || !newFee.amount}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Fee Type
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
