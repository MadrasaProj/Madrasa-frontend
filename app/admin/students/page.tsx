import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  Users,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const [activeClassId, setActiveClassId] = useState<string | "all">("all");
  const [gender, setGender] = useState<"all" | "MALE" | "FEMALE">("all");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");

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
      status: statusFilter !== "all" ? statusFilter : undefined,
      sortBy: sortBy,
      sortOrder: sortDir,
    }),
    [page, pageSize, search, activeClassId, gender, statusFilter, sortBy, sortDir],
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
  const handleSearch = (val: string) => {
    setSearchInput(val);
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, search, activeClassId, gender, statusFilter, sortBy, sortDir]);

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
        toast.success("Student deleted successfully");
        setDrawer(null);
        setShowDeleteConfirm(false);
        setPage(1);
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to delete student");
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
        // Frontend pre-validation: check that students sharing a parent phone have consistent passwords
        const phoneGroups = new Map<string, Array<{ rowNum: number; password: string }>>();
        rows.forEach((r, idx) => {
          let digits = r.parentPhone ? String(r.parentPhone).replace(/\D/g, "") : "";
          if (digits.length === 12 && digits.startsWith("91")) {
            digits = digits.slice(2);
          }
          if (digits && digits.length >= 7) {
            if (!phoneGroups.has(digits)) phoneGroups.set(digits, []);
            phoneGroups.get(digits)!.push({
              rowNum: idx + 1,
              password: r.parentPassword ? String(r.parentPassword).trim() : "",
            });
          }
        });

        for (const [phone, group] of phoneGroups.entries()) {
          if (group.length > 1) {
            const distinct = Array.from(new Set(group.map((g) => g.password)));
            if (distinct.length > 1) {
              const rowList = group.map((g) => `Row ${g.rowNum}`).join(", ");
              const hasEmpty = distinct.some((p) => !p);
              if (hasEmpty) {
                throw new Error(
                  `Conflict in import file: ${rowList} share parent phone (${phone}), but some have passwords while others are blank. In bulk import, all students with the same parent phone must have the same password or leave it blank.`
                );
              } else {
                throw new Error(
                  `Conflict in import file: ${rowList} share parent phone (${phone}), but have conflicting passwords. All students with the same parent phone must have the same password.`
                );
              }
            }
          }
        }

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

  const visibleSelectedCount = students.filter((student) => selectedIds.has(student.id)).length;
  const allVisibleSelected = students.length > 0 && visibleSelectedCount === students.length;
  const sortValue = sortBy ? `${sortBy}:${sortDir}` : "default";

  return (
    <DashboardLayout>
      <PageHeader title={t("adminPages", "studentsTitle", lang)} />

      {error && (
        <ApiErrorBanner
          message={(error as Error).message}
          onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.students.all })}
        />
      )}

      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
        <div className="min-w-0 border-r border-gray-100 p-2.5 sm:p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {t("common", "students", lang)}
          </div>
          <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">
            {isLoading ? "—" : total}
          </span>
        </div>
        <div className="min-w-0 p-2.5 sm:p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />
            {t("adminPages", "allClassesFilter", lang)}
          </div>
          <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">
            {classes.length}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canWrite && (
          <>
            <Button type="button" variant="outline" className="shadow-none" onClick={() => setShowImport(true)}>
              <Upload aria-hidden="true" />
              {t("adminPages", "importBtn", lang)}
            </Button>
            <Button type="button" className="shadow-none" onClick={openAdd}>
              <Plus aria-hidden="true" />
              {t("adminPages", "addStudent", lang)}
            </Button>
          </>
        )}
      </div>

      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            size="lg"
            value={searchInput}
            onChange={(event) => handleSearch(event.target.value)}
            aria-label={t("adminPages", "searchNameOrAdm", lang)}
            placeholder={t("adminPages", "searchNameOrAdm", lang)}
            className="bg-white pl-10 shadow-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <DrawerSelector
            title={t("adminPages", "classCol", lang)}
            options={[
              { value: "all", label: t("adminPages", "allClassesFilter", lang) },
              ...classes.map((cls) => ({
                value: cls.id,
                label: `${cls.name}${cls.studentCount != null ? ` (${cls.studentCount})` : ""}`,
              })),
            ]}
            value={activeClassId}
            onChange={(value) => { setActiveClassId(value); setPage(1); }}
            className="shadow-none"
          />
          <DrawerSelector
            title={t("adminPages", "genderCol", lang)}
            options={[
              { value: "all", label: t("adminPages", "allFilter", lang) },
              { value: "MALE", label: t("adminPages", "boysFilter", lang) },
              { value: "FEMALE", label: t("adminPages", "girlsFilter", lang) },
            ]}
            value={gender}
            onChange={(value) => { setGender(value as typeof gender); setPage(1); }}
            className="shadow-none"
          />
          <DrawerSelector
            title="Status"
            options={[
              { value: "all", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "GRADUATED", label: "Graduated" },
              { value: "TRANSFERRED", label: "Transferred" },
              { value: "DROPPED_OUT", label: "Dropped out" },
            ]}
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            className="shadow-none"
          />
          <DrawerSelector
            title="Sort students"
            options={[
              { value: "default", label: "Default order" },
              { value: "name:asc", label: "Name A–Z" },
              { value: "name:desc", label: "Name Z–A" },
              { value: "gender:asc", label: "Gender A–Z" },
              { value: "gender:desc", label: "Gender Z–A" },
              { value: "guardianName:asc", label: "Guardian A–Z" },
              { value: "guardianName:desc", label: "Guardian Z–A" },
              { value: "status:asc", label: "Status A–Z" },
              { value: "status:desc", label: "Status Z–A" },
            ]}
            value={sortValue}
            onChange={(value) => {
              if (value === "default") {
                setSortBy(undefined);
                setSortDir("asc");
                setPage(1);
                return;
              }
              const [key, direction] = value.split(":");
              handleSort(key, direction as "asc" | "desc");
            }}
            className="shadow-none"
          />
        </div>
      </div>

      {visibleSelectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-sm font-semibold text-primary-800">
            {visibleSelectedCount} {t("common", "selected", lang)}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="bg-white shadow-none" onClick={() => setSelectedIds(new Set())}>
              <X aria-hidden="true" />
              {t("common", "cancel", lang)}
            </Button>
            {canWrite && (
              <Button type="button" size="sm" variant="destructive" className="shadow-none" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 aria-hidden="true" />
                {t("adminPages", "deleteStudentTitle", lang)}
              </Button>
            )}
          </div>
        </div>
      )}

      <section aria-label={t("adminPages", "studentsTitle", lang)}>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-none">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Users aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">{t("adminPages", "noStudentsFound", lang)}</p>
              <p className="mt-1 text-xs text-gray-500">{t("adminPages", "tryAdjustFilter", lang)}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label="Select all students on this page"
                />
                <span className="text-xs font-medium text-gray-500">Select all on this page</span>
              </div>
              {students.map((student) => {
                const avatar = student.gender === "FEMALE" ? GENDER_AVATAR.FEMALE : student.gender === "MALE" ? GENDER_AVATAR.MALE : GENDER_AVATAR.null;
                return (
                  <div key={student.id} className="flex items-center gap-2 px-4 py-4 sm:gap-3">
                    <Checkbox
                      checked={selectedIds.has(student.id)}
                      onCheckedChange={(checked) => handleSelectOne(student.id, checked === true)}
                      aria-label={`Select ${student.name}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate(`${slugPrefix}/admin/students/${student.id}`)}
                      className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-lg px-0 py-0 text-left whitespace-normal shadow-none hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                    >
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 object-cover" />
                      ) : (
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", avatar.bg, avatar.text)}>
                          {student.name.charAt(0)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{student.name}</span>
                        <span className="mt-1 block truncate text-xs text-gray-500">
                          {student.adno}{student.class?.name ? ` · ${student.class.name}` : ""}{student.guardianName ? ` · ${student.guardianName}` : ""}
                        </span>
                      </span>
                      <span className={cn(
                        "hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold sm:inline-flex",
                        student.status === "ACTIVE" || !student.status ? "bg-emerald-100 text-emerald-700" : student.status === "INACTIVE" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700",
                      )}>
                        {student.status ?? "ACTIVE"}
                      </span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
                    </Button>
                    {canWrite && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button type="button" size="icon-xs" variant="ghost" aria-label={`Edit ${student.name}`} onClick={() => openEdit(student)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Delete ${student.name}`}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deleteMutation.isPending && deleteTarget?.id === student.id}
                          onClick={() => { setDeleteTarget(student); setShowDeleteConfirm(true); }}
                        >
                          {deleteMutation.isPending && deleteTarget?.id === student.id ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="tabular-nums">{total} total</span>
          <DrawerSelector
            title="Students per page"
            options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onChange={(value) => { setPageSize(Number(value)); setPage(1); }}
            className="h-9 w-20 shadow-none"
          />
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button type="button" size="icon-xs" variant="outline" className="shadow-none" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-16 text-center text-sm font-medium tabular-nums text-gray-600">{page} / {totalPages}</span>
            <Button type="button" size="icon-xs" variant="outline" className="shadow-none" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

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
          toast.success("Import completed successfully");
          setPage(1);
          invalidateList();
        }}
        onClose={() => setShowImport(false)}
      />

      <ResponsivePopover
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!deleteMutation.isPending) setShowDeleteConfirm(open); }}
        title={t("adminPages", "deleteStudentTitle", lang)}
        footer={
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1 shadow-none" disabled={deleteMutation.isPending} onClick={() => setShowDeleteConfirm(false)}>
              {t("common", "cancel", lang)}
            </Button>
            <Button type="button" variant="destructive" className="flex-1 shadow-none" disabled={deleteMutation.isPending} onClick={handleDelete}>
              {deleteMutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
              {deleteMutation.isPending ? t("adminPages", "deletingLabel", lang) : t("adminPages", "deleteConfirm", lang)}
            </Button>
          </div>
        }
      >
        <p className="px-4 py-4 text-sm text-gray-600">
          {t("adminPages", "deleteStudentConfirm", lang).replace("{name}", deleteTarget?.name ?? "")}
        </p>
      </ResponsivePopover>

      <ResponsivePopover
        open={showBulkDeleteConfirm}
        onOpenChange={(open) => { if (!bulkDeleteMutation.isPending) setShowBulkDeleteConfirm(open); }}
        title={t("adminPages", "deleteStudentTitle", lang)}
        footer={
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1 shadow-none" disabled={bulkDeleteMutation.isPending} onClick={() => setShowBulkDeleteConfirm(false)}>
              {t("common", "cancel", lang)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 shadow-none"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                bulkDeleteMutation.mutate(Array.from(selectedIds), {
                  onSuccess: () => {
                    setShowBulkDeleteConfirm(false);
                    setSelectedIds(new Set());
                    setPage(1);
                  },
                  onError: () => setShowBulkDeleteConfirm(false),
                });
              }}
            >
              {bulkDeleteMutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
              {bulkDeleteMutation.isPending ? t("adminPages", "deletingLabel", lang) : t("adminPages", "deleteConfirm", lang)}
            </Button>
          </div>
        }
      >
        <p className="px-4 py-4 text-sm text-gray-600">
          {t("adminPages", "bulkDeleteStudentsConfirm", lang).replace("{count}", String(selectedIds.size))}
        </p>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
