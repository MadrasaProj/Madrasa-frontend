import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import {
  Users, Loader2, Trash2, CalendarDays,
  Check, AlertTriangle, ArrowRight, ArrowLeft, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { DrawerSelector } from "@/components/DrawerSelector";
import { StudentAvatar } from "@/components/teacher/StudentAvatar";
import {
  createStudent, updateStudent, uploadStudentPhoto, getStudentProfileV2,
  checkParentPhone, type CheckParentPhoneResponse,
  type StudentRecord, type CreateStudentPayload,
} from "@/lib/students-api";
import type { ClassRecord } from "@/lib/classes-api";
import { useAuthStore } from "@/store/auth";
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";
import { toast } from "sonner";

interface FormState {
  name: string; uid: string; adno: string; classId: string; gender: "MALE" | "FEMALE";
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "TRANSFERRED" | "DROPPED_OUT";
  dateOfBirth: string; guardianName: string; parentPhone: string;
  parentAltPhone: string; parentEmail: string;
  relationToStudent: string; parentPassword: string;
  address: string; city: string; state: string; country: string; pincode: string;
  bloodGroup: string;
  emergencyContactName: string; emergencyContactPhone: string; medicalNotes: string;
}

const EMPTY_FORM: FormState = {
  name: "", uid: "", adno: "", classId: "", gender: "MALE",
  status: "ACTIVE",
  dateOfBirth: "",
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
    status: s.status ?? "ACTIVE",
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

const validatePasswordStrength = (password: string, phone?: string, dobVal?: string): string | null => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
  }

  const normalized = password.toLowerCase();

  const WEAK_PASSWORDS = [
    'password', '123456', '12345678', '123456789', 'qwerty', '123123', '111111',
    'password123', 'admin123', 'madrasa', 'madrasa123', 'welcome', 'letmein',
    'school123', 'parent123', 'student123', 'pass123', 'user123', 'changekey'
  ];

  const isWeak = WEAK_PASSWORDS.some((weak) => normalized.includes(weak));
  if (isWeak) {
    return "Password is too common or easy to guess. Please choose a stronger password.";
  }

  if (phone) {
    const cleanPhone = phone.replace(/\+/g, '').trim();
    if (cleanPhone.length >= 4 && normalized.includes(cleanPhone.toLowerCase())) {
      return "Password must not contain parent's phone number.";
    }
  }

  if (dobVal) {
    const match = dobVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dobStr = match ? `${match[3]}${match[2]}${match[1]}` : dobVal.replace(/[^0-9]/g, "");
    if (dobStr.length >= 6 && normalized.includes(dobStr)) {
      return "Password must not contain student's date of birth.";
    }
  }

  return null;
};

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

  // Sibling detection and deliberate password change confirmation
  const [siblingInfo, setSiblingInfo] = useState<CheckParentPhoneResponse | null>(null);
  const [checkingSiblings, setCheckingSiblings] = useState(false);
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [passwordInputUnlocked, setPasswordInputUnlocked] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(isEditing && student ? studentToForm(student) : EMPTY_FORM);
    setTab("personal");
    setSubmitError(null);
    setFieldErrors({});
    setAvatarPreview(null);
    setUploadedPhotoUrl(null);
    setSiblingInfo(null);
    setShowPasswordConfirmModal(false);
    setShowParentPassword(false);
    setPasswordInputUnlocked(false);
  }, [open, isEditing, student]);

  // Debounced check for sibling accounts sharing the same parent phone
  useEffect(() => {
    if (!open || !activeClientId || !accessToken) return;
    const cleanDigits = form.parentPhone.replace(/\D/g, "");
    if (cleanDigits.length < 7) {
      setSiblingInfo(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingSiblings(true);
      try {
        const res = await checkParentPhone(activeClientId, accessToken, form.parentPhone, student?.id);
        setSiblingInfo(res.exists && res.students.length > 0 ? res : null);
      } catch {
        setSiblingInfo(null);
      } finally {
        setCheckingSiblings(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, activeClientId, accessToken, form.parentPhone, student?.id]);

  const validateTab1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.adno.trim()) errs.adno = "Admission number is required";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSubmitError("Please fill all required fields before proceeding.");
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const validateTab2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.parentPhone) {
      const clean = form.parentPhone.replace(/\D/g, "");
      if (clean.length < 7 || clean.length > 15) {
        errs.parentPhone = "Enter a valid mobile number";
      }
    }
    if (form.parentAltPhone && !/^\+?\d{7,15}$/.test(form.parentAltPhone.replace(/[\s\-()]/g, ""))) {
      errs.parentAltPhone = "Enter a valid phone (7–15 digits)";
    }
    if (form.parentPassword) {
      const strengthError = validatePasswordStrength(form.parentPassword, form.parentPhone, form.dateOfBirth);
      if (strengthError) {
        errs.parentPassword = strengthError;
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setSubmitError("Please fix the errors in Parent details before proceeding.");
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const switchTab = (t: typeof tab) => {
    if (t === "parent") {
      if (!validateTab1()) return;
    } else if (t === "emergency") {
      if (!validateTab1()) return;
      if (!validateTab2()) return;
    }
    setTab(t);
    setSubmitError(null);
    setFieldErrors({});
  };

  const closeDrawer = () => {
    onClose();
    setDatePickerOpen(false);
    setShowPasswordConfirmModal(false);
  };

  const validateAll = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.adno.trim()) errs.adno = "Admission number is required";
    if (form.parentAltPhone && !/^\+?\d{7,15}$/.test(form.parentAltPhone.replace(/[\s\-()]/g, ""))) {
      errs.parentAltPhone = "Enter a valid phone (7–15 digits)";
    }
    if (form.parentPassword) {
      const strengthError = validatePasswordStrength(form.parentPassword, form.parentPhone, form.dateOfBirth);
      if (strengthError) {
        errs.parentPassword = strengthError;
      }
    }
    if (form.emergencyContactPhone && !/^\+?\d{7,15}$/.test(form.emergencyContactPhone.replace(/[\s\-()]/g, ""))) {
      errs.emergencyContactPhone = "Enter a valid phone (7–15 digits)";
    }
    setFieldErrors(errs);
    return errs;
  };

  const executeSave = async (confirmSiblingUpdate: boolean) => {
    if (!activeClientId || !accessToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateStudentPayload = {
        name: form.name.trim(),
        uid: form.uid.trim() || null,
        adno: form.adno.trim(),
        ...(form.classId ? { classId: form.classId } : {}),
        gender: form.gender,
        status: form.status,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.guardianName ? { guardianName: form.guardianName.trim() } : {}),
        ...(form.parentPhone ? { parentPhone: form.parentPhone.trim() } : {}),
        ...(form.parentAltPhone ? { parentAltPhone: form.parentAltPhone.trim() } : {}),
        ...(form.parentEmail ? { parentEmail: form.parentEmail.trim() } : {}),
        ...(form.relationToStudent ? { relationToStudent: form.relationToStudent } : {}),
        ...(form.parentPassword ? { parentPassword: form.parentPassword } : {}),
        ...(confirmSiblingUpdate ? { confirmParentPasswordChange: true } : {}),
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

      toast.success(isEditing ? "Student updated successfully" : "Student created successfully");
      onSaved(fullProfile);
      closeDrawer();
    } catch (e) {
      const apiErr = e as import("@/lib/students-api").StudentsApiError;
      if (apiErr.statusCode === 409) {
        setShowPasswordConfirmModal(true);
      } else {
        setSubmitError(apiErr.message);
        if (apiErr.fieldErrors) setFieldErrors(apiErr.fieldErrors);
        toast.error(apiErr.message || "Failed to save student");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeClientId || !accessToken) return;
    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setSubmitError("Please fix the highlighted errors before saving.");
      if (errors.name || errors.adno) setTab("personal");
      else if (errors.parentPhone || errors.parentAltPhone || errors.parentPassword) setTab("parent");
      else if (errors.emergencyContactPhone) setTab("emergency");
      return;
    }

    // If password is being set/changed and sibling students exist with this phone number, require explicit confirmation
    if (form.parentPassword && siblingInfo && siblingInfo.students.length > 0) {
      setShowPasswordConfirmModal(true);
      return;
    }

    await executeSave(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!activeClientId || !accessToken || !student) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadStudentPhoto(activeClientId, accessToken, student.id, file);
      setAvatarPreview(null);
      setUploadedPhotoUrl(result.photoUrl);
      toast.success("Photo uploaded successfully");
    } catch (e) {
      setAvatarPreview(null);
      setSubmitError((e as Error).message);
      toast.error((e as Error).message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fieldClass = "space-y-1.5";
  const labelClass = "block text-xs font-semibold text-gray-700";
  const errorText = (key: keyof FormState) =>
    fieldErrors[key] ? <p className="text-xs font-medium text-rose-600">{fieldErrors[key]}</p> : null;

  return (
    <>
      <ResponsivePopover
        open={open}
        onOpenChange={(nextOpen) => { if (!nextOpen && !submitting) closeDrawer(); }}
        title={isEditing ? "Edit Student" : t("adminPages", "newAdmission", lang)}
        description={t("adminPages", "fillStudentDetails", lang)}
        fullHeight
        showBackButton={false}
        className="md:max-w-[640px]"
        
        footer={
          <div className="flex items-center gap-2 border-t border-gray-100 bg-white p-4">
            {isEditing && canWrite && onDelete && (
              <Button type="button" size="lg" variant="destructive" aria-label="Delete student" onClick={onDelete}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
            {tab === "personal" ? (
              <>
                <Button type="button" size="lg" variant="outline" disabled={submitting} onClick={closeDrawer}>Cancel</Button>
                <Button type="button" size="lg" className="min-w-0 flex-1" disabled={submitting || !form.name.trim() || !form.adno.trim()} onClick={() => { if (validateTab1()) setTab("parent"); }}>
                  Next: Parent <ArrowRight aria-hidden="true" />
                </Button>
              </>
            ) : tab === "parent" ? (
              <>
                <Button type="button" size="lg" variant="outline" onClick={() => setTab("personal")}>
                  <ArrowLeft aria-hidden="true" /> Back
                </Button>
                <Button type="button" size="lg" className="min-w-0 flex-1" disabled={submitting} onClick={() => { if (validateTab2()) setTab("emergency"); }}>
                  Next: Emergency <ArrowRight aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" size="lg" variant="outline" disabled={submitting} onClick={() => setTab("parent")}>
                  <ArrowLeft aria-hidden="true" /> Back
                </Button>
                <Button type="button" size="lg" className="min-w-0 flex-1" disabled={submitting || !form.name.trim() || !form.adno.trim()} onClick={handleSubmit}>
                  {submitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                  {submitting ? "Saving…" : isEditing ? "Save changes" : t("adminPages", "admitStudent", lang)}
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="mx-auto w-full max-w-2xl px-5 pb-8 pt-4 sm:px-6">
          <Tabs value={tab} onValueChange={(value) => switchTab(value as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {submitError && (
              <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {submitError}
              </div>
            )}

            <TabsContent value="personal" className="mt-5 space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                <StudentAvatar
                  name={form.name || student?.name || "Student"}
                  gender={form.gender}
                  photoUrl={avatarPreview ?? uploadedPhotoUrl ?? student?.photoUrl}
                  size="lg"
                  className="size-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{isEditing ? "Profile photo" : "New student"}</p>
                  <p className="text-xs text-gray-500">{isEditing ? "Choose a PNG or JPG image." : "Add the student details below."}</p>
                </div>
              </div>
              {isEditing && (
                <div className={fieldClass}>
                  <label htmlFor="student-photo" className={labelClass}>Change photo</label>
                  <Input
                    id="student-photo"
                    type="file"
                    accept="image/*"
                    size="lg"
                    disabled={uploadingPhoto}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setAvatarPreview(reader.result as string);
                      reader.readAsDataURL(file);
                      await handleAvatarUpload(file);
                      event.target.value = "";
                    }}
                  />
                  {uploadingPhoto && <p className="flex items-center gap-1 text-xs text-gray-500"><Loader2 className="size-3 animate-spin" /> Uploading photo…</p>}
                </div>
              )}

              {([
                { key: "name", label: t("adminPages", "studentName", lang), placeholder: t("adminPages", "fullName", lang), required: true },
                { key: "uid", label: "Student UID", placeholder: "Optional unique identifier" },
                { key: "adno", label: t("adminPages", "admissionNumber", lang), placeholder: t("adminPages", "admNoPlaceholder", lang), required: true },
              ] as const).map(({ key, label, placeholder, ...rest }) => (
                <div key={key} className={fieldClass}>
                  <label htmlFor={"student-" + key} className={labelClass}>{label}{"required" in rest && rest.required && <span className="ml-1 text-rose-600">*</span>}</label>
                  <Input
                    id={"student-" + key}
                    type="text"
                    size="lg"
                    value={form[key]}
                    placeholder={placeholder}
                    aria-invalid={!!fieldErrors[key]}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, [key]: event.target.value }));
                      setFieldErrors((current) => ({ ...current, [key]: "" }));
                    }}
                  />
                  {errorText(key)}
                </div>
              ))}

              <div className={fieldClass}>
                <span className={labelClass}>{t("adminPages", "dateOfBirth2", lang)}</span>
                <Button type="button" size="lg" variant="outline" className="w-full justify-between font-normal" aria-label={t("adminPages", "dateOfBirth2", lang)} aria-haspopup="dialog" aria-expanded={datePickerOpen} onClick={() => setDatePickerOpen(true)}>
                  {form.dateOfBirth ? new Date(form.dateOfBirth + "T00:00:00").toLocaleDateString("en-GB") : "Choose date of birth"}
                  <CalendarDays aria-hidden="true" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className={fieldClass}>
                  <span className={labelClass}>{t("adminPages", "gender", lang)}</span>
                  <DrawerSelector title={t("adminPages", "gender", lang)} value={form.gender} options={[
                    { value: "MALE", label: t("adminPages", "male", lang) },
                    { value: "FEMALE", label: t("adminPages", "female", lang) },
                  ]} onChange={(value) => setForm((current) => ({ ...current, gender: value as FormState["gender"] }))} />
                </div>
                <div className={fieldClass}>
                  <span className={labelClass}>{t("adminPages", "classField", lang)}</span>
                  <DrawerSelector title={t("adminPages", "classField", lang)} value={form.classId} options={[
                    { value: "", label: "No class" },
                    ...classes.map((item) => ({ value: item.id, label: item.name })),
                  ]} onChange={(value) => setForm((current) => ({ ...current, classId: value }))} />
                </div>
                <div className={fieldClass}>
                  <span className={labelClass}>Blood group</span>
                  <DrawerSelector title="Blood group" value={form.bloodGroup} options={[
                    { value: "", label: "Not selected" },
                    ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({ value, label: value })),
                  ]} onChange={(value) => setForm((current) => ({ ...current, bloodGroup: value }))} />
                </div>
                <div className={fieldClass}>
                  <span className={labelClass}>Status</span>
                  <DrawerSelector title="Status" value={form.status} options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                    { value: "GRADUATED", label: "Graduated" },
                    { value: "TRANSFERRED", label: "Transferred" },
                    { value: "DROPPED_OUT", label: "Dropped out" },
                  ]} onChange={(value) => setForm((current) => ({ ...current, status: value as FormState["status"] }))} />
                </div>
              </div>

              <section className="space-y-4 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-900">Address</h3>
                <div className={fieldClass}>
                  <label htmlFor="student-address" className={labelClass}>Street address</label>
                  <Textarea id="student-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="House, street, area" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { key: "city", label: "City" },
                    { key: "state", label: "State" },
                    { key: "country", label: "Country" },
                    { key: "pincode", label: "Pincode" },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className={fieldClass}>
                      <label htmlFor={"student-" + key} className={labelClass}>{label}</label>
                      <Input id={"student-" + key} size="lg" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="parent" className="mt-5 space-y-5">
              {checkingSiblings && <Skeleton className="h-12 w-full rounded-xl" />}
              {siblingInfo && !checkingSiblings && (
                <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Shared parent account ({siblingInfo.count} siblings)</p>
                  <p className="text-xs">This phone number is linked to {siblingInfo.students.map((item) => item.name).join(", ")}.</p>
                  {form.parentPassword && <p className="text-xs font-semibold">Changing the password also changes the login for these students.</p>}
                </div>
              )}
              {([
                { key: "guardianName", label: t("adminPages", "fatherNameForm", lang), placeholder: t("adminPages", "fatherFullName", lang), type: "text" },
                { key: "parentPhone", label: t("adminPages", "phoneNumber", lang), placeholder: t("adminPages", "tenDigitMobile", lang), type: "tel" },
                { key: "parentAltPhone", label: "Alternate phone", placeholder: "Alternate mobile", type: "tel" },
                { key: "parentEmail", label: "Parent email", placeholder: "Email address", type: "email" },
              ] as const).map(({ key, label, placeholder, type }) => (
                <div key={key} className={fieldClass}>
                  <label htmlFor={"student-" + key} className={labelClass}>{label}</label>
                  <Input
                    id={"student-" + key}
                    type={type}
                    size="lg"
                    value={form[key]}
                    placeholder={placeholder}
                    aria-invalid={!!fieldErrors[key]}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, [key]: event.target.value }));
                      setFieldErrors((current) => ({ ...current, [key]: "" }));
                    }}
                  />
                  {errorText(key)}
                </div>
              ))}
              <div className={fieldClass}>
                <label htmlFor="student-parent-password" className={labelClass}>{isEditing ? "New parent password" : t("adminPages", "parentLoginPwd", lang)}</label>
                {isEditing && <p className="text-xs text-gray-500">Leave blank to keep the current password.</p>}
                <div className="relative">
                  <Input
                    id="student-parent-password"
                    type={showParentPassword ? "text" : "password"}
                    name="student_parent_pwd_custom"
                    autoComplete="new-password"
                    readOnly={!passwordInputUnlocked}
                    onFocus={() => setPasswordInputUnlocked(true)}
                    onMouseDown={() => setPasswordInputUnlocked(true)}
                    size="lg"
                    className="pr-11"
                    value={form.parentPassword}
                    placeholder={isEditing ? "Leave blank to keep current" : t("adminPages", "minSixChars", lang)}
                    aria-invalid={!!fieldErrors.parentPassword}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, parentPassword: event.target.value }));
                      setFieldErrors((current) => ({ ...current, parentPassword: "" }));
                    }}
                  />
                  <Button type="button" size="icon-sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={showParentPassword ? "Hide password" : "Show password"} onClick={() => setShowParentPassword((value) => !value)}>
                    {showParentPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                </div>
                {errorText("parentPassword")}
              </div>
              <div className={fieldClass}>
                <span className={labelClass}>Relation to student</span>
                <DrawerSelector title="Relation to student" value={form.relationToStudent} options={["father", "mother", "guardian", "uncle", "aunt", "grandparent"].map((value) => ({
                  value,
                  label: value.charAt(0).toUpperCase() + value.slice(1),
                }))} onChange={(value) => setForm((current) => ({ ...current, relationToStudent: value }))} />
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-5 space-y-5">
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">Emergency information is optional but helps staff respond quickly.</p>
              {([
                { key: "emergencyContactName", label: "Emergency contact name", placeholder: "Contact person", type: "text" },
                { key: "emergencyContactPhone", label: "Emergency contact phone", placeholder: "Mobile number", type: "tel" },
              ] as const).map(({ key, label, placeholder, type }) => (
                <div key={key} className={fieldClass}>
                  <label htmlFor={"student-" + key} className={labelClass}>{label}</label>
                  <Input
                    id={"student-" + key}
                    type={type}
                    size="lg"
                    value={form[key]}
                    placeholder={placeholder}
                    aria-invalid={!!fieldErrors[key]}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, [key]: event.target.value }));
                      setFieldErrors((current) => ({ ...current, [key]: "" }));
                    }}
                  />
                  {errorText(key)}
                </div>
              ))}
              <div className={fieldClass}>
                <label htmlFor="student-medical-notes" className={labelClass}>Medical notes</label>
                <Textarea id="student-medical-notes" value={form.medicalNotes} onChange={(event) => setForm((current) => ({ ...current, medicalNotes: event.target.value }))} placeholder="Allergies, conditions, medications…" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsivePopover>

      <DatePickerDrawer
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        date={form.dateOfBirth}
        onDateChange={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))}
        title={t("adminPages", "dateOfBirth2", lang)}
        allowClear
      />

      <ResponsivePopover
        open={showPasswordConfirmModal && !!siblingInfo}
        onOpenChange={setShowPasswordConfirmModal}
        title="Confirm password update"
        compact
        footer={
          <div className="flex gap-2 border-t border-gray-100 p-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPasswordConfirmModal(false)}>Cancel</Button>
            <Button type="button" className="flex-1" disabled={submitting} onClick={async () => {
              setShowPasswordConfirmModal(false);
              await executeSave(true);
            }}>
              {submitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
              Update for all
            </Button>
          </div>
        }
      >
        {siblingInfo && (
          <div className="space-y-4 px-5 pb-5 text-sm text-gray-700">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-800">
              <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
              <p>This phone number is linked to {siblingInfo.count} other student(s).</p>
            </div>
            <p>Changing this password updates the parent login for every student using {form.parentPhone}.</p>
            <div className="max-h-36 space-y-2 overflow-y-auto">
              {siblingInfo.students.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500">{item.className || item.adno}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ResponsivePopover>
    </>
  );
}
