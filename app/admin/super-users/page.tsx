import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  listSuperAdminUsers,
  createSuperAdminUser,
  updateSuperAdminUser,
  deleteSuperAdminUser,
  type SuperAdminUser,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import { Shield, ShieldCheck, UserPlus, Trash2, Pencil, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Add / Edit Drawer ──────────────────────────────────────────────────────────

type Mode = "add" | "edit";

function UserDrawer({
  mode,
  user,
  token,
  onSaved,
  onClose,
}: {
  mode: Mode;
  user?: SuperAdminUser;
  token: string;
  onSaved: (u: SuperAdminUser) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [identifier, setIdentifier] = useState(user?.identifier ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400";
  const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

  const handleSubmit = async () => {
    if (!name) { setError("Name is required."); return; }
    if (mode === "add" && (!identifier || !password)) {
      setError("Username and password are required."); return;
    }
    setSaving(true);
    setError("");
    try {
      let saved: SuperAdminUser;
      if (mode === "add") {
        saved = await createSuperAdminUser({ name, identifier, password }, token);
      } else {
        const dto: { name?: string; password?: string } = { name };
        if (password) dto.password = password;
        saved = await updateSuperAdminUser(user!.id, dto, token);
      }
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
        <motion.div
          initial={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
          transition={isMobile ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.2 }}
          className={cn(
            "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
            isMobile 
              ? "rounded-t-3xl max-h-[92dvh]" 
              : "rounded-3xl max-w-xl max-h-[85dvh]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">
              {mode === "add" ? "Add Admin User" : "Edit Admin User"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 pb-6">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Full name" />
              </div>
              {mode === "add" && (
                <div>
                  <label className={labelCls}>Username / Identifier *</label>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    className={inputCls} placeholder="e.g. superadmin" />
                </div>
              )}
              <div>
                <label className={labelCls}>{mode === "add" ? "Password *" : "New Password (leave blank to keep)"}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls} placeholder={mode === "edit" ? "Optional" : "Min 8 characters"} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "add" ? "Add User" : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminSuperUsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState<{ mode: Mode; user?: SuperAdminUser } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    listSuperAdminUsers(accessToken)
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e?.message ?? "Failed to load users."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleSaved = (saved: SuperAdminUser) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDelete = async (userId: string) => {
    if (!accessToken) return;
    setDeleting(userId);
    try {
      await deleteSuperAdminUser(userId, accessToken);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setError(e?.message ?? "Delete failed.");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Users"
        icon={ShieldCheck}
        action={
          <button
            onClick={() => setDrawer({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Admin User
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No admin users found.</p>
        </div>
      ) : (
        <div className="space-y-2 pb-20">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                u.isPrimary ? "bg-amber-100" : "bg-gray-100",
              )}>
                {u.isPrimary
                  ? <ShieldCheck className="w-5 h-5 text-amber-600" />
                  : <Shield className="w-5 h-5 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                  {u.isPrimary && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">{u.identifier}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Added {fmtDate(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDrawer({ mode: "edit", user: u })}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-emerald-600 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!u.isPrimary && (
                  confirmDelete === u.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting === u.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-all"
                      >
                        {deleting === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(u.id)}
                      className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {drawer && (
          <UserDrawer
            mode={drawer.mode}
            user={drawer.user}
            token={accessToken!}
            onSaved={handleSaved}
            onClose={() => setDrawer(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
