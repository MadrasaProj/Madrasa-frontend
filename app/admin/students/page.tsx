import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  createStudent,
  bulkImportStudentsV2,
  type StudentRecord,
  type CreateStudentPayload,
} from "@/lib/students-api";
import { type ClassRecord } from "@/lib/classes-api";
import { useClasses, useStudentsList, useDeleteStudent, useBulkDeleteStudents } from "@/lib/queries";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import StudentEditDrawer from "@/components/admin/StudentEditDrawer";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { parse, isValid, format } from "date-fns";
import {
  Plus,
  Search,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  Phone,
  Check,
  Users,
  Upload,
  X,
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

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
    />
  );
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
  {
    header: "UID",
    field: "uid",
    example: "UID12345",
  },
  {
    header: "Address",
    field: "address",
    example: "123 Main St",
  },
  {
    header: "City",
    field: "city",
    example: "Kozhikode",
  },
  {
    header: "State",
    field: "state",
    example: "Kerala",
  },
  {
    header: "Country",
    field: "country",
    example: "India",
  },
  {
    header: "Pincode",
    field: "pincode",
    example: "673001",
  },
  {
    header: "Blood Group",
    field: "bloodGroup",
    example: "O+",
  },
  {
    header: "Emergency Contact Name",
    field: "emergencyContactName",
    example: "Uncle John",
  },
  {
    header: "Emergency Contact Phone",
    field: "emergencyContactPhone",
    example: "9876543212",
    validate: (val) => {
      if (!val) return null;
      if (!/^\d{10}$/.test(String(val))) return `Emergency phone must be 10 digits`;
      return null;
    },
  },
  {
    header: "Medical Notes",
    field: "medicalNotes",
    example: "Asthma",
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
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | "all">("all");
  const [gender, setGender] = useState<"all" | "MALE" | "FEMALE">("all");

  const [drawer, setDrawer] = useState<null | "add" | StudentRecord>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [showImport, setShowImport] = useState(false);

  const ctx = useMemo(
    () => ({ clientId: activeClientId!, token: accessToken! }),
    [activeClientId, accessToken],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkDeleteMutation = useBulkDeleteStudents(ctx);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search || undefined,
      classId: activeClassId !== "all" ? activeClassId : undefined,
      gender: gender !== "all" ? gender : undefined,
      status: "ACTIVE" as const,
      sortBy: sortBy,
      sortOrder: sortDir,
    }),
    [page, pageSize, search, activeClassId, gender, sortBy, sortDir],
  );

  const { data, isLoading, error } = useStudentsList(ctx, queryParams, {
    enabled: !!activeClientId && !!accessToken,
  });
  const deleteMutation = useDeleteStudent(ctx);

  const students = data?.data ?? [];
  const total = data?.total ?? 0;

  const { data: classesData } = useClasses({
    clientId: activeClientId ?? "",
    token: accessToken ?? "",
  });
  const classes = classesData ?? [];
