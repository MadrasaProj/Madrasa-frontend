import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  type SubjectRecord,
} from "@/lib/subjects-api";
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  useBulkAssignTeacher,
  useClasses,
  useTeachers,
} from "@/lib/api-hooks";
import { ExamConfigForm } from "@/components/exam/ExamConfigForm";
import { useAuthStore } from "@/store/auth";
import { useLocation } from "react-router-dom";
import {
  BookOpen, Plus, Pencil, Loader2, Trash2, X, Users, Search, GraduationCap, ChevronDown, ChevronRight, Settings2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FormState {
  name: string;
  classId: string;
  teacherId: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY_FORM: FormState = { name: "", classId: "", teacherId: "", status: "ACTIVE" };

function subjectToForm(s: SubjectRecord): FormState {
  return {
    name: s.name,
    classId: s.classId,
    teacherId: s.teacherId ?? "",
    status: (s.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
  };
}

export default function AdminSubjectsPage() {
  const { user, activeClientId, accessToken } = useAuthStore();
  const location = useLocation();

  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";
  const isAdmin = user?.actorType === "CLIENT_ADMIN" || user?.actorType === "SUPER_ADMIN";

  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const defaultClassId = new URLSearchParams(location.search).get("classId") ?? "";

  const [filterClassId, setFilterClassId] = useState(defaultClassId);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: subjectsData,
    isLoading: loading,
    error: subjectsError,
    refetch: refetchSubjects,
  } = useSubjects({ classId: filterClassId || undefined, search: debouncedSearch || undefined });
  const subjects = subjectsData?.data ?? [];

  const { data: classes = [] } = useClasses();
  const { data: teachersData } = useTeachers();
  const teachers = teachersData?.data ?? [];

  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();
  const bulkAssignMutation = useBulkAssignTeacher();

  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error?.message || updateMutation.error?.message || "";
  const deleting = deleteMutation.isPending ? deleteMutation.variables ?? null : null;

  const [showDrawer, setShowDrawer]   = useState(false);
  const [editTarget, setEditTarget]   = useState<SubjectRecord | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [showExamConfig, setShowExamConfig] = useState(false);
  const subjectExamConfig = useRef<{ maxMarks: number | null; gradeConfig: Record<string, { min: number }> } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubjectRecord | null>(null);

  // Bulk assign modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClassId, setBulkClassId]     = useState("");
  const [bulkTeacherId, setBulkTeacherId] = useState("");

  const handleFilterClass = (id: string) => {
    setFilterClassId(id);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, classId: filterClassId });
    setShowExamConfig(false);
    createMutation.reset();
    updateMutation.reset();
    setShowDrawer(true);
  };

  const openEdit = (s: SubjectRecord) => {
    setEditTarget(s); setForm(subjectToForm(s));
    subjectExamConfig.current = null;
    setShowExamConfig(!!(s.maxMarks || s.gradeConfig));
    createMutation.reset();
    updateMutation.reset();
    setShowDrawer(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (!editTarget && !form.classId) return;
    if (editTarget) {
      const examConfig = subjectExamConfig.current;
      updateMutation.mutate(
        {
          subjectId: editTarget.id,
          data: {
            name: form.name.trim(),
            teacherId: isPeriodBased ? (form.teacherId || null) : undefined,
            status: form.status,
            ...(examConfig && { maxMarks: examConfig.maxMarks, gradeConfig: examConfig.gradeConfig }),
          },
        },
        { onSuccess: () => setShowDrawer(false) },
      );
    } else {
      createMutation.mutate(
        {
          name: form.name.trim(),
          classId: form.classId,
          teacherId: isPeriodBased && form.teacherId ? form.teacherId : undefined,
        },
        { onSuccess: () => setShowDrawer(false) },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setShowDeleteConfirm(false),
      onError: () => setShowDeleteConfirm(false),
    });
  };

  const handleBulkAssign = () => {
    if (!bulkClassId || !bulkTeacherId) return;
    bulkAssignMutation.mutate(
      { classId: bulkClassId, teacherId: bulkTeacherId },
      {
        onSuccess: (result) => {
          setShowBulkModal(false);
          setBulkClassId(""); setBulkTeacherId("");
          alert(`Assigned teacher to ${result.updated} subjects`);
        },
      },
    );
  };

  const columns: Column<SubjectRecord>[] = [
    {
      key: "name",
      header: "Subject",
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-sm shrink-0 text-emerald-700">
            {s.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.class?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (s) => (
        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">
          {s.class?.name ?? "—"}
        </span>
      ),
      className: "hidden sm:table-cell",
      headerClass: "hidden sm:table-cell",
    },
    ...(isPeriodBased
      ? [{
          key: "teacher",
          header: "Teacher",
          render: (s: SubjectRecord) =>
            s.teacher ? (
              <span className="text-sm text-gray-700">{s.teacher.name}</span>
            ) : (
              <span className="text-xs text-gray-400 italic">Unassigned</span>
            ),
          className: "hidden sm:table-cell",
          headerClass: "hidden sm:table-cell",
        } as Column<SubjectRecord>]
      : []),
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <span className={cn(
          "text-xs font-bold px-2.5 py-1 rounded-lg",
          s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
        )}>
          {s.status}
        </span>
      ),
      className: "hidden sm:table-cell",
      headerClass: "hidden sm:table-cell",
    },
    ...(isAdmin
      ? [{
          key: "actions",
          header: "",
          render: (s: SubjectRecord) => (
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); setShowDeleteConfirm(true); }}
                disabled={deleting === s.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Delete Subject"
              >
                {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ),
          className: "text-right",
        } as Column<SubjectRecord>]
      : []),
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Subjects"
        subtitle={`${subjects.length} total`}
        icon={BookOpen}
        action={
          isAdmin ? (
            <div className="flex items-center gap-2">
              {isPeriodBased && (
                <button
                   onClick={() => { bulkAssignMutation.reset(); setBulkClassId(filterClassId); setShowBulkModal(true); }}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Sync Teacher</span>
                </button>
              )}
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          ) : undefined
        }
      />

      {subjectsError && <ApiErrorBanner message={subjectsError.message} onRetry={() => refetchSubjects()} />}

      {/* Search + class filter */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search subjects…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filterClassId}
            onChange={(e) => handleFilterClass(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={subjects}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyIcon={BookOpen}
        emptyMessage="No subjects found"
        mobileRender={(s) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center font-bold text-lg shrink-0 text-emerald-700">
                {s.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.class?.name}</p>
                {isPeriodBased && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.teacher ? s.teacher.name : "No teacher assigned"}
                  </p>
                )}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* Add/Edit Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div key="subjects-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div key="subjects-drawer"
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                transition={isMobile ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.2 }}
                className={cn(
                  "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                  isMobile 
                    ? "rounded-t-3xl max-h-[92dvh]" 
                    : "rounded-3xl max-w-xl max-h-[85dvh]"
                )}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <h2 className="font-bold text-gray-900 text-lg">
                  {editTarget ? "Edit Subject" : "Add Subject"}
                </h2>
                <button
                  onClick={() => !saving && setShowDrawer(false)}
                  disabled={saving}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {saveError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                  />
                </div>

                {!editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.classId}
                      onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {isPeriodBased && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assigned Teacher</label>
                    <select
                      value={form.teacherId}
                      onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                    >
                      <option value="">(Unassigned)</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} · @{t.username}</option>)}
                    </select>
                  </div>
                )}

                {editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                    <div className="flex gap-3">
                      {(["ACTIVE", "INACTIVE"] as const).map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio" name="subj-status" value={s}
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

                {/* Exam Configuration (edit only — needs subject ID) */}
                {editTarget && (
                  <div className="border-t border-gray-100 pt-4">
                    <button
                      onClick={() => setShowExamConfig((v) => !v)}
                      className="flex items-center justify-between w-full py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-blue-600" />
                        <span>Exam Configuration</span>
                      </div>
                      {showExamConfig ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {showExamConfig && (
                      <div className="mt-3">
                        <ExamConfigForm
                          clientId={activeClientId ?? ""}
                          token={accessToken ?? ""}
                          embedded
                          subjectId={editTarget.id}
                          initialMaxMarks={editTarget.maxMarks}
                          initialGradeConfig={editTarget.gradeConfig}
                          onConfigChange={(cfg) => { subjectExamConfig.current = cfg; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  {editTarget ? "Save Changes" : "Create Subject"}
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk Assign Teacher Modal (period-based) */}
      <AnimatePresence>
        {showBulkModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => !bulkAssignMutation.isPending && setShowBulkModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">Sync Teacher to Class</h3>
                  <button onClick={() => setShowBulkModal(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Assigns one teacher to all active subjects in the selected class.</p>

                {bulkAssignMutation.error && (
                  <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{bulkAssignMutation.error.message}</div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class</label>
                  <select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teacher</label>
                  <select value={bulkTeacherId} onChange={(e) => setBulkTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                    <option value="">Select teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} · @{t.username}</option>)}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowBulkModal(false)} disabled={bulkAssignMutation.isPending}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleBulkAssign} disabled={bulkAssignMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                    {bulkAssignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Assign
                  </button>
                 </div>
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
                <h3 className="font-bold text-gray-900 text-lg">Delete Subject?</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete subject <strong>{deleteTarget?.name}</strong>? This action cannot be undone and will affect grading metrics.
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                    </span>
                  ) : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
