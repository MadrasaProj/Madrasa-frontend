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
  type EducationSystemInfo,
  type GradeLevelDetail,
  type ClassSubjectInfo,
} from "@/lib/super-admin-api";
import { useAuthStore } from "@/store/auth";
import {
  BookOpen, GraduationCap, Plus, Pencil, Trash2, X, Loader2, ArrowUpRight,
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

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";
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
    try {
      await deleteEducationSystem(sysId, token);
      setSystems((prev) => prev.filter((s) => s.id !== sysId));
      toast.success("System deactivated");
    } catch (e) { toast.error((e as Error).message); }
  };

  // ── Main Drawer ──────────────────────────────────────────────────────────────

  const openDrawer = async (sys: EducationSystemInfo) => {
    setDrawerSys(sys);
    setActiveGlId(null);
    setSubjects([]);
    setGlLoading(true);
    try {
      const res = await listEducationSystems(token);
      const found = res.data.find((s) => s.id === sys.id);
      setGradeLevels(found?.gradeLevels ?? []);
    } catch { /* ignore */ }
    finally { setGlLoading(false); }
    setGlFormDrawer(false);
    setShowSubjForm(false);
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
        toast.success("Subject updated");
      } else {
        const created = await createClassSubject(activeGlId, dto, token);
        setSubjects((prev) => [...prev, created]);
        toast.success("Subject created");
      }
      setShowSubjForm(false);
      setSubjForm(EMPTY_SUBJECT);
      setEditingSubj(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubjSaving(false); }
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
    try {
      await deleteClassSubject(subjId, token);
      setSubjects((prev) => prev.filter((s) => s.id !== subjId));
      toast.success("Subject deleted");
    } catch (e) { toast.error((e as Error).message); }
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
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add System
          </button>
        }
      />

      {error && <ApiErrorBanner message={error} onRetry={loadSystems} />}

      {loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

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
                    className="p-1.5 rounded-lg hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 mr-0.5"
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
                  <button onClick={handleSaveSys} disabled={sysSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
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

                    <button onClick={() => setDrawerSys(null)} className=" absolute right-4 p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body: split layout */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left panel: Class list */}
                  <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Classes</span>
                      <button onClick={() => openGlFormDrawer()}
                        className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {glLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
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
                                  ? "bg-emerald-50 text-emerald-700"
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
                      <div className="flex-1 flex justify-center items-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : (
                      <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-gray-900">
                            Subjects — <span className="text-emerald-600">{gradeLevels.find((g) => g.id === activeGlId)?.name}</span>
                          </h3>
                          <button onClick={openAddSubjForm}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition-colors">
                            <Plus className="w-4 h-4" /> Add Subject
                          </button>
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
                                    <button onClick={() => deleteSubj(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                                      <Trash2 className="w-4 h-4" />
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
                  <button onClick={saveGl} disabled={glSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
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
                            className="w-20 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                            placeholder="A+"
                          />
                          <span className="text-xs text-gray-400">≥</span>
                          <input
                            type="number"
                            value={g.min}
                            onChange={(e) => updateGradeRow(i, "min", parseInt(e.target.value) || 0)}
                            className="w-24 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                            placeholder="90"
                          />
                          <button onClick={() => removeGradeRow(i)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={addGradeRow}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
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
                  <button onClick={saveSubj} disabled={subjSaving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                    {subjSaving && <Loader2 className="w-4 h-4 animate-spin" />}{editingSubj ? "Save" : "Add"}
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
