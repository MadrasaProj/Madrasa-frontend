import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getStudentProfileV2,
  uploadStudentPhoto,
  type StudentRecord,
} from "@/lib/students-api";
import {
  getStudentAttendance,
  type StudentAttendanceResponse,
} from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Calendar,
  Loader2,
  GraduationCap,
  Hash,
  Heart,
  MapPin,
  AlertCircle,
  Pencil,
  Upload,
  X,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

const GENDER_COLORS: Record<string, string> = {
  FEMALE: "bg-pink-100 text-pink-700",
  MALE: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  GRADUATED: "bg-blue-100 text-blue-700",
  TRANSFERRED: "bg-amber-100 text-amber-700",
  DROPPED_OUT: "bg-red-100 text-red-600",
};

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE = `${API_ORIGIN}/api/v2`;

export default function ParentStudentProfile() {
  const navigate = useNavigate();
  const { lang } = useLanguageStore();
  const {
    user,
    accessToken,
    activeClientId,
    activeStudentId,
    setActiveStudent,
  } = useAuthStore();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [attendance, setAttendance] =
    useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalNotes: "",
  });
  const [editError, setEditError] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const students = user?.accessibleStudents ?? [];
  const ids = user?.accessibleStudentIds ?? [];
  const studentId = activeStudentId ?? ids[0];

  useEffect(() => {
    if (!activeClientId || !accessToken || !studentId) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();

    Promise.all([
      getStudentProfileV2(activeClientId, accessToken, studentId, ac.signal),
      getStudentAttendance(
        activeClientId,
        accessToken,
        studentId,
        {
          ...(user?.defaultAcademicYearId
            ? { academicYearId: user.defaultAcademicYearId }
            : {}),
          take: 365,
        },
        ac.signal,
      ),
    ])
      .then(([s, att]) => {
         
        setStudent(s);
        setAttendance(att);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [activeClientId, accessToken, studentId, user?.defaultAcademicYearId]);

  const switchStudent = (id: string) => {
    setActiveStudent(id);
  };

  const openEdit = () => {
    if (!student) return;
    setEditForm({
      bloodGroup: student.bloodGroup ?? "",
      emergencyContactName: student.emergencyContactName ?? "",
      emergencyContactPhone: student.emergencyContactPhone ?? "",
      medicalNotes: student.medicalNotes ?? "",
    });
    setEditError("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!activeClientId || !accessToken || !student) return;
    setSaving(true);
    setEditError("");
    setSuccess("");
    try {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(editForm)) {
        if (value) payload[key] = value;
      }
      const res = await fetch(
        `${V2_BASE}/${activeClientId}/students/${student.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Update failed" }));
        throw new Error(err.message ?? "Update failed");
      }
      const updated = await getStudentProfileV2(
        activeClientId,
        accessToken,
        student.id,
      );
      setStudent(updated);
      setShowEdit(false);
      setSuccess(t("parentPages", "profileUpdated", lang));
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !activeClientId || !accessToken || !student) return;
    setUploadingPhoto(true);
    try {
      await uploadStudentPhoto(
        activeClientId,
        accessToken,
        student.id,
        avatarFile,
      );
      setAvatarFile(null);
      setAvatarPreview(null);
      const updated = await getStudentProfileV2(
        activeClientId,
        accessToken,
        student.id,
      );
      setStudent(updated);
      setSuccess("Photo updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setEditError(e?.message ?? "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "studentProfileTitle", lang)} back />
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "studentProfileTitle", lang)} back />
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">{t("parentPages", "noStudentSelected", lang)}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-emerald-600 font-semibold text-sm underline"
          >
            {t("parentPages", "goBack", lang)}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const studentName =
    students.find((s) => s.id === studentId)?.name ?? student.name;

  const attTotal = attendance?.total ?? 0;
  const attPresent = attendance?.summary?.PRESENT ?? 0;
  const attAbsent = attendance?.summary?.ABSENT ?? 0;
  const attLate = attendance?.summary?.LATE ?? 0;
  const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const inputCls =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <DashboardLayout>
      <PageHeader title="Student Profile" back />

      {/* Student tabs */}
      {ids.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
          {ids.map((id) => {
            const info = students.find((s) => s.id === id);
            const isActive = id === studentId;
            return (
              <button
                key={id}
                onClick={() => switchStudent(id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700",
                )}
              >
                {info?.name ?? `Student`}
              </button>
            );
          })}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 border border-gray-100 mb-5"
      >
        <div className="flex items-center gap-4 mb-4">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-gray-200"
            />
          ) : (
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0",
                GENDER_COLORS[student.gender ?? ""] ??
                  "bg-gray-100 text-gray-600",
              )}
            >
              {student.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {student.name}
              </h2>
              <button
                onClick={openEdit}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> {t("parentPages", "editStudentBtn", lang)}
              </button>
            </div>
            <p className="text-sm text-gray-500">{student.adno}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {student.class && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                  {student.class.name}
                </span>
              )}
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-lg",
                  student.gender === "FEMALE"
                    ? "bg-pink-100 text-pink-700"
                    : "bg-blue-100 text-blue-700",
                )}
              >
                {student.gender === "FEMALE" ? t("parentPages", "girlLabel", lang) : t("parentPages", "boyLabel", lang)}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-lg",
                  STATUS_COLORS[student.status] ?? STATUS_COLORS.ACTIVE,
                )}
              >
                {student.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Hash, label: t("parentPages", "admissionNoLabel", lang), value: student.adno },
            { icon: Hash, label: t("parentPages", "studentUidLabel", lang), value: student.uid ?? "—" },
            {
              icon: GraduationCap,
              label: t("parentPages", "classInfoLabel", lang),
              value: student.class?.name ?? "—",
            },
            ...(student.dateOfBirth
              ? [
                  {
                    icon: Calendar,
                    label: t("parentPages", "dateOfBirthLabel", lang),
                    value: new Date(student.dateOfBirth).toLocaleDateString(
                      "en-GB",
                    ),
                  },
                ]
              : []),
            ...(student.guardianName
              ? [
                  {
                    icon: User,
                    label: t("parentPages", "guardianLabel", lang),
                    value: `${student.guardianName} (${student.relationToStudent ?? "guardian"})`,
                  },
                ]
              : []),
            ...(student.parentPhone
              ? [
                  {
                    icon: Phone,
                    label: t("parentPages", "parentPhoneLabel", lang),
                    value: student.parentPhone,
                  },
                ]
              : []),
            ...(student.bloodGroup
              ? [
                  {
                    icon: Heart,
                    label: t("parentPages", "bloodGroupLabel", lang),
                    value: student.bloodGroup,
                  },
                ]
              : []),
            ...(student.address || student.city
              ? [
                  {
                    icon: MapPin,
                    label: t("parentPages", "addressLabel", lang),
                    value: [student.address, student.city, student.state]
                      .filter(Boolean)
                      .join(", "),
                  },
                ]
              : []),
            ...(student.emergencyContactName
              ? [
                  {
                    icon: AlertCircle,
                    label: t("parentPages", "emergencyContactLabel", lang),
                    value: `${student.emergencyContactName}${student.emergencyContactPhone ? ` (${student.emergencyContactPhone})` : ""}`,
                  },
                ]
              : []),
            ...(student.accademicYear
              ? [
                  {
                    icon: Calendar,
                    label: t("parentPages", "academicYearLabel", lang),
                    value: student.accademicYear.name,
                  },
                ]
              : []),
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-xl p-3 flex gap-2.5 items-start"
            >
              <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                  {String(value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attendance */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4"
      >
        <p className="text-sm font-bold text-gray-700 mb-3">{t("parentPages", "attendanceSection", lang)}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: t("parentPages", "presentStat", lang), val: attPresent, color: "text-emerald-700" },
            { label: t("parentPages", "absentStat", lang), val: attAbsent, color: "text-red-600" },
            { label: t("parentPages", "lateStat", lang), val: attLate, color: "text-amber-700" },
            { label: t("parentPages", "totalStat", lang), val: attTotal, color: "text-gray-800" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-xl p-2.5 text-center"
            >
              <p className={cn("text-xl font-bold", color)}>{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                attPct >= 75 ? "bg-emerald-500" : "bg-red-400",
              )}
              style={{ width: `${attPct}%` }}
            />
          </div>
          <span
            className={cn(
              "text-sm font-bold",
              attPct >= 75 ? "text-emerald-700" : "text-red-600",
            )}
          >
            {attPct}%
          </span>
        </div>
        {attPct < 75 && (
          <p className="text-xs text-red-500 mt-2">
            {t("parentPages", "belowThreshold", lang)}
          </p>
        )}
      </motion.div>

      {/* Edit note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
        {t("parentPages", "editNoteMsg", lang)}{" "}
        <a href="/parent/profile" className="font-semibold underline">
          {t("parentPages", "studentProfileTitle", lang)}
        </a>
        .
      </div>

      {/* ── Edit Drawer ── */}
      <AnimatePresence>
        {showEdit && (
          <>
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEdit(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
              <motion.div
                key="edit-drawer"
                initial={{ y: "100%", opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 1 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative rounded-t-3xl md:rounded-3xl max-h-[92dvh] md:max-h-[85dvh] md:max-w-xl"
              >
                <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">
                      {t("parentPages", "editStudent", lang)}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {student.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 pb-8">
                  {editError && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                      {editError}
                    </div>
                  )}

                  {/* Photo Upload */}
                  <section>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                      {t("parentPages", "photoSection", lang)}
                    </p>
                    <div className="flex items-center gap-4">
                      {avatarPreview ? (
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden">
                          <img
                            src={avatarPreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 cursor-pointer transition-colors w-fit">
                          {uploadingPhoto ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {uploadingPhoto ? t("parentPages", "uploadingLabel", lang) : t("parentPages", "choosePhoto", lang)}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingPhoto}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              // Show preview immediately
                              const reader = new FileReader();
                              reader.onload = () =>
                                setAvatarPreview(reader.result as string);
                              reader.readAsDataURL(file);
                              // Auto-upload
                              if (!activeClientId || !accessToken || !student)
                                return;
                              setUploadingPhoto(true);
                              try {
                                const result = await uploadStudentPhoto(
                                  activeClientId,
                                  accessToken,
                                  student.id,
                                  file,
                                );
                                setAvatarFile(null);
                                setAvatarPreview(null);
                                // Update photoUrl directly from upload response
                                setStudent((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        photoUrl: result.photoUrl,
                                        photo: result.photo,
                                      }
                                    : prev,
                                );
                                setSuccess(t("parentPages", "photoUpdated", lang));
                                setTimeout(() => setSuccess(""), 3000);
                              } catch (err) {
                                setEditError(
                                  (err as Error).message ??
                                    "Photo upload failed",
                                );
                              } finally {
                                setUploadingPhoto(false);
                                // Reset file input so same file can be re-selected
                                e.target.value = "";
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-dashed border-gray-200" />

                  {/* Health & Emergency */}
                  <section>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                      {t("parentPages", "healthEmergency", lang)}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>{t("parentPages", "bloodGroupLabel", lang)}</label>
                        <select
                          value={editForm.bloodGroup}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              bloodGroup: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-amber-400 text-sm"
                        >
                          <option value="">— Select —</option>
                          {[
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "AB+",
                            "AB-",
                            "O+",
                            "O-",
                          ].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>
                          {t("parentPages", "emergencyContactLabel", lang)}
                        </label>
                        <input
                          value={editForm.emergencyContactName}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              emergencyContactName: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="Emergency contact person"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          {t("parentPages", "parentPhoneLabel", lang)}
                        </label>
                        <input
                          value={editForm.emergencyContactPhone}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              emergencyContactPhone: e.target.value,
                            }))
                          }
                          className={inputCls}
                          placeholder="10-digit mobile"
                          type="tel"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t("parentPages", "medicalNotes", lang)}</label>
                        <textarea
                          value={editForm.medicalNotes}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              medicalNotes: e.target.value,
                            }))
                          }
                          rows={2}
                          className={inputCls + " resize-none"}
                          placeholder="Allergies, conditions, notes"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
                  <button
                    onClick={() => setShowEdit(false)}
                    className="flex-1 py-3.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    {t("parentPages", "cancelLabel", lang)}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform shadow-lg disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t("parentPages", "savingLabel", lang)}
                      </span>
                    ) : (
                      t("parentPages", "saveChanges", lang)
                    )}
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
