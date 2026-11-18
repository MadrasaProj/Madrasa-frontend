import { TableSkeleton, SkeletonList, DetailSkeleton } from "@/components/ui/Skeleton";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import {
  listEducationSystems,
  createEducationSystem,
  updateEducationSystem,
  deleteEducationSystem,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
  getGradeLevelSubjects,
  createClassSubject,
  updateClassSubject,
  deleteClassSubject,
  syncEducationSystemSubjects,
  syncGradeLevelSubjects,
  listEducationSystemYearlyExams,
  createEducationSystemYearlyExam,
  updateEducationSystemYearlyExam,
  deleteEducationSystemYearlyExam,
  type EducationSystemInfo,
  type GradeLevelDetail,
  type ClassSubjectInfo,
  type YearlyExamConfig,
  type YearlyExamRecord,
  type YearlyExamSubjectOverride,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import {
  BookOpen, GraduationCap, Plus, Pencil, Trash2, X, Loader2, ArrowUpRight, RefreshCw, FileText, Check, Settings2, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GradeLevelForm {
  name: string;
  level: number;
}

interface GradeEntry {
  grade: string;
  min: number;
}

interface SubjectForm {
  subjectName: string;
  maxMarks: string;
  passMarks: string;
  annualPassMarks: string;
  grades: GradeEntry[];
}

const EMPTY_GL: GradeLevelForm = { name: "", level: 1 };
const EMPTY_SUBJECT: SubjectForm = { subjectName: "", maxMarks: "", passMarks: "", annualPassMarks: "", grades: [] };

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all";
const labelCls = "text-xs font-semibold text-gray-600 mb-1.5 block";

export default function AdminGlobalClassSubjectsPage() {
  const { accessToken } = useAuthStore();
  const token = accessToken ?? "";

  const [systems, setSystems] = useState<EducationSystemInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // System modal
  const [showSysModal, setShowSysModal] = useState(false);
  const [editingSys, setEditingSys] = useState<string | null>(null);
  const [sysName, setSysName] = useState("");
  const [sysCode, setSysCode] = useState("");
  const [sysDesc, setSysDesc] = useState("");
  const [sysSaving, setSysSaving] = useState(false);

  // Main drawer (system → classes + subjects)
  const [drawerSys, setDrawerSys] = useState<EducationSystemInfo | null>(null);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelDetail[]>([]);
  const [glLoading, setGlLoading] = useState(false);
  const [activeGlId, setActiveGlId] = useState<string | null>(null);

  // Subjects for active class
  const [subjects, setSubjects] = useState<ClassSubjectInfo[]>([]);
  const [subjLoading, setSubjLoading] = useState(false);

  // GL form drawer
  const [glFormDrawer, setGlFormDrawer] = useState(false);
  const [glForm, setGlForm] = useState<GradeLevelForm>(EMPTY_GL);
  const [editingGl, setEditingGl] = useState<string | null>(null);
  const [glSaving, setGlSaving] = useState(false);

  // Subject form (inline right panel)
  const [showSubjForm, setShowSubjForm] = useState(false);
  const [subjForm, setSubjForm] = useState<SubjectForm>(EMPTY_SUBJECT);
  const [editingSubj, setEditingSubj] = useState<string | null>(null);
  const [subjSaving, setSubjSaving] = useState(false);
  const [deletingSubjId, setDeletingSubjId] = useState<string | null>(null);

  // System Drawer Tabs & Yearly Exam State
  const [activeTab, setActiveTab] = useState<"classSubjects" | "exams">("classSubjects");
  const [yearlyExamsList, setYearlyExamsList] = useState<YearlyExamRecord[]>([]);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [activeExamClassId, setActiveExamClassId] = useState<string | null>(null);
  const [yearlyExamConfig, setYearlyExamConfig] = useState<YearlyExamConfig>({});
  const [yearlyExamLoading, setYearlyExamLoading] = useState(false);
  const [yearlyExamSaving, setYearlyExamSaving] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [termFormName, setTermFormName] = useState("");
  const [termFormTerm, setTermFormTerm] = useState("");
  const [termModalSaving, setTermModalSaving] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [examSubjectsByGl, setExamSubjectsByGl] = useState<Record<string, ClassSubjectInfo[]>>({});
  const [examSubjectsLoading, setExamSubjectsLoading] = useState(false);
  const [editingOverride, setEditingOverride] = useState<{
    classKey: string;
    subjKey: string;
    subjectName: string;
    className: string;
    form: {
      maxMarks: string;
      passMarks: string;
      annualPassMarks: string;
      grades: GradeEntry[];
    };
  } | null>(null);

  // ── Systems ───────────────────────────────────────────────────────────────────

  const loadSystems = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await listEducationSystems(token);
      setSystems(res.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadSystems(); }, [loadSystems]);

  const openAddSys = () => {
    setEditingSys(null); setSysName(""); setSysCode(""); setSysDesc(""); setShowSysModal(true);
  };

  const openEditSys = (sys: EducationSystemInfo) => {
    setEditingSys(sys.id); setSysName(sys.name); setSysCode(sys.code); setSysDesc(sys.description ?? ""); setShowSysModal(true);
  };

  const handleSaveSys = async () => {
    if (!sysName.trim() || !sysCode.trim()) { toast.error("Name and code are required."); return; }
    setSysSaving(true);
    try {
      if (editingSys) {
        const updated = await updateEducationSystem(editingSys, { name: sysName.trim(), code: sysCode.trim(), description: sysDesc.trim() || undefined }, token);
        setSystems((prev) => prev.map((s) => (s.id === editingSys ? { ...s, ...updated } : s)));
        toast.success("System updated");
      } else {
        const created = await createEducationSystem({ name: sysName.trim(), code: sysCode.trim(), description: sysDesc.trim() || undefined }, token);
        setSystems((prev) => [...prev, created]);
        toast.success("System created");
      }
      setShowSysModal(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSysSaving(false); }
  };

  const handleDeleteSys = async (sysId: string) => {
    if (!confirm("Are you sure you want to deactivate this education system?")) return;
    try {
      await deleteEducationSystem(sysId, token);
      setSystems((prev) => prev.filter((s) => s.id !== sysId));
      toast.success("System deactivated");
    } catch (e) { toast.error((e as Error).message); }
  };

  // ── Main Drawer & Yearly Exams (Multiple Terms) ───────────────────────────────

  const loadYearlyExamData = useCallback(async (sysId: string, glList: GradeLevelDetail[]) => {
    if (!token) return;
    setYearlyExamLoading(true);
    setExamSubjectsLoading(true);
    try {
      const [yearlyRes, ...subjectsRes] = await Promise.all([
        listEducationSystemYearlyExams(sysId, token).catch(() => ({ data: [] as YearlyExamRecord[] })),
        ...glList.map((gl) =>
          getGradeLevelSubjects(gl.id, token)
            .then((res) => ({ glId: gl.id, subjects: res.data }))
            .catch(() => ({ glId: gl.id, subjects: [] as ClassSubjectInfo[] })),
        ),
      ]);

      const exams = yearlyRes?.data || [];
      setYearlyExamsList(exams);
      if (exams.length > 0) {
        // Default to first exam if not selected or current selection missing
        setActiveExamId((curr) => {
          const exists = exams.some((e) => e.id === curr);
          const nextId = exists ? curr : exams[0].id;
          const chosen = exams.find((e) => e.id === nextId);
          setYearlyExamConfig(chosen?.config || {});
          return nextId;
        });
      } else {
        setActiveExamId(null);
        setYearlyExamConfig({});
      }

      const map: Record<string, ClassSubjectInfo[]> = {};
      for (const item of subjectsRes) {
        if ("glId" in item) {
          map[item.glId] = item.subjects;
        }
      }
      setExamSubjectsByGl(map);
    } catch {
      /* ignore */
    } finally {
      setYearlyExamLoading(false);
      setExamSubjectsLoading(false);
    }
  }, [token]);

  const openDrawer = async (sys: EducationSystemInfo) => {
    setDrawerSys(sys);
    setActiveGlId(null);
    setActiveExamClassId(null);
    setSubjects([]);
    setActiveTab("classSubjects");
    setGlLoading(true);
    try {
      const res = await listEducationSystems(token);
      const found = res.data.find((s) => s.id === sys.id);
      const gls = found?.gradeLevels ?? [];
      setGradeLevels(gls);
      if (gls.length > 0) {
        setActiveExamClassId(gls[0].id);
      }
      loadYearlyExamData(sys.id, gls);
    } catch { /* ignore */ }
    finally { setGlLoading(false); }
    setGlFormDrawer(false);
    setShowSubjForm(false);
  };

  const selectExamTerm = (exam: YearlyExamRecord) => {
    setActiveExamId(exam.id);
    setYearlyExamConfig(exam.config || {});
  };

  const openAddTermModal = () => {
    setEditingTermId(null);
    setTermFormName("");
    setTermFormTerm("");
    setShowTermModal(true);
  };

  const openEditTermModal = (exam: YearlyExamRecord) => {
    setEditingTermId(exam.id);
    setTermFormName(exam.name);
    setTermFormTerm(exam.term || "");
    setShowTermModal(true);
  };

  const handleSaveTermModal = async () => {
    if (!termFormName.trim()) {
      toast.error("Term / Exam name is required (e.g. Mid-Term Exam)");
      return;
    }
    if (!drawerSys) return;

    setTermModalSaving(true);
    try {
      if (editingTermId) {
        const res = await updateEducationSystemYearlyExam(
          editingTermId,
          { name: termFormName.trim(), term: termFormTerm.trim() || undefined },
          token,
        );
        if (res?.data) {
          setYearlyExamsList((prev) =>
            prev.map((e) => (e.id === editingTermId ? { ...e, ...res.data } : e)),
          );
          toast.success("Exam term updated");
        }
      } else {
        const res = await createEducationSystemYearlyExam(
          drawerSys.id,
          {
            name: termFormName.trim(),
            term: termFormTerm.trim() || undefined,
            config: {},
          },
          token,
        );
        if (res?.data) {
          setYearlyExamsList((prev) => [res.data, ...prev]);
          setActiveExamId(res.data.id);
          setYearlyExamConfig(res.data.config || {});
          toast.success("New exam term created");
        }
      }
      setShowTermModal(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save exam term");
    } finally {
      setTermModalSaving(false);
    }
  };

  const handleDeleteTerm = async (examId: string, examName: string) => {
    if (!confirm(`Are you sure you want to delete "${examName}"?`)) return;
    try {
      await deleteEducationSystemYearlyExam(examId, token);
      setYearlyExamsList((prev) => {
        const filtered = prev.filter((e) => e.id !== examId);
        if (activeExamId === examId) {
          if (filtered.length > 0) {
            setActiveExamId(filtered[0].id);
            setYearlyExamConfig(filtered[0].config || {});
          } else {
            setActiveExamId(null);
            setYearlyExamConfig({});
          }
        }
        return filtered;
      });
      toast.success("Exam term deleted");
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete exam term");
    }
  };

  const handleToggleSubjectExam = (classKey: string, subjKey: string, currentlyEnabled: boolean) => {
    setYearlyExamConfig((prev) => {
      const classCfg = { ...(prev[classKey] || {}) };
      if (currentlyEnabled) {
        classCfg[subjKey] = false;
      } else {
        classCfg[subjKey] = true;
      }
      return { ...prev, [classKey]: classCfg };
    });
  };

  const handleOpenOverrideModal = (
    classKey: string,
    subjKey: string,
    subject: ClassSubjectInfo,
    className: string,
  ) => {
    const currentVal = yearlyExamConfig[classKey]?.[subjKey];
    const isObj = currentVal && typeof currentVal === "object";
    const currentOverride: YearlyExamSubjectOverride = isObj ? currentVal : {};

    // Load grade config from override first, else fallback to standard classSubject gradeConfig
    const effectiveGradeConfig = currentOverride.gradeConfig || subject.gradeConfig;
    const grades: GradeEntry[] = [];
    if (effectiveGradeConfig && typeof effectiveGradeConfig === "object") {
      for (const [grade, val] of Object.entries(effectiveGradeConfig)) {
        const entry = val as { min?: number };
        grades.push({ grade, min: entry.min ?? 0 });
      }
      grades.sort((a, b) => b.min - a.min);
    }

    setEditingOverride({
      classKey,
      subjKey,
      subjectName: subject.subjectName,
      className,
      form: {
        maxMarks: currentOverride.maxMarks !== undefined ? String(currentOverride.maxMarks) : (subject.maxMarks !== null && subject.maxMarks !== undefined ? String(subject.maxMarks) : ""),
        passMarks: currentOverride.passMarks !== undefined ? String(currentOverride.passMarks) : (subject.passMarks !== null && subject.passMarks !== undefined ? String(subject.passMarks) : ""),
        annualPassMarks: currentOverride.annualPassMarks !== undefined ? String(currentOverride.annualPassMarks) : (subject.annualPassMarks !== null && subject.annualPassMarks !== undefined ? String(subject.annualPassMarks) : ""),
        grades,
      },
    });
  };

  const handleSaveOverride = () => {
    if (!editingOverride) return;
    const { classKey, subjKey, form } = editingOverride;

    const overrideObj: YearlyExamSubjectOverride = {};
    if (form.maxMarks.trim()) overrideObj.maxMarks = parseInt(form.maxMarks, 10);
    if (form.passMarks.trim()) overrideObj.passMarks = parseInt(form.passMarks, 10);
    if (form.annualPassMarks.trim()) overrideObj.annualPassMarks = parseInt(form.annualPassMarks, 10);

    if (form.grades && form.grades.length > 0) {
      const gradeConfig: Record<string, { min: number }> = {};
      for (const g of form.grades) {
        if (g.grade.trim()) {
          gradeConfig[g.grade.trim()] = { min: g.min };
        }
      }
      if (Object.keys(gradeConfig).length > 0) {
        overrideObj.gradeConfig = gradeConfig;
      }
    }

    setYearlyExamConfig((prev) => {
      const classCfg = { ...(prev[classKey] || {}) };
      if (Object.keys(overrideObj).length === 0) {
        classCfg[subjKey] = true;
      } else {
        classCfg[subjKey] = overrideObj;
      }
      return { ...prev, [classKey]: classCfg };
    });

    setEditingOverride(null);
    toast.success("Exam config updated in draft");
  };

  const handleResetOverride = (classKey: string, subjKey: string) => {
    setYearlyExamConfig((prev) => {
      const classCfg = { ...(prev[classKey] || {}) };
      classCfg[subjKey] = true;
      return { ...prev, [classKey]: classCfg };
    });
    setEditingOverride(null);
    toast.info("Subject reset to default settings");
  };

  const handleSaveYearlyExam = async () => {
    if (!activeExamId) {
      toast.error("Please create or select an exam term first.");
      return;
    }
    setYearlyExamSaving(true);
    try {
      const res = await updateEducationSystemYearlyExam(
        activeExamId,
        { config: yearlyExamConfig },
        token,
      );
      if (res?.data) {
        setYearlyExamsList((prev) =>
          prev.map((e) => (e.id === activeExamId ? { ...e, config: res.data.config } : e)),
        );
        setYearlyExamConfig(res.data.config || {});
      }
      toast.success("Yearly exam configuration saved successfully!");
    } catch (e) {
      toast.error((e as Error).message || "Failed to save yearly exam configuration");
    } finally {
      setYearlyExamSaving(false);
    }
  };

  const selectGl = async (gl: GradeLevelDetail) => {
    setActiveGlId(gl.id);
    setShowSubjForm(false);
    setSubjLoading(true);
    try {
      const res = await getGradeLevelSubjects(gl.id, token);
      setSubjects(res.data);
    } catch { /* ignore */ }
    finally { setSubjLoading(false); }
    setSubjForm(EMPTY_SUBJECT);
    setEditingSubj(null);
  };

  // ── GL CRUD ───────────────────────────────────────────────────────────────────

  const openGlFormDrawer = (gl?: GradeLevelDetail) => {
    if (gl) { setGlForm({ name: gl.name, level: gl.level }); setEditingGl(gl.id); }
    else { setGlForm(EMPTY_GL); setEditingGl(null); }
    setGlFormDrawer(true);
  };

  const saveGl = async () => {
    if (!glForm.name.trim()) { toast.error("Name is required."); return; }
    if (!drawerSys) return;
    setGlSaving(true);
    try {
      if (editingGl) {
        const updated = await updateGradeLevel(editingGl, { name: glForm.name.trim(), level: glForm.level }, token);
        setGradeLevels((prev) => prev.map((g) => (g.id === editingGl ? { ...g, ...updated } : g)));
        toast.success("Class updated");
      } else {
        const created = await createGradeLevel(drawerSys.id, { name: glForm.name.trim(), level: glForm.level }, token);
        setGradeLevels((prev) => [...prev, created]);
        toast.success("Class created");
      }
      setGlFormDrawer(false);
      setGlForm(EMPTY_GL);
      setEditingGl(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGlSaving(false); }
  };

  const deleteGl = async (glId: string) => {
    if (!confirm("Are you sure you want to deactivate this class?")) return;
    try {
      await deleteGradeLevel(glId, token);
      setGradeLevels((prev) => prev.filter((g) => g.id !== glId));
      if (activeGlId === glId) { setActiveGlId(null); setSubjects([]); }
      toast.success("Class deactivated");
    } catch (e) { toast.error((e as Error).message); }
  };

  // ── Subject CRUD ──────────────────────────────────────────────────────────────

  const openAddSubjForm = () => {
    setSubjForm(EMPTY_SUBJECT); setEditingSubj(null); setShowSubjForm(true);
  };

  const editSubj = (s: ClassSubjectInfo) => {
    setEditingSubj(s.id);
    const grades: GradeEntry[] = [];
    if (s.gradeConfig && typeof s.gradeConfig === "object") {
      for (const [grade, val] of Object.entries(s.gradeConfig)) {
        const entry = val as { min?: number };
        grades.push({ grade, min: entry.min ?? 0 });
      }
      grades.sort((a, b) => b.min - a.min);
    }
    setSubjForm({
      subjectName: s.subjectName,
      maxMarks: s.maxMarks?.toString() ?? "",
      passMarks: s.passMarks?.toString() ?? "",
      annualPassMarks: s.annualPassMarks?.toString() ?? "",
      grades,
    });
    setShowSubjForm(true);
  };

  const cancelSubjForm = () => { setShowSubjForm(false); setSubjForm(EMPTY_SUBJECT); setEditingSubj(null); };

  const saveSubj = async () => {
    if (!subjForm.subjectName.trim()) { toast.error("Subject name is required."); return; }
    if (!activeGlId) return;
    setSubjSaving(true);
    try {
      const dto: any = { subjectName: subjForm.subjectName.trim() };
      if (subjForm.maxMarks) dto.maxMarks = parseInt(subjForm.maxMarks, 10);
      if (subjForm.passMarks) dto.passMarks = parseInt(subjForm.passMarks, 10);
      if (subjForm.annualPassMarks) dto.annualPassMarks = parseInt(subjForm.annualPassMarks, 10);
      if (subjForm.grades.length > 0) {
        const config: Record<string, { min: number }> = {};
        for (const g of subjForm.grades) {
          if (g.grade.trim()) config[g.grade.trim()] = { min: g.min };
        }
        dto.gradeConfig = config;
      }

      if (editingSubj) {
        const updated = await updateClassSubject(editingSubj, dto, token);
        setSubjects((prev) => prev.map((s) => (s.id === editingSubj ? { ...s, ...updated } : s)));
        const prop = (updated as any)?.propagation;
        if (prop && prop.classesUpdated > 0) {
          toast.success(`Subject updated & synced across ${prop.classesUpdated} madrasa class(es)`);
        } else {
          toast.success("Subject updated");
        }
      } else {
        const created = await createClassSubject(activeGlId, dto, token);
        setSubjects((prev) => [...prev, created]);
        const prop = (created as any)?.propagation;
        if (prop && prop.classesUpdated > 0) {
          toast.success(`Subject added to ${prop.classesUpdated} existing madrasa class(es)`);
        } else {
          toast.success("Subject created");
        }
      }
      setShowSubjForm(false);
      setSubjForm(EMPTY_SUBJECT);
      setEditingSubj(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubjSaving(false); }
  };

  const [syncingSys, setSyncingSys] = useState(false);
  const [syncingGl, setSyncingGl] = useState(false);

  const handleSyncSystem = async () => {
    if (!drawerSys || !token) return;
    setSyncingSys(true);
    try {
      const res = await syncEducationSystemSubjects(drawerSys.id, token);
      if (res.async) {
        toast.success(res.message || "Sync job started in background across all enrolled madrasas.");
      } else {
        toast.success(
          `Academic system synced! ${res.stats?.classesUpdated ?? 0} class(es) updated, ${res.stats?.subjectsAdded ?? 0} subject(s) added, ${res.stats?.subjectsLinked ?? 0} linked.`
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncingSys(false);
    }
  };

  const handleSyncGradeLevel = async () => {
    if (!activeGlId || !token) return;
    setSyncingGl(true);
    try {
      const res = await syncGradeLevelSubjects(activeGlId, token);
      if (res.async) {
        toast.success(res.message || "Class sync started in background across all enrolled madrasas.");
      } else {
        toast.success(
          `Class synced! ${res.stats?.classesUpdated ?? 0} class(es) updated, ${res.stats?.subjectsAdded ?? 0} subject(s) added, ${res.stats?.subjectsLinked ?? 0} linked.`
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncingGl(false);
    }
  };

  const addGradeRow = () => {
    setSubjForm((f) => ({ ...f, grades: [...f.grades, { grade: "", min: 0 }] }));
  };

  const updateGradeRow = (i: number, field: keyof GradeEntry, value: string | number) => {
    setSubjForm((f) => {
      const grades = [...f.grades];
      grades[i] = { ...grades[i], [field]: value };
      return { ...f, grades };
    });
  };

  const removeGradeRow = (i: number) => {
    setSubjForm((f) => ({ ...f, grades: f.grades.filter((_, idx) => idx !== i) }));
  };

  const deleteSubj = async (subjId: string) => {
    if (!confirm("Are you sure you want to remove this subject from this grade level? This will remove or deactivate it across all classes in this system.")) {
      return;
    }
    setDeletingSubjId(subjId);
    try {
      const res: any = await deleteClassSubject(subjId, token);
      setSubjects((prev) => prev.filter((s) => s.id !== subjId));
      if (res?.deactivatedCount > 0) {
        toast.success(`Subject removed. Preserved ${res.deactivatedCount} historical exam/result record(s).`);
      } else {
        toast.success("Subject deleted");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingSubjId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <PageHeader
        title="Accademic Systems"
        subtitle="Manage education systems, classes, and subjects"
        icon={BookOpen}
        action={
          <button onClick={openAddSys}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add System
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={loadSystems} />}

      {loading && <TableSkeleton />}

      {!loading && systems.length === 0 && (
        <div className="text-center py-20">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No education systems yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first system to get started</p>
        </div>
      )}

      {/* Systems table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3.5">System</th>
              <th className="text-left px-5 py-3.5">Code</th>
              <th className="text-left px-5 py-3.5">Classes</th>
              <th className="text-right px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {systems.map((sys) => (
              <tr key={sys.id}
                onClick={() => openDrawer(sys)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">{sys.name}</span>
                      {sys.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{sys.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600 font-mono">{sys.code}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600">{sys.gradeLevels.length} classes</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={(e) => { e.stopPropagation(); openEditSys(sys); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 mr-0.5"
                    title="Edit system">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openDrawer(sys); }}
                    className="p-1.5 rounded-lg hover:bg-primary-100 text-gray-400 hover:text-primary-600 mr-0.5"
                    title="Manage classes & subjects">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSys(sys.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Deactivate system">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Modal */}
      <AnimatePresence>
        {showSysModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSysModal(false)} className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">{editingSys ? "Edit System" : "Add System"}</h3>
                  <button onClick={() => setShowSysModal(false)} className="p-1.5 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  <div><label className={labelCls}>Name *</label><input value={sysName} onChange={(e) => setSysName(e.target.value)} className={inputCls} placeholder="e.g. CBSE" /></div>
                  <div><label className={labelCls}>Code *</label><input value={sysCode} onChange={(e) => setSysCode(e.target.value)} className={inputCls} placeholder="e.g. CBSE" /></div>
                  <div><label className={labelCls}>Description</label><textarea value={sysDesc} onChange={(e) => setSysDesc(e.target.value)} className={inputCls} rows={2} /></div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowSysModal(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200">Cancel</button>
                  <button onClick={handleSaveSys} disabled={sysSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                    {sysSaving && <Loader2 className="w-4 h-4 animate-spin" />}{editingSys ? "Save" : "Create"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Big Drawer: left = classes, right = subjects */}
      <AnimatePresence>
        {drawerSys && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerSys(null)} className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-[75vw] bg-white shadow-2xl pointer-events-auto flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
                
                  <div>
                    <h2 className="font-bold text-gray-900">{drawerSys.name}</h2>
                    <p className="text-xs text-gray-400">{drawerSys.code} · {gradeLevels.length} classes</p>
                  </div>

                  <div className="ml-auto flex items-center gap-2 pr-10">
                    <button
                      type="button"
                      onClick={handleSyncSystem}
                      disabled={syncingSys}
                      title="Sync subjects and ensure all active classes have all subjects of their grade level"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", syncingSys && "animate-spin text-primary-600")} />
                      <span>{syncingSys ? "Syncing..." : "Sync to All Classes"}</span>
                    </button>
                  </div>

                  <button onClick={() => setDrawerSys(null)} className="absolute right-4 p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs bar */}
                <div className="flex items-center gap-2 px-6 border-b border-gray-200 bg-gray-50/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("classSubjects")}
                    className={cn(
                      "flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all",
                      activeTab === "classSubjects"
                        ? "border-primary-600 text-primary-700 bg-white shadow-xs rounded-t-lg -mb-px"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-t-lg",
                    )}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Class Subjects</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("exams")}
                    className={cn(
                      "flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all",
                      activeTab === "exams"
                        ? "border-primary-600 text-primary-700 bg-white shadow-xs rounded-t-lg -mb-px"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-t-lg",
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Exams (Terms)</span>
                    {yearlyExamsList.length > 0 && (
                      <span className="text-[11px] bg-primary-100 text-primary-700 px-1.5 py-0.2 rounded-full font-bold">
                        {yearlyExamsList.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tab content */}
                {activeTab === "classSubjects" ? (
                  /* Body: split layout */
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left panel: Class list */}
                    <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Classes</span>
                        <button onClick={() => openGlFormDrawer()}
                          className="p-1 rounded-lg hover:bg-primary-100 text-primary-600 hover:text-primary-700">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {glLoading ? (
                          <SkeletonList count={4} className="p-3" />
                        ) : gradeLevels.length === 0 ? (
                          <p className="text-sm text-gray-400 italic text-center py-8">No classes yet</p>
                        ) : (
                          <div className="py-1">
                            {gradeLevels.map((gl) => (
                              <div key={gl.id}
                                onClick={() => selectGl(gl)}
                                className={cn(
                                  "group flex items-center justify-between px-4 py-3 mx-2 rounded-xl cursor-pointer transition-colors",
                                  activeGlId === gl.id
                                    ? "bg-primary-50 text-primary-700"
                                    : "hover:bg-gray-50 text-gray-700",
                                )}
                              >
                                <div>
                                  <span className="text-sm font-medium">{gl.name}</span>
                                  <span className="text-xs text-gray-400 ml-2">Lvl {gl.level}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button onClick={(e) => { e.stopPropagation(); openGlFormDrawer(gl); }}
                                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteGl(gl.id); }}
                                    className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right panel: Subjects */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {!activeGlId ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">Select a class to manage subjects</p>
                          </div>
                        </div>
                      ) : subjLoading ? (
                        <DetailSkeleton className="flex-1" />
                      ) : (
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">
                              Subjects — <span className="text-primary-600">{gradeLevels.find((g) => g.id === activeGlId)?.name}</span>
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSyncGradeLevel}
                                disabled={syncingGl}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                title="Sync this class's subjects to all enrolled madrasas"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5", syncingGl && "animate-spin text-primary-600")} />
                                <span>{syncingGl ? "Syncing..." : "Sync Class"}</span>
                              </button>
                              <button onClick={openAddSubjForm}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary-100 text-primary-700 text-sm font-semibold hover:bg-primary-200 transition-colors">
                                <Plus className="w-4 h-4" /> Add Subject
                              </button>
                            </div>
                          </div>

                          {/* Subjects table */}
                          <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  <th className="text-left px-4 py-3">Subject</th>
                                  <th className="text-left px-4 py-3">Max Marks</th>
                                  <th className="text-left px-4 py-3">Pass Marks</th>
                                  <th className="text-left px-4 py-3">Annual Pass</th>
                                  <th className="text-left px-4 py-3">Grade Config</th>
                                  <th className="text-right px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {subjects.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{s.subjectName}</td>
                                    <td className="px-4 py-3.5 text-sm text-gray-600">{s.maxMarks ?? "—"}</td>
                                    <td className="px-4 py-3.5 text-sm text-gray-600">{s.passMarks ?? "—"}</td>
                                    <td className="px-4 py-3.5 text-sm text-gray-600">{s.annualPassMarks ?? "—"}</td>
                                    <td className="px-4 py-3.5">
                                      {s.gradeConfig ? (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Set</span>
                                      ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      <button onClick={() => editSubj(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 mr-1">
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteSubj(s.id)}
                                        disabled={deletingSubjId === s.id}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                                        title="Delete subject"
                                      >
                                        {deletingSubjId === s.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {subjects.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 italic">No subjects yet</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Exams Tab Content - Split into Term list & Term Subject Config */
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left sub-panel: Terms list */}
                    <div className="w-80 border-r border-gray-200 flex flex-col shrink-0 bg-gray-50/40">
                      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
                        <div>
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Exam Terms</span>
                          <p className="text-[11px] text-gray-400">Mid-term, Final, etc.</p>
                        </div>
                        <button
                          type="button"
                          onClick={openAddTermModal}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-semibold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Term</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {yearlyExamLoading ? (
                          <SkeletonList count={3} className="p-2" />
                        ) : yearlyExamsList.length === 0 ? (
                          <div className="text-center py-12 px-4">
                            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-gray-600">No terms yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Add terms like Mid-term, Half-Yearly, or Final Annual Exam.
                            </p>
                            <button
                              type="button"
                              onClick={openAddTermModal}
                              className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create First Term</span>
                            </button>
                          </div>
                        ) : (
                          yearlyExamsList.map((exam) => {
                            const isSelected = activeExamId === exam.id;
                            const configuredClassesCount = Object.keys(exam.config || {}).length;

                            return (
                              <div
                                key={exam.id}
                                onClick={() => selectExamTerm(exam)}
                                className={cn(
                                  "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                  isSelected
                                    ? "bg-white border-primary-300 shadow-xs text-primary-900"
                                    : "bg-transparent border-transparent hover:bg-white/80 hover:border-gray-200 text-gray-700",
                                )}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold truncate">{exam.name}</span>
                                    {isSelected && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {exam.term && (
                                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        {exam.term}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-gray-400">
                                      {configuredClassesCount} class{configuredClassesCount !== 1 ? "es" : ""} tuned
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditTermModal(exam);
                                    }}
                                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                    title="Edit term name"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTerm(exam.id, exam.name);
                                    }}
                                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                                    title="Delete term"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right sub-panel: Selected Term's Subject Config */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
                      {!activeExamId ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                          <div className="text-center p-6">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-medium text-gray-600">Select or add an exam term</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-sm">
                              Create multiple terms like Mid-term, Second Term, or Final Exam and customize their class-subject configs.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Config Header */}
                          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-gray-900">
                                  {yearlyExamsList.find((e) => e.id === activeExamId)?.name}
                                </h3>
                                {yearlyExamsList.find((e) => e.id === activeExamId)?.term && (
                                  <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                                    {yearlyExamsList.find((e) => e.id === activeExamId)?.term}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Set exam subject participation and custom marks for this term. Format: <code className="text-primary-700 bg-primary-50 px-1 py-0.5 rounded font-mono text-[11px]">{"{[class]:[subject]:[boolean|{updatedConfig}]}"}</code>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => drawerSys && loadYearlyExamData(drawerSys.id, gradeLevels)}
                                disabled={yearlyExamLoading}
                                className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5", yearlyExamLoading && "animate-spin text-primary-600")} />
                                <span>Reload</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveYearlyExam}
                                disabled={yearlyExamSaving || yearlyExamLoading}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                              >
                                {yearlyExamSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>{yearlyExamSaving ? "Saving..." : "Save Term Config"}</span>
                              </button>
                            </div>
                          </div>

                          {/* Classes Horizontal Tabs */}
                          {gradeLevels.length > 0 && (
                            <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-gray-200 bg-white overflow-x-auto shrink-0 scrollbar-thin">
                              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-2 shrink-0">
                                Class:
                              </span>
                              {gradeLevels.map((gl) => {
                                const isGlActive = (activeExamClassId || gradeLevels[0]?.id) === gl.id;
                                const subjs = examSubjectsByGl[gl.id] || [];
                                const classCfg = yearlyExamConfig[gl.id] || {};
                                const includedCount = subjs.filter((s) => classCfg[s.id] !== false).length;

                                return (
                                  <button
                                    key={gl.id}
                                    type="button"
                                    onClick={() => setActiveExamClassId(gl.id)}
                                    className={cn(
                                      "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 border",
                                      isGlActive
                                        ? "bg-primary-50 border-primary-300 text-primary-700 shadow-xs"
                                        : "bg-gray-50/70 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                    )}
                                  >
                                    <span>{gl.name}</span>
                                    <span
                                      className={cn(
                                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                        isGlActive
                                          ? "bg-primary-200/80 text-primary-800"
                                          : "bg-gray-200 text-gray-600",
                                      )}
                                    >
                                      {includedCount}/{subjs.length}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Selected Class Subjects Content */}
                          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {examSubjectsLoading ? (
                              <div className="space-y-4">
                                <SkeletonList count={3} />
                              </div>
                            ) : gradeLevels.length === 0 ? (
                              <div className="text-center py-12 text-gray-400">
                                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p className="text-sm font-medium">No classes configured in this education system yet.</p>
                                <p className="text-xs text-gray-400 mt-1">Add classes in the Class Subjects tab first.</p>
                              </div>
                            ) : (() => {
                              const activeGl =
                                gradeLevels.find((g) => g.id === (activeExamClassId || gradeLevels[0]?.id)) ||
                                gradeLevels[0];
                              if (!activeGl) return null;

                              const glSubjs = examSubjectsByGl[activeGl.id] || [];
                              const classCfg = yearlyExamConfig[activeGl.id] || {};

                              return (
                                <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                                  <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 border-b border-gray-100">
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-bold text-gray-900 text-sm">{activeGl.name}</span>
                                      <span className="text-xs text-gray-400 font-medium">Level {activeGl.level}</span>
                                      <span className="text-[11px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
                                        {glSubjs.length} subject{glSubjs.length !== 1 ? "s" : ""}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedClassCfg = { ...classCfg };
                                          glSubjs.forEach((s) => {
                                            if (updatedClassCfg[s.id] === undefined || updatedClassCfg[s.id] === false) {
                                              updatedClassCfg[s.id] = true;
                                            }
                                          });
                                          setYearlyExamConfig((prev) => ({ ...prev, [activeGl.id]: updatedClassCfg }));
                                          toast.success(`Included all subjects for ${activeGl.name}`);
                                        }}
                                        className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                                      >
                                        Include All
                                      </button>
                                      <span className="text-gray-300">·</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedClassCfg = { ...classCfg };
                                          glSubjs.forEach((s) => {
                                            updatedClassCfg[s.id] = false;
                                          });
                                          setYearlyExamConfig((prev) => ({ ...prev, [activeGl.id]: updatedClassCfg }));
                                          toast.info(`Excluded all subjects for ${activeGl.name}`);
                                        }}
                                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:underline"
                                      >
                                        Exclude All
                                      </button>
                                    </div>
                                  </div>

                                  {glSubjs.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-gray-400 italic">
                                      No subjects defined for this class. Add subjects in the Class Subjects tab.
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-gray-100">
                                      {glSubjs.map((s) => {
                                        const val = classCfg[s.id];
                                        const isIncluded = val !== false; // defaults to active/included
                                        const isOverride = val && typeof val === "object";
                                        const overrideObj = isOverride ? (val as YearlyExamSubjectOverride) : null;

                                        return (
                                          <div
                                            key={s.id}
                                            className={cn(
                                              "flex items-center justify-between px-5 py-3 transition-colors",
                                              isIncluded ? "bg-white" : "bg-gray-50/60 opacity-60",
                                            )}
                                          >
                                            <div className="flex items-center gap-3">
                                              <input
                                                type="checkbox"
                                                checked={isIncluded}
                                                onChange={() => handleToggleSubjectExam(activeGl.id, s.id, isIncluded)}
                                                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer"
                                                id={`exam-toggle-${activeExamId}-${activeGl.id}-${s.id}`}
                                              />
                                              <label
                                                htmlFor={`exam-toggle-${activeExamId}-${activeGl.id}-${s.id}`}
                                                className={cn(
                                                  "text-sm font-medium cursor-pointer",
                                                  isIncluded ? "text-gray-900" : "text-gray-500 line-through",
                                                )}
                                              >
                                                {s.subjectName}
                                              </label>

                                              {isOverride && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                  Custom Config
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs">
                                              <div className="flex items-center gap-3 text-gray-500">
                                                <span>
                                                  Max:{" "}
                                                  <strong className="text-gray-800">
                                                    {overrideObj?.maxMarks ?? s.maxMarks ?? "—"}
                                                  </strong>
                                                </span>
                                                <span>
                                                  Pass:{" "}
                                                  <strong className="text-gray-800">
                                                    {overrideObj?.passMarks ?? s.passMarks ?? "—"}
                                                  </strong>
                                                </span>
                                                <span>
                                                  Annual Pass:{" "}
                                                  <strong className="text-gray-800">
                                                    {overrideObj?.annualPassMarks ?? s.annualPassMarks ?? "—"}
                                                  </strong>
                                                </span>
                                                <span>
                                                  Grades:{" "}
                                                  <strong className="text-gray-800">
                                                    {overrideObj?.gradeConfig
                                                      ? `${Object.keys(overrideObj.gradeConfig).length} custom`
                                                      : s.gradeConfig
                                                      ? "Class default"
                                                      : "—"}
                                                  </strong>
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-1.5 ml-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenOverrideModal(activeGl.id, s.id, s, activeGl.name)}
                                                  disabled={!isIncluded}
                                                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                  title="Configure custom marks for this term"
                                                >
                                                  <Settings2 className="w-3.5 h-3.5" />
                                                </button>

                                                {isOverride && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleResetOverride(activeGl.id, s.id)}
                                                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                                    title="Reset to default class subject marks"
                                                  >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* GL Form Drawer */}
      <AnimatePresence>
        {glFormDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setGlFormDrawer(false)} className="fixed inset-0 bg-black/20 z-50" />
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white shadow-2xl pointer-events-auto flex flex-col"
              >
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
                  <h2 className="font-bold text-gray-900">{editingGl ? "Edit Class" : "Add Class"}</h2>
                  <button onClick={() => setGlFormDrawer(false)} className="p-2 absolute right-3 rounded-xl hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 px-6 py-4 space-y-4">
                  <div><label className={labelCls}>Name *</label><input value={glForm.name} onChange={(e) => setGlForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Class 1" /></div>
                  <div><label className={labelCls}>Level</label><input type="number" value={glForm.level} onChange={(e) => setGlForm((f) => ({ ...f, level: parseInt(e.target.value) || 1 }))} className={inputCls} min={1} max={12} /></div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                  <button onClick={() => setGlFormDrawer(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200">Cancel</button>
                  <button onClick={saveGl} disabled={glSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                    {glSaving && <Loader2 className="w-4 h-4 animate-spin" />}{editingGl ? "Save" : "Create"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Subject Form Drawer */}
      <AnimatePresence>
        {showSubjForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={cancelSubjForm} className="fixed inset-0 bg-black/20 z-50" />
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-[40vw] bg-white shadow-2xl pointer-events-auto flex flex-col"
              >
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
                  <h2 className="font-bold text-gray-900">{editingSubj ? "Edit Subject" : "Add Subject"}</h2>
                  <button onClick={cancelSubjForm} className="absolute right-3 p-2 rounded-xl hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div>
                    <label className={labelCls}>Subject Name *</label>
                    <input value={subjForm.subjectName} onChange={(e) => setSubjForm((f) => ({ ...f, subjectName: e.target.value }))} className={inputCls} placeholder="e.g. Mathematics" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Max Marks</label>
                      <input type="number" value={subjForm.maxMarks} onChange={(e) => setSubjForm((f) => ({ ...f, maxMarks: e.target.value }))} className={inputCls} placeholder="e.g. 100" />
                    </div>
                    <div>
                      <label className={labelCls}>Pass Marks</label>
                      <input type="number" value={subjForm.passMarks} onChange={(e) => setSubjForm((f) => ({ ...f, passMarks: e.target.value }))} className={inputCls} placeholder="e.g. 30" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Annual Pass Marks</label>
                    <input type="number" value={subjForm.annualPassMarks} onChange={(e) => setSubjForm((f) => ({ ...f, annualPassMarks: e.target.value }))} className={inputCls} placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label className={labelCls}>Grade Config <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="space-y-2">
                      {subjForm.grades.map((g, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={g.grade}
                            onChange={(e) => updateGradeRow(i, "grade", e.target.value)}
                            className="w-20 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                            placeholder="A+"
                          />
                          <span className="text-xs text-gray-400">≥</span>
                          <input
                            type="number"
                            value={g.min}
                            onChange={(e) => updateGradeRow(i, "min", parseInt(e.target.value) || 0)}
                            className="w-24 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                            placeholder="90"
                          />
                          <button onClick={() => removeGradeRow(i)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={addGradeRow}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Grade
                      </button>
                    </div>
                    {subjForm.grades.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">Grades are evaluated top-down by min score. Highest min = best grade.</p>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                  <button onClick={cancelSubjForm} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200">Cancel</button>
                  <button onClick={saveSubj} disabled={subjSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                    {subjSaving && <Loader2 className="w-4 h-4 animate-spin" />}{editingSubj ? "Save" : "Add"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Yearly Exam Custom Override Modal */}
      <AnimatePresence>
        {editingOverride && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingOverride(null)}
              className="fixed inset-0 bg-black/30 z-50 backdrop-blur-xs"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 pointer-events-auto overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Custom Yearly Exam Marks</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {editingOverride.subjectName} · {editingOverride.className}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingOverride(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                    Set customized marks for this subject for the yearly exam. Leave empty or click reset to inherit default class subject settings.
                  </div>

                  <div>
                    <label className={labelCls}>Max Marks</label>
                    <input
                      type="number"
                      value={editingOverride.form.maxMarks}
                      onChange={(e) =>
                        setEditingOverride((prev) =>
                          prev
                            ? { ...prev, form: { ...prev.form, maxMarks: e.target.value } }
                            : null,
                        )
                      }
                      className={inputCls}
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Pass Marks</label>
                      <input
                        type="number"
                        value={editingOverride.form.passMarks}
                        onChange={(e) =>
                          setEditingOverride((prev) =>
                            prev
                              ? { ...prev, form: { ...prev.form, passMarks: e.target.value } }
                              : null,
                          )
                        }
                        className={inputCls}
                        placeholder="e.g. 35"
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Annual Pass Marks</label>
                      <input
                        type="number"
                        value={editingOverride.form.annualPassMarks}
                        onChange={(e) =>
                          setEditingOverride((prev) =>
                            prev
                              ? { ...prev, form: { ...prev.form, annualPassMarks: e.target.value } }
                              : null,
                          )
                        }
                        className={inputCls}
                        placeholder="e.g. 35"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      Grade Configuration for this Term <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {editingOverride.form.grades.map((g, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={g.grade}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingOverride((prev) => {
                                if (!prev) return null;
                                const nextGrades = [...prev.form.grades];
                                nextGrades[i] = { ...nextGrades[i], grade: val };
                                return { ...prev, form: { ...prev.form, grades: nextGrades } };
                              });
                            }}
                            className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                            placeholder="A+"
                          />
                          <span className="text-xs text-gray-400">≥</span>
                          <input
                            type="number"
                            value={g.min}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setEditingOverride((prev) => {
                                if (!prev) return null;
                                const nextGrades = [...prev.form.grades];
                                nextGrades[i] = { ...nextGrades[i], min: val };
                                return { ...prev, form: { ...prev.form, grades: nextGrades } };
                              });
                            }}
                            className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                            placeholder="90"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOverride((prev) => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  form: {
                                    ...prev.form,
                                    grades: prev.form.grades.filter((_, idx) => idx !== i),
                                  },
                                };
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOverride((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              form: {
                                ...prev.form,
                                grades: [...prev.form.grades, { grade: "", min: 0 }],
                              },
                            };
                          });
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Grade Row
                      </button>
                    </div>
                    {editingOverride.form.grades.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Custom grades configured here will be saved in the term's config JSON.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    type="button"
                    onClick={() =>
                      handleResetOverride(editingOverride.classKey, editingOverride.subjKey)
                    }
                    className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Reset to Default
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingOverride(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOverride}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Add / Edit Exam Term Modal */}
      <AnimatePresence>
        {showTermModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermModal(false)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingTermId ? "Edit Exam Term" : "Add New Exam Term"}
                  </h3>
                  <button
                    onClick={() => setShowTermModal(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className={labelCls}>Exam Name *</label>
                    <input
                      value={termFormName}
                      onChange={(e) => setTermFormName(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Mid-Term Examination 2026, Final Board Exam"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Term Label / Category <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      value={termFormTerm}
                      onChange={(e) => setTermFormTerm(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. TERM 1, MID-TERM, FINAL"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-gray-400">Quick suggestions:</span>
                      {["Mid-Term", "Term 1", "Term 2", "Final"].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setTermFormTerm(sug);
                            if (!termFormName) setTermFormName(`${sug} Exam`);
                          }}
                          className="text-[11px] font-medium bg-gray-100 hover:bg-primary-50 hover:text-primary-700 px-2 py-0.5 rounded-md text-gray-600 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    type="button"
                    onClick={() => setShowTermModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTermModal}
                    disabled={termModalSaving}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {termModalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingTermId ? "Update Term" : "Create Term"}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
