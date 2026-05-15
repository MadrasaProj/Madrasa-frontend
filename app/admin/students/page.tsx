import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getStudents, createStudent, type StudentRecord, type CreateStudentPayload,
} from "@/lib/students-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { Users, Plus, Search, Eye, GraduationCap, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const CLASS_COLORS = [
  { bg: "bg-sky-100",     text: "text-sky-700",     badge: "bg-sky-100 text-sky-700 border border-sky-200" },
  { bg: "bg-purple-100",  text: "text-purple-700",  badge: "bg-purple-100 text-purple-700 border border-purple-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  { bg: "bg-amber-100",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700 border border-amber-200" },
  { bg: "bg-rose-100",    text: "text-rose-700",    badge: "bg-rose-100 text-rose-700 border border-rose-200" },
  { bg: "bg-teal-100",    text: "text-teal-700",    badge: "bg-teal-100 text-teal-700 border border-teal-200" },
];
const fallbackColor = { bg: "bg-gray-100", text: "text-gray-700", badge: "bg-gray-100 text-gray-700 border border-gray-200" };

const LIMIT = 20;

// ── Add Student Form State ─────────────────────────────────────────────────
interface FormState {
  name: string; adno: string; classId: string; gender: "MALE" | "FEMALE";
  dateOfBirth: string; guardianName: string; parentPhone: string;
  parentAltPhone: string; relationToStudent: string; parentPassword: string;
}
const EMPTY_FORM: FormState = {
  name: "", adno: "", classId: "", gender: "MALE",
  dateOfBirth: "", guardianName: "", parentPhone: "",
  parentAltPhone: "", relationToStudent: "father", parentPassword: "",
};

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const { lang } = useLanguageStore();
  const { user, accessToken, activeClientId } = useAuthStore();

  const [students, setStudents]       = useState<StudentRecord[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [classes, setClasses]         = useState<ClassRecord[]>([]);
  const [classColorMap, setClassColorMap] = useState<Record<string, typeof CLASS_COLORS[0]>>({});
  const [search, setSearch]           = useState("");
  const [activeClassId, setActiveClassId] = useState<string | "all">("all");
  const [gender, setGender]           = useState<"all" | "MALE" | "FEMALE">("all");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load classes once
  useEffect(() => {
    if (!activeClientId || !accessToken) return;
    const ac = new AbortController();
    getAllClasses(activeClientId, accessToken, ac.signal).then((data) => {
      setClasses(data);
      const map: Record<string, typeof CLASS_COLORS[0]> = {};
      data.forEach((c, i) => { map[c.id] = CLASS_COLORS[i % CLASS_COLORS.length]; });
      setClassColorMap(map);
    }).catch(() => {});
    return () => ac.abort();
  }, [activeClientId, accessToken]);

  // Load students
  const loadStudents = useCallback(async (pg: number, srch: string, clsId: string, gen: string) => {
    if (!activeClientId || !accessToken) return;
    setLoading(true); setError(null);
    try {
      const res = await getStudents(activeClientId, accessToken, {
        page: pg, limit: LIMIT,
        search: srch || undefined,
        classId: clsId !== "all" ? clsId : undefined,
        status: "ACTIVE",
      });
      setStudents(res.data);
      setTotal(res.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeClientId, accessToken]);

  useEffect(() => { loadStudents(page, search, activeClassId, gender); },
    [page, activeClassId, gender, loadStudents]); // eslint-disable-line

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val); setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadStudents(1, val, activeClassId, gender), 400);
  };

  // Add student submit
  const handleSubmit = async () => {
    if (!activeClientId || !accessToken) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const payload: CreateStudentPayload = {
        name: form.name.trim(),
        adno: form.adno.trim(),
        ...(form.classId ? { classId: form.classId } : {}),
        gender: form.gender,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.guardianName ? { guardianName: form.guardianName.trim() } : {}),
        ...(form.parentPhone ? { parentPhone: form.parentPhone.trim() } : {}),
        ...(form.parentAltPhone ? { parentAltPhone: form.parentAltPhone.trim() } : {}),
        ...(form.relationToStudent ? { relationToStudent: form.relationToStudent } : {}),
        ...(form.parentPassword ? { parentPassword: form.parentPassword } : {}),
        ...(user.defaultAcademicYearId ? { accademicYearId: user.defaultAcademicYearId } : {}),
      };
      await createStudent(activeClientId, accessToken, payload);
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadStudents(1, search, activeClassId, gender);
      setPage(1);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <DashboardLayout>
      <PageHeader
        title={t("adminPages", "studentsTitle", lang)}
        subtitle={`${total} ${t("common", "students", lang).toLowerCase()}`}
        icon={Users}
        action={
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setSubmitError(null); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> {t("adminPages", "addStudent", lang)}
          </button>
        }
      />

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

      {/* Class tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        <button
          onClick={() => { setActiveClassId("all"); setPage(1); }}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all",
            activeClassId === "all"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
              : "bg-white border border-gray-200 text-gray-600"
          )}
        >
          <GraduationCap className="w-3.5 h-3.5" /> All
          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full",
            activeClassId === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
            {total}
          </span>
        </button>
        {classes.map((cls) => {
          const col = classColorMap[cls.id] ?? fallbackColor;
          return (
            <button key={cls.id}
              onClick={() => { setActiveClassId(cls.id); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all",
                activeClassId === cls.id
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-white border border-gray-200 text-gray-600"
              )}
            >
              {cls.name}
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full",
                activeClassId === cls.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                {cls.studentCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gender filter */}
      <div className="flex gap-2 mb-5">
        {(["all", "MALE", "FEMALE"] as const).map((g) => (
          <button key={g} onClick={() => { setGender(g); setPage(1); }}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all",
              gender === g
                ? g === "MALE"   ? "bg-blue-600 text-white"
                : g === "FEMALE" ? "bg-pink-500 text-white"
                :                  "bg-gray-800 text-white"
                : "bg-white border border-gray-200 text-gray-500"
            )}
          >
            {g === "all" ? t("adminPages", "genderAll", lang) : g === "MALE" ? t("adminPages", "genderBoys", lang) : t("adminPages", "genderGirls", lang)}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-400 mb-3 font-medium">
        {t("adminPages", "showingStudents", lang)} <span className="text-gray-700 font-bold">{students.length}</span> {t("adminPages", "studentsLabel", lang)} of {total}
      </p>

      {/* Student list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {students.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center py-16 text-gray-400"
                >
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">{t("adminPages", "noStudentsFound", lang)}</p>
                  <p className="text-sm mt-1">{t("adminPages", "tryAdjustFilter", lang)}</p>
                </motion.div>
              ) : students.map((student, i) => {
                const col = student.classId ? (classColorMap[student.classId] ?? fallbackColor) : fallbackColor;
                return (
                  <motion.div key={student.id} layout
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between group hover:border-emerald-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0",
                        student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : col.bg + " " + col.text
                      )}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {student.adno} {student.class?.name ? `· ${student.class.name}` : ""}
                        </p>
                        {student.guardianName && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {student.gender === "MALE" ? "♂" : "♀"} {student.guardianName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {student.class && (
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg hidden sm:inline-flex", col.badge)}>
                          {student.class.name}
                        </span>
                      )}
                      <button
                        onClick={() => navigate(`/admin/students/${student.id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("adminPages", "viewBtn", lang)}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Add Student Drawer ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div key="drawer"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92dvh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{t("adminPages", "newAdmission", lang)}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t("adminPages", "fillStudentDetails", lang)}</p>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 pb-8">
                {submitError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{submitError}</div>
                )}

                {/* Student Info */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                    <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">{t("adminPages", "studentInfo", lang)}</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: "name" as const, label: t("adminPages", "studentName", lang), placeholder: t("adminPages", "fullName", lang), type: "text" },
                      { key: "adno" as const, label: t("adminPages", "admissionNumber", lang), placeholder: t("adminPages", "admNoPlaceholder", lang), type: "text" },
                      { key: "dateOfBirth" as const, label: t("adminPages", "dateOfBirth2", lang), placeholder: "", type: "date" },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input type={type} placeholder={placeholder} value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white text-sm transition-colors"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("adminPages", "gender", lang)}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["MALE", "FEMALE"] as const).map((g) => (
                          <label key={g} className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                            form.gender === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-700"
                          )}>
                            <input type="radio" name="gender" value={g} checked={form.gender === g}
                              onChange={() => setForm((f) => ({ ...f, gender: g }))} className="sr-only" />
                            {g === "MALE" ? "♂" : "♀"} {g === "MALE" ? t("adminPages", "male", lang) : t("adminPages", "female", lang)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t("adminPages", "classField", lang)}</label>
                      <select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm">
                        <option value="">— No class —</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                <div className="border-t border-dashed border-gray-200" />

                {/* Parent Info */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <p className="text-sm font-bold text-teal-700 uppercase tracking-wide">{t("adminPages", "parentInfo", lang)}</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: "guardianName" as const, label: t("adminPages", "fatherNameForm", lang), placeholder: t("adminPages", "fatherFullName", lang), type: "text" },
                      { key: "parentPhone" as const, label: t("adminPages", "phoneNumber", lang), placeholder: t("adminPages", "tenDigitMobile", lang), type: "tel" },
                      { key: "parentAltPhone" as const, label: "Alt. Phone", placeholder: "Alternate mobile", type: "tel" },
                      { key: "parentPassword" as const, label: t("adminPages", "parentLoginPwd", lang), placeholder: t("adminPages", "minSixChars", lang), type: "password" },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input type={type} placeholder={placeholder} value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white text-sm transition-colors"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Relation to student</label>
                      <select value={form.relationToStudent} onChange={(e) => setForm((f) => ({ ...f, relationToStudent: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-teal-400 text-sm">
                        {["father","mother","guardian","uncle","aunt","grandparent"].map((r) => (
                          <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.name.trim() || !form.adno.trim()}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-transform shadow-lg shadow-emerald-200 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
                  ) : t("adminPages", "admitStudent", lang)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
