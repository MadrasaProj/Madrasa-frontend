"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTenantPath } from "@/hooks/useTenantPath";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getFeeTypes, createFeeType, updateFeeType, deleteFeeType, generatePayments,
  type FeeType, type CreateFeeTypePayload,
} from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  CreditCard, Plus, Loader2, Zap, ArrowLeft, Pencil, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminFeeTypesPage() {
  const tenantPath = useTenantPath();
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
    isDonation: false,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [generating, setGenerating] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeType | null>(null);
  const [editFee, setEditFee] = useState<Partial<CreateFeeTypePayload & { status?: string }>>({});
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FeeType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    if (!newFee.name || (!newFee.isDonation && !newFee.amount)) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createFeeType(cid, token, newFee as CreateFeeTypePayload);
      toast.success("Fee type created successfully");
      setShowCreate(false);
      setNewFee({ kind: "ONE_TIME", amount: 0, isDonation: false });
      load();
    } catch (e) {
      setCreateError((e as Error).message);
      toast.error((e as Error).message || "Failed to create fee type");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (ft: FeeType) => {
    setEditingFee(ft);
    setEditFee({
      name: ft.name,
      description: ft.description ?? undefined,
      amount: Number(ft.amount),
      isDonation: ft.isDonation,
      kind: ft.kind,
      frequency: ft.frequency ?? undefined,
      dueDay: ft.dueDay ?? undefined,
      targetClassIds: ft.targetClassIds ?? undefined,
      status: ft.status,
    });
    setEditError(null);
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingFee) return;
    setUpdating(true);
    setEditError(null);
    try {
      await updateFeeType(cid, token, editingFee.id, editFee);
      toast.success("Fee type updated successfully");
      setShowEdit(false);
      setEditingFee(null);
      load();
    } catch (e) {
      setEditError((e as Error).message);
      toast.error((e as Error).message || "Failed to update fee type");
    } finally {
      setUpdating(false);
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
      toast.success(`Generated ${res.generated} payment records${res.message ? ` — ${res.message}` : ""}`);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message || "Failed to generate payments");
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFeeType(cid, token, deleteTarget.id);
      setFeeTypes((current) => current.filter((ft) => ft.id !== deleteTarget.id));
      toast.success("Fee type deleted successfully");
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError((e as Error).message);
      toast.error((e as Error).message || "Failed to delete fee type");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Fee Type Management" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <Link to={tenantPath("/admin/fees")} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"><ArrowLeft className="size-4" /> All fees</Link>
        <Button type="button" onClick={() => { setShowCreate(true); setCreateError(null); }}><Plus className="size-4" /> New fee type</Button>
      </div>

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
          <Button
            onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Fee Type
          </Button>
        </div>
      ) : (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">All fee types <span className="font-normal text-gray-500">({feeTypes.length})</span></h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {feeTypes.map((feeType) => {
              const targetClasses = classes.filter((item) => (feeType.targetClassIds ?? []).includes(item.id));
              return (
                <div key={feeType.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{feeType.name}</span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {feeType.kind === "RECURRING" ? feeType.frequency ?? "Recurring" : "One time"}
                      {" · "}{targetClasses.length ? targetClasses.map((item) => item.name).join(", ") : "All classes"}
                      {" · "}{feeType._count?.payments ?? 0} records
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-gray-950">{feeType.isDonation ? "Variable" : `₹${Number(feeType.amount).toLocaleString("en-IN")}`}</span>
                    <span className={cn("mt-1 inline-block rounded-lg px-2 py-0.5 text-xs font-medium", feeType.status === "ACTIVE" ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-500")}>{feeType.status}</span>
                  </span>
                  <div className="flex w-full justify-end gap-1 sm:w-auto">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${feeType.name}`} onClick={() => handleEdit(feeType)}><Pencil className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Generate payments for ${feeType.name}`} disabled={generating === feeType.id} onClick={() => handleGenerate(feeType)}>{generating === feeType.id ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}</Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${feeType.name}`} onClick={() => { setDeleteTarget(feeType); setDeleteError(null); }}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ResponsivePopover open={showCreate} onOpenChange={setShowCreate} title="New fee type" fullHeight>
        <div className="mx-auto w-full max-w-xl pb-5">
                <div className="px-5 py-4 space-y-4">
                  {createError && (
                    <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{createError}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name *</label>
                    <Input
                      type="text" value={newFee.name ?? ""}
                      placeholder="e.g. Monthly Fee, SKSBV Fund"
                      onChange={(e) => setNewFee((n) => ({ ...n, name: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount (₹) {newFee.isDonation ? "(not applicable)" : "*"}</label>
                    <Input
                      type="number" value={newFee.isDonation ? "" : (newFee.amount ?? "")} placeholder={newFee.isDonation ? "Entered during collection" : "500"}
                      disabled={newFee.isDonation}
                      onChange={(e) => setNewFee((n) => ({ ...n, amount: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                    <Checkbox checked={!!newFee.isDonation} onCheckedChange={(checked) => setNewFee((n) => ({ ...n, isDonation: checked === true, amount: checked === true ? 0 : (n.amount ?? 0) }))} />
                    <span><span className="block text-sm font-semibold text-amber-800">This is a donation</span><span className="block text-[11px] text-amber-700">No fixed amount; enter it when marking payment.</span></span>
                  </label>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description (optional)</label>
                    <Input
                      type="text" value={newFee.description ?? ""} placeholder="Details…"
                      onChange={(e) => setNewFee((n) => ({ ...n, description: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
                    <Tabs value={newFee.kind ?? "ONE_TIME"} onValueChange={(value) => setNewFee((current) => ({ ...current, kind: value as "ONE_TIME" | "RECURRING" }))}>
                      <TabsList className="grid w-full grid-cols-2 shadow-none">
                        <TabsTrigger value="ONE_TIME" className="shadow-none!">One time</TabsTrigger>
                        <TabsTrigger value="RECURRING" className="shadow-none!">Recurring</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {newFee.kind === "RECURRING" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Frequency</label>
                        <DrawerSelector title="Frequency" value={newFee.frequency ?? "monthly"} options={["monthly", "quarterly", "yearly"].map((frequency) => ({ value: frequency, label: frequency.charAt(0).toUpperCase() + frequency.slice(1) }))} onChange={(value) => setNewFee((current) => ({ ...current, frequency: value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Due Day</label>
                        <Input
                          type="number" min={1} max={31} placeholder="5"
                          value={newFee.dueDay ?? ""}
                          onChange={(e) => setNewFee((n) => ({ ...n, dueDay: Number(e.target.value) }))}
                          className="w-full"
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
                            <Button
                              key={c.id} type="button" variant="outline" aria-pressed={selected}
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
                                selected ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600",
                              )}
                            >
                              {c.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newFee.name || (!newFee.isDonation && !newFee.amount)}
                    className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Fee Type
                  </Button>
                </div>
        </div>
      </ResponsivePopover>

      <ResponsivePopover open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }} title="Delete fee type" description="Existing payment records will be preserved">
        {deleteTarget && (
          <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
            <p className="text-sm text-gray-600">Remove <strong className="text-gray-900">{deleteTarget.name}</strong> from the active fee types?</p>
            {deleteError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteTarget(null)}>Keep</Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}><Trash2 className="size-4" /> Delete</Button>
            </div>
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover open={showEdit && editingFee !== null} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditingFee(null); } }} title={editingFee ? `Edit ${editingFee.name}` : "Edit fee type"} fullHeight>
        <div className="mx-auto w-full max-w-xl pb-5">
                <div className="px-5 py-4 space-y-4">
                  {editError && (
                    <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{editError}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name *</label>
                    <Input
                      type="text" value={editFee.name ?? ""}
                      placeholder="e.g. Monthly Fee, SKSBV Fund"
                      onChange={(e) => setEditFee((n) => ({ ...n, name: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Amount (₹) {editFee.isDonation ? "(not applicable)" : "*"}</label>
                    <Input
                      type="number" value={editFee.isDonation ? "" : (editFee.amount ?? "")} placeholder={editFee.isDonation ? "Entered during collection" : "500"} disabled={editFee.isDonation}
                      onChange={(e) => setEditFee((n) => ({ ...n, amount: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                    <Checkbox checked={!!editFee.isDonation} onCheckedChange={(checked) => setEditFee((n) => ({ ...n, isDonation: checked === true, amount: checked === true ? 0 : (n.amount ?? 0) }))} />
                    <span><span className="block text-sm font-semibold text-amber-800">This is a donation</span><span className="block text-[11px] text-amber-700">No fixed amount; enter it when marking payment.</span></span>
                  </label>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description (optional)</label>
                    <Input
                      type="text" value={editFee.description ?? ""} placeholder="Details…"
                      onChange={(e) => setEditFee((n) => ({ ...n, description: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
                    <Tabs value={editFee.kind ?? "ONE_TIME"} onValueChange={(value) => setEditFee((current) => ({ ...current, kind: value as "ONE_TIME" | "RECURRING" }))}>
                      <TabsList className="grid w-full grid-cols-2 shadow-none">
                        <TabsTrigger value="ONE_TIME" className="shadow-none!">One time</TabsTrigger>
                        <TabsTrigger value="RECURRING" className="shadow-none!">Recurring</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {editFee.kind === "RECURRING" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Frequency</label>
                        <DrawerSelector title="Frequency" value={editFee.frequency ?? "monthly"} options={["monthly", "quarterly", "yearly"].map((frequency) => ({ value: frequency, label: frequency.charAt(0).toUpperCase() + frequency.slice(1) }))} onChange={(value) => setEditFee((current) => ({ ...current, frequency: value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Due Day</label>
                        <Input
                          type="number" min={1} max={31} placeholder="5"
                          value={editFee.dueDay ?? ""}
                          onChange={(e) => setEditFee((n) => ({ ...n, dueDay: Number(e.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Status</label>
                    <Tabs value={editFee.status ?? "ACTIVE"} onValueChange={(value) => setEditFee((current) => ({ ...current, status: value }))}>
                      <TabsList className="grid w-full grid-cols-2 shadow-none">
                        <TabsTrigger value="ACTIVE" className="shadow-none!">Active</TabsTrigger>
                        <TabsTrigger value="INACTIVE" className="shadow-none!">Inactive</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {classes.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Target Classes (leave empty = all classes)</label>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c) => {
                          const selected = (editFee.targetClassIds ?? []).includes(c.id);
                          return (
                            <Button
                              key={c.id} type="button" variant="outline" aria-pressed={selected}
                              onClick={() =>
                                setEditFee((n) => ({
                                  ...n,
                                  targetClassIds: selected
                                    ? (n.targetClassIds ?? []).filter((id) => id !== c.id)
                                    : [...(n.targetClassIds ?? []), c.id],
                                }))
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                                selected ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600",
                              )}
                            >
                              {c.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <Button
                    onClick={handleUpdate}
                    disabled={updating || !editFee.name || (!editFee.isDonation && !editFee.amount)}
                    className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                    Update Fee Type
                  </Button>
                </div>
        </div>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
