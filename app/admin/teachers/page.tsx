import { FormSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { DrawerSelector } from "@/components/DrawerSelector";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
 Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
 PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { type SortDir } from "@/components/ui/DataTable";
import {
 ImportModal,
 type ImportConfig,
} from "@/components/ui/ImportModal";
import {
 getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher,
 bulkUpsertTeachers, uploadTeacherPhoto, deleteTeacherPhoto,
 type TeacherRecord, type UpdateTeacherPayload, type CreateTeacherPayload,
 type BulkUpsertTeacherRow,
} from "@/lib/teachers-api";
import {
 TEACHER_IMPORT_COLUMNS,
} from "@/lib/teacher-import";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getSubjects, type SubjectRecord } from "@/lib/subjects-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
 Users, Plus, Search, ArrowUpDown, Loader2, Eye, EyeOff,
 GraduationCap, CheckCircle2, ChevronDown, ChevronRight, Trash2, Upload,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PAGE_SIZE = 20;

function paginationItems(current: number, total: number): Array<number | "ellipsis"> {
 const pages = [...new Set([1, total, current - 1, current, current + 1])]
  .filter((value) => value >= 1 && value <= total)
  .sort((a, b) => a - b);
 const items: Array<number | "ellipsis"> = [];
 pages.forEach((value, index) => {
  const previous = pages[index - 1];
  if (previous && value - previous === 2) items.push(previous + 1);
  if (previous && value - previous > 2) items.push("ellipsis");
  items.push(value);
 });
 return items;
}

