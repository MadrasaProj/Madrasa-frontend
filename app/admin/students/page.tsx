import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  ImportModal,
  type ImportConfig,
  type ImportColumnDef,
  type ParseResult,
} from "@/components/ui/ImportModal";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  type StudentRecord,
  type CreateStudentPayload,
} from "@/lib/students-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import {
  Users,
  Plus,
  Search,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Upload,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Simple 2-color scheme: pink for girls, indigo for boys
const GENDER_AVATAR = {
  FEMALE: { bg: "bg-pink-100", text: "text-pink-700" },
  MALE: { bg: "bg-indigo-100", text: "text-indigo-700" },
  null: { bg: "bg-gray-100", text: "text-gray-600" },
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  uid: string;
  adno: string;
  classId: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  guardianName: string;
  parentPhone: string;
  parentAltPhone: string;
  parentEmail: string;
  relationToStudent: string;
  parentPassword: string;
}
const EMPTY_FORM: FormState = {
  name: "",
  uid: "",
  adno: "",
  classId: "",
  gender: "MALE",
  dateOfBirth: "",
  guardianName: "",
  parentPhone: "",
  parentAltPhone: "",
  parentEmail: "",
  relationToStudent: "father",
  parentPassword: "",
};

function studentToForm(s: StudentRecord): FormState {
  return {
    name: s.name,
    uid: s.uid ?? "",
    adno: s.adno,
    classId: s.classId ?? "",
    gender: s.gender ?? "MALE",
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "", // strip time for date input
    guardianName: s.guardianName ?? "",
    parentPhone: s.parentPhone ?? "",
    parentAltPhone: s.parentAltPhone ?? "",
    parentEmail: s.parentEmail ?? "",
    relationToStudent: s.relationToStudent ?? "father",
    parentPassword: "",
  };
}

// ── Import column definitions (static — no auth deps here) ───────────────────

