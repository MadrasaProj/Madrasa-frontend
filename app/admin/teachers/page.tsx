import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTeachers, createTeacher, type TeacherRecord } from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Users, Plus, Search, Loader2, X, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminTeachersPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);

  // Add teacher form
  const [showAdd, setShowAdd]         = useState(false);
  const [newName, setNewName]         = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail]       = useState("");
  const [newPhone, setNewPhone]       = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    if (!cid || !token) return;
    setLoading(true);
    try {
      const data = await getTeachers(cid, token, { search: search || undefined, page, limit });
      setTeachers(data.data ?? []);
      setTotal(data.total ?? data.data?.length ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [cid, token, search, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!newName || !newUsername || !newPassword) return;
    setCreateError("");
    setCreating(true);
    try {
      await createTeacher(cid, token, {
        name: newName,
        username: newUsername,
        password: newPassword,
        email: newEmail || undefined,
        phone: newPhone || undefined,
      });
      setShowAdd(false);
      setNewName(""); setNewUsername(""); setNewPassword(""); setNewEmail(""); setNewPhone("");
      load();
    } catch (e) { setCreateError((e as Error).message); }
    finally { setCreating(false); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Teachers"
        subtitle={`${total} total`}
        icon={Users}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No teachers found</div>
      ) : (
        <>
          <div className="space-y-2 pb-20">
            {teachers.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">@{t.username}</p>
                  {(t.email || t.phone) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.email ?? ""}{t.email && t.phone ? " · " : ""}{t.phone ?? ""}
                    </p>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0",
                  t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                )}>
                  {t.status}
                </span>
              </motion.div>
            ))}
          </div>

          {total > limit && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500">Page {page}</span>
              <button disabled={page * limit >= total} onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {/* Add teacher modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-gray-900 text-lg">Add Teacher</p>
                  <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                {createError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{createError}</div>
                )}
                <div className="space-y-4">
                  {[
                    { label: "Full Name *",  value: newName,     onChange: setNewName,     placeholder: "e.g. Abdul Rahman" },
                    { label: "Username *",   value: newUsername, onChange: setNewUsername,  placeholder: "e.g. abdulrahman" },
                    { label: "Email",        value: newEmail,    onChange: setNewEmail,     placeholder: "teacher@madrasa.com", type: "email" },
                    { label: "Phone",        value: newPhone,    onChange: setNewPhone,     placeholder: "+91 9876543210", type: "tel" },
                  ].map(({ label, value, onChange, placeholder, type = "text" }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                      <input
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Temporary password"
                        className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAdd(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName || !newUsername || !newPassword || creating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Add Teacher
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