export default function AdminTeachersPage() {
 const { user, accessToken, activeClientId } = useAuthStore();
 const { lang } = useLanguageStore();
 const cid = activeClientId ?? "";
 const token = accessToken ?? "";
 const isPeriodBased = user?.attendanceMode === "PERIOD_BASED";

 // ── List state ─────────────────────────────────────────────────────────────
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Import state ──────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showDrawer, setShowDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherRecord | null>(null);
  const [fName, setFName] = useState("");
 const [fUsername, setFUsername] = useState("");
 const [fPassword, setFPassword] = useState("");
 const [fNewPassword, setFNewPassword] = useState("");
 const [fStatus, setFStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
 const [fClassIds, setFClassIds] = useState<Set<string>>(new Set());
 const [fSubjectIds, setFSubjectIds] = useState<Set<string>>(new Set());
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fQualification, setFQualification] = useState("");
  const [fAddress, setFAddress] = useState("");
  const [fCity, setFCity] = useState("");
  const [fState, setFState] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fPincode, setFPincode] = useState("");
  const [fDateOfBirth, setFDateOfBirth] = useState("");
  const [fBloodGroup, setFBloodGroup] = useState("");
  const [fGender, setFGender] = useState("");
  const [fEmergencyName, setFEmergencyName] = useState("");
  const [fEmergencyPhone, setFEmergencyPhone] = useState("");
  const [fPhotoUrl, setFPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [deleting, setDeleting] = useState(false);

 // ── Assignment data (loaded on edit open) ──────────────────────────────────
 const [allClasses, setAllClasses] = useState<ClassRecord[]>([]);
 const [allSubjects, setAllSubjects] = useState<SubjectRecord[]>([]);
 const [loadingAssign, setLoadingAssign] = useState(false);
 const [assignError, setAssignError] = useState("");
 const [subjectSearch, setSubjectSearch] = useState("");
 const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

 // ── Load teachers ──────────────────────────────────────────────────────────
 const load = useCallback(async (
 srch: string, pg: number, lim: number, sb?: string, sd?: SortDir,
 ) => {
 if (!cid || !token) return;
 setLoading(true); setError(null);
 try {
 const data = await getTeachers(cid, token, {
 search: srch || undefined, page: pg, limit: lim,
 sortBy: sb, sortOrder: sd,
 });
 setTeachers(data.data ?? []);
 setTotal(data.total ?? data.data?.length ?? 0);
 } catch (e) {
 setError((e as Error).message);
 } finally {
 setLoading(false);
 }
 }, [cid, token]);

 useEffect(() => {
 load(search, page, DEFAULT_PAGE_SIZE, sortBy, sortDir);
 }, [page, sortBy, sortDir, load]); // eslint-disable-line

 const handleSearch = (val: string) => {
 setSearch(val); setPage(1);
 if (searchTimer.current) clearTimeout(searchTimer.current);
 searchTimer.current = setTimeout(() => load(val, 1, DEFAULT_PAGE_SIZE, sortBy, sortDir), 400);
 };

 const handleSort = (key: string, dir: SortDir) => {
 setSortBy(key); setSortDir(dir); setPage(1);
 };

 // ── Drawer open ────────────────────────────────────────────────────────────
  const resetForm = () => {
  setFName(""); setFUsername(""); setFPassword(""); setFNewPassword("");
  setFStatus("ACTIVE"); setFClassIds(new Set()); setFSubjectIds(new Set());
  setFPhone(""); setFEmail(""); setFQualification("");
  setFAddress(""); setFCity(""); setFState(""); setFCountry(""); setFPincode("");
  setFDateOfBirth(""); setFBloodGroup(""); setFGender("");
  setFEmergencyName(""); setFEmergencyPhone("");
  setFPhotoUrl(null);
  setSaveError(""); setShowPw(false); setShowNewPw(false);
  setAllClasses([]); setAllSubjects([]); setAssignError("");
  setSubjectSearch(""); setExpandedGroups(new Set());
  setShowDeleteConfirm(false); setDeleting(false);
  };
  const handleDelete = async () => {
    if (!editTarget || !cid || !token) return;
    setDeleting(true);
    setSaveError("");
    try {
      await deleteTeacher(cid, token, editTarget.id);
      toast.success("Teacher deleted successfully");
      setShowDeleteConfirm(false);
      setShowDrawer(false);
      setSelectedTeacher(null);
      setPage(1);
      load(search, 1, DEFAULT_PAGE_SIZE, sortBy, sortDir);
    } catch (e) {
      setSaveError((e as Error).message);
      toast.error((e as Error).message || "Failed to delete teacher");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

 const openAdd = () => {
 setEditTarget(null);
 resetForm();
 setShowDrawer(true);
 };

  const openEdit = async (t: TeacherRecord) => {
   setSelectedTeacher(null);
   if (!cid) { setAssignError("No active madrasa selected."); return; }
   const teacherSubjectIds = new Set(t.subjects?.map((s) => s.id) ?? []);
   setEditTarget(t);
   setFName(t.name);
   setFUsername(t.username);
   setFPassword(""); setFNewPassword("");
   setFStatus((t.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE");
   setFClassIds(new Set(t.classes?.map((c) => c.id) ?? []));
   setFSubjectIds(teacherSubjectIds);
   setSaveError(""); setShowPw(false); setShowNewPw(false);
   setAllClasses([]); setAllSubjects([]); setAssignError("");
   setSubjectSearch(""); setExpandedGroups(new Set());
   setShowDrawer(true);

   setLoadingAssign(true);
   try {
   const [detail, cls, subjs] = await Promise.all([
    getTeacher(cid, token, t.id),
    getAllClasses(cid, token),
    isPeriodBased ? getSubjects(cid, token, {}).then((r) => r.data) : Promise.resolve([]),
   ]);
   setFPhone(detail.phone ?? "");
   setFEmail(detail.email ?? "");
   setFQualification(detail.qualification ?? "");
   setFAddress(detail.address ?? "");
   setFCity(detail.city ?? "");
   setFState(detail.state ?? "");
   setFCountry(detail.country ?? "");
   setFPincode(detail.pincode ?? "");
   setFDateOfBirth(detail.dateOfBirth ?? "");
   setFBloodGroup(detail.bloodGroup ?? "");
   setFGender(detail.gender ?? "");
   setFEmergencyName(detail.emergencyContactName ?? "");
   setFEmergencyPhone(detail.emergencyContactPhone ?? "");
   setFPhotoUrl(detail.photoUrl ?? null);
  setAllClasses(cls);
  setAllSubjects(subjs);
  // Auto-expand groups that have pre-selected subjects
  const preExpanded = new Set(
  subjs.filter((s) => teacherSubjectIds.has(s.id)).map((s) => s.classId ?? "__none__"),
  );
  setExpandedGroups(preExpanded);
  } catch (e) {
  setAssignError((e as Error).message);
  } finally {
  setLoadingAssign(false);
  }
  };

  // ── Save (single call for everything) ─────────────────────────────────────
  const handleSave = async () => {
  if (!fName.trim() || !fUsername.trim() || (!editTarget && !fPassword)) return;
  setSaveError(""); setSaving(true);
  try {
  if (editTarget) {
  const payload: UpdateTeacherPayload = {
  name: fName.trim(),
  status: fStatus,
  classIds: [...fClassIds],
  phone: fPhone.trim() || null,
  email: fEmail.trim() || null,
  qualification: fQualification.trim() || null,
  address: fAddress.trim() || null,
  city: fCity.trim() || null,
  state: fState.trim() || null,
  country: fCountry.trim() || null,
  pincode: fPincode.trim() || null,
  dateOfBirth: fDateOfBirth.trim() || null,
  bloodGroup: fBloodGroup.trim() || null,
  gender: fGender.trim() || null,
  emergencyContactName: fEmergencyName.trim() || null,
  emergencyContactPhone: fEmergencyPhone.trim() || null,
  };
  if (fNewPassword.trim()) payload.password = fNewPassword.trim();
  if (isPeriodBased) payload.subjectIds = [...fSubjectIds];
  await updateTeacher(cid, token, editTarget.id, payload);
  toast.success("Teacher updated successfully");
  } else {
  const payload: CreateTeacherPayload = {
  name: fName.trim(), username: fUsername.trim(), password: fPassword,
  };
  if (fPhone.trim()) payload.phone = fPhone.trim();
  if (fEmail.trim()) payload.email = fEmail.trim();
  if (fQualification.trim()) payload.qualification = fQualification.trim();
  if (fAddress.trim()) payload.address = fAddress.trim();
  if (fCity.trim()) payload.city = fCity.trim();
  if (fState.trim()) payload.state = fState.trim();
  if (fCountry.trim()) payload.country = fCountry.trim();
  if (fPincode.trim()) payload.pincode = fPincode.trim();
  if (fDateOfBirth.trim()) payload.dateOfBirth = fDateOfBirth.trim();
  if (fBloodGroup.trim()) payload.bloodGroup = fBloodGroup.trim();
  if (fGender.trim()) payload.gender = fGender.trim();
  if (fEmergencyName.trim()) payload.emergencyContactName = fEmergencyName.trim();
  if (fEmergencyPhone.trim()) payload.emergencyContactPhone = fEmergencyPhone.trim();
  await createTeacher(cid, token, payload);
  toast.success("Teacher created successfully");
  }
  setShowDrawer(false);
  setPage(1);
  load(search, 1, DEFAULT_PAGE_SIZE, sortBy, sortDir);
  } catch (e) {
  setSaveError((e as Error).message);
  toast.error((e as Error).message || "Failed to save teacher");
  } finally {
  setSaving(false);
  }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (!file || !editTarget) return;
   setPhotoUploading(true);
   try {
    const res = await uploadTeacherPhoto(cid, token, editTarget.id, file);
    setFPhotoUrl(res.photoUrl);
    toast.success("Photo uploaded successfully");
   } catch (err) {
    setSaveError((err as Error).message);
    toast.error((err as Error).message || "Failed to upload photo");
   } finally {
    setPhotoUploading(false);
   }
  };

  const handlePhotoRemove = async () => {
   if (!editTarget) return;
   setPhotoUploading(true);
   try {
    await deleteTeacherPhoto(cid, token, editTarget.id);
    setFPhotoUrl(null);
    toast.success("Photo removed successfully");
   } catch (err) {
    setSaveError((err as Error).message);
    toast.error((err as Error).message || "Failed to remove photo");
   } finally {
    setPhotoUploading(false);
   }
  };

  const toggleSubject = (id: string) => {
  setFSubjectIds((prev) => {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
  });
 };

 const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

 // ── Import config (single bulk POST, upsert by username) ──────────────────
 const importConfig = useMemo<ImportConfig<BulkUpsertTeacherRow>>(
  () => ({
   entityName: "Teachers",
   templateFilename: "teacher-import-template",
   columns: TEACHER_IMPORT_COLUMNS,
    createRow: (row) =>
     createTeacher(cid, token, {
      name: row.name,
      username: row.username,
      password: row.password ?? "pass1234",
      status: row.status,
      phone: row.phone,
      email: row.email,
      qualification: row.qualification,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      pincode: row.pincode,
      dateOfBirth: row.dateOfBirth,
      bloodGroup: row.bloodGroup,
      gender: row.gender,
      emergencyContactName: row.emergencyContactName,
      emergencyContactPhone: row.emergencyContactPhone,
     }),
    createBulk: async (rows) => {
     const res = await bulkUpsertTeachers(cid, token, rows);
     return {
      imported: (res.results ?? []).map((r) => ({ rowIndex: r.rowIndex, action: r.action })),
      failed: (res.errors ?? []).map((e) => ({ rowIndex: e.rowIndex, message: e.message })),
     };
    },
  }),
  [cid, token],
 ); // eslint-disable-line

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

 const stats = [
  { label: "Total teachers", value: total, icon: Users },
  { label: "On this page", value: teachers.length, icon: Users },
  { label: "With classes", value: teachers.filter((teacher) => (teacher.classes?.length ?? 0) > 0).length, icon: GraduationCap },
  { label: "Active on page", value: teachers.filter((teacher) => teacher.status === "ACTIVE").length, icon: CheckCircle2 },
 ];

 return (
  <DashboardLayout>
   <PageHeader title={t("adminPages", "teachersTitle", lang)} />

   <div className="space-y-5 pb-20">
    {error && <ApiErrorBanner message={error} onRetry={() => load(search, page, DEFAULT_PAGE_SIZE, sortBy, sortDir)} />}

    <div className="flex items-center gap-2">
     <div className="relative min-w-0 flex-1">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <Input size="lg"
       type="search"
       aria-label="Search teachers"
       value={search}
       onChange={(event) => handleSearch(event.target.value)}
       placeholder="Search by name or username…"
       className="bg-white pl-10 shadow-none"
      />
     </div>
     <DrawerSelector
      title="Sort teachers"
      options={[
       { value: "", label: "Default order" },
       { value: "name:asc", label: "Name A to Z" },
       { value: "name:desc", label: "Name Z to A" },
       { value: "status:asc", label: "Status A to Z" },
       { value: "status:desc", label: "Status Z to A" },
      ]}
      value={sortBy ? sortBy + ":" + sortDir : ""}
      onChange={(value) => {
       if (!value) {
        setSortBy(undefined);
        setSortDir("asc");
        setPage(1);
       } else {
        const [key, direction] = value.split(":");
        handleSort(key, direction as SortDir);
       }
      }}
      triggerIcon={<ArrowUpDown className="size-4" />}
      className="size-11 shadow-none"
     />
    </div>

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

    <h2 id="teachers-list-title" className="px-1 text-sm font-semibold text-gray-700">All teachers</h2>

    <section aria-labelledby="teachers-list-title">
     <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white">
      {loading ? Array.from({ length: 5 }, (_, index) => (
       <div key={index} className="flex items-center gap-3 px-4 py-4">
        <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-56 max-w-full" /></div>
        <Skeleton className="h-4 w-16" />
       </div>
      )) : teachers.length === 0 ? (
       <p className="px-4 py-10 text-center text-sm text-gray-500">{search ? "No teachers match your search" : "No teachers found"}</p>
      ) : teachers.map((teacher) => (
       <Button
        key={teacher.id}
        type="button"
        variant="ghost"
        aria-haspopup="dialog"
        onClick={() => setSelectedTeacher(teacher)}
        className="h-auto w-full justify-start gap-3 whitespace-normal px-4 py-4 text-left shadow-none transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
       >
        <span className="min-w-0 flex-1">
         <span className="block truncate text-sm font-semibold text-gray-950 sm:text-base">{teacher.name}</span>
         <span className="mt-1 block truncate text-xs text-gray-500">
          @{teacher.username}{teacher.classes?.length ? " · " + teacher.classes.map((item) => item.name).join(", ") : ""}
         </span>
        </span>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " + (teacher.status === "ACTIVE" ? "bg-primary-50 text-primary-700" : "bg-gray-100 text-gray-600")}>
         {teacher.status === "ACTIVE" ? "Active" : "Inactive"}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
       </Button>
      ))}
     </div>
    </section>

    {!loading && totalPages > 1 && (
     <Pagination aria-label="Teacher pages">
      <PaginationContent className="gap-1">
       <PaginationItem>
        <PaginationPrevious
         href="#"
         aria-label="Previous teacher page"
         aria-disabled={page <= 1}
         tabIndex={page <= 1 ? -1 : undefined}
         className={cn("rounded-lg", page <= 1 && "pointer-events-none opacity-40")}
         onClick={(event) => { event.preventDefault(); if (page > 1) setPage(page - 1); }}
        />
       </PaginationItem>
       {paginationItems(page, totalPages).map((item, index) => (
        <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : item}>
         {item === "ellipsis" ? <PaginationEllipsis /> : (
          <PaginationLink
           href="#"
           isActive={item === page}
           aria-label={`Go to teacher page ${item}`}
           className="rounded-lg"
           onClick={(event) => { event.preventDefault(); setPage(item); }}
          >
           {item}
          </PaginationLink>
         )}
        </PaginationItem>
       ))}
       <PaginationItem>
        <PaginationNext
         href="#"
         aria-label="Next teacher page"
         aria-disabled={page >= totalPages}
         tabIndex={page >= totalPages ? -1 : undefined}
         className={cn("rounded-lg", page >= totalPages && "pointer-events-none opacity-40")}
         onClick={(event) => { event.preventDefault(); if (page < totalPages) setPage(page + 1); }}
        />
       </PaginationItem>
      </PaginationContent>
     </Pagination>
    )}
   </div>

  <div className="p-0!">
     <ButtonGroup aria-label="Teacher actions" className="fixed bottom-[92px] left-1/2 z-40 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-white p-1 shadow-lg lg:bottom-6">
    <Button type="button" size="lg" variant="outline" className="border-gray-200 bg-white shadow-none" onClick={() => setShowImport(true)}>
     <Upload aria-hidden="true" />
     {t("adminPages", "importBtn", lang)}
    </Button>
    <Button type="button" size="lg" className="shadow-none" onClick={openAdd}>
     <Plus aria-hidden="true" />
     {t("adminPages", "addTeacher", lang)}
    </Button>
   </ButtonGroup>
  </div>


   <ResponsivePopover
    open={selectedTeacher !== null}
    onOpenChange={(open) => { if (!open) setSelectedTeacher(null); }}
    title={selectedTeacher?.name}
    side="bottom"
    desktopView="right-drawer"
    className="shadow-none"
    
   >
    {selectedTeacher && (
     <div className="space-y-5">
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white text-sm">
       <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Username</span><span className="font-medium text-gray-900">@{selectedTeacher.username}</span></div>
       <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Status</span><span className="font-medium text-gray-900">{selectedTeacher.status === "ACTIVE" ? "Active" : "Inactive"}</span></div>
       <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Classes</span><span className="text-right font-medium text-gray-900">{selectedTeacher.classes?.map((item) => item.name).join(", ") || "None"}</span></div>
       {isPeriodBased && <div className="flex justify-between gap-4 px-4 py-3"><span className="text-gray-500">Subjects</span><span className="text-right font-medium text-gray-900">{selectedTeacher.subjects?.map((item) => item.name).join(", ") || "None"}</span></div>}
      </div>
      <div className="flex gap-2">
       <Button type="button" variant="outline" className="flex-1 shadow-none" onClick={() => void openEdit(selectedTeacher)}>Edit teacher</Button>
       <Button type="button" variant="destructive" className="flex-1 shadow-none" onClick={() => { setEditTarget(selectedTeacher); setSelectedTeacher(null); setShowDeleteConfirm(true); }}><Trash2 className="size-4" /> Delete</Button>
      </div>
     </div>
    )}
   </ResponsivePopover>

   <ResponsivePopover
    open={showDrawer}
    onOpenChange={(open) => { if (!saving) setShowDrawer(open); }}
    title={editTarget ? "Edit Teacher" : "Add Teacher"}
    description={editTarget ? "@" + editTarget.username : undefined}
    side="bottom"
    desktopView="right-drawer"
    className="shadow-none"
    
    footer={
     <div className="border-t border-gray-100 bg-white px-5 py-4">
      <ButtonGroup aria-label={editTarget ? "Edit teacher actions" : "Add teacher actions"} className="w-full [&>button]:flex-1">
       {editTarget && (
        <Button type="button" variant="destructive" onClick={() => { setShowDrawer(false); setShowDeleteConfirm(true); }} className="shadow-none">Delete Teacher</Button>
       )}
       <Button
        type="button"
        onClick={handleSave}
        disabled={saving || !fName.trim() || !fUsername.trim() || (!editTarget && !fPassword) || (editTarget !== null && loadingAssign)}
        className="shadow-none"
       >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Teacher"}
       </Button>
      </ButtonGroup>
     </div>
    }
   >
 {/* Scrollable body */}
 <div className="space-y-4 px-5 py-4 pb-8">
 {saveError && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>
 )}

 {/* ── Basic fields ── */}
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
 <Input size="lg"
 type="text" value={fName} placeholder="Abdul Rahman"
 onChange={(e) => setFName(e.target.value)}
 className="bg-gray-50 shadow-none"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">
 Username *{editTarget && " (cannot change)"}
 </label>
 <Input size="lg"
 type="text" value={fUsername} placeholder="abdulrahman"
 disabled={!!editTarget}
 onChange={(e) => setFUsername(e.target.value)}
 className={cn(
 "bg-gray-50 shadow-none",
 editTarget && "cursor-not-allowed bg-gray-100",
 )}
 />
 </div>

  {/* Browser autofill decoy trap to prevent Chrome from auto-injecting credentials */}
  <div style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", zIndex: -1 }}>
    <Input size="lg" type="text" name="fake_username_trap" tabIndex={-1} autoComplete="username" />
    <Input size="lg" type="password" name="fake_password_trap" tabIndex={-1} autoComplete="current-password" />
  </div>

  {/* Password — create */}
  {!editTarget && (
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
  <div className="relative">
  <Input size="lg"
  type={showPw ? "text" : "password"} value={fPassword}
  name="teacher_create_pwd_field"
  autoComplete="new-password"
  readOnly
  onFocus={(e) => e.target.removeAttribute("readOnly")}
  onMouseDown={(e) => (e.target as HTMLInputElement).removeAttribute("readOnly")}
  onChange={(e) => setFPassword(e.target.value)}
  placeholder="Min. 6 characters"
  className="bg-gray-50 pr-12 shadow-none"
  />
  <Button variant="ghost" type="button" onClick={() => setShowPw(!showPw)}
  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </Button>
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
  <Input size="lg"
  type={showNewPw ? "text" : "password"} value={fNewPassword}
  name="teacher_edit_pwd_field"
  autoComplete="new-password"
  readOnly
  onFocus={(e) => e.target.removeAttribute("readOnly")}
  onMouseDown={(e) => (e.target as HTMLInputElement).removeAttribute("readOnly")}
  onChange={(e) => setFNewPassword(e.target.value)}
  placeholder="Enter new password…"
  className="bg-gray-50 pr-12 shadow-none"
  />
  <Button variant="ghost" type="button" onClick={() => setShowNewPw(!showNewPw)}
  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </Button>
  </div>
  </div>
  )}

  {/* Status — edit only */}
  {editTarget && (
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
  <DrawerSelector
   title="Teacher status"
   options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]}
   value={fStatus}
   onChange={(value) => setFStatus(value as "ACTIVE" | "INACTIVE")}
   className="shadow-none"
  />
  </div>
  )}

  {/* ── Profile Photo (edit only) ── */}
  {editTarget && (
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-2">Profile Photo</label>
  <div className="flex items-center gap-4">
  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
  {fPhotoUrl ? (
  <img src={fPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
  ) : (
  <Users className="w-7 h-7 text-gray-400" />
  )}
  </div>
  <div className="flex gap-2">
  <label className="cursor-pointer px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors">
  {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
  <Input size="lg" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
  </label>
  {fPhotoUrl && (
  <Button variant="ghost" onClick={handlePhotoRemove} disabled={photoUploading}
  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-600 transition-colors">
  Remove
  </Button>
  )}
  </div>
  </div>
  </div>
  )}

  {/* ── Basic Info ── */}
  <div>
  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Basic Info</p>
  <div className="space-y-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qualification</label>
  <Input size="lg" type="text" value={fQualification} placeholder="e.g. B.Ed, M.Sc"
  onChange={(e) => setFQualification(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
  <Input size="lg" type="text" value={fPhone} placeholder="9876543210"
  onChange={(e) => setFPhone(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
  <Input size="lg" type="email" value={fEmail} placeholder="teacher@madrasa.org"
  onChange={(e) => setFEmail(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date of Birth</label>
  <Button type="button" variant="outline" onClick={() => setShowDatePicker(true)} className="w-full justify-start shadow-none">
   {fDateOfBirth || "Select date"}
  </Button>
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label>
  <DrawerSelector
   title="Gender"
   options={[{ value: "", label: "Select" }, { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }]}
   value={fGender}
   onChange={setFGender}
   className="shadow-none"
  />
  </div>
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Blood Group</label>
  <DrawerSelector
   title="Blood group"
   options={[{ value: "", label: "Select" }, ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({ value, label: value }))]}
   value={fBloodGroup}
   onChange={setFBloodGroup}
   className="shadow-none"
  />
  </div>
  </div>
  </div>

  {/* ── Address ── */}
  <div>
  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Address</p>
  <div className="space-y-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
  <Textarea value={fAddress} placeholder="Street, building, area…" rows={2}
  onChange={(e) => setFAddress(e.target.value)}
  className="resize-none bg-gray-50 shadow-none" />
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
  <Input size="lg" type="text" value={fCity} placeholder="Kozhikode"
  onChange={(e) => setFCity(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
  <Input size="lg" type="text" value={fState} placeholder="Kerala"
  onChange={(e) => setFState(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
  <Input size="lg" type="text" value={fCountry} placeholder="India"
  onChange={(e) => setFCountry(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode</label>
  <Input size="lg" type="text" value={fPincode} placeholder="673001"
  onChange={(e) => setFPincode(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  </div>
  </div>
  </div>

  {/* ── Emergency Contact ── */}
  <div>
  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Emergency Contact</p>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Name</label>
  <Input size="lg" type="text" value={fEmergencyName} placeholder="Spouse / parent"
  onChange={(e) => setFEmergencyName(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  <div>
  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Phone</label>
  <Input size="lg" type="text" value={fEmergencyPhone} placeholder="9876543210"
  onChange={(e) => setFEmergencyPhone(e.target.value)}
  className="bg-gray-50 shadow-none" />
  </div>
  </div>
  </div>

  {/* ── Class & Subject assignment (edit only) ── */}
  {editTarget && (
  <>
  <div className="border-t border-dashed border-gray-200 pt-1" />

 {assignError && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl">{assignError}</div>
 )}

 {loadingAssign ? (
 <FormSkeleton className="py-4" />
 ) : (
 <>
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
 <Button variant="ghost"
 key={cls.id}
 type="button"
 aria-pressed={selected}
 onClick={() => {
 setFClassIds((prev) => {
 const next = new Set(prev);
 if (next.has(cls.id)) next.delete(cls.id);
 else next.add(cls.id);
 return next;
 });
 }}
 className={cn(
 "h-auto w-full justify-between whitespace-normal p-3 rounded-xl border text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-primary-500",
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
 </Button>
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
 <Input size="lg"
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
 className="bg-gray-50 pl-9 shadow-none"
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
 <Button variant="ghost"
 type="button"
 aria-expanded={isOpen}
 onClick={() => toggleGroup(group.classId)}
 className="h-auto w-full justify-between whitespace-normal bg-gray-50 px-3 py-2.5 text-left shadow-none transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-500"
 >
 <div className="flex items-center gap-2">
 <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
 <span className="text-xs font-bold text-gray-700">{group.className}</span>
 <span className="text-[10px] text-gray-400">{group.subjects.length} subjects</span>
 </div>
 <div className="flex items-center gap-2">
 {selectedInGroup > 0 && (
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
 {selectedInGroup} selected
 </span>
 )}
 <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
 </div>
 </Button>

 {/* Subject list */}
 {isOpen && (
 <div className="divide-y divide-gray-100">
 {group.subjects.map((subj) => {
 const selected = fSubjectIds.has(subj.id);
 const hasOther = subj.teacherId && subj.teacherId !== editTarget.id;
 return (
 <Button variant="ghost"
 key={subj.id}
 type="button"
 aria-pressed={selected}
 onClick={() => toggleSubject(subj.id)}
 className={cn(
 "h-auto w-full justify-between whitespace-normal px-3 py-2.5 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-primary-500",
 selected ? "bg-primary-50" : "bg-white hover:bg-gray-50",
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
 ? <CheckCircle2 className="w-4 h-4 text-primary-600" />
 : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
 }
 </div>
 </Button>
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
 </>
 )}
 </div>


   </ResponsivePopover>

   <DatePickerDrawer
    open={showDatePicker}
    onOpenChange={setShowDatePicker}
    date={fDateOfBirth}
    onDateChange={setFDateOfBirth}
    title="Date of birth"
    allowClear
    disableFuture
   />

   <ResponsivePopover
    open={showDeleteConfirm}
    onOpenChange={(open) => { if (!deleting) setShowDeleteConfirm(open); }}
    title="Delete teacher?"
    description={editTarget ? "This action cannot be undone. Classes, subjects, results, diaries, and homework will be unlinked or deleted." : undefined}
    side="bottom"
    desktopView="right-drawer"
    className="shadow-none"
    
    footer={
     <div className="flex gap-3 border-t border-gray-100 bg-white px-5 py-4">
      <Button type="button" variant="outline" disabled={deleting} onClick={() => setShowDeleteConfirm(false)} className="flex-1 shadow-none">Cancel</Button>
      <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete} className="flex-1 shadow-none">
       {deleting && <Loader2 className="size-4 animate-spin" />} Delete
      </Button>
     </div>
    }
   >
    <p className="text-sm text-gray-600">Delete <strong>{editTarget?.name}</strong>?</p>
   </ResponsivePopover>

   <ImportModal
    show={showImport}
    config={importConfig}
    onComplete={() => {
     toast.success("Import completed successfully");
     setPage(1);
     load(search, 1, DEFAULT_PAGE_SIZE, sortBy, sortDir);
    }}
    onClose={() => setShowImport(false)}
   />
  </DashboardLayout>
 );
}
