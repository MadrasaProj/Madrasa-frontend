import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, ChevronRight, GraduationCap, Loader2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClassPicker } from "@/components/ui/ClassPicker";
import { DrawerSelector } from "@/components/DrawerSelector";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Skeleton } from "@/components/ui/Skeleton";
import { createSubject, getSubjects, updateSubject, bulkAssignTeacher, type SubjectRecord } from "@/lib/subjects-api";
import { useClasses, useTeachers } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";

interface FormState {
  name: string;
  classId: string;
  teacherId: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY_FORM: FormState = { name: "", classId: "", teacherId: "", status: "ACTIVE" };

function subjectToForm(subject: SubjectRecord): FormState {
  return {
    name: subject.name,
    classId: subject.classId,
    teacherId: subject.teacherId ?? "",
    status: subject.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

export default function AdminSubjectsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const clientId = activeClientId ?? "";
  const token = accessToken ?? "";
  const location = useLocation();
  const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";
  const isAdmin = user?.actorType === "CLIENT_ADMIN" || user?.actorType === "SUPER_ADMIN";

  const defaultClassId = new URLSearchParams(location.search).get("classId") ?? "";
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState(defaultClassId);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectRecord | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<SubjectRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkTeacherId, setBulkTeacherId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const { data: classesData } = useClasses({ clientId, token });
  const { data: teachersData } = useTeachers({ clientId, token });
  const classes = classesData ?? [];
  const teachers = teachersData?.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setFilterClassId(defaultClassId);
  }, [defaultClassId]);

  const load = useCallback(async (classId: string, search: string, signal?: AbortSignal) => {
    if (!clientId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getSubjects(clientId, token, {
        classId: classId || undefined,
        search: search || undefined,
        signal,
      });
      if (!signal?.aborted) setSubjects(result.data);
    } catch (cause) {
      if (!signal?.aborted && (cause as Error).name !== "AbortError") {
        setError((cause as Error).message);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    const controller = new AbortController();
    void load(filterClassId, searchQuery, controller.signal);
    return () => controller.abort();
  }, [filterClassId, searchQuery, load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, classId: filterClassId });
    setSaveError("");
    setShowDrawer(true);
  };

  const openEdit = (subject: SubjectRecord) => {
    setSelectedSubject(null);
    setEditTarget(subject);
    setForm(subjectToForm(subject));
    setSaveError("");
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSaveError("Subject name is required");
      return;
    }
    if (!editTarget && !form.classId) {
      setSaveError("Class is required");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (editTarget) {
        await updateSubject(clientId, token, editTarget.id, {
          name: form.name.trim(),
          teacherId: isPeriodBased ? (form.teacherId || null) : undefined,
          status: form.status,
        });
        toast.success("Subject updated successfully");
      } else {
        await createSubject(clientId, token, {
          name: form.name.trim(),
          classId: form.classId,
          teacherId: isPeriodBased && form.teacherId ? form.teacherId : undefined,
        });
        toast.success("Subject created successfully");
      }
      setShowDrawer(false);
      await load(filterClassId, searchQuery);
    } catch (cause) {
      const message = (cause as Error).message || "Failed to save subject";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkClassId || !bulkTeacherId) {
      setBulkError("Select both class and teacher");
      return;
    }
    setBulkSaving(true);
    setBulkError("");
    try {
      const result = await bulkAssignTeacher(clientId, token, {
        classId: bulkClassId,
        teacherId: bulkTeacherId,
      });
      setShowBulkModal(false);
      setBulkClassId("");
      setBulkTeacherId("");
      await load(filterClassId, searchQuery);
      toast.success("Assigned teacher to " + result.updated + " subjects");
    } catch (cause) {
      const message = (cause as Error).message || "Failed to assign teacher";
      setBulkError(message);
      toast.error(message);
    } finally {
      setBulkSaving(false);
    }
  };

