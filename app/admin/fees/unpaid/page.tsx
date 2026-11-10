import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { getPayments, updatePayment, type FeePayment, type FeePaymentStatus } from "@/lib/fees-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { useTenantPath } from "@/hooks/useTenantPath";
import { Link } from "react-router-dom";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

export default function AdminFeesUnpaidPage() {
  const tenantPath = useTenantPath();
  const { user, accessToken, activeClientId } = useAuthStore();
  const [payments, setPayments]     = useState<FeePayment[]>([]);
  const [total, setTotal]           = useState(0);
  const [skip, setSkip]             = useState(0);
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [classes, setClasses]       = useState<ClassRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Quick-record state
  const [recording, setRecording]   = useState<string | null>(null); // paymentId
  const [method, setMethod]         = useState("CASH");
  const [reference, setReference]   = useState("");
  const [saving, setSaving]         = useState(false);

  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();
    getAllClasses(cid, token, ac.signal).then(setClasses).catch(() => {});
    return () => ac.abort();
  }, [cid, token]);

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const res = await getPayments(cid, token, {
        status: filterStatus as FeePaymentStatus || undefined,
        classId: filterClass || undefined,
        skip, take: 30,
      });
      setPayments(res.payments);
      setTotal(res.total);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, filterStatus, filterClass, skip]);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (p: FeePayment) => {
    setSaving(true);
    try {
      await updatePayment(cid, token, p.id, {
        paidAmount: Number(p.dueAmount),
        method: method as any,
        reference: reference || undefined,
        status: "PAID",
        paidAt: new Date().toISOString(),
      });
      toast.success("Payment recorded successfully");
      setRecording(null);
      setReference("");
      load();
    } catch (err) { toast.error((err as Error).message || "Failed to record payment"); }
    finally { setSaving(false); }
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    PARTIAL: "bg-blue-50 text-blue-700",
    OVERDUE: "bg-red-50 text-red-700",
  };

  const recordingPayment = payments.find((payment) => payment.id === recording) ?? null;

  return (
    <DashboardLayout>
      <PageHeader title="Unpaid Fees" />
      <Link to={tenantPath("/admin/fees")} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"><ArrowLeft className="size-4" /> All fees</Link>

      <div className="mb-4 flex flex-wrap gap-2">
        <DrawerSelector title="Status" value={filterStatus} options={[
          { value: "", label: "All statuses" },
          { value: "PENDING", label: "Pending" },
          { value: "PARTIAL", label: "Partial" },
          { value: "OVERDUE", label: "Overdue" },
        ]} onChange={(value) => { setFilterStatus(value); setSkip(0); }} className="w-auto min-w-36" />
        <DrawerSelector title="Class" value={filterClass} options={[{ value: "", label: "All classes" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]} onChange={(value) => { setFilterClass(value); setSkip(0); }} className="w-auto min-w-36" />
      </div>

      {error && <ApiErrorBanner message={error} onRetry={load} />}
      <h2 className="mb-2 px-1 text-sm font-semibold text-gray-700">Unpaid records <span className="font-normal text-gray-500">({total})</span></h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
        {loading ? <SkeletonList count={4} /> : payments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No unpaid records found</p>
        ) : payments.map((payment) => (
          <div key={payment.id} className="flex items-center gap-3 px-4 py-4">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{payment.student.name}</span>
              <span className="mt-1 block truncate text-xs text-gray-500">{payment.student.adno}{payment.student.class ? ` · ${payment.student.class.name}` : ""} · {payment.feeType.name}</span>
              <span className="mt-1 block text-xs text-gray-500">Due {new Date(payment.dueDate).toLocaleDateString("en-GB")}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-gray-950">₹{Number(payment.dueAmount).toLocaleString("en-IN")}</span>
              <span className={cn("mt-1 inline-block rounded-lg px-2 py-0.5 text-xs font-medium", STATUS_COLOR[payment.status] ?? STATUS_COLOR.PENDING)}>{payment.status}</span>
            </span>
            <Button type="button" size="icon-sm" variant="outline" aria-label={`Record payment for ${payment.student.name}`} onClick={() => { setRecording(payment.id); setMethod("CASH"); setReference(""); }}><CheckCircle className="size-4" /></Button>
          </div>
        ))}
      </div>

      {total > 30 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button type="button" variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 30))}>Previous</Button>
          <span className="text-sm text-gray-500">{skip + 1}–{Math.min(skip + 30, total)} of {total}</span>
          <Button type="button" variant="outline" size="sm" disabled={skip + 30 >= total} onClick={() => setSkip(skip + 30)}>Next</Button>
        </div>
      )}

      <ResponsivePopover open={recordingPayment !== null} onOpenChange={(open) => { if (!open) setRecording(null); }} title="Record payment" description={recordingPayment?.student.name}>
        {recordingPayment && (
          <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
            <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3 text-sm">
              <span className="text-primary-700">{recordingPayment.feeType.name}</span>
              <strong className="tabular-nums text-primary-700">₹{Number(recordingPayment.dueAmount).toLocaleString("en-IN")}</strong>
            </div>
            <DrawerSelector title="Payment method" value={method} options={PAYMENT_METHODS.map((item) => ({ value: item, label: item.replace(/_/g, " ") }))} onChange={setMethod} />
            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt / reference no. (optional)" aria-label="Receipt or reference number" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRecording(null)}>Cancel</Button>
              <Button type="button" className="flex-1" disabled={saving} onClick={() => markPaid(recordingPayment)}><CheckCircle className="size-4" /> Mark paid</Button>
            </div>
          </div>
        )}
      </ResponsivePopover>
    </DashboardLayout>
  );
}
