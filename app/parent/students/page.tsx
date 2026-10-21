import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import {
  User,
  Loader2,
  Upload,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

function StudentsPageSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="-mx-4 -mt-4 min-h-screen px-4 pb-0 pt-4 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pb-8 lg:pt-8"
      style={{
        backgroundColor: "#f6faf8",
        // backgroundImage:
        //   "linear-gradient(rgba(246, 250, 248, 0.9), rgba(246, 250, 248, 0.9)), url('/imgs/students/student-lines.webp')",
        // backgroundSize: "auto, 440px 440px",
        backgroundRepeat: "repeat",
      }}
    >
      {children}
    </div>
  );
}

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

  const { data: student, isLoading: loadingStudent, error: studentError } = useStudentProfileV2(
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
      <DashboardLayout>
        <StudentsPageSurface>
          <PageHeader title={t("parentPages", "studentProfileTitle", lang)} />
          <PageSkeleton />
        </StudentsPageSurface>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <StudentsPageSurface>
          <PageHeader title={t("parentPages", "studentProfileTitle", lang)} />
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
        </StudentsPageSurface>
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

  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <DashboardLayout>
      <StudentsPageSurface>
      <PageHeader title={t("parentPages", "studentProfileTitle", lang)} />

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Active student */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-b-[2rem] px-4 pb-9 pt-9 text-center md:pt-12"
      >
        <div className="aspect-square w-[60vw] max-w-[200px] overflow-hidden rounded-full bg-emerald-200">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[clamp(4rem,18vw,7rem)] font-semibold text-emerald-800">
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
        <Swiper
          modules={[FreeMode]}
          freeMode={{ enabled: true, momentum: true }}
          slidesPerView="auto"
          spaceBetween={8}
          grabCursor
          className="!overflow-hidden"
          aria-label={t("parentPages", "yourStudentsLabel", lang)}
        >
          {ids.map((id) => {
            const info = students.find((s) => s.id === id);
            const isActive = id === studentId;
            const photo = id === studentId ? student.photoUrl : info?.photoUrl;
            const name = info?.name ?? (id === studentId ? student.name : t("parentPages", "studentProfileTitle", lang));
            return (
              <SwiperSlide key={id} className="!h-auto !w-auto">
                <button
                  type="button"
                  onClick={() => switchStudent(id)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex h-11 max-w-44 items-center gap-2 rounded-full border px-2 pr-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                    isActive
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
                    {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : name.charAt(0)}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              </SwiperSlide>
            );
          })}
        </Swiper>
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
              <Icon icon={icon} className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
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
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-8 border-t border-gray-100 px-1 pt-7"
      >
        <p className="mb-4 text-lg font-semibold text-gray-900">{t("parentPages", "attendanceSection", lang)}</p>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <span className="text-4xl font-bold tracking-tight text-emerald-900">{attPct}%</span>
            <p className="mt-1 text-xs text-gray-500">{t("parentPages", "attendanceRateLabel", lang)}</p>
          </div>
          <span className="text-sm font-medium text-gray-500">{attPresent} / {attTotal}</span>
        </div>
        <div
          className="mb-5 h-3 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={attPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("parentPages", "attendanceRateLabel", lang)}
        >
          <div
            className={cn("h-full rounded-full transition-all", attPct >= 75 ? "bg-emerald-600" : "bg-amber-500")}
            style={{ width: `${attPct}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: t("parentPages", "presentStat", lang), val: attPresent, color: "text-emerald-700" },
            { label: t("parentPages", "absentStat", lang), val: attAbsent, color: "text-red-600" },
            { label: t("parentPages", "lateStat", lang), val: attLate, color: "text-amber-700" },
            { label: t("parentPages", "totalStat", lang), val: attTotal, color: "text-gray-800" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="border-l border-gray-100 px-2 py-1 text-center first:border-l-0"
            >
              <p className={cn("text-xl font-bold", color)}>{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {attTotal > 0 && attPct < 75 && (
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
      </StudentsPageSurface>
    </DashboardLayout>
  );
}
