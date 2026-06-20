import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPayments, getPaymentReceipt, type FeePayment, type ReceiptData } from "@/lib/fees-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, Receipt, Search, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { SkeletonList } from "@/components/ui/Skeleton";

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl"
      >
        <div className="text-center mb-4 border-b border-dashed pb-4">
          <p className="font-bold text-lg">{receipt.client.name}</p>
          {receipt.client.address && <p className="text-xs text-gray-500">{receipt.client.address}</p>}
          <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-widest">Fee Receipt</p>
        </div>
        <div className="space-y-2 text-sm mb-4">
          {[
            ["Receipt No", receipt.reference ?? receipt.id.slice(0, 8).toUpperCase()],
            ["Date", receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : "—"],
            ["Student", receipt.student.name],
            ["Adm No", receipt.student.adno],
            ["Class", receipt.student.class?.name ?? "—"],
            ["Fee", receipt.feeType.name],
            ["Amount Paid", `₹${Number(receipt.paidAmount ?? 0).toLocaleString()}`],
            ["Method", receipt.method ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        {receipt.notes && <p className="text-xs text-gray-400 italic mb-4">Note: {receipt.notes}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600">Close</button>
          <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminFeesPaidPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const [payments, setPayments]     = useState<FeePayment[]>([]);
  const [total, setTotal]           = useState(0);
  const [skip, setSkip]             = useState(0);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [receipt, setReceipt]       = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

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
      <PageHeader title="Paid Fees" subtitle={`${total} paid records`} icon={CheckCircle} back backHref="/admin/fees" />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student name or adm no..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none text-sm" />
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {p.student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.student.name}</p>
                  <p className="text-xs text-gray-400">{p.student.adno} · {p.feeType.name}</p>
                  {p.paidAt && <p className="text-xs text-emerald-600">{new Date(p.paidAt).toLocaleDateString("en-GB")}{p.reference ? ` · ${p.reference}` : ""}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-700">₹{Number(p.paidAmount ?? p.dueAmount).toLocaleString()}</p>
                  <button onClick={() => showReceipt(p.id)} disabled={loadingReceipt === p.id}
                    className="text-xs text-gray-500 flex items-center gap-1 mt-1 ml-auto">
                    {loadingReceipt === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />} Receipt
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No paid records found</div>}
          </div>

          {total > 30 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 30))} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500">{skip + 1}–{Math.min(skip + 30, total)} of {total}</span>
              <button disabled={skip + 30 >= total} onClick={() => setSkip(skip + 30)} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </DashboardLayout>
  );
}
