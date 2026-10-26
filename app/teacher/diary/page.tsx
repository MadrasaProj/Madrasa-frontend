import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  upsertDiary, updateDiary, deleteDiary,
  type DiaryEntry, type DiaryComment,
} from "@/lib/diary-api";
import { useDiaryList } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  FileText, Plus, Save, CheckCircle2, Loader2, Trash2, Pencil,
  Users, GraduationCap, X, Search, ChevronLeft, ChevronRight,
  Bold, Italic, Underline, List, ListOrdered, Image, Palette, MessageSquare, CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";

function fmt(d: Date) { return d.toISOString().split("T")[0]; }

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const groups: Record<string, DiaryEntry[]> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function JournalList({ entries, openEdit, handleDelete, deletingId, lang }: {
  entries: DiaryEntry[];
  openEdit: (e: DiaryEntry) => void;
  handleDelete: (id: string) => void;
  deletingId: string | null;
  lang: Lang;
}) {
  const [commentViewId, setCommentViewId] = useState<string | null>(null);
  const grouped = useMemo(() => groupByDate(entries), [entries]);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (<>
    <div className="pb-20 space-y-8">
      {dates.map((dateKey) => (
        <div key={dateKey}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              {fmtDate(dateKey)}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="space-y-4">
            {grouped[dateKey].map((entry: DiaryEntry, i: number) => {
              const isClass = entry.targetType === "class";
              const themeCard: Record<string, string> = {
                default: "bg-white border-gray-200",
                classic: "bg-amber-50 border-amber-300/60",
                vintage: "bg-orange-50 border-orange-300/60",
                nature: "bg-primary-50 border-primary-300/60",
                ocean: "bg-blue-50 border-blue-300/60",
                dreamy: "bg-purple-50 border-purple-300/60",
                cozy: "bg-pink-50 border-pink-300/60",
                sunny: "bg-yellow-50 border-yellow-300/60",
              };
              const themeBadge: Record<string, string> = {
                default: "bg-gray-100 text-gray-500",
                classic: "bg-amber-200/50 text-amber-800",
                vintage: "bg-orange-200/50 text-orange-800",
                nature: "bg-primary-200/50 text-primary-800",
                ocean: "bg-blue-200/50 text-blue-800",
                dreamy: "bg-purple-200/50 text-purple-800",
                cozy: "bg-pink-200/50 text-pink-800",
                sunny: "bg-yellow-200/50 text-yellow-800",
              };
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "transition-all shadow-sm hover:shadow-lg relative overflow-hidden",
                    themeCard[entry.theme] ?? themeCard.default,
                    "rounded-2xl",
                  )}
                  style={{
                    borderRadius: "18px 20px 16px 22px",
                    borderWidth: "1.5px",
                  }}
                >
                  <div className="p-5 pt-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold leading-tight truncate">{entry.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            themeBadge[entry.theme] ?? themeBadge.default,
                          )}>
                            {isClass ? (entry.class?.name ?? t("teacherPages", "classBadge", lang)) : t("teacherPages", "studentBadge", lang)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" aria-label="Edit diary entry" onClick={() => openEdit(entry)} className="rounded-xl text-gray-400 hover:text-blue-500">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete diary entry" onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} className="rounded-xl text-gray-400 hover:text-red-500">
                          {deletingId === entry.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-base leading-relaxed line-clamp-4 [&_ul]:pl-5 [&_ol]:pl-5 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: entry.content }} />

                    {/* Footer */}
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-black/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentViewId(entry.id)}
                        className="gap-1.5 rounded-full text-xs text-gray-400 hover:text-gray-600"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {entry.comments?.length ?? 0}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    <ResponsivePopover
      open={commentViewId !== null}
      onOpenChange={(open) => { if (!open) setCommentViewId(null); }}
      title={t("teacherPages", "responsesTitle", lang)}
    >
      <div className="p-5">
        {(() => {
          const entry = entries.find((e) => e.id === commentViewId);
          if (!entry) return null;
          if (!entry.comments || entry.comments.length === 0) {
            return <p className="text-sm text-gray-400 text-center py-6">{t("teacherPages", "noResponsesYet", lang)}</p>;
          }
          return (
            <div className="space-y-3">
              {entry.comments.map((c: DiaryComment) => (
                <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    {c.parentName ?? t("teacherPages", "parentRole", lang)}
                  </p>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </ResponsivePopover>
  </>
  );
}

export default function TeacherDiaryPage() {
  const { user, accessToken } = useAuthStore();
  const { lang } = useLanguageStore();
  const cid   = user?.clientId ?? "";
  const token = accessToken ?? "";

  const qc = useQueryClient();
  const { activeClassId, activeClass } = useActiveClass();

  const { data: diaryData, isLoading: loadingDiary } = useDiaryList({ clientId: cid, token }, { classId: activeClassId }, { enabled: !!cid && !!token && !!activeClassId });
  const entries = (diaryData ?? []).filter((entry) => entry.classId === activeClassId);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const loading = loadingDiary || saving;
  const error = customError;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [targetType, setTargetType] = useState<"class" | "student">("class");
  const selectedClassId = activeClassId;
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(fmt(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [step, setStep] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState("default");
  const [themeOpen, setThemeOpen] = useState(false);

  const themes: Record<string, { bg: string; text: string; label: string; font: string; mlFont: string }> = {
    default: { bg: "bg-white",      text: "text-gray-800",  label: "Clean",   font: "system-ui, sans-serif", mlFont: "'Noto Sans Malayalam', sans-serif" },
    classic: { bg: "bg-amber-50",   text: "text-amber-900", label: "Classic", font: "'Merriweather', serif",   mlFont: "'Noto Serif Malayalam', serif" },
    vintage: { bg: "bg-orange-50",  text: "text-orange-900", label: "Vintage", font: "'Playfair Display', serif", mlFont: "'Noto Serif Malayalam', serif" },
    nature:  { bg: "bg-primary-50", text: "text-primary-900", label: "Nature", font: "'EB Garamond', serif",     mlFont: "'Noto Serif Malayalam', serif" },
    ocean:   { bg: "bg-blue-50",    text: "text-blue-900",  label: "Ocean",   font: "'DM Sans', sans-serif",   mlFont: "'Manjari', sans-serif" },
    dreamy:  { bg: "bg-purple-50",  text: "text-purple-900", label: "Dreamy", font: "'Nunito', sans-serif",     mlFont: "'Baloo Chettan 2', sans-serif" },
    cozy:    { bg: "bg-pink-50",    text: "text-pink-900",  label: "Cozy",    font: "'Cormorant Garamond', serif", mlFont: "'Noto Serif Malayalam', serif" },
    sunny:   { bg: "bg-yellow-50",  text: "text-yellow-900", label: "Sunny",  font: "'Fredoka', sans-serif",    mlFont: "'Baloo Chettan 2', sans-serif" },
  };

  const themeFontLinks: Record<string, string[]> = {
    classic: [
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
    ],
    vintage: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
    ],
    nature: [
      "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap",
      "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
    ],
    ocean: [
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&display=swap",
    ],
    dreamy: [
      "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@400;600&display=swap",
    ],
    cozy: [
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600&display=swap",
    ],
    sunny: [
      "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&display=swap",
      "https://fonts.googleapis.com/css2?family=Baloo+Chettan+2:wght@400;600&display=swap",
    ],
    default: [],
  };

  useEffect(() => {
    const links = theme !== "default" ? themeFontLinks[theme] : [];
    if (!links) return;
    for (const href of links) {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) continue;
      const el = document.createElement("link");
      el.href = href;
      el.rel = "stylesheet";
      document.head.appendChild(el);
    }
  }, [theme]);



  const loadStudents = useCallback(async (classId: string) => {
    if (!cid || !token || !classId) return;
    try {
      const res = await getStudents(cid, token, { classId, status: "ACTIVE", limit: 200 });
      setStudents(res.data ?? []);
    } catch { setStudents([]); }
  }, [cid, token]);

  useEffect(() => {
    if (targetType === "student") loadStudents(selectedClassId);
  }, [targetType, selectedClassId, loadStudents]);

  const openCreate = () => {
    setEditingEntry(null);
    setTargetType("class");

    setSelectedStudentIds([]);
    setTitle(""); setContent("");
    setDate(fmt(new Date()));
    setDatePickerOpen(false);
    setStudentSearch("");
    setStep(1);
    setTheme("default");
    setThemeOpen(false);
    setDrawerOpen(true);
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setTargetType(entry.targetType);

    setSelectedStudentIds(entry.recipients?.map((r) => r.studentId) ?? []);
    setTitle(entry.title);
            setContent(entry.content);
            setDate(entry.date.split("T")[0]);
            setDatePickerOpen(false);
            setStudentSearch("");
            setTheme(entry.theme ?? "default");
            setThemeOpen(false);
            if (entry.targetType === "student" && entry.classId) loadStudents(entry.classId);
            setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setDatePickerOpen(false); };

  const toggleStudent = (sid: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid],
    );
  };

  const execFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const insertImage = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000"}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}/${cid}/diary/upload-image`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData },
      );
      const data = await res.json();
      if (data.url) {
        editorRef.current?.focus();
        document.execCommand("insertImage", false, data.url);
      }
    } catch {
      // fallback to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        editorRef.current?.focus();
        document.execCommand("insertImage", false, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const html = editorRef.current?.innerHTML ?? content;
    if (!title.trim() || !html.trim() || html === "<br>") return;
    if (targetType === "class" && !selectedClassId) return;
    if (targetType === "student" && selectedStudentIds.length === 0) return;
    setSaving(true);
    try {
      if (editingEntry) {
        await updateDiary(cid, token, editingEntry.id, { title, content: html, theme });
      } else {
        await upsertDiary(cid, token, {
          classId: targetType === "class" ? selectedClassId : undefined,
          targetType,
          studentIds: targetType === "student" ? selectedStudentIds : undefined,
          date,
          title,
          content: html,
          theme,
          academicYearId: user?.defaultAcademicYearId ?? undefined,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      closeDrawer();
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    } catch (e) { setCustomError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDiary(cid, token, id);
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    } catch (e) { setCustomError((e as Error).message); }
    finally { setDeletingId(null); }
  };

  const filteredStudents = students.filter(
    (s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  useEffect(() => {
    if ((step === 2 || editingEntry) && editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, [step, editingEntry]); // eslint-disable-line


  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "classDiaryTitle", lang)} />

      {error && (
        <ApiErrorBanner
          message={error}
          onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.diary.all })}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <JournalList
          entries={entries}
          openEdit={openEdit}
          handleDelete={handleDelete}
          deletingId={deletingId}
          lang={lang}
        />
      )}

      <Button
        size="lg"
        onClick={openCreate}
        className="fixed bottom-22 left-1/2 z-30 -translate-x-1/2 rounded-full shadow-lg lg:bottom-6"
      >
        <Plus className="size-4" />
        {t("teacherPages", "addDiaryBtn", lang)}
      </Button>

      <ResponsivePopover
        open={drawerOpen}
        onOpenChange={(open) => { if (!open) { closeDrawer(); setThemeOpen(false); } }}
        title={
          <span className="flex items-center gap-3">
            {step === 2 && !editingEntry && (
              <Button variant="ghost" size="icon" onClick={() => setStep(1)} aria-label="Back">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Button>
            )}
            {editingEntry ? t("teacherPages", "editDiaryTitle", lang) : t("teacherPages", "newEntryTitle", lang)}
          </span>
        }
        className={step === 2 || editingEntry ? "h-dvh max-h-dvh data-[swipe-axis=y]:[--drawer-content-max-height:100dvh]" : undefined}
        footer={step === 2 || editingEntry ? (
          <div className="border-t border-gray-100 bg-white p-4">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className={cn(
                "w-full rounded-xl",
                saved ? "bg-primary-100 text-primary-700" : "bg-primary-600 text-white hover:bg-primary-700",
              )}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> :
               saved  ? <><CheckCircle2 className="w-5 h-5" /> {t("teacherPages", "savedExcl", lang)}</> :
                         <><Save className="w-5 h-5" /> {editingEntry ? t("teacherPages", "updateEntryBtn", lang) : t("teacherPages", "postEntryBtn", lang)}</>}
            </Button>
          </div>
        ) : undefined}
      >
        <div className="p-5">

                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <Tabs value={targetType}
                     onValueChange={(value) => setTargetType(value as "class" | "student")}>
                      {!editingEntry && (
                        <TabsList className="grid w-max grid-cols-2">
                          <TabsTrigger value="class" className="text-xs">
                            {t("teacherPages", "toClassBtn", lang)}
                          </TabsTrigger>
                          <TabsTrigger value="student" className="text-xs">
                            {t("teacherPages", "toStudentsBtn", lang)}
                          </TabsTrigger>
                        </TabsList>
                      )}

                      <TabsContent value="student" className="mt-4">
                      <div>
                        <div className="relative">
                          <Input
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder={t("teacherPages", "searchDiary", lang)}
                            size="lg"
                            className="bg-gray-50"
                          />
                        </div>
                        <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-gray-50 divide-y divide-gray-100 text-sm">
                          {filteredStudents.length === 0 ? (
                            <p className="text-xs text-gray-400 p-2 text-center">None</p>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-xs text-gray-500">
                                <Checkbox
                                  id="diary-select-all-students"
                                  checked={filteredStudents.every((s) => selectedStudentIds.includes(s.id))}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      setSelectedStudentIds((prev) => prev.filter((id) => !filteredStudents.some((s) => s.id === id)));
                                    } else {
                                      setSelectedStudentIds((prev) => [...new Set([...prev, ...filteredStudents.map((s) => s.id)])]);
                                    }
                                  }}
                                />
                                <label htmlFor="diary-select-all-students" className="cursor-pointer">
                                  {t("teacherPages", "selectAllCount", lang).replace("{n}", String(filteredStudents.length))}
                                </label>
                              </div>
                              {filteredStudents.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100"
                                >
                                  <Checkbox
                                    id={`diary-student-${s.id}`}
                                    checked={selectedStudentIds.includes(s.id)}
                                    onCheckedChange={() => toggleStudent(s.id)}
                                  />
                                  <label htmlFor={`diary-student-${s.id}`} className="flex-1 cursor-pointer">{s.name}</label>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                      </TabsContent>
                    </Tabs>

                    {/* Date */}
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      aria-haspopup="dialog"
                      aria-expanded={datePickerOpen}
                      onClick={() => setDatePickerOpen(true)}
                      className="w-full justify-start font-normal shadow-none!"
                    >
                      <CalendarDays className="size-4 text-gray-500" />
                      {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </Button>
                    <DatePickerDrawer
                      open={datePickerOpen}
                      onOpenChange={setDatePickerOpen}
                      date={date}
                      onDateChange={setDate}
                      title={t("teacherPages", "dateLabel", lang)}
                      disableFuture
                    />

                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={targetType === "class" ? !selectedClassId : selectedStudentIds.length === 0}
                      className="w-full bg-primary-600 text-white hover:bg-primary-700"
                    >
                      {t("teacherPages", "continueBtn", lang)}
                    </Button>
                  </motion.div>
                ) : (
                  <>
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Theme picker row + Summary */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="bg-primary-50 rounded-xl px-3 py-2 flex items-center gap-2 flex-1 min-w-0 mr-3">
                        <FileText className="w-4 h-4 text-primary-600 shrink-0" />
                        <p className="text-xs text-primary-700 font-medium truncate">
                          {targetType === "class"
                            ? `To ${activeClass?.name ?? "class"}`
                            : `To ${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? "s" : ""}`}
                          {" · "}
                          {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Button type="button" variant="ghost" size="icon" aria-label={t("common", "themes", lang)} onClick={() => setThemeOpen(true)} className="rounded-xl text-gray-500">
                          <Palette className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Notion-style editor */}
                    <div className={cn("rounded-2xl transition-colors duration-200", themes[theme].bg)} style={{ fontFamily: `${themes[theme].font}, ${themes[theme].mlFont}` }}>
                      {/* Title */}
                      <div className="px-4 pt-5">
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t("teacherPages", "giveTitlePlc", lang)}
                          className={cn(
                            "h-auto w-full border-none bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0 placeholder:text-gray-300",
                            themes[theme].text,
                          )}
                        />
                      </div>

                      {/* Mobile-friendly toolbar */}
                      <div className="flex items-center gap-0.5 px-3 pt-3 pb-1 overflow-x-auto scrollbar-none">
                        <Button type="button" variant="ghost" size="icon" onClick={() => execFormat("bold")} title={t("teacherPages", "boldTooltip", lang)} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <Bold className="w-5 h-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => execFormat("italic")} title={t("teacherPages", "italicTooltip", lang)} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <Italic className="w-5 h-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => execFormat("underline")} title={t("teacherPages", "underlineTooltip", lang)} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <Underline className="w-5 h-5" />
                        </Button>
                        <span className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
                        <Button type="button" variant="ghost" size="icon" aria-label="Bulleted list" onClick={() => execFormat("insertUnorderedList")} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <List className="w-5 h-5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Numbered list" onClick={() => execFormat("insertOrderedList")} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <ListOrdered className="w-5 h-5" />
                        </Button>
                        <span className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
                        <Button type="button" variant="ghost" size="icon" aria-label="Insert image" onClick={() => fileInputRef.current?.click()} className="size-10 rounded-xl text-gray-500 shrink-0">
                          <Image className="w-5 h-5" />
                        </Button>
                        <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
                      </div>

                      {/* Editor */}
                      <div className="px-4 pb-5">
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => setContent((e.target as HTMLDivElement).innerHTML)}
                          data-placeholder={t("teacherPages", "editorPlaceholder", lang)}
                          className={cn(
                            "w-full min-h-[180px] text-lg bg-transparent border-none outline-none empty:before:text-gray-300 empty:before:content-[attr(data-placeholder)] leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1",
                            themes[theme].text,
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                  </>
                )}
        </div>

        <ResponsivePopover
          open={themeOpen}
          onOpenChange={setThemeOpen}
          title={t("common", "themes", lang)}
        >
          <div className="grid grid-cols-2 gap-2 p-5">
            {Object.entries(themes).map(([key, themeOption]) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                onClick={() => { setTheme(key); setThemeOpen(false); }}
                className={cn(
                  "relative flex h-auto w-full flex-col items-center gap-2 whitespace-normal rounded-xl px-3 py-4 text-sm font-medium",
                  theme === key ? "ring-2 ring-primary-400 shadow-sm" : "hover:bg-gray-50",
                  themeOption.bg, themeOption.text,
                )}
              >
                <div className="w-full h-16 rounded-lg flex items-center justify-center">
                  <span className="text-3xl font-bold opacity-30" style={{ fontFamily: themeOption.font }}>Aa</span>
                </div>
                <p className="font-semibold text-xs">{themeOption.label}</p>
                {theme === key && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 absolute top-2 right-2" />
                )}
              </Button>
            ))}
          </div>
        </ResponsivePopover>
      </ResponsivePopover>
    </DashboardLayout>
  );
}