  const stats = [
    { label: "Subjects", value: subjects.length, icon: BookOpen },
    { label: "Active", value: subjects.filter((subject) => subject.status === "ACTIVE").length, icon: BookOpen },
    { label: "Classes represented", value: new Set(subjects.map((subject) => subject.classId)).size, icon: GraduationCap },
    isPeriodBased
      ? { label: "Teacher assigned", value: subjects.filter((subject) => subject.teacherId).length, icon: Users }
      : { label: "Inactive", value: subjects.filter((subject) => subject.status === "INACTIVE").length, icon: BookOpen },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Subjects"
        switcher={
          <ClassPicker
            title="Filter by class"
            options={[{ value: "", label: "All classes" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]}
            value={filterClassId}
            onChange={setFilterClassId}
            placeholder="All classes"
            className="w-36 max-w-full sm:w-44"
          />
        }
      />

      <div className="space-y-5 pb-24 lg:pb-20">
        {error && <ApiErrorBanner message={error} onRetry={() => void load(filterClassId, searchQuery)} />}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              aria-label="Search subjects"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search subjects…"
              size="lg"
              className="bg-white pl-10 shadow-none"
            />
          </div>
        </div>

        {isAdmin && isPeriodBased && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="shadow-none"
              onClick={() => {
                setBulkError("");
                setBulkClassId(filterClassId);
                setShowBulkModal(true);
              }}
            >
              <Users className="size-4" /> Sync Teacher
            </Button>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/60 via-white to-sky-50/60">
            {stats.map(({ label, value, icon: Icon }, index) => (
              <div key={label} className={"min-w-0 p-2.5 sm:p-3 " + (index % 2 === 0 ? "border-r border-gray-100 " : "") + (index < 2 ? "border-b border-gray-100" : "")}>
                <div className="flex items-center gap-1.5 text-sm font-medium leading-4 text-gray-700">
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{label}</span>
                </div>
                <span className="mt-1.5 block text-[22px] font-medium leading-none tabular-nums text-gray-950">{value}</span>
              </div>
            ))}
          </div>
        )}

        <section aria-labelledby="subjects-list-title">
          <h2 id="subjects-list-title" className="mb-2 px-1 text-sm font-semibold text-gray-700">All subjects</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
            {loading ? Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-44 max-w-full" /></div>
                <Skeleton className="h-4 w-16" />
              </div>
            )) : subjects.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">{searchQuery || filterClassId ? "No subjects match your filters" : "No subjects found"}</p>
            ) : subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSelectedSubject(subject)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{subject.name}</span>
                  <span className="mt-1 block truncate text-xs text-gray-500">
                    {subject.class?.name ?? "Class unavailable"}
                    {isPeriodBased && " · " + (subject.teacher?.name ?? "No teacher assigned")}
                  </span>
                </span>
                <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " + (subject.status === "ACTIVE" ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-600")}>
                  {subject.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {isAdmin && !showDrawer && (
        <div className="fixed bottom-[92px] left-1/2 z-40 w-max -translate-x-1/2 lg:bottom-6">
          <Button
            type="button"
            size="lg"
            onClick={openAdd}
            className="gap-2 rounded-full shadow-lg shadow-primary-900/20"
          >
            <Plus aria-hidden="true" className="size-5" />
            Add Subject
          </Button>
        </div>
      )}

      <ResponsivePopover
        open={selectedSubject !== null}
        onOpenChange={(open) => { if (!open) setSelectedSubject(null); }}
        title={selectedSubject?.name}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        
      >
        {selectedSubject && (
          <div className="space-y-5">
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white text-sm">
              <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Class</span><span className="text-right font-medium text-gray-900">{selectedSubject.class?.name ?? "Unavailable"}</span></div>
              {isPeriodBased && <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Teacher</span><span className="text-right font-medium text-gray-900">{selectedSubject.teacher?.name ?? "Unassigned"}</span></div>}
              <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Status</span><span className="font-medium text-gray-900">{selectedSubject.status === "ACTIVE" ? "Active" : "Inactive"}</span></div>
              {selectedSubject.classSubject && <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Global subject</span><span className="text-right font-medium text-gray-900">{selectedSubject.classSubject.subjectName}</span></div>}
            </div>
            {isAdmin && <Button type="button" variant="outline" className="w-full shadow-none" onClick={() => openEdit(selectedSubject)}>Edit subject</Button>}
          </div>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={showDrawer}
        onOpenChange={(open) => { if (!saving) setShowDrawer(open); }}
        title={editTarget ? "Edit Subject" : "Add Subject"}
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        
        footer={
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setShowDrawer(false)} className="flex-1 shadow-none">Cancel</Button>
            <Button type="button" disabled={saving} onClick={handleSave} className="flex-1 shadow-none">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Subject"}
            </Button>
          </div>
        }
      >
        {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>}

        <div className="space-y-1.5">
          <label htmlFor="subject-name" className="block text-xs font-semibold text-gray-600">Display name <span className="text-red-600">*</span></label>
          <Input id="subject-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Mathematics" size="lg" className="shadow-none" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Class <span className="text-red-600">*</span></label>
          <DrawerSelector
            title="Select class"
            options={[{ value: "", label: "Select class" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]}
            value={form.classId}
            onChange={(value) => setForm((current) => ({ ...current, classId: value }))}
            disabled={Boolean(editTarget)}
            className="shadow-none"
          />
        </div>

        {isPeriodBased && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Assigned teacher</label>
            <DrawerSelector
              title="Select teacher"
              options={[{ value: "", label: "Unassigned" }, ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.name + " · @" + teacher.username }))]}
              value={form.teacherId}
              onChange={(value) => setForm((current) => ({ ...current, teacherId: value }))}
              className="shadow-none"
            />
          </div>
        )}

        {editTarget && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Status</label>
              <DrawerSelector
                title="Subject status"
                options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]}
                value={form.status}
                onChange={(value) => setForm((current) => ({ ...current, status: value as FormState["status"] }))}
                className="shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-gray-600">Global subject</span>
              <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-600">{editTarget.classSubject?.subjectName ?? "None"}</p>
            </div>
          </>
        )}
      </ResponsivePopover>

      <ResponsivePopover
        open={showBulkModal}
        onOpenChange={(open) => { if (!bulkSaving) setShowBulkModal(open); }}
        title="Sync Teacher to Class"
        description="Assigns one teacher to all active subjects in the selected class."
        side="bottom"
        desktopView="right-drawer"
        className="shadow-none"
        
        footer={
          <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
            <Button type="button" variant="outline" disabled={bulkSaving} onClick={() => setShowBulkModal(false)} className="flex-1 shadow-none">Cancel</Button>
            <Button type="button" disabled={bulkSaving} onClick={handleBulkAssign} className="flex-1 shadow-none">
              {bulkSaving && <Loader2 className="size-4 animate-spin" />} Assign
            </Button>
          </div>
        }
      >
        {bulkError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{bulkError}</p>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Class</label>
          <DrawerSelector
            title="Select class"
            options={[{ value: "", label: "Select class" }, ...classes.map((item) => ({ value: item.id, label: item.name }))]}
            value={bulkClassId}
            onChange={setBulkClassId}
            className="shadow-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600">Teacher</label>
          <DrawerSelector
            title="Select teacher"
            options={[{ value: "", label: "Select teacher" }, ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.name + " · @" + teacher.username }))]}
            value={bulkTeacherId}
            onChange={setBulkTeacherId}
            className="shadow-none"
          />
        </div>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