const STUDENT_IMPORT_COLUMNS: ImportColumnDef[] = [
  {
    header: "Name",
    field: "name",
    required: true,
    example: "Mohammed Abdullah",
  },
  { header: "Admission No", field: "adno", required: true, example: "ADM001" },
  {
    header: "Class",
    field: "classId",
    example: "Class 5",
    parse: (val, ctx): ParseResult => {
      const classes = ctx.classes as ClassRecord[] | undefined;
      if (!val.trim()) return { ok: true, value: undefined };
      const match = classes?.find(
        (c) => c.name.toLowerCase() === val.trim().toLowerCase(),
      );
      if (!match) return { ok: false, error: `Class "${val}" not found` };
      return { ok: true, value: match.id };
    },
  },
  {
    header: "Gender",
    field: "gender",
    example: "MALE",
    parse: (val): ParseResult => {
      const v = val.trim().toUpperCase();
      if (!v) return { ok: true, value: undefined };
      if (v !== "MALE" && v !== "FEMALE")
        return {
          ok: false,
          error: `Gender must be MALE or FEMALE (got "${val}")`,
        };
      return { ok: true, value: v };
    },
  },
  {
    header: "Date of Birth",
    field: "dateOfBirth",
    example: "15/06/2010",
    parse: (val): ParseResult => {
      if (!val.trim()) return { ok: true, value: undefined };
      // Accept DD/MM/YYYY or YYYY-MM-DD
      const ddmm = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmm) {
        const iso = `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
        if (!isNaN(Date.parse(iso))) return { ok: true, value: iso };
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val)))
        return { ok: true, value: val };
      return { ok: false, error: `Invalid date "${val}" — use DD/MM/YYYY` };
    },
  },
  { header: "Guardian Name", field: "guardianName", example: "Ahmed Abdullah" },
  {
    header: "Phone",
    field: "parentPhone",
    example: "9876543210",
    validate: (val) => {
      if (!val) return null;
      if (!/^\d{10}$/.test(String(val))) return `Phone must be 10 digits`;
      return null;
    },
  },
  {
    header: "Alt Phone",
    field: "parentAltPhone",
    example: "9876543211",
    validate: (val) => {
      if (!val) return null;
      if (!/^\d{10}$/.test(String(val))) return `Alt phone must be 10 digits`;
      return null;
    },
  },
  {
    header: "Relation",
    field: "relationToStudent",
    example: "father",
    parse: (val): ParseResult => {
      const v = val.trim().toLowerCase();
      if (!v) return { ok: true, value: undefined };
      const valid = [
        "father",
        "mother",
        "guardian",
        "uncle",
        "aunt",
        "grandparent",
      ];
      if (!valid.includes(v))
        return {
          ok: false,
          error: `Relation must be one of: ${valid.join(", ")}`,
        };
      return { ok: true, value: v };
    },
  },
  {
    header: "Parent Password",
    field: "parentPassword",
    example: "pass123",
    validate: (val) => {
      if (!val) return null;
      if (String(val).length < 6)
        return "Password must be at least 6 characters";
      return null;
    },
  },
];

// ── Page component ────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();
  const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
  const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeClassId, setActiveClassId] = useState<string | "all">("all");
  const [gender, setGender] = useState<"all" | "MALE" | "FEMALE">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state: null = closed, "add" = adding, StudentRecord = editing
  const [drawer, setDrawer] = useState<null | "add" | StudentRecord>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);

  const [showImport, setShowImport] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load classes once
  useEffect(() => {
    if (!activeClientId || !accessToken) return;
    const ac = new AbortController();
    getAllClasses(activeClientId, accessToken, ac.signal)
      .then(setClasses)
      .catch((e) => {
        setError((e as Error).message);
      });
    return () => ac.abort();
  }, [activeClientId, accessToken]);

  const loadStudents = useCallback(
    async (
      pg: number,
      srch: string,
      clsId: string,
      gen: "all" | "MALE" | "FEMALE",
      lim: number,
      sb?: string,
      sd?: "asc" | "desc",
    ) => {
      if (!activeClientId || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getStudents(activeClientId, accessToken, {
          page: pg,
          limit: lim,
          search: srch || undefined,
          classId: clsId !== "all" ? clsId : undefined,
          gender: gen !== "all" ? gen : undefined,
          status: "ACTIVE",
          sortBy: sb,
          sortOrder: sd,
        });
        setStudents(res.data);
        setTotal(res.total);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [activeClientId, accessToken],
  );

  useEffect(() => {
    loadStudents(
      page,
      search,
      activeClassId,
      gender,
      pageSize,
      sortBy,
      sortDir,
    );
  }, [page, activeClassId, gender, pageSize, sortBy, sortDir, loadStudents]); // eslint-disable-line

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () =>
        loadStudents(1, val, activeClassId, gender, pageSize, sortBy, sortDir),
      400,
    );
  };

  const handleSort = (key: string, dir: "asc" | "desc") => {
    setSortBy(key);
    setSortDir(dir);
    setPage(1);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setFieldErrors({});
    setDrawer("add");
  };

  const openEdit = (student: StudentRecord) => {
    setForm(studentToForm(student));
    setSubmitError(null);
    setFieldErrors({});
    setDrawer(student);
  };

  const handleSubmit = async () => {
    if (!activeClientId || !accessToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateStudentPayload = {
        name: form.name.trim(),
        uid: form.uid.trim() || null,
        adno: form.adno.trim(),
        ...(form.classId ? { classId: form.classId } : {}),
        gender: form.gender,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.guardianName
          ? { guardianName: form.guardianName.trim() }
          : {}),
        ...(form.parentPhone ? { parentPhone: form.parentPhone.trim() } : {}),
        ...(form.parentAltPhone
          ? { parentAltPhone: form.parentAltPhone.trim() }
          : {}),
        ...(form.parentEmail ? { parentEmail: form.parentEmail.trim() } : {}),
        ...(form.relationToStudent
          ? { relationToStudent: form.relationToStudent }
          : {}),
        ...(form.parentPassword ? { parentPassword: form.parentPassword } : {}),
        ...(user?.defaultAcademicYearId
          ? { accademicYearId: user.defaultAcademicYearId }
          : {}),
      };

      if (typeof drawer === "object" && drawer !== null) {
        await updateStudent(activeClientId, accessToken, drawer.id, payload);
      } else {
        await createStudent(activeClientId, accessToken, payload);
      }

      setDrawer(null);
      setPage(1);
      loadStudents(1, search, activeClassId, gender, pageSize, sortBy, sortDir);
    } catch (err) {
      const apiErr = err as import("@/lib/students-api").StudentsApiError;
      setSubmitError(apiErr.message);
      if (apiErr.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteStudent(activeClientId!, accessToken!, deleteTarget.id);
      setDrawer(null);
      setShowDeleteConfirm(false);
      setPage(1);
      loadStudents(1, search, activeClassId, gender, pageSize, sortBy, sortDir);
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete student.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const isEditing = typeof drawer === "object" && drawer !== null;
  const canWrite = user?.actorType !== "TEAM_LEADER";

  // Import config (bound to current auth + classes)
  const importConfig = useMemo<ImportConfig<CreateStudentPayload>>(
    () => ({
      entityName: "Students",
      templateFilename: "student-import-template",
      columns: STUDENT_IMPORT_COLUMNS,
      createRow: (row) =>
        createStudent(activeClientId!, accessToken!, {
          ...row,
          ...(user?.defaultAcademicYearId
            ? { accademicYearId: user.defaultAcademicYearId }
            : {}),
        }),
      context: { classes },
    }),
    [activeClientId, accessToken, user?.defaultAcademicYearId, classes],
  ); // eslint-disable-line

  // DataTable column definitions
  const columns = useMemo(
    (): Column<StudentRecord>[] => [
      {
        key: "name",
        header: "Student",
        sortable: true,
        render: (s) => {
          const av =
            s.gender === "FEMALE" ? GENDER_AVATAR.FEMALE : GENDER_AVATAR.MALE;
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                  av.bg,
                  av.text,
                )}
              >
                {s.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">
                  {s.name}
                </p>
                <p className="text-xs text-gray-400">{s.adno}</p>
              </div>
            </div>
          );
        },
      },
      {
        key: "class",
        header: "Class",
        render: (s) =>
          s.class ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
              {s.class.name}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        key: "gender",
        header: "Gender",
        sortable: true,
        render: (s) => (
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-lg",
              s.gender === "FEMALE"
                ? "bg-pink-100 text-pink-700"
                : "bg-indigo-100 text-indigo-700",
            )}
          >
            {s.gender === "FEMALE" ? "Girls" : "Boys"}
          </span>
        ),
        className: "hidden sm:table-cell",
        headerClass: "hidden sm:table-cell",
      },
      {
        key: "guardianName",
        header: "Guardian",
        sortable: true,
        render: (s) =>
          s.guardianName ? (
            <span className="text-sm text-gray-600">{s.guardianName}</span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
        className: "hidden lg:table-cell",
        headerClass: "hidden lg:table-cell",
      },
      {
        key: "actions",
        header: "",
        render: (s) => (
          <div className="flex items-center gap-1.5 justify-end">
            {canWrite && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(s);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors text-xs font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {/* <span className="hidden sm:inline">Edit</span> */}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(s);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={deleting === s.id}
                  className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Delete Student"
                >
                  {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`${slugPrefix}/admin/students/${s.id}`);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5" />
              {/* <span className="hidden sm:inline">{t("adminPages", "viewBtn", lang)}</span> */}
            </button>
          </div>
        ),
        className: "text-right",
      },
    ],
    [lang, navigate, canWrite],
  ); // eslint-disable-line

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "studentsTitle", lang)}
        subtitle={`${total} ${t("common", "students", lang).toLowerCase()}`}
        icon={Users}
        action={
          canWrite ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />{" "}
                {t("adminPages", "addStudent", lang)}
              </button>
            </div>
          ) : undefined
        }
      />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={() =>
            loadStudents(
              page,
              search,
              activeClassId,
              gender,
              pageSize,
              sortBy,
              sortDir,
            )
          }
        />
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("adminPages", "searchNameOrAdm", lang)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

      {/* Filters row — class dropdown + gender select */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={activeClassId}
            onChange={(e) => {
              setActiveClassId(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
          >
            <option value="all">All Classes ({total})</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
                {cls.studentCount != null ? ` (${cls.studentCount})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value as typeof gender);
              setPage(1);
            }}
            className="pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="MALE">Boys</option>
            <option value="FEMALE">Girls</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={students}
        keyExtractor={(s) => s.id}
        loading={loading}
        error={error}
        emptyIcon={Users}
        emptyMessage={t("adminPages", "noStudentsFound", lang)}
        emptySubtext={t("adminPages", "tryAdjustFilter", lang)}
        onRowClick={(s) => navigate(`${slugPrefix}/admin/students/${s.id}`)}
        onSort={handleSort}
        sortKey={sortBy}
        sortDir={sortDir}
        pagination={{
          page,
          totalPages,
          total,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: setPage,
          onPageSizeChange: (sz) => {
            setPageSize(sz);
            setPage(1);
          },
        }}
        mobileRender={(s) => {
          return (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0",
                    s.gender === "FEMALE"
                      ? "bg-pink-100 text-pink-700"
                      : "bg-indigo-100 text-indigo-700",
                  )}
                >
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.adno}
                    {s.class?.name ? ` · ${s.class.name}` : ""}
                  </p>
                  {s.guardianName && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.guardianName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canWrite && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(s);
                      }}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(s);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleting === s.id}
                      className="p-2 rounded-xl text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`${slugPrefix}/admin/students/${s.id}`);
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {t("adminPages", "viewBtn", lang)}
                  </span>
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* ── Add / Edit Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drawer !== null && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(null)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                key="drawer-panel"
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
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    {isEditing
                      ? "Edit Student"
                      : t("adminPages", "newAdmission", lang)}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("adminPages", "fillStudentDetails", lang)}
                  </p>
                </div>
                <button
                  onClick={() => setDrawer(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 pb-8">
                {submitError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {submitError}
                  </div>
                )}

                {/* Student Info */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                      1
                    </div>
                    <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                      {t("adminPages", "studentInfo", lang)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        key: "name" as const,
                        label: t("adminPages", "studentName", lang),
                        placeholder: t("adminPages", "fullName", lang),
                        type: "text",
                      },
                      {
                        key: "uid" as const,
                        label: "Student UID",
                        placeholder: "Optional unique identifier",
                        type: "text",
                      },
                      {
                        key: "adno" as const,
                        label: t("adminPages", "admissionNumber", lang),
                        placeholder: t("adminPages", "admNoPlaceholder", lang),
                        type: "text",
                      },
                      {
                        key: "dateOfBirth" as const,
                        label: t("adminPages", "dateOfBirth2", lang),
                        placeholder: "",
                        type: "date",
                      },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={form[key]}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, [key]: e.target.value }));
                            setFieldErrors((fe) => ({ ...fe, [key]: "" }));
                          }}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl border bg-gray-50 focus:outline-none focus:bg-white text-sm transition-colors",
                            fieldErrors[key]
                              ? "border-red-400 focus:border-red-400"
                              : "border-gray-200 focus:border-emerald-400",
                          )}
                        />
                        {fieldErrors[key] && (
                          <p className="text-xs text-red-500 mt-1 px-1">
                            {fieldErrors[key]}
                          </p>
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("adminPages", "gender", lang)}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["MALE", "FEMALE"] as const).map((g) => (
                          <label
                            key={g}
                            className={cn(
                              "flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                              form.gender === g
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-gray-200 bg-gray-50 text-gray-700",
                            )}
                          >
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={form.gender === g}
                              onChange={() =>
                                setForm((f) => ({ ...f, gender: g }))
                              }
                              className="sr-only"
                            />
                            {g === "MALE"
                              ? t("adminPages", "male", lang)
                              : t("adminPages", "female", lang)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {t("adminPages", "classField", lang)}
                      </label>
                      <select
                        value={form.classId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, classId: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
                      >
                        <option value="">— No class —</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <div className="border-t border-dashed border-gray-200" />

                {/* Parent Info */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      2
                    </div>
                    <p className="text-sm font-bold text-teal-700 uppercase tracking-wide">
                      {t("adminPages", "parentInfo", lang)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        key: "guardianName" as const,
                        label: t("adminPages", "fatherNameForm", lang),
                        placeholder: t("adminPages", "fatherFullName", lang),
                        type: "text",
                      },
                      {
                        key: "parentPhone" as const,
                        label: t("adminPages", "phoneNumber", lang),
                        placeholder: t("adminPages", "tenDigitMobile", lang),
                        type: "tel",
                      },
                      {
                        key: "parentAltPhone" as const,
                        label: "Alt. Phone",
                        placeholder: "Alternate mobile",
                        type: "tel",
                      },
                      // {
                      //   key: "parentEmail" as const,
                      //   label: "Parent Email",
                      //   placeholder: "parent@email.com",
                      //   type: "email",
                      // },
                      {
                        key: "parentPassword" as const,
                        label: t("adminPages", "parentLoginPwd", lang),
                        placeholder: t("adminPages", "minSixChars", lang),
                        type: "password",
                      },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {label}
                        </label>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={form[key]}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, [key]: e.target.value }));
                            setFieldErrors((fe) => ({ ...fe, [key]: "" }));
                          }}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl border bg-gray-50 focus:outline-none focus:bg-white text-sm transition-colors",
                            fieldErrors[key]
                              ? "border-red-400 focus:border-red-400"
                              : "border-gray-200 focus:border-teal-400",
                          )}
                        />
                        {fieldErrors[key] && (
                          <p className="text-xs text-red-500 mt-1 px-1">
                            {fieldErrors[key]}
                          </p>
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Relation to student
                      </label>
                      <select
                        value={form.relationToStudent}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            relationToStudent: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-teal-400 text-sm"
                      >
                        {[
                          "father",
                          "mother",
                          "guardian",
                          "uncle",
                          "aunt",
                          "grandparent",
                        ].map((r) => (
                          <option key={r} value={r} className="capitalize">
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                {isEditing && canWrite && (
                  <button
                    onClick={() => {
                      setDeleteTarget(drawer as StudentRecord);
                      setShowDeleteConfirm(true);
                    }}
                    type="button"
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting || !form.name.trim() || !form.adno.trim()
                  }
                  className={cn(
                    "bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform shadow-lg shadow-emerald-200 disabled:opacity-60",
                    isEditing && canWrite ? "flex-1" : "w-full",
                  )}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </span>
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    t("adminPages", "admitStudent", lang)
                  )}
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Import Modal ── */}
      <ImportModal
        show={showImport}
        config={importConfig}
        onComplete={() => {
          setPage(1);
          loadStudents(
            1,
            search,
            activeClassId,
            gender,
            pageSize,
            sortBy,
            sortDir,
          );
        }}
        onClose={() => setShowImport(false)}
      />

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
                <h3 className="font-bold text-gray-900 text-lg">Delete Student?</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete student <strong>{deleteTarget?.name}</strong>? This action cannot be undone and will delete all parent link mappings.
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
