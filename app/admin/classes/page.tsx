import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  getAllClasses, createClass, updateClass, deleteClass,
  type ClassRecord, type CreateClassPayload, type UpdateClassPayload,
} from "@/lib/classes-api";
import { getTeachers, type TeacherRecord } from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  School, Plus, Pencil, Loader2, BookOpen, Users, Trash2, X, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FormState {
  name: string;
  classTeacherId: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY_FORM: FormState = { name: "", classTeacherId: "", status: "ACTIVE" };

function classToForm(c: ClassRecord): FormState {
  return {
    name: c.name,
    classTeacherId: c.classTeacherId ?? "",
    status: (c.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
  };
}

export default function AdminClassesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";
  const navigate = useNavigate();

  const isAdmin = user?.actorType === "CLIENT_ADMIN" || user?.actorType === "SUPER_ADMIN";

  const [classes, setClasses]   = useState<ClassRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const searchTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRecord | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget]           = useState<ClassRecord | null>(null);

  const load = useCallback(async (srch?: string) => {
    if (!cid || !token) return;
    setLoading(true); setError(null);
    try {
      const [cls, tch] = await Promise.all([
        getAllClasses(cid, token, { search: srch }),
        getTeachers(cid, token),
      ]);
      setClasses(cls);
      setTeachers(tch.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cid, token]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 400);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(""); setShowDrawer(true);
  };

  const openEdit = (c: ClassRecord) => {
    setEditTarget(c); setForm(classToForm(c)); setSaveError(""); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Class name is required"); return; }
    setSaving(true); setSaveError("");
    try {
      if (editTarget) {
        const updated = await updateClass(cid, token, editTarget.id, {
          name: form.name.trim(),
          classTeacherId: form.classTeacherId || null,
          status: form.status,
        } as UpdateClassPayload);
        setClasses((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      } else {
        const created = await createClass(cid, token, {
          name: form.name.trim(),
          classTeacherId: form.classTeacherId || null,
          accademicYearId: user?.defaultAcademicYearId ?? undefined,
        } as CreateClassPayload);
        setClasses((prev) => [...prev, created]);
      }
      setShowDrawer(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteClass(cid, token, deleteTarget.id);
      setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
    } catch (e) {
      setError((e as Error).message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(null);
    }
  };

  const columns: Column<ClassRecord>[] = [
    {
      key: "name",
      header: "Class",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-sm shrink-0 text-emerald-700">
            {c.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{c.name}</p>
            {c.classTeacher && (
              <p className="text-xs text-gray-400 mt-0.5">{c.classTeacher.name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "classTeacher",
      header: "Class Teacher",
      render: (c) =>
        c.classTeacher ? (
          <span className="text-sm text-gray-700">{c.classTeacher.name}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">—</span>
        ),
      className: "hidden sm:table-cell",
      headerClass: "hidden sm:table-cell",
    },
    {
      key: "subjectCount",
      header: "Subjects",
      render: (c) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/subjects?classId=${c.id}`); }}
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          {c.subjectCount ?? 0} subjects
        </button>
      ),
      className: "hidden lg:table-cell",
      headerClass: "hidden lg:table-cell",
    },
    {
      key: "studentCount",
      header: "Students",
      render: (c) => (
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
          <Users className="w-3 h-3" />
          {c.studentCount}
        </div>
      ),
      className: "hidden sm:table-cell",
      headerClass: "hidden sm:table-cell",
    },
    ...(isAdmin
      ? [{
          key: "actions",
          header: "",
          render: (c: ClassRecord) => (
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); setShowDeleteConfirm(true); }}
                disabled={deleting === c.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Delete Class"
              >
                {deleting === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ),
          className: "text-right",
        }]
      : []),
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} total`}
        icon={School}
        action={
          isAdmin ? (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Class
            </button>
          ) : undefined
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={() => load(search)} />}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search classes…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={classes}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyIcon={School}
        emptyMessage="No classes found"
        mobileRender={(c) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center font-bold text-lg shrink-0 text-emerald-700">
                {c.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.classTeacher ? c.classTeacher.name : "No class teacher"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.studentCount} students · {c.subjectCount ?? 0} subjects
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div key="classes-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div key="classes-drawer"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:w-full md:max-w-xl md:-translate-x-1/2 z-50 bg-white rounded-t-3xl max-h-[92dvh] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <h2 className="font-bold text-gray-900 text-lg">
                  {editTarget ? "Edit Class" : "Add Class"}
                </h2>
                <button
                  onClick={() => !saving && setShowDrawer(false)}
                  disabled={saving}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {saveError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Class 5A"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class Teacher</label>
                  <select
                    value={form.classTeacherId}
                    onChange={(e) => setForm((f) => ({ ...f, classTeacherId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                  >
                    <option value="">(No class teacher)</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} · @{t.username}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Each teacher can be class teacher of only one class</p>
                </div>

                {editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                    <div className="flex gap-3">
                      {(["ACTIVE", "INACTIVE"] as const).map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio" name="cls-status" value={s}
                            checked={form.status === s}
                            onChange={() => setForm((f) => ({ ...f, status: s }))}
                            className="accent-emerald-600"
                          />
                          <span className="text-sm text-gray-700">{s === "ACTIVE" ? "Active" : "Inactive"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button
                  onClick={() => !saving && setShowDrawer(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Standalone Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div key="del-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div key="del-dialog"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Delete Class?</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to deactivate or delete class <strong>{deleteTarget?.name}</strong>? Students won't be deleted, but all course mappings will be affected.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting !== null}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting !== null}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting !== null ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Deactivating…
                    </span>
                  ) : "Deactivate"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
