import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import {
  getStudent, updateStudent, deleteStudent,
  type StudentRecord, type CreateStudentPayload,
} from "@/lib/students-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudentAttendance, type StudentAttendanceResponse } from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Calendar, Loader2, GraduationCap, Hash, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      "bg-emerald-100 text-emerald-700",
  INACTIVE:    "bg-gray-100 text-gray-600",
  GRADUATED:   "bg-blue-100 text-blue-700",
  TRANSFERRED: "bg-amber-100 text-amber-700",
  DROPPED_OUT: "bg-red-100 text-red-600",
};

interface FormState {
  name: string; adno: string; classId: string; gender: "MALE" | "FEMALE";
  dateOfBirth: string; guardianName: string; parentPhone: string;
  parentAltPhone: string; parentEmail: string;
  relationToStudent: string; parentPassword: string;
}

function studentToForm(s: StudentRecord): FormState {
  return {
    name: s.name,
    adno: s.adno,
    classId: s.classId ?? "",
    gender: s.gender ?? "MALE",
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "",
    guardianName: s.guardianName ?? "",
    parentPhone: s.parentPhone ?? "",
    parentAltPhone: s.parentAltPhone ?? "",
    parentEmail: s.parentEmail ?? "",
    relationToStudent: s.relationToStudent ?? "father",
    parentPassword: "",
  };
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
  const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";
  const { user, accessToken, activeClientId } = useAuthStore();

  const [student, setStudent]             = useState<StudentRecord | null>(null);
  const [attendance, setAttendance]       = useState<StudentAttendanceResponse | null>(null);
  const [classes, setClasses]             = useState<ClassRecord[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingAtt, setLoadingAtt]       = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  const [showEdit, setShowEdit]     = useState(false);
  const [form, setForm]             = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    if (!activeClientId || !accessToken) return;
    const ac = new AbortController();

    getStudent(activeClientId, accessToken, id!, ac.signal)
      .then((s) => { setStudent(s); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoadingStudent(false));

    getStudentAttendance(activeClientId, accessToken, id!,
      { ...(user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : {}), take: 365 },
      ac.signal)
      .then(setAttendance)
      .finally(() => setLoadingAtt(false));

    getAllClasses(activeClientId, accessToken, ac.signal)
      .then(setClasses)
      .catch(() => {});

    return () => ac.abort();
  }, [activeClientId, user?.defaultAcademicYearId, accessToken, id]);

  const openEdit = () => {
    if (!student) return;
    setForm(studentToForm(student));
    setSubmitError(null);
    setFieldErrors({});
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!activeClientId || !accessToken || !student || !form) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const payload: Partial<CreateStudentPayload> = {
        name: form.name.trim(),
        adno: form.adno.trim(),
        ...(form.classId ? { classId: form.classId } : { classId: undefined }),
        gender: form.gender,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.guardianName ? { guardianName: form.guardianName.trim() } : {}),
        ...(form.parentPhone ? { parentPhone: form.parentPhone.trim() } : {}),
        ...(form.parentAltPhone ? { parentAltPhone: form.parentAltPhone.trim() } : {}),
        ...(form.parentEmail ? { parentEmail: form.parentEmail.trim() } : {}),
        ...(form.relationToStudent ? { relationToStudent: form.relationToStudent } : {}),
        ...(form.parentPassword ? { parentPassword: form.parentPassword } : {}),
      };
      const updated = await updateStudent(activeClientId, accessToken, student.id, payload);
      setStudent(updated);
      setShowEdit(false);
    } catch (e) {
      const apiErr = e as import("@/lib/students-api").StudentsApiError;
      setSubmitError(apiErr.message);
      if (apiErr.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeClientId || !accessToken || !student) return;
    setDeleting(true);
    try {
      await deleteStudent(activeClientId, accessToken, student.id);
      navigate(`${slugPrefix}/admin/students`);
    } catch (e) {
      setConfirmDelete(false);
      setDeleting(false);
      setError((e as Error).message);
    }
  };

  if (loadingStudent) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Profile" back />
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      </DashboardLayout>
    );
  }

  if (!student || error) {
    return (
      <DashboardLayout>
        <PageHeader title="Student Not Found" back />
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">{error ?? "Student not found"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-semibold text-sm underline">
            Go back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const attTotal   = attendance?.total ?? 0;
  const attPresent = attendance?.summary?.PRESENT ?? 0;
  const attAbsent  = attendance?.summary?.ABSENT ?? 0;
  const attLate    = attendance?.summary?.LATE ?? 0;
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Student Profile"
        back
        backHref={`${slugPrefix}/admin/students`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-gray-100 mb-5"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0",
            student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-emerald-100 text-emerald-700",
          )}>
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{student.name}</h2>
            <p className="text-sm text-gray-500">{student.adno}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {student.class && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                  {student.class.name}
                </span>
              )}
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg",
                student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700")}>
                {student.gender === "FEMALE" ? "Girl" : "Boy"}
              </span>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg",
                STATUS_COLORS[student.status] ?? STATUS_COLORS.ACTIVE)}>
                {student.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Hash,          label: "Admission No",   value: student.adno },
            { icon: GraduationCap, label: "Class",           value: student.class?.name ?? "—" },
            ...(student.dateOfBirth ? [{ icon: Calendar, label: "Date of Birth",  value: new Date(student.dateOfBirth).toLocaleDateString("en-GB") }] : []),
            ...(student.guardianName ? [{ icon: User, label: "Guardian",   value: `${student.guardianName} (${student.relationToStudent ?? "guardian"})` }] : []),
            ...(student.parentPhone ? [{ icon: Phone, label: "Parent Phone", value: student.parentPhone }] : []),
            ...(student.accademicYear ? [{ icon: Calendar, label: "Academic Year", value: student.accademicYear.name }] : []),
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 flex gap-2.5 items-start">
              <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{String(value)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attendance */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4"
      >
        <SectionHeader title="Attendance" />
        {loadingAtt ? (
          <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Present", val: attPresent, color: "text-emerald-700" },
                { label: "Absent",  val: attAbsent,  color: "text-red-600"    },
                { label: "Late",    val: attLate,    color: "text-amber-700"  },
                { label: "Total",   val: attTotal,   color: "text-gray-800"   },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className={cn("text-xl font-bold", color)}>{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", attPct >= 75 ? "bg-emerald-500" : "bg-red-400")}
                  style={{ width: `${attPct}%` }} />
              </div>
              <span className={cn("text-sm font-bold", attPct >= 75 ? "text-emerald-700" : "text-red-600")}>
                {attPct}%
              </span>
            </div>
            {attPct < 75 && (
              <p className="text-xs text-red-500 mt-2">Below 75% attendance threshold</p>
            )}
          </>
        )}
      </motion.div>

      {/* Fees placeholder */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4 opacity-60"
      >
        <SectionHeader title="Fees" />
        <p className="text-sm text-gray-400 py-2">Fee integration coming soon (Module 3)</p>
      </motion.div>

      {/* Results placeholder */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60"
      >
        <SectionHeader title="Exam Results" />
        <p className="text-sm text-gray-400 py-2">Results integration coming soon (Module 5)</p>
      </motion.div>

      {/* ── Edit Drawer ── */}
      <AnimatePresence>
        {showEdit && form && (
          <>
            <motion.div key="edit-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEdit(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div key="edit-drawer"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92dvh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Edit Student</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{student.name}</p>
                </div>
                <button onClick={() => setShowEdit(false)}
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
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Student Info</p>
                  <div className="space-y-3">
                    {([
                      { key: "name" as const,        label: "Full Name",        placeholder: "", type: "text" },
                      { key: "adno" as const,        label: "Admission No",     placeholder: "", type: "text" },
                      { key: "dateOfBirth" as const, label: "Date of Birth",    placeholder: "", type: "date" },
                    ]).map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input type={type} placeholder={placeholder} value={form[key]}
                          onChange={(e) => { setForm(f => f ? { ...f, [key]: e.target.value } : f); setFieldErrors(fe => ({ ...fe, [key]: "" })); }}
                          className={cn(
                            "w-full px-4 py-3 rounded-2xl border bg-gray-50 focus:outline-none focus:bg-white text-sm transition-colors",
                            fieldErrors[key] ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-emerald-400",
                          )}
                        />
                        {fieldErrors[key] && <p className="text-xs text-red-500 mt-1 px-1">{fieldErrors[key]}</p>}
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["MALE", "FEMALE"] as const).map((g) => (
                          <label key={g} className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all",
                            form.gender === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-700",
                          )}>
                            <input type="radio" name="edit-gender" value={g} checked={form.gender === g}
                              onChange={() => setForm(f => f ? { ...f, gender: g } : f)} className="sr-only" />
                            {g === "MALE" ? "Boy" : "Girl"}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class</label>
                      <select value={form.classId} onChange={(e) => setForm(f => f ? { ...f, classId: e.target.value } : f)}
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
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Parent Info</p>
                  <div className="space-y-3">
                    {([
                      { key: "guardianName" as const,   label: "Guardian Name",  placeholder: "", type: "text"     },
                      { key: "parentPhone" as const,    label: "Phone",          placeholder: "", type: "tel"      },
                      { key: "parentAltPhone" as const, label: "Alt. Phone",     placeholder: "", type: "tel"      },
                      { key: "parentEmail" as const,    label: "Parent Email",   placeholder: "parent@email.com", type: "email" },
                      { key: "parentPassword" as const, label: "New Password",   placeholder: "Leave blank to keep current", type: "password" },
                    ]).map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input type={type} placeholder={placeholder} value={form[key]}
                          onChange={(e) => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white text-sm transition-colors"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Relation</label>
                      <select value={form.relationToStudent} onChange={(e) => setForm(f => f ? { ...f, relationToStudent: e.target.value } : f)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-teal-400 text-sm">
                        {["father", "mother", "guardian", "uncle", "aunt", "grandparent"].map((r) => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleSave}
                  disabled={submitting || !form.name.trim() || !form.adno.trim()}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-transform shadow-lg shadow-emerald-200 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </span>
                  ) : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div key="del-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setConfirmDelete(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.div key="del-dialog"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl p-6 max-w-sm mx-auto shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Delete Student?</h3>
                <p className="text-sm text-gray-500">
                  <strong>{student.name}</strong> will be permanently deleted. This cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting ? (
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
