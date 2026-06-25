import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Loader2, Upload, Trash2, User, MapPin,
  HeartPulse, Check, X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createStudent, updateStudent, uploadStudentPhoto, getStudentProfileV2,
  type StudentRecord, type CreateStudentPayload,
} from "@/lib/students-api";
import type { ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

interface FormState {
  name: string; uid: string; adno: string; classId: string; gender: "MALE" | "FEMALE";
  dateOfBirth: string; guardianName: string; parentPhone: string;
  parentAltPhone: string; parentEmail: string;
  relationToStudent: string; parentPassword: string;
  address: string; city: string; state: string; country: string; pincode: string;
  bloodGroup: string;
  emergencyContactName: string; emergencyContactPhone: string; medicalNotes: string;
}

const EMPTY_FORM: FormState = {
  name: "", uid: "", adno: "", classId: "", gender: "MALE", dateOfBirth: "",
  guardianName: "", parentPhone: "", parentAltPhone: "", parentEmail: "",
  relationToStudent: "father", parentPassword: "",
  address: "", city: "", state: "", country: "", pincode: "", bloodGroup: "",
  emergencyContactName: "", emergencyContactPhone: "", medicalNotes: "",
};

export function studentToForm(s: StudentRecord): FormState {
  return {
    name: s.name,
    uid: s.uid ?? "",
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
    address: s.address ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    country: s.country ?? "",
    pincode: s.pincode ?? "",
    bloodGroup: s.bloodGroup ?? "",
    emergencyContactName: s.emergencyContactName ?? "",
    emergencyContactPhone: s.emergencyContactPhone ?? "",
    medicalNotes: s.medicalNotes ?? "",
  };
}

export interface StudentEditDrawerProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  student?: StudentRecord | null;
  classes: ClassRecord[];
  onSaved: (student: StudentRecord) => void;
  onDelete?: () => void;
}

