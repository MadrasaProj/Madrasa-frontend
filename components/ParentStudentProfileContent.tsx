import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ParentStudentSwitcher } from "@/components/ParentStudentSwitcher";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { Textarea } from "@/components/ui/textarea";
import { DrawerSelector } from "@/components/DrawerSelector";
import {
  useStudentProfileV2,
  useUpdateStudent,
  useUploadStudentPhoto,
} from "@/lib/queries";
import { useStudentAttendance } from "@/lib/queries";
import { useAuthStore } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import {
  User,
  Loader2,
  Upload,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

export function ParentStudentProfileContent({
  onBack,
}: {
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const { lang } = useLanguageStore();
  const {
    user,
    accessToken,
    activeClientId,
    activeStudentId,
    setActiveStudent,
  } = useAuthStore();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalNotes: "",
  });
  const [editError, setEditError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const students = user?.accessibleStudents ?? [];
  const ids = user?.accessibleStudentIds ?? [];
  const studentId = activeStudentId ?? ids[0];

  const cid = activeClientId ?? "";
  const token = accessToken ?? "";

  const { data: student, isLoading: loadingStudent } = useStudentProfileV2(
    { clientId: cid, token },
    studentId ?? "",
  );
  const { data: attendance } = useStudentAttendance(
    { clientId: cid, token },
    studentId ?? "",
    user?.defaultAcademicYearId
      ? { academicYearId: user.defaultAcademicYearId, take: 365 }
      : { take: 365 },
  );

  const updateMutation = useUpdateStudent({ clientId: cid, token });
  const photoMutation = useUploadStudentPhoto({ clientId: cid, token });

  const loading = loadingStudent && !student;

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
    setSuccess("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!student) return;
    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(editForm)) {
      if (value) payload[key] = value;
    }
    try {
      await updateMutation.mutateAsync({ studentId: student.id, data: payload });
      setShowEdit(false);
      setSuccess(t("parentPages", "profileUpdated", lang));
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!student) return;
    try {
      await photoMutation.mutateAsync({ studentId: student.id, file });
      setAvatarPreview(null);
      setSuccess(t("parentPages", "photoUpdated", lang));
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setEditError(e?.message ?? "Photo upload failed");
    }
  };

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  if (!student) {
    return (
      <>
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">{t("parentPages", "noStudentSelected", lang)}</p>
          <button
            onClick={() => onBack ? onBack() : navigate(-1)}
            className="mt-4 text-primary-600 font-semibold text-sm underline"
          >
            {t("parentPages", "goBack", lang)}
          </button>
        </div>
      </>
    );
  }

  const studentName =
    students.find((s) => s.id === studentId)?.name ?? student.name;

  const attTotal = attendance?.total ?? 0;
  const attPresent = attendance?.summary?.PRESENT ?? 0;
  const attAbsent = attendance?.summary?.ABSENT ?? 0;
  const attLate = attendance?.summary?.LATE ?? 0;
  const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <>
      {success && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-2 text-xs text-primary-700">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Active student */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-b-[2rem] px-4 pb-9 pt-9 text-center md:pt-12"
      >
        <div className="aspect-square w-[60vw] max-w-[120px] overflow-hidden rounded-full bg-linear-120 from-primary-200 to-primary-850">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[clamp(4rem,18vw,7rem)] font-semibold text-white">
              {student.name.charAt(0)}
            </div>
          )}
        </div>
        <h2 className="mt-6 max-w-full   text-3xl font-bold leading-tight  md:text-4xl">
          {studentName}
        </h2>
        <p className="mt-2 text-sm font-medium text-gray-600">
          {student.class?.name ?? t("parentPages", "classInfoLabel", lang)}
          <span className="mx-2 text-gray-400">·</span>
          {t("parentPages", "admissionNoLabel", lang)} {student.adno}
        </p>
        <Button
          type="button"
          onClick={openEdit}
          size={"lg"}
          variant="default"
          className="mt-6  rounded-full "
        >
          {t("parentPages", "editStudentBtn", lang)}
        </Button>
      </motion.div>

      {/* Student switcher */}
      <section className="mb-8 border-b border-gray-100 px-1 pb-6 pt-2 text-gray-900">
        <ParentStudentSwitcher
          studentIds={ids}
          students={students}
          activeStudentId={studentId ?? null}
          activeStudent={student}
          onSelectStudent={switchStudent}
        />
      </section>

      {/* Student details */}
      <section className="mb-8 px-1">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">{t("parentPages", "studentDetailsLabel", lang)}</h3>
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {[
            { icon: "tabler:hash", label: t("parentPages", "admissionNoLabel", lang), value: student.adno },
            {
              icon: "tabler:school",
              label: t("parentPages", "classInfoLabel", lang),
              value: student.class?.name ?? "—",
            },
            {
              icon: "tabler:user",
              label: t("parentPages", "genderLabel", lang),
              value: student.gender === "FEMALE"
                ? t("parentPages", "girlLabel", lang)
                : t("parentPages", "boyLabel", lang),
            },
            {
              icon: "tabler:circle-check",
              label: t("parentPages", "statusLabel", lang),
              value: student.status,
            },
            ...(student.dateOfBirth
              ? [
                  {
                    icon: "tabler:calendar-event",
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
                    icon: "tabler:user-heart",
                    label: t("parentPages", "guardianLabel", lang),
                    value: `${student.guardianName} (${student.relationToStudent ?? "guardian"})`,
                  },
                ]
              : []),
            ...(student.parentPhone
              ? [
                  {
                    icon: "tabler:phone",
                    label: t("parentPages", "parentPhoneLabel", lang),
                    value: student.parentPhone,
                  },
                ]
              : []),
            ...(student.bloodGroup
              ? [
                  {
                    icon: "tabler:droplet",
                    label: t("parentPages", "bloodGroupLabel", lang),
                    value: student.bloodGroup,
                  },
                ]
              : []),
            ...(student.address || student.city
              ? [
                  {
                    icon: "tabler:map-pin",
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
                    icon: "tabler:alert-circle",
                    label: t("parentPages", "emergencyContactLabel", lang),
                    value: `${student.emergencyContactName}${student.emergencyContactPhone ? ` (${student.emergencyContactPhone})` : ""}`,
                  },
                ]
              : []),
            ...(student.accademicYear
              ? [
                  {
                    icon: "tabler:calendar-stats",
                    label: t("parentPages", "academicYearLabel", lang),
                    value: student.accademicYear.name,
                  },
                ]
              : []),
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              className="flex min-w-0 items-start gap-4 border-b border-gray-100 py-4 last:border-b-0"
            >
              <Icon icon={icon}  className="mt-0.5 *:stroke-[1.2px] size-7 shrink-0 text-primary-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">
                  {String(value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Attendance */}
      

      

      {/* Edit profile */}
      <ResponsivePopover
        open={showEdit}
        onOpenChange={setShowEdit}
        drawerOnDesktop
        title={t("parentPages", "editStudent", lang)}
        description={student.name}
        contentClassName="px-5 py-5"
        footer={
          <div className="border-t border-gray-100 bg-white p-4">
            <ButtonGroup className="w-full [&>button]:flex-1">
              <Button type="button" variant="outline" size="lg" onClick={() => setShowEdit(false)}>
                {t("parentPages", "cancelLabel", lang)}
              </Button>
              <Button type="button" size="lg" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("parentPages", updateMutation.isPending ? "savingLabel" : "saveChanges", lang)}
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <div className="space-y-6 pb-4">
          {editError && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {editError}
            </div>
          )}

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-700">
              {t("parentPages", "photoSection", lang)}
            </p>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              ) : student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                  <User className="h-8 w-8" />
                </div>
              )}
              <Input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                disabled={photoMutation.isPending}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setAvatarPreview(reader.result as string);
                  reader.readAsDataURL(file);
                  await handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={photoMutation.isPending}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("parentPages", photoMutation.isPending ? "uploadingLabel" : "choosePhoto", lang)}
              </Button>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">
              {t("parentPages", "healthEmergency", lang)}
            </p>
            <div className="space-y-4">
              <div>
                <p className={labelCls}>{t("parentPages", "bloodGroupLabel", lang)}</p>
                <DrawerSelector
                  title={t("parentPages", "bloodGroupLabel", lang)}
                  value={editForm.bloodGroup}
                  onChange={(bloodGroup) => setEditForm((form) => ({ ...form, bloodGroup }))}
                  placeholder="— Select —"
                  options={[
                    { value: "", label: "— Select —" },
                    ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({ value: group, label: group })),
                  ]}
                  className="min-h-11"
                />
              </div>
              <div>
                <label htmlFor="student-emergency-name" className={labelCls}>
                  {t("parentPages", "emergencyContactLabel", lang)}
                </label>
                <Input
                  id="student-emergency-name"
                  size="lg"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm((form) => ({ ...form, emergencyContactName: e.target.value }))}
                  placeholder="Emergency contact person"
                />
              </div>
              <div>
                <label htmlFor="student-emergency-phone" className={labelCls}>
                  {t("parentPages", "parentPhoneLabel", lang)}
                </label>
                <Input
                  id="student-emergency-phone"
                  type="tel"
                  size="lg"
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditForm((form) => ({ ...form, emergencyContactPhone: e.target.value }))}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <label htmlFor="student-medical-notes" className={labelCls}>
                  {t("parentPages", "medicalNotes", lang)}
                </label>
                <Textarea
                  id="student-medical-notes"
                  rows={2}
                  value={editForm.medicalNotes}
                  onChange={(e) => setEditForm((form) => ({ ...form, medicalNotes: e.target.value }))}
                  placeholder="Allergies, conditions, notes"
                  className="resize-none"
                />
              </div>
            </div>
          </section>
        </div>
      </ResponsivePopover>
    </>
  );
}