console.log(classes);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const handleSort = (key: string, dir: "asc" | "desc") => {
    setSortBy(key);
    setSortDir(dir);
    setPage(1);
  };

  const openAdd = () => setDrawer("add");
  const openEdit = (student: StudentRecord) => setDrawer(student);
  const closeDrawer = () => setDrawer(null);

  const invalidateList = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.students.all });
  }, [qc]);

  const handleStudentSaved = () => {
    setDrawer(null);
    setPage(1);
    invalidateList();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDrawer(null);
        setShowDeleteConfirm(false);
        setPage(1);
      },
      onError: (err) => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const totalPages = Math.ceil(total / pageSize);
  const isEditing = typeof drawer === "object" && drawer !== null;
  const canWrite = user?.actorType !== "TEAM_LEADER";

  const importConfig = useMemo<ImportConfig<CreateStudentPayload>>(
    () => ({
      entityName: "Students",
      templateFilename: "student-import-template",
      columns: STUDENT_IMPORT_COLUMNS,
      templateSamples: classes.map((c) => ({
        "Name": "Mohammed Abdullah",
        "Admission No": `ADM${(c.classLevel ?? 0).toString().padStart(2, "0")}${c.division ?? ""}001`,
        "Class": c.name,
        "Gender": "MALE",
        "Date of Birth": "15/06/2010",
        "Guardian Name": "Ahmed Abdullah",
        "Phone": "9876543210",
        "Relation": "father",
      })),
      createRow: (row) =>
        createStudent(activeClientId!, accessToken!, {
          ...row,
          ...(user?.defaultAcademicYearId
            ? { accademicYearId: user.defaultAcademicYearId }
            : {}),
        }),
      createBulk: async (rows) => {
        const enriched = rows.map((r) => ({
          ...r,
          ...(user?.defaultAcademicYearId
            ? { accademicYearId: user.defaultAcademicYearId }
            : {}),
        }));
        const res = await bulkImportStudentsV2(activeClientId!, accessToken!, enriched);
        return {
          imported: res.imported || [],
          failed: res.failed || [],
        };
      },
      context: { classes },
    }),
    [activeClientId, accessToken, user?.defaultAcademicYearId, classes],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(students.map((s) => s.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [students],
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const columns = useMemo(
    (): Column<StudentRecord>[] => [
      {
        key: "__checkbox",
        header: (
          <IndeterminateCheckbox
            checked={students.length > 0 && selectedIds.size === students.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < students.length}
            onChange={(checked) => handleSelectAll(checked)}
          />
        ),
        render: (s) => (
          <input
            type="checkbox"
            checked={selectedIds.has(s.id)}
            onChange={(e) => handleSelectOne(s.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ),
        className: "w-10",
        headerClass: "w-10",
      },
      {
        key: "name",
        header: t("adminPages", "studentCol", lang),
        sortable: true,
        render: (s) => {
          const av =
            s.gender === "FEMALE" ? GENDER_AVATAR.FEMALE : GENDER_AVATAR.MALE;
          return (
            <div className="flex items-center gap-3">
              {s.photoUrl ? (
                <img
                  src={s.photoUrl}
                  alt={s.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                    av.bg,
                    av.text,
                  )}
                >
                  {s.name.charAt(0)}
                </div>
              )}
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
        header: t("adminPages", "classCol", lang),
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
        header: t("adminPages", "genderCol", lang),
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
            {s.gender === "FEMALE"
              ? t("adminPages", "girlsLabel", lang)
              : t("adminPages", "boysLabel", lang)}
          </span>
        ),
        className: "hidden sm:table-cell",
        headerClass: "hidden sm:table-cell",
      },
      {
        key: "guardianName",
        header: t("adminPages", "guardianCol", lang),
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
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(s);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={deleteMutation.isPending && deleteTarget?.id === s.id}
                  className="p-1.5 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                  title={t("adminPages", "deleteStudentTitle", lang)}
                >
                  {deleteMutation.isPending && deleteTarget?.id === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
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
            </button>
          </div>
        ),
        className: "text-right",
      },
    ],
    [lang, navigate, canWrite, deleteMutation.isPending, deleteTarget, students, selectedIds, handleSelectAll, handleSelectOne],
  );

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
                <span className="hidden sm:inline">
                  {t("adminPages", "importBtn", lang)}
                </span>
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
          message={(error as Error).message}
          onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.students.all })}
        />
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("adminPages", "searchNameOrAdm", lang)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
      </div>

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
            <option value="all">
              {t("adminPages", "allClassesFilter", lang)} ({total})
            </option>
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
            <option value="all">{t("adminPages", "allFilter", lang)}</option>
            <option value="MALE">{t("adminPages", "boysFilter", lang)}</option>
            <option value="FEMALE">
              {t("adminPages", "girlsFilter", lang)}
            </option>
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4"
        >
          <span className="text-sm font-semibold text-emerald-800">
            {selectedIds.size} {t("common", "selected", lang)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {t("common", "cancel", lang)}
            </button>
            {canWrite && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("adminPages", "deleteStudentTitle", lang)}
              </button>
            )}
          </div>
        </motion.div>
      )}

      <DataTable
        columns={columns}
        data={students}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        error={error ? (error as Error).message : null}
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
        mobileRender={(s) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(s.id)}
                onChange={(e) => handleSelectOne(s.id, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              {s.photoUrl ? (
                <img
                  src={s.photoUrl}
                  alt={s.name}
                  className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-gray-200"
                />
              ) : (
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
              )}
              <div>
                <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.adno}
                  {s.class?.name ? ` · ${s.class.name}` : ""}
                </p>
                {s.guardianName && (
                  <p className="text-xs text-gray-400 mt-0.5">{s.guardianName}</p>
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
                    disabled={deleteMutation.isPending && deleteTarget?.id === s.id}
                    className="p-2 rounded-xl text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deleteMutation.isPending && deleteTarget?.id === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
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
        )}
      />

      <StudentEditDrawer
        open={drawer !== null}
        onClose={closeDrawer}
        mode={drawer === "add" ? "add" : "edit"}
        student={typeof drawer === "object" ? drawer : null}
        classes={classes}
        onSaved={handleStudentSaved}
        onDelete={
          isEditing
            ? () => {
                if (typeof drawer === "object" && drawer !== null) {
                  setDeleteTarget(drawer);
                  setShowDeleteConfirm(true);
                }
              }
            : undefined
        }
      />

      <ImportModal
        show={showImport}
        config={importConfig}
        onComplete={() => {
          setPage(1);
          invalidateList();
        }}
        onClose={() => setShowImport(false)}
      />

      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              key="del-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleteMutation.isPending && setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              key="del-dialog"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {t("adminPages", "deleteStudentTitle", lang)}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("adminPages", "deleteStudentConfirm", lang).replace(
                    "{name}",
                    deleteTarget?.name ?? "",
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t("common", "cancel", lang)}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleteMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t("adminPages", "deletingLabel", lang)}
                    </span>
                  ) : (
                    t("adminPages", "deleteConfirm", lang)
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <>
            <motion.div
              key="bulk-del-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !bulkDeleteMutation.isPending && setShowBulkDeleteConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              key="bulk-del-dialog"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {t("adminPages", "deleteStudentTitle", lang)}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("adminPages", "bulkDeleteStudentsConfirm", lang).replace(
                    "{count}",
                    String(selectedIds.size),
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  disabled={bulkDeleteMutation.isPending}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t("common", "cancel", lang)}
                </button>
                <button
                  onClick={() => {
                    bulkDeleteMutation.mutate(Array.from(selectedIds), {
                      onSuccess: () => {
                        setShowBulkDeleteConfirm(false);
                        setSelectedIds(new Set());
                        setPage(1);
                      },
                      onError: () => {
                        setShowBulkDeleteConfirm(false);
                      },
                    });
                  }}
                  disabled={bulkDeleteMutation.isPending}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {bulkDeleteMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      {t("adminPages", "deletingLabel", lang)}
                    </span>
                  ) : (
                    t("adminPages", "deleteConfirm", lang)
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
