import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import {
 getStudent, getStudentProfileV2, updateStudent, deleteStudent, uploadStudentPhoto,
 type StudentRecord, type CreateStudentPayload,
} from "@/lib/students-api";
import { getAllClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudentAttendance, type StudentAttendanceResponse } from "@/lib/attendance-api";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Calendar, Loader2, GraduationCap, Hash, Pencil, Trash2, Upload, Users, Heart, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

const STATUS_COLORS: Record<string, string> = {
 ACTIVE: "bg-emerald-100 text-emerald-700",
 INACTIVE: "bg-gray-100 text-gray-600",
 GRADUATED: "bg-blue-100 text-blue-700",
 TRANSFERRED: "bg-amber-100 text-amber-700",
 DROPPED_OUT: "bg-red-100 text-red-600",
};

interface FormState {
 name: string; uid: string; adno: string; classId: string; gender: "MALE" | "FEMALE";
 dateOfBirth: string; guardianName: string; parentPhone: string;
 parentAltPhone: string; parentEmail: string;
 relationToStudent: string; parentPassword: string;
 address: string; city: string; state: string; country: string; pincode: string;
 bloodGroup: string;
 emergencyContactName: string; emergencyContactPhone: string; medicalNotes: string;
}

function studentToForm(s: StudentRecord): FormState {
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

export default function StudentDetailPage() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { pathname } = useLocation();
 const slugMatch = pathname.match(/^\/m\/([^/]+)\//);
 const slugPrefix = slugMatch ? `/m/${slugMatch[1]}` : "";
 const { user, accessToken, activeClientId } = useAuthStore();
 const canWrite = user?.actorType !== "TEAM_LEADER";

 const [student, setStudent] = useState<StudentRecord | null>(null);
 const [attendance, setAttendance] = useState<StudentAttendanceResponse | null>(null);
 const [classes, setClasses] = useState<ClassRecord[]>([]);
 const [loadingStudent, setLoadingStudent] = useState(true);
 const [loadingAtt, setLoadingAtt] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [showEdit, setShowEdit] = useState(false);
 const [form, setForm] = useState<FormState | null>(null);
 const [submitting, setSubmitting] = useState(false);
 const [submitError, setSubmitError] = useState<string | null>(null);
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
 const [avatarFile, setAvatarFile] = useState<File | null>(null);
 const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
 const [uploadingPhoto, setUploadingPhoto] = useState(false);

 const [confirmDelete, setConfirmDelete] = useState(false);
 const [deleting, setDeleting] = useState(false);

 const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
 useEffect(() => {
 const checkMobile = () => setIsMobile(window.innerWidth < 768);
 window.addEventListener("resize", checkMobile);
 return () => window.removeEventListener("resize", checkMobile);
 }, []);

 useEffect(() => {
 if (!activeClientId || !accessToken) return;
 const ac = new AbortController();

 getStudentProfileV2(activeClientId, accessToken, id!, ac.signal)
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
 uid: form.uid.trim() || null,
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
 ...(form.address ? { address: form.address.trim() } : {}),
 ...(form.city ? { city: form.city.trim() } : {}),
 ...(form.state ? { state: form.state.trim() } : {}),
 ...(form.country ? { country: form.country.trim() } : {}),
 ...(form.pincode ? { pincode: form.pincode.trim() } : {}),
 ...(form.bloodGroup ? { bloodGroup: form.bloodGroup } : {}),
 ...(form.emergencyContactName ? { emergencyContactName: form.emergencyContactName.trim() } : {}),
 ...(form.emergencyContactPhone ? { emergencyContactPhone: form.emergencyContactPhone.trim() } : {}),
 ...(form.medicalNotes ? { medicalNotes: form.medicalNotes.trim() } : {}),
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
 <PageSkeleton />
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

 const attTotal = attendance?.total ?? 0;
 const attPresent = attendance?.summary?.PRESENT ?? 0;
 const attAbsent = attendance?.summary?.ABSENT ?? 0;
 const attLate = attendance?.summary?.LATE ?? 0;
 const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

 return (
 <DashboardLayout>
 <PageHeader
 title="Student Profile"
 back
 backHref={`${slugPrefix}/admin/students`}
 action={
 canWrite ? (
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
 ) : undefined
 }
 />

 {/* Profile card */}
 <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-3xl p-5 border border-gray-100 mb-5"
 >
 <div className="flex items-center gap-4 mb-4">
 {student.photoUrl ? (
 <img src={student.photoUrl} alt={student.name}
 className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-gray-200"
 />
 ) : (
 <div className={cn(
 "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0",
 student.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-emerald-100 text-emerald-700",
 )}>
 {student.name.charAt(0)}
 </div>
 )}
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
 { icon: Hash, label: "Admission No", value: student.adno },
 { icon: Hash, label: "Student UID", value: student.uid ?? "—" },
 { icon: GraduationCap, label: "Class", value: student.class?.name ?? "—" },
 ...(student.dateOfBirth ? [{ icon: Calendar, label: "Date of Birth", value: new Date(student.dateOfBirth).toLocaleDateString("en-GB") }] : []),
 ...(student.guardianName ? [{ icon: User, label: "Guardian", value: `${student.guardianName} (${student.relationToStudent ?? "guardian"})` }] : []),
 ...(student.parentPhone ? [{ icon: Phone, label: "Parent Phone", value: student.parentPhone }] : []),
 ...(student.bloodGroup ? [{ icon: Heart, label: "Blood Group", value: student.bloodGroup }] : []),
 ...(student.address || student.city ? [{ icon: MapPin, label: "Address", value: [student.address, student.city, student.state].filter(Boolean).join(", ") }] : []),
 ...(student.emergencyContactName ? [{ icon: AlertCircle, label: "Emergency Contact", value: `${student.emergencyContactName}${student.emergencyContactPhone ? ` (${student.emergencyContactPhone})` : ""}` }] : []),
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
 { label: "Absent", val: attAbsent, color: "text-red-600" },
 { label: "Late", val: attLate, color: "text-amber-700" },
 { label: "Total", val: attTotal, color: "text-gray-800" },
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
 <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
 <motion.div key="edit-drawer"
 initial={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
 animate={{ y: 0, opacity: 1, scale: 1 }}
 exit={isMobile ? { y: "100%", opacity: 1, scale: 1 } : { y: 0, opacity: 0, scale: 0.95 }}
 transition={isMobile ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.2 }}
 className={cn(
 "w-full bg-white flex flex-col pointer-events-auto shadow-2xl relative",
 isMobile 
 ? "rounded-t-3xl max-h-[92dvh]" 
 : "rounded-3xl max-w-xl max-h-[85dvh]"
 )}
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

 {/* Photo Upload */}
 <section>
 <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Photo</p>
 <div className="flex items-center gap-4">
 {avatarPreview ? (
 <div className="relative w-20 h-20 rounded-2xl overflow-hidden">
 <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
 </div>
 ) : student.photoUrl ? (
 <img src={student.photoUrl} alt={student.name}
 className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
 />
 ) : (
 <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400">
 <Users className="w-8 h-8" />
 </div>
 )}
 <div className="flex-1">
 <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 cursor-pointer transition-colors w-fit">
 {uploadingPhoto ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Upload className="w-4 h-4" />
 )}
 {uploadingPhoto ? "Uploading..." : "Choose Photo"}
 <input type="file" accept="image/*" disabled={uploadingPhoto}
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => setAvatarPreview(reader.result as string);
 reader.readAsDataURL(file);
 if (!activeClientId || !accessToken) return;
 setUploadingPhoto(true);
 try {
 const result = await uploadStudentPhoto(activeClientId, accessToken, student.id, file);
 setAvatarFile(null);
 setAvatarPreview(null);
 // Update photoUrl directly from upload response
 setStudent(prev => prev ? { ...prev, photoUrl: result.photoUrl, photo: result.photo } : prev);
 } catch (e) {
 setSubmitError((e as Error).message);
 } finally {
 setUploadingPhoto(false);
 e.target.value = '';
 }
 }}
 className="hidden" />
 </label>
 </div>
 </div>
 </section>

 {/* Student Info */}
 <section>
 <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Student Info</p>
 <div className="space-y-3">
 {([
 { key: "name" as const, label: "Full Name", placeholder: "", type: "text" },
 { key: "uid" as const, label: "Student UID", placeholder: "", type: "text" },
 { key: "adno" as const, label: "Admission No", placeholder: "", type: "text" },
 { key: "dateOfBirth" as const, label: "Date of Birth", placeholder: "", type: "date" },
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
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Blood Group</label>
 <select value={form.bloodGroup} onChange={(e) => setForm(f => f ? { ...f, bloodGroup: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm">
 <option value="">— Select —</option>
 {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
 <option key={bg} value={bg}>{bg}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
 <textarea value={form.address}
 onChange={(e) => setForm(f => f ? { ...f, address: e.target.value } : f)}
 rows={2}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm resize-none"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
 <input type="text" value={form.city}
 onChange={(e) => setForm(f => f ? { ...f, city: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">State</label>
 <input type="text" value={form.state}
 onChange={(e) => setForm(f => f ? { ...f, state: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
 <input type="text" value={form.country}
 onChange={(e) => setForm(f => f ? { ...f, country: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode</label>
 <input type="text" value={form.pincode}
 onChange={(e) => setForm(f => f ? { ...f, pincode: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 text-sm"
 />
 </div>
 </div>
 </div>
 </section>

 <div className="border-t border-dashed border-gray-200" />

 {/* Parent Info */}
 <section>
 <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Parent Info</p>
 <div className="space-y-3">
 {([
 { key: "guardianName" as const, label: "Guardian Name", placeholder: "", type: "text" },
 { key: "parentPhone" as const, label: "Phone", placeholder: "", type: "tel" },
 { key: "parentAltPhone" as const, label: "Alt. Phone", placeholder: "", type: "tel" },
 // { key: "parentEmail" as const, label: "Parent Email", placeholder: "parent@email.com", type: "email" },
 { key: "parentPassword" as const, label: "New Password", placeholder: "Leave blank to keep current", type: "password" },
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

 <div className="border-t border-dashed border-gray-200" />

 {/* Emergency Contact */}
 <section>
 <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Emergency Contact</p>
 <div className="space-y-3">
 {([
 { key: "emergencyContactName" as const, label: "Contact Name", placeholder: "Emergency contact person", type: "text" },
 { key: "emergencyContactPhone" as const, label: "Contact Phone", placeholder: "10-digit mobile", type: "tel" },
 ]).map(({ key, label, placeholder, type }) => (
 <div key={key}>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
 <input type={type} placeholder={placeholder} value={form[key]}
 onChange={(e) => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white text-sm transition-colors"
 />
 </div>
 ))}
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1.5">Medical Notes</label>
 <textarea value={form.medicalNotes}
 onChange={(e) => setForm(f => f ? { ...f, medicalNotes: e.target.value } : f)}
 rows={2}
 className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-amber-400 text-sm resize-none"
 />
 </div>
 </div>
 </section>
 </div>

 {/* Footer */}
 <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
 <button
 onClick={() => setShowEdit(false)}
 className="flex-1 py-3.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
 >
 Cancel
 </button>
 <button
 onClick={handleSave}
 disabled={submitting || !form.name.trim() || !form.adno.trim()}
 className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform shadow-lg disabled:opacity-60"
 >
 {submitting ? (
 <span className="flex items-center justify-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin" /> Saving…
 </span>
 ) : "Save Changes"}
 </button>
 </div>
 </motion.div>
 </div>
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