export default function StudentEditDrawer({
  open, onClose, mode, student, classes, onSaved, onDelete,
}: StudentEditDrawerProps) {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();

  const isEditing = mode === "edit";
  const canWrite = user?.actorType !== "TEAM_LEADER";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [tab, setTab] = useState<"personal" | "parent" | "emergency">("personal");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : true
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(isEditing && student ? studentToForm(student) : EMPTY_FORM);
    setTab("personal");
    setSubmitError(null);
    setFieldErrors({});
    setAvatarPreview(null);
    setUploadedPhotoUrl(null);
  }, [open, isEditing, student]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  const switchTab = (t: typeof tab) => {
    setTab(t);
    setSubmitError(null);
    setFieldErrors({});
  };

  const closeDrawer = () => {
    onClose();
    setTimeout(() => {
      setForm(EMPTY_FORM);
      setTab("personal");
      setSubmitError(null);
      setFieldErrors({});
      setAvatarPreview(null);
      setUploadedPhotoUrl(null);
    }, 250);
  };

  const validateAll = (): boolean => {
  const errs: Record<string, string> = {};
  if (!form.name.trim()) errs.name = "Name is required";
  if (!form.adno.trim()) errs.adno = "Admission number is required";
  if (form.parentAltPhone && !/^\+?\d{7,15}$/.test(form.parentAltPhone.replace(/[\s\-()]/g, ""))) {
  errs.parentAltPhone = "Enter a valid phone (7–15 digits)";
  }
  if (form.parentPassword && form.parentPassword.length < 6) {
  errs.parentPassword = "Min 6 characters";
  }
  if (form.emergencyContactPhone && !/^\+?\d{7,15}$/.test(form.emergencyContactPhone.replace(/[\s\-()]/g, ""))) {
  errs.emergencyContactPhone = "Enter a valid phone (7–15 digits)";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!activeClientId || !accessToken) return;
    if (!validateAll()) {
      setSubmitError("Please fix the highlighted errors before saving.");
      if (fieldErrors.name || fieldErrors.adno) setTab("personal");
      else if (fieldErrors.parentPhone || fieldErrors.parentAltPhone || fieldErrors.parentPassword) setTab("parent");
      else if (fieldErrors.emergencyContactPhone) setTab("emergency");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateStudentPayload = {
        name: form.name.trim(),
        uid: form.uid.trim() || null,
        adno: form.adno.trim(),
        ...(form.classId ? { classId: form.classId } : {}),
        gender: form.gender,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.guardianName ? { guardianName: form.guardianName.trim() } : {}),
        ...(form.parentPhone ? { parentPhone: form.parentPhone.trim() } : {}),
        ...(form.parentAltPhone ? { parentAltPhone: form.parentAltPhone.trim() } : {}),
        ...(form.parentEmail ? { parentEmail: form.parentEmail.trim() } : {}),
        ...(form.relationToStudent ? { relationToStudent: form.relationToStudent } : {}),
        ...(form.parentPassword ? { parentPassword: form.parentPassword } : {}),
        ...(form.address ? { address: form.address.trim() } : {}),
        ...(form.city ? { city: form.city.trim() } : {}),
        ...(form.state ? { state: form.state.trim() } : {}),
        ...(form.country ? { country: form.country.trim() } : {}),
        ...(form.pincode ? { pincode: form.pincode.trim() } : {}),
        ...(form.bloodGroup ? { bloodGroup: form.bloodGroup } : {}),
        ...(form.emergencyContactName ? { emergencyContactName: form.emergencyContactName.trim() } : {}),
        ...(form.emergencyContactPhone ? { emergencyContactPhone: form.emergencyContactPhone.trim() } : {}),
        ...(form.medicalNotes ? { medicalNotes: form.medicalNotes.trim() } : {}),
        ...(user?.defaultAcademicYearId ? { accademicYearId: user.defaultAcademicYearId } : {}),
      };

      const result = isEditing && student
        ? await updateStudent(activeClientId, accessToken, student.id, payload)
        : await createStudent(activeClientId, accessToken, payload);

      // Re-fetch full V2 profile to get relations and photoUrl
      const fullProfile = isEditing && student
        ? await getStudentProfileV2(activeClientId, accessToken, student.id)
        : result;

      onSaved(fullProfile);
      closeDrawer();
    } catch (e) {
      const apiErr = e as import("@/lib/students-api").StudentsApiError;
      setSubmitError(apiErr.message);
      if (apiErr.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!activeClientId || !accessToken || !student) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadStudentPhoto(activeClientId, accessToken, student.id, file);
      setAvatarPreview(null);
      setUploadedPhotoUrl(result.photoUrl);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
            <motion.div
              key="drawer-panel"
              initial={isMobile ? { y: "100%" } : { x: "100%" }}
              animate={{ x: 0, y: 0 }}
              exit={isMobile ? { y: "100%" } : { x: "100%" }}
              transition={isMobile
                ? { type: "spring", damping: 30, stiffness: 300 }
                : { type: "spring", stiffness: 350, damping: 36 }}
              className={cn(
                "bg-white flex flex-col pointer-events-auto shadow-2xl relative",
                isMobile
                  ? "w-full rounded-t-3xl max-h-[92dvh] self-end"
                  : "h-full w-full sm:max-w-lg"
              )}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    {isEditing ? "Edit Student" : t("adminPages", "newAdmission", lang)}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("adminPages", "fillStudentDetails", lang)}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 pt-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
                  {[
                    { id: "personal"  as const, label: "Personal & Address", icon: User },
                    { id: "parent"    as const, label: "Parent / Guardian",  icon: Users },
                    { id: "emergency" as const, label: "Emergency Contact",  icon: HeartPulse },
                  ].map((tDef) => {
                    const Icon = tDef.icon;
                    const active = tab === tDef.id;
                    return (
                      <button
                        key={tDef.id}
                        type="button"
                        onClick={() => switchTab(tDef.id)}
                        className={cn(
                          "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap",
                          active ? "text-white" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {active && (
                          <motion.div
                            layoutId="studentDrawerActiveTab"
                            className="absolute inset-0 bg-emerald-600 rounded-xl shadow"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Icon className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10 hidden sm:inline">{tDef.label}</span>
                        <span className="relative z-10 sm:hidden">{tDef.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-5">
                {submitError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <XIcon className="w-4 h-4 shrink-0" /> {submitError}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {tab === "personal" && (
                    <motion.div
                      key="tab-personal"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {isEditing && (
                        <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="relative shrink-0">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow" />
                            ) : (uploadedPhotoUrl ?? (student as StudentRecord).photoUrl) ? (
                              <img src={uploadedPhotoUrl ?? (student as StudentRecord).photoUrl!} alt={(student as StudentRecord).name}
                                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white text-xl font-black flex items-center justify-center border-2 border-white shadow">
                                {(student as StudentRecord).name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">Profile Picture</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">PNG, JPG up to 2MB.</p>
                            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold
                              bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors active:scale-95">
                              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {avatarPreview ? "Change Photo" : "Upload Photo"}
                              <input type="file" accept="image/*" disabled={uploadingPhoto} className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => setAvatarPreview(reader.result as string);
                                  reader.readAsDataURL(file);
                                  await handleAvatarUpload(file);
                                  e.target.value = "";
                                }} />
                            </label>
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Plus className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">New Admission</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Fill in the student's details below.</p>
                          </div>
                        </div>
                      )}

                      {[
                        { key: "name" as const,        label: t("adminPages", "studentName", lang),      placeholder: t("adminPages", "fullName", lang),        type: "text", required: true },
                        { key: "uid" as const,         label: "Student UID",                              placeholder: "Optional unique identifier",              type: "text" },
                        { key: "adno" as const,        label: t("adminPages", "admissionNumber", lang),   placeholder: t("adminPages", "admNoPlaceholder", lang), type: "text", required: true },
                        { key: "dateOfBirth" as const, label: t("adminPages", "dateOfBirth2", lang),     placeholder: "",                                       type: "date" },
                      ].map(({ key, label, placeholder, type, required }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          <input
                            type={type}
                            placeholder={placeholder}
                            value={form[key]}
                            onChange={(e) => {
                              setForm((f) => ({ ...f, [key]: e.target.value }));
                              setFieldErrors((fe) => ({ ...fe, [key]: "" }));
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-colors",
                              fieldErrors[key] ? "border-rose-300 focus:border-rose-400" : "border-gray-200 focus:border-emerald-400",
                            )}
                          />
                          {fieldErrors[key] && (
                            <p className="text-[11px] text-rose-600 font-semibold mt-1 px-1">{fieldErrors[key]}</p>
                          )}
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {t("adminPages", "gender", lang)}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["MALE", "FEMALE"] as const).map((g) => (
                            <label key={g}
                              className={cn(
                                "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-colors",
                                form.gender === g
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                              )}>
                              <input type="radio" name="gender" value={g} checked={form.gender === g}
                                onChange={() => setForm((f) => ({ ...f, gender: g }))} className="sr-only" />
                              {g === "MALE" ? t("adminPages", "male", lang) : t("adminPages", "female", lang)}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            {t("adminPages", "classField", lang)}
                          </label>
                          <select value={form.classId}
                            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400">
                            <option value="">— No class —</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Blood Group</label>
                          <select value={form.bloodGroup}
                            onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400">
                            <option value="">— Select —</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Address</p>
                        </div>
                        <div className="space-y-3">
                          <textarea value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            rows={2} placeholder="House, street, area"
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400 resize-none" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="City" value={form.city}
                              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400" />
                            <input type="text" placeholder="State" value={form.state}
                              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="Country" value={form.country}
                              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400" />
                            <input type="text" placeholder="Pincode" value={form.pincode}
                              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {tab === "parent" && (
                    <motion.div
                      key="tab-parent"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Parent / guardian receives login credentials to access the parent app.
                        </p>
                      </div>

                      {[
                        { key: "guardianName" as const,   label: t("adminPages", "fatherNameForm", lang), placeholder: t("adminPages", "fatherFullName", lang), type: "text" },
                        { key: "parentPhone" as const,    label: t("adminPages", "phoneNumber", lang),    placeholder: t("adminPages", "tenDigitMobile", lang), type: "tel" },
                        { key: "parentAltPhone" as const, label: "Alt. Phone",                              placeholder: "Alternate mobile",                       type: "tel" },
                        { key: "parentPassword" as const, label: isEditing ? "New Password" : t("adminPages", "parentLoginPwd", lang), placeholder: isEditing ? "Leave blank to keep current" : t("adminPages", "minSixChars", lang), type: "password" },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                          <input type={type} placeholder={placeholder} value={form[key]}
                            onChange={(e) => {
                              setForm((f) => ({ ...f, [key]: e.target.value }));
                              setFieldErrors((fe) => ({ ...fe, [key]: "" }));
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-colors",
                              fieldErrors[key] ? "border-rose-300 focus:border-rose-400" : "border-gray-200 focus:border-emerald-400",
                            )} />
                          {fieldErrors[key] && <p className="text-[11px] text-rose-600 font-semibold mt-1 px-1">{fieldErrors[key]}</p>}
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Relation to student</label>
                        <select value={form.relationToStudent}
                          onChange={(e) => setForm((f) => ({ ...f, relationToStudent: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400">
                          {["father", "mother", "guardian", "uncle", "aunt", "grandparent"].map((r) => (
                            <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {tab === "emergency" && (
                    <motion.div
                      key="tab-emergency"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <HeartPulse className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-[11px] text-amber-800 font-medium">
                          Optional but recommended for student safety.
                        </p>
                      </div>

                      {[
                        { key: "emergencyContactName" as const,  label: "Contact Name",  placeholder: "Emergency contact person", type: "text" },
                        { key: "emergencyContactPhone" as const, label: "Contact Phone", placeholder: "10-digit mobile",          type: "tel" },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                          <input type={type} placeholder={placeholder} value={form[key]}
                            onChange={(e) => {
                              setForm((f) => ({ ...f, [key]: e.target.value }));
                              setFieldErrors((fe) => ({ ...fe, [key]: "" }));
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-colors",
                              fieldErrors[key] ? "border-rose-300 focus:border-rose-400" : "border-gray-200 focus:border-emerald-400",
                            )} />
                          {fieldErrors[key] && <p className="text-[11px] text-rose-600 font-semibold mt-1 px-1">{fieldErrors[key]}</p>}
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Medical Notes</label>
                        <textarea value={form.medicalNotes}
                          onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))}
                          rows={3} placeholder="Allergies, conditions, medications…"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400 resize-none" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  {isEditing && canWrite && onDelete && (
                    <button
                      onClick={onDelete}
                      type="button"
                      className="px-3 py-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold rounded-2xl text-sm active:scale-[0.98] transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={closeDrawer}
                    disabled={submitting}
                    className="px-4 py-3 text-sm font-semibold border border-gray-200 rounded-2xl text-gray-700 bg-white hover:bg-gray-50 transition-colors active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.name.trim() || !form.adno.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors active:scale-[0.98] shadow-lg disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : isEditing ? (
                      <><Check className="w-4 h-4" /> Save Changes</>
                    ) : (
                      <>{t("adminPages", "admitStudent", lang)}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
