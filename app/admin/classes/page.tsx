import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DrawerSelector } from "@/components/DrawerSelector";
import {
  createClass, updateClass, deleteClass,
  type ClassRecord, type CreateClassPayload, type UpdateClassPayload,
} from "@/lib/classes-api";
import { useClasses, useGradeLevels, useTeachers, useStudentsList } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getSubjects } from "@/lib/subjects-api";
import {
  School, Plus, Loader2, BookOpen, Users, Trash2, Search, ChevronRight, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

const DIVISION_OPTIONS = ["A", "B", "C", "D"];

interface FormState {
  name: string;
  gradeLevelId: string;
  division: string;
  classTeacherId: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY_FORM: FormState = { name: "", gradeLevelId: "", division: "", classTeacherId: "", status: "ACTIVE" };

function classToForm(c: ClassRecord): FormState {
  return {
    name: c.name,
    gradeLevelId: c.gradeLevelId ?? "",
    division: c.division ?? "",
    classTeacherId: c.classTeacherId ?? "",
    status: (c.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
  };
}

export default function AdminClassesPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid   = activeClientId ?? "";
  const token = accessToken ?? "";

  const isAdmin = user?.actorType === "CLIENT_ADMIN" || user?.actorType === "SUPER_ADMIN";

  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRecord | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget]           = useState<ClassRecord | null>(null);

  // Debounce searchInput to searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load classes using cached query hook
  const { data: classesData, isLoading: loadingClasses, error: classesError } = useClasses(
    { clientId: cid, token },
    { search: searchQuery || undefined }
  );

  // Load grade levels using cached query hook
  const { data: gradeLevelsData } = useGradeLevels({ clientId: cid, token });

  // Load teachers using cached query hook
  const { data: teachersData } = useTeachers({ clientId: cid, token });

  const selectedClassId = selectedClass?.id ?? "";
  const { data: subjectsData, isPending: loadingSubjects, error: subjectsError, refetch: refetchSubjects } = useQuery({
    queryKey: ["subjects", "class", cid, selectedClassId],
    queryFn: ({ signal }) => getSubjects(cid, token, { classId: selectedClassId, signal }),
    enabled: !!cid && !!token && !!selectedClassId,
  });
  const { data: studentsData, isPending: loadingStudents, error: studentsError, refetch: refetchStudents } = useStudentsList(
    { clientId: cid, token },
    { classId: selectedClassId, page: studentPage, limit: 20 },
    { enabled: !!cid && !!token && !!selectedClassId },
  );

  const classes = classesData ?? [];
  const gradeLevels = gradeLevelsData ?? [];
  const teachers = teachersData?.data ?? [];
  const [actionError, setActionError] = useState<string | null>(null);
  const error = classesError ? classesError.message : actionError;

  const updateClassName = (gradeLevelId: string, division: string) => {
    const gradeName = gradeLevels.find((grade) => grade.id === gradeLevelId)?.name;
    return gradeName ? (division ? `${gradeName} ${division}` : gradeName) : "";
  };

  const changeGradeLevel = (gradeLevelId: string) => {
    setForm((current) => ({ ...current, gradeLevelId, name: updateClassName(gradeLevelId, current.division) }));
  };

  const changeDivision = (division: string) => {
    setForm((current) => ({ ...current, division, name: updateClassName(current.gradeLevelId, division) || current.name }));
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(""); setShowDrawer(true);
  };

  const openEdit = (c: ClassRecord) => {
    setSelectedClass(null);
    setEditTarget(c); setForm(classToForm(c)); setSaveError(""); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Display name is required"); return; }
    const divisionVal = form.division;
    setSaving(true); setSaveError("");
    try {
      if (editTarget) {
        await updateClass(cid, token, editTarget.id, {
          name: form.name.trim(),
          gradeLevelId: form.gradeLevelId || null,
          division: divisionVal || null,
          classTeacherId: form.classTeacherId || null,
          status: form.status,
        } as UpdateClassPayload);
        toast.success("Class updated successfully");
      } else {
        await createClass(cid, token, {
          name: form.name.trim(),
          gradeLevelId: form.gradeLevelId || undefined,
          division: divisionVal || undefined,
          classTeacherId: form.classTeacherId || null,
          accademicYearId: user?.defaultAcademicYearId ?? undefined,
        } as CreateClassPayload);
        toast.success("Class created successfully");
      }
      qc.invalidateQueries({ queryKey: queryKeys.classes.all });
      setShowDrawer(false);
    } catch (e) {
      setSaveError((e as Error).message);
      toast.error((e as Error).message || "Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setActionError(null);
    try {
      await deleteClass(cid, token, deleteTarget.id);
      toast.success("Class deleted successfully");
      qc.invalidateQueries({ queryKey: queryKeys.classes.all });
      setShowDeleteConfirm(false);
    } catch (e) {
      setActionError((e as Error).message);
      toast.error((e as Error).message || "Failed to delete class");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(null);
    }
  };

  const stats = [
    { label: searchQuery ? "Matching classes" : "Classes", value: classes.length, icon: School },
    { label: "Students", value: classes.reduce((total, item) => total + (item.studentCount ?? 0), 0), icon: Users },
    { label: "Subjects", value: classes.reduce((total, item) => total + (item.subjectCount ?? 0), 0), icon: BookOpen },
    { label: "Class teachers", value: classes.filter((item) => item.classTeacherId).length, icon: GraduationCap },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Classes" />

      <div className="space-y-5 pb-24 lg:pb-20">
        {error && <ApiErrorBanner message={error} onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.classes.all })} />}

        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            aria-label="Search classes"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search classes…"
            size="lg"
            className="bg-white pl-10 shadow-none"
          />
        </div>

        {!loadingClasses && (
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
            {stats.map(({ label, value, icon: Icon }, index) => (
              <div key={label} className={`min-w-0 p-2.5 sm:p-3 ${index % 2 === 0 ? "border-r border-gray-100" : ""} ${index < 2 ? "border-b border-gray-100" : ""}`}>
                <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700">
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{label}</span>
                </div>
                <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{value}</span>
              </div>
            ))}
          </div>
        )}

        <section aria-labelledby="classes-list-title">
          <h2 id="classes-list-title" className="mb-2 px-1 text-sm font-semibold text-gray-700">All classes</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {loadingClasses ? Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48 max-w-full" /></div>
                <Skeleton className="h-4 w-16" />
              </div>
            )) : classes.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">{searchQuery ? "No classes match your search" : "No classes found"}</p>
            ) : classes.map((classRecord) => (
              <button
                key={classRecord.id}
                type="button"
                aria-haspopup="dialog"
                onClick={() => { setStudentPage(1); setSelectedClass(classRecord); }}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{classRecord.name}</span>
                  <span className="mt-1 block truncate text-xs text-gray-500">{classRecord.classTeacher?.name ?? "No class teacher"}{classRecord.status === "INACTIVE" ? " · Inactive" : ""}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-primary-700">{classRecord.studentCount ?? 0} students</span>
                  <span className="mt-0.5 block text-xs tabular-nums text-gray-500">{classRecord.subjectCount ?? 0} subjects</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {isAdmin && (
        <Button type="button" size="lg" onClick={openAdd} className="fixed bottom-[92px] left-1/2 z-40 -translate-x-1/2 rounded-xl shadow-lg lg:bottom-6">
          <Plus aria-hidden="true" className="size-4" /> Add Class
        </Button>
      )}

      <ResponsivePopover
        open={selectedClass !== null}
        onOpenChange={(open) => { if (!open) setSelectedClass(null); }}
        title={selectedClass?.name}
        fullHeight
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none md:w-[400px] md:max-w-[400px]"
        contentClassName="px-5 py-4"
      >
        {selectedClass && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-xs font-medium text-gray-500">Class teacher</p>
              <p className="mt-1 text-base font-semibold text-gray-950">{selectedClass.classTeacher?.name ?? "Unassigned"}</p>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
              <div className="min-w-0 border-r border-gray-100 px-2 py-3 text-center">
                <p className="truncate text-[10px] font-medium text-gray-600 sm:text-xs">Status</p>
                <p className="mt-1.5 truncate text-sm font-semibold text-gray-950" title={selectedClass.status === "INACTIVE" ? "Inactive" : "Active"}>{selectedClass.status === "INACTIVE" ? "Inactive" : "Active"}</p>
              </div>
              <div className="min-w-0 border-r border-gray-100 px-2 py-3 text-center">
                <p className="truncate text-[10px] font-medium text-gray-600 sm:text-xs">Subjects</p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-gray-950">{selectedClass.subjectCount ?? 0}</p>
              </div>
              <div className="min-w-0 px-2 py-3 text-center">
                <p className="truncate text-[10px] font-medium text-gray-600 sm:text-xs">Students</p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-gray-950">{selectedClass.studentCount ?? 0}</p>
              </div>
            </div>
            <section aria-labelledby="class-subjects-title" className="space-y-2">
              <h2 id="class-subjects-title" className="flex items-center gap-2 text-sm font-semibold text-gray-800"><BookOpen aria-hidden="true" className="size-4" /> Subjects ({selectedClass.subjectCount ?? 0})</h2>
              {loadingSubjects ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                : subjectsError ? <ApiErrorBanner message={subjectsError.message} onRetry={() => void refetchSubjects()} />
                : subjectsData?.data.length ? (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    {subjectsData.data.map((subject) => (
                      <div key={subject.id} className="px-4 py-3">
                        <p className="font-medium text-gray-950">{subject.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{subject.teacher?.name ?? "No subject teacher"}{subject.status === "INACTIVE" ? " · Inactive" : ""}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="rounded-2xl border border-gray-100 px-4 py-6 text-center text-sm text-gray-500">No subjects in this class</p>}
            </section>
            <section aria-labelledby="class-students-title" className="space-y-2">
              <h2 id="class-students-title" className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Users aria-hidden="true" className="size-4" /> Students ({selectedClass.studentCount ?? 0})</h2>
              {loadingStudents ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                : studentsError ? <ApiErrorBanner message={studentsError.message} onRetry={() => void refetchStudents()} />
                : studentsData?.data.length ? (
                  <div className="space-y-4">
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                      {studentsData.data.map((student) => (
                        <div key={student.id} className="px-4 py-3">
                          <p className="font-medium text-gray-950">{student.name}</p>
                          <p className="mt-1 text-xs text-gray-500">Admission no. {student.adno}{student.status !== "ACTIVE" ? ` · ${student.status.toLowerCase().replace(/_/g, " ")}` : ""}</p>
                        </div>
                      ))}
                    </div>
                    {studentsData.total > 20 && (
                      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                        <span>Page {studentPage} of {Math.ceil(studentsData.total / 20)}</span>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" disabled={studentPage === 1} onClick={() => setStudentPage((page) => page - 1)}>Previous</Button>
                          <Button type="button" variant="outline" size="sm" disabled={studentPage * 20 >= studentsData.total} onClick={() => setStudentPage((page) => page + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : <p className="rounded-2xl border border-gray-100 px-4 py-6 text-center text-sm text-gray-500">No students in this class</p>}
            </section>
            {isAdmin && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 shadow-none" onClick={() => openEdit(selectedClass)}>Edit class</Button>
                <Button type="button" variant="destructive" className="flex-1 shadow-none" onClick={() => { setDeleteTarget(selectedClass); setSelectedClass(null); setShowDeleteConfirm(true); }}><Trash2 className="size-4" /> Deactivate</Button>
              </div>
            )}
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={showDrawer}
        onOpenChange={(open) => { if (!saving) setShowDrawer(open); }}
        title={editTarget ? "Edit Class" : "Add Class"}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        contentClassName="space-y-4 px-5 py-4"
        footer={
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setShowDrawer(false)} className="flex-1 shadow-none">Cancel</Button>
            <Button type="button" disabled={saving} onClick={handleSave} className="flex-1 shadow-none">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Class"}
            </Button>
          </div>
        }
      >
        {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Class</label>
          <DrawerSelector
            title="Select class"
            options={[{ value: "", label: "No class selected" }, ...gradeLevels.map((grade) => ({ value: grade.id, label: grade.name }))]}
            value={form.gradeLevelId}
            onChange={changeGradeLevel}
            placeholder="Select class…"
            className="shadow-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="class-division" className="block text-xs font-semibold text-gray-600">Division</label>
          <div className="flex gap-2">
            {DIVISION_OPTIONS.map((division) => (
              <Button key={division} type="button" variant={form.division === division ? "default" : "outline"} size="xs" aria-pressed={form.division === division} onClick={() => changeDivision(form.division === division ? "" : division)} className="shadow-none">{division}</Button>
            ))}
          </div>
          <Input id="class-division" value={form.division} onChange={(event) => changeDivision(event.target.value)} placeholder="Or type a custom division…" size="lg" className="shadow-none" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="class-display-name" className="block text-xs font-semibold text-gray-600">Display name <span className="text-red-600">*</span></label>
          <Input id="class-display-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Auto-computed from class and division" size="lg" className="shadow-none" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Class teacher</label>
          <DrawerSelector
            title="Select class teacher"
            options={[{ value: "", label: "No class teacher" }, ...teachers.map((teacher) => ({ value: teacher.id, label: `${teacher.name} · @${teacher.username}` }))]}
            value={form.classTeacherId}
            onChange={(value) => setForm((current) => ({ ...current, classTeacherId: value }))}
            placeholder="No class teacher"
            className="shadow-none"
          />
          <p className="text-xs text-gray-500">Each teacher can be class teacher of only one class.</p>
        </div>

        {editTarget && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Status</label>
            <DrawerSelector
              title="Class status"
              options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]}
              value={form.status}
              onChange={(value) => setForm((current) => ({ ...current, status: value as FormState["status"] }))}
              className="shadow-none"
            />
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!open && !deleting) setShowDeleteConfirm(false); }}
        title="Deactivate class?"
        description={deleteTarget ? `Students in ${deleteTarget.name} will be unassigned and its subjects will be removed.` : undefined}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        contentClassName="px-5 py-4"
        footer={
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
            <Button type="button" variant="outline" disabled={deleting !== null} onClick={() => setShowDeleteConfirm(false)} className="flex-1 shadow-none">Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleting !== null} onClick={handleDelete} className="flex-1 shadow-none">{deleting !== null && <Loader2 className="size-4 animate-spin" />} Deactivate</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">This will deactivate <strong>{deleteTarget?.name}</strong>.</p>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
