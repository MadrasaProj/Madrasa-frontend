import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { getPayments, getPaymentReceipt, type FeePayment, type ReceiptData } from "@/lib/fees-api";
import { getTeachers } from "@/lib/teachers-api";
import { apiFetch } from "@/lib/fetch";
import { useAuthStore } from "@/store/auth";
import { ArrowLeft, Loader2, Receipt, Search, Printer } from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useTenantPath } from "@/hooks/useTenantPath";
import { Link } from "react-router-dom";

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <ResponsivePopover open onOpenChange={(open) => { if (!open) onClose(); }} title="Fee receipt" description={receipt.client.name}>
      <div className="space-y-5 px-4 pb-6 pt-2 sm:px-6">
        <dl className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white text-sm">
          {[
            ["Receipt no", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Date", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Student", receipt.student.name],
            ["Admission no", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee", receipt.feeType.name],
            ["Amount paid", `₹${Number(receipt.paidAmount ?? 0).toLocaleString("en-IN")}`],
            ["Method", receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-4">
              <dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
        {receipt.notes && <p className="text-sm text-gray-500">Note: {receipt.notes}</p>}
        <Button type="button" onClick={() => window.print()}><Printer className="size-4" /> Print receipt</Button>
      </div>
    </ResponsivePopover>
  );
}

export default function AdminFeesPaidPage() {
  const tenantPath = useTenantPath();
  const { user, accessToken, activeClientId } = useAuthStore();
  const [payments, setPayments]     = useState<FeePayment[]>([]);
  const [total, setTotal]           = useState(0);
  const [skip, setSkip]             = useState(0);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [receipt, setReceipt]       = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [teachers, setTeachers]     = useState<Record<string, string>>({});

  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const res = await getPayments(cid, token, { status: "PAID", skip, take: 30 });
      setPayments(res.payments);
      setTotal(res.total);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [cid, token, skip]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!cid || !token) return;
    (async () => {
      const map: Record<string, string> = {};
      try {
        const teachersRes = await getTeachers(cid, token, { limit: 500 });
        for (const t of teachersRes.data ?? []) map[t.id] = t.name;
      } catch {}
      try {
        const usersRes = await apiFetch<{ data: { id: string; name: string }[] }>(
          `${import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000"}/api/v2/${cid}/users`, token
        );
        for (const u of usersRes.data ?? []) map[u.id] = u.name;
      } catch {}
      setTeachers(map);
    })();
  }, [cid, token]);

  const showReceipt = async (id: string) => {
    setLoadingReceipt(id);
    try { setReceipt(await getPaymentReceipt(cid, token, id)); }
    catch (err) { alert((err as Error).message); }
    finally { setLoadingReceipt(null); }
  };

  const filtered = search
    ? payments.filter((p) => p.student.name.toLowerCase().includes(search.toLowerCase()) || p.student.adno.includes(search))
    : payments;

  return (
    <DashboardLayout>
      <PageHeader title="Paid Fees" />
      <Link to={tenantPath("/admin/fees")} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"><ArrowLeft className="size-4" /> All fees</Link>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student name or adm no..." aria-label="Search student name or admission number"
          className="w-full pl-10" />
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ApiErrorBanner message={error} onRetry={load} />
      ) : (
        <>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-4">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {p.student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.student.name}</p>
                  <p className="text-xs text-gray-400">{p.student.adno} · {p.feeType.name}</p>
                  {p.collectedBy ? (
                    <p className="text-[10px] text-gray-400 mt-0.5">Collected by {teachers[p.collectedBy] ?? (p.collectedBy === cid ? user?.name ?? "Admin" : p.collectedBy.slice(0, 8))}</p>
                  ) : null}
                  {p.paidAt && <p className="text-xs text-primary-600">{new Date(p.paidAt).toLocaleDateString("en-GB")}{p.reference ? ` · ${p.reference}` : ""}</p>}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="font-bold text-primary-700">₹{Number(p.paidAmount ?? p.dueAmount).toLocaleString()}</p>
                  <Button type="button" variant="ghost" size="xs" onClick={() => showReceipt(p.id)} disabled={loadingReceipt === p.id}
                    className="text-xs text-gray-600">
                    {loadingReceipt === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />} Receipt
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No paid records found</div>}
          </div>

          {total > 30 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button type="button" variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 30))}>Previous</Button>
              <span className="text-sm text-gray-500">{skip + 1}–{Math.min(skip + 30, total)} of {total}</span>
              <Button type="button" variant="outline" size="sm" disabled={skip + 30 >= total} onClick={() => setSkip(skip + 30)}>Next</Button>
            </div>
          )}
        </>
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </DashboardLayout>
  );
}
