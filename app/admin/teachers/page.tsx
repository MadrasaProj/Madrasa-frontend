import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column, type SortDir } from "@/components/ui/DataTable";
import {
  type TeacherRecord,
  type UpdateTeacherPayload,
} from "@/lib/teachers-api";
import { type SubjectRecord } from "@/lib/subjects-api";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useClasses, useSubjects } from "@/lib/api-hooks";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  Users, Plus, Search, Loader2, X, Eye, EyeOff, Pencil,
  GraduationCap, BookOpen, CheckCircle2, ChevronDown, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminTeachersPage() {
  const { user } = useAuthStore();
  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── List state ─────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy]     = useState<string | undefined>(undefined);
  const [sortDir, setSortDir]   = useState<SortDir>("asc");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: teachersData,
    isLoading: loading,
    error: teachersError,
    refetch: refetchTeachers,
  } = useTeachers({
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder: sortDir,
  });
  const teachers = teachersData?.data ?? [];
  const total = teachersData?.total ?? teachersData?.data?.length ?? 0;

  const { data: allClasses = [] } = useClasses();
  const { data: subjectsData } = useSubjects(isPeriodBased ? {} : { classId: "__none__" });
  const allSubjects = isPeriodBased ? (subjectsData?.data ?? []) : [];

  const createMutation = useCreateTeacher();
  const updateMutation = useUpdateTeacher();
  const deleteMutation = useDeleteTeacher();

  const saveError = createMutation.error?.message || updateMutation.error?.message || "";
  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherRecord | null>(null);
  const [fName, setFName]           = useState("");
  const [fUsername, setFUsername]   = useState("");
  const [fPassword, setFPassword]   = useState("");
  const [fNewPassword, setFNewPassword] = useState("");
  const [fStatus, setFStatus]       = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [fClassIds, setFClassIds]   = useState<Set<string>>(new Set());
  const [fSubjectIds, setFSubjectIds] = useState<Set<string>>(new Set());
  const [showPw, setShowPw]         = useState(false);
  const [showNewPw, setShowNewPw]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Assignment filters (inline) ─────────────────────────────────────────────
  const [subjectSearch, setSubjectSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const handleSort = (key: string, dir: SortDir) => {
    setSortBy(key); setSortDir(dir); setPage(1);
  };

  // ── Drawer open ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFName(""); setFUsername(""); setFPassword(""); setFNewPassword("");
    setFStatus("ACTIVE"); setFClassIds(new Set()); setFSubjectIds(new Set());
    setShowPw(false); setShowNewPw(false);
    setSubjectSearch(""); setExpandedGroups(new Set());
    setShowDeleteConfirm(false);
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  };

  const handleDelete = () => {
    if (!editTarget) return;
    deleteMutation.mutate(editTarget.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setShowDrawer(false);
        setPage(1);
      },
      onError: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const openAdd = () => {
    setEditTarget(null);
    resetForm();
    setShowDrawer(true);
  };

  const openEdit = async (t: TeacherRecord) => {
    const teacherSubjectIds = new Set(t.subjects?.map((s) => s.id) ?? []);
    setEditTarget(t);
    setFName(t.name);
    setFUsername(t.username);
    setFPassword(""); setFNewPassword("");
    setFStatus((t.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE");
    setFClassIds(new Set(t.classes?.map((c) => c.id) ?? []));
    setFSubjectIds(teacherSubjectIds);
    setShowPw(false); setShowNewPw(false);
    setSubjectSearch(""); setShowDeleteConfirm(false);
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();

    // Auto-expand groups that have pre-selected subjects
    const preExpanded = new Set(
      allSubjects.filter((s) => teacherSubjectIds.has(s.id)).map((s) => s.classId ?? "__none__"),
    );
    setExpandedGroups(preExpanded);

    setShowDrawer(true);
  };

  // ── Save (single call for everything) ─────────────────────────────────────
  const handleSave = () => {
    if (!fName.trim() || !fUsername.trim() || (!editTarget && !fPassword)) return;
    if (editTarget) {
      const payload: UpdateTeacherPayload = {
        name: fName.trim(),
        status: fStatus,
        classIds: [...fClassIds],
      };
      if (fNewPassword.trim()) payload.password = fNewPassword.trim();
      if (isPeriodBased) payload.subjectIds = [...fSubjectIds];
      updateMutation.mutate(
        { id: editTarget.id, data: payload },
        {
          onSuccess: () => {
            setShowDrawer(false);
            setPage(1);
          },
        },
      );
    } else {
      createMutation.mutate(
        { name: fName.trim(), username: fUsername.trim(), password: fPassword },
        {
          onSuccess: () => {
            setShowDrawer(false);
            setPage(1);
          },
        },
      );
    }
  };

  const toggleSubject = (id: string) => {
    setFSubjectIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  // ── Subjects grouped by class ───────────────────────────────────────────────
  const groupedSubjects = useMemo(() => {
    const q = subjectSearch.toLowerCase();
    const filtered = q
      ? allSubjects.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.class?.name?.toLowerCase().includes(q),
        )
      : allSubjects;
    const map = new Map<string, { classId: string; className: string; subjects: SubjectRecord[] }>();
    for (const s of filtered) {
      const key = s.classId ?? "__none__";
      if (!map.has(key)) map.set(key, { classId: key, className: s.class?.name ?? "No Class", subjects: [] });
      map.get(key)!.subjects.push(s);
    }
    return [...map.values()].sort((a, b) => a.className.localeCompare(b.className));
  }, [allSubjects, subjectSearch]);

  const toggleGroup = (classId: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(classId) ? next.delete(classId) : next.add(classId);
      return next;
    });

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo((): Column<TeacherRecord>[] => {
    const cols: Column<TeacherRecord>[] = [
      {
        key: "name",
        header: "Teacher",
        sortable: true,
        render: (t) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
              {t.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
              <p className="text-xs text-gray-400">@{t.username}</p>
            </div>
          </div>
        ),
      },
      {
        key: "classes",
        header: "Class",
        render: (t) => {
          const cls = t.classes?.[0];
          if (!cls) return <span className="text-gray-300 text-xs">—</span>;
          return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {cls.name}
            </span>
          );
        },
        className: "hidden md:table-cell",
        headerClass: "hidden md:table-cell",
      },
    ];

    if (isPeriodBased) {
      cols.push({
        key: "subjects",
        header: "Subjects",
        render: (t) => {
          const subjects = t.subjects ?? [];
          if (!subjects.length) return <span className="text-gray-300 text-xs">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {subjects.map((s) => (
                <span key={s.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {s.name}{s.class ? ` · ${s.class.name}` : ""}
                </span>
              ))}
            </div>
          );
        },
        className: "hidden lg:table-cell",
        headerClass: "hidden lg:table-cell",
      });
    }

    cols.push(
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (t) => (
          <span className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-lg",
            t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
          )}>
            {t.status}
          </span>
        ),
        className: "hidden sm:table-cell",
        headerClass: "hidden sm:table-cell",
      },
      {
        key: "actions",
        header: "",
        render: (t) => (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(t); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTarget(t);
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors"
              title="Delete Teacher"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
        className: "text-right",
      },
    );

    return cols;
  }, [isPeriodBased]); // eslint-disable-line

  return (
    <DashboardLayout>
      <PageHeader
        title="Teachers"
        subtitle={`${total} total`}
        icon={Users}
        action={
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        }
      />

      {teachersError && <ApiErrorBanner message={teachersError.message} onRetry={() => refetchTeachers()} />}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or username…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        keyExtractor={(t) => t.id}
        loading={loading}
        error={teachersError?.message ?? null}
        emptyIcon={Users}
        emptyMessage="No teachers found"
        onSort={handleSort}
        sortKey={sortBy}
        sortDir={sortDir}
        pagination={{
          page, totalPages, total,
          pageSize, pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: setPage,
          onPageSizeChange: (sz) => { setPageSize(sz); setPage(1); },
        }}
        mobileRender={(t) => {
          const cls = t.classes?.[0];
          const subjects = t.subjects ?? [];
          return (
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0 mt-0.5">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">@{t.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                      t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                    )}>
                      {t.status}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditTarget(t); setShowDeleteConfirm(true); }}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {cls && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {cls.name}
                    </span>
                  </div>
                )}
                {isPeriodBased && subjects.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <BookOpen className="w-3 h-3 text-emerald-500 shrink-0" />
                    {subjects.map((s) => (
                      <span key={s.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {s.name}{s.class ? ` · ${s.class.name}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />

      {/* ── Add / Edit Teacher Drawer ── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div key="teacher-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !saving && setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div key="teacher-drawer"
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
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    {editTarget ? "Edit Teacher" : "Add Teacher"}
                  </h2>
                  {editTarget && (
                    <p className="text-xs text-gray-400 mt-0.5">@{editTarget.username}</p>
                  )}
                </div>
                <button onClick={() => !saving && setShowDrawer(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                  disabled={saving}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {saveError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>
                )}

                {/* ── Basic fields ── */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                  <input
                    type="text" value={fName} placeholder="Abdul Rahman"
                    onChange={(e) => setFName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Username *{editTarget && " (cannot change)"}
                  </label>
                  <input
                    type="text" value={fUsername} placeholder="abdulrahman"
                    disabled={!!editTarget}
                    onChange={(e) => setFUsername(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white text-sm transition-colors",
                      editTarget && "opacity-50 cursor-not-allowed bg-gray-100",
                    )}
                  />
                </div>

                {/* Password — create */}
                {!editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"} value={fPassword}
                        onChange={(e) => setFPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white text-sm transition-colors"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* New password — edit */}
                {editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      New Password <span className="font-normal text-gray-400">(leave blank to keep)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"} value={fNewPassword}
                        onChange={(e) => setFNewPassword(e.target.value)}
                        placeholder="Enter new password…"
                        className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white text-sm transition-colors"
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status — edit only */}
                {editTarget && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                    <div className="flex gap-2">
                      {(["ACTIVE", "INACTIVE"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setFStatus(s)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors",
                            fStatus === s
                              ? s === "ACTIVE"
                                ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                : "bg-red-100 border-red-300 text-red-600"
                              : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Class & Subject assignment (edit only) ── */}
                {editTarget && (
                  <>
                    <div className="border-t border-dashed border-gray-200 pt-1" />

                      {/* Class — multi-select checkboxes */}
                        <div>
                          <SectionHeader title="Class Teacher" className="mb-1" />
                          <p className="text-xs text-gray-400 mb-3">
                            Select classes this teacher manages ({fClassIds.size} selected)
                          </p>
                          {allClasses.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">No classes found</p>
                          ) : (
                            <div className="space-y-2">
                              {allClasses.map((cls) => {
                                const selected = fClassIds.has(cls.id);
                                const otherTeacher = cls.classTeacherId && cls.classTeacherId !== editTarget.id;
                                return (
                                  <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => {
                                      setFClassIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(cls.id)) next.delete(cls.id);
                                        else next.add(cls.id);
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                      selected
                                        ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                                        : "border-gray-100 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50/40",
                                    )}
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">{cls.name}</p>
                                      {otherTeacher && cls.classTeacher && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          Also: {cls.classTeacher.name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 ml-3">
                                      {selected
                                        ? <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                        : <div className="w-4 h-4 rounded-md border-2 border-gray-300" />
                                      }
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Subjects — grouped by class, period-based only */}
                        {isPeriodBased && (
                          <div>
                            <SectionHeader title="Subjects" className="mb-1" />
                            <p className="text-xs text-gray-400 mb-3">
                              Select subjects this teacher teaches ({fSubjectIds.size} selected)
                            </p>
                            {allSubjects.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-3">No subjects found</p>
                            ) : (
                              <>
                                {/* Search */}
                                <div className="relative mb-3">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="text"
                                    value={subjectSearch}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSubjectSearch(val);
                                      if (val) {
                                        // Expand all groups on search so matches are visible
                                        setExpandedGroups(new Set(allSubjects.map((s) => s.classId ?? "__none__")));
                                      }
                                    }}
                                    placeholder="Search subjects or class…"
                                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                                  />
                                </div>

                                {groupedSubjects.length === 0 ? (
                                  <p className="text-xs text-gray-400 text-center py-3">No matches</p>
                                ) : (
                                  <div className="space-y-2">
                                    {groupedSubjects.map((group) => {
                                      const isOpen = expandedGroups.has(group.classId);
                                      const selectedInGroup = group.subjects.filter((s) => fSubjectIds.has(s.id)).length;
                                      return (
                                        <div key={group.classId} className="rounded-xl border border-gray-200 overflow-hidden">
                                          {/* Group header */}
                                          <button
                                            type="button"
                                            onClick={() => toggleGroup(group.classId)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                          >
                                            <div className="flex items-center gap-2">
                                              <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                              <span className="text-xs font-bold text-gray-700">{group.className}</span>
                                              <span className="text-[10px] text-gray-400">{group.subjects.length} subjects</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {selectedInGroup > 0 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                  {selectedInGroup} selected
                                                </span>
                                              )}
                                              <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                                            </div>
                                          </button>

                                          {/* Subject list */}
                                          {isOpen && (
                                            <div className="divide-y divide-gray-100">
                                              {group.subjects.map((subj) => {
                                                const selected = fSubjectIds.has(subj.id);
                                                const hasOther = subj.teacherId && subj.teacherId !== editTarget.id;
                                                return (
                                                  <button
                                                    key={subj.id}
                                                    type="button"
                                                    onClick={() => toggleSubject(subj.id)}
                                                    className={cn(
                                                      "w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left",
                                                      selected ? "bg-emerald-50" : "bg-white hover:bg-gray-50",
                                                    )}
                                                  >
                                                    <div>
                                                      <p className="text-sm font-semibold text-gray-800">{subj.name}</p>
                                                      {hasOther && subj.teacher && (
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{subj.teacher.name}</p>
                                                      )}
                                                    </div>
                                                    <div className="shrink-0 ml-3">
                                                      {selected
                                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                                      }
                                                    </div>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-3 shrink-0">
                {editTarget && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full border border-red-200 hover:border-red-300 text-red-600 font-semibold py-3 rounded-2xl text-sm transition-all"
                  >
                    Delete Teacher
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !fName.trim() || !fUsername.trim() || (!editTarget && !fPassword)}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-200 disabled:opacity-60 active:scale-[0.98] transition-transform"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </span>
                  ) : editTarget ? "Save Changes" : "Add Teacher"}
                </button>
              </div>
            </motion.div>
            </div>
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
                <h3 className="font-bold text-gray-900 text-lg">Delete Teacher?</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{editTarget?.name}</strong>? This action cannot be undone. All classes, subjects, results, diaries, and homework will be unlinked or deleted.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting ? (
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
