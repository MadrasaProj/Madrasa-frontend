import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { getMyClasses, type ClassRecord } from "@/lib/classes-api";
import { getStudentHomework, type StudentHomeworkItem } from "@/lib/homework-api";
import { getStudentIbadah, type StudentIbadahLog } from "@/lib/ibadah-api";
import { getStudentAttendance, type AttendanceRecord } from "@/lib/attendance-api";
import { Download, Loader2, FileText, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

type DatePreset = "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "LAST_90_DAYS" | "CUSTOM";

export default function IndividualStudentReportPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? user?.clientId ?? "";
  const token = accessToken ?? "";
  const isTeacher = (user?.actorType ?? user?.role) === "TEACHER";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState<DatePreset>("THIS_MONTH");
  const [homework, setHomework] = useState<StudentHomeworkItem[]>([]);
  const [ibadah, setIbadah] = useState<StudentIbadahLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load students, scoped for teachers if applicable
  useEffect(() => {
    if (!cid || !token) return;
    const ac = new AbortController();

    if (isTeacher) {
      getMyClasses(cid, token, ac.signal)
        .then(async (cls) => {
          const teacherId = user?.id ?? "";
          const ownClasses = cls.filter((c) => c.classTeacherId === teacherId);
          if (ownClasses.length > 0) {
            const classIds = new Set(ownClasses.map((c) => c.id));
            const all = await getStudents(cid, token, { limit: 1000, status: "ACTIVE", signal: ac.signal });
            setStudents((all.data ?? []).filter((s) => s.classId && classIds.has(s.classId)));
          } else {
            const all = await getStudents(cid, token, { limit: 1000, status: "ACTIVE", signal: ac.signal });
            setStudents(all.data ?? []);
          }
        })
        .catch(() => {});
    } else {
      getStudents(cid, token, { limit: 1000, status: "ACTIVE", signal: ac.signal })
        .then((r) => setStudents(r.data ?? []))
        .catch(() => {});
    }

    return () => ac.abort();
  }, [cid, token, isTeacher, user?.id]);

  useEffect(() => {
    if (!cid || !token || !studentId || (from && to && from > to)) return;
    setLoading(true);
    Promise.all([
      getStudentHomework(cid, token, studentId),
      getStudentIbadah(cid, token, studentId, { from, to, limit: 500 }),
      getStudentAttendance(cid, token, studentId, { from, to, take: 500 }),
    ])
      .then(([hw, ib, att]) => {
        setHomework(
          hw.homework.filter(
            (item) => item.dueDate.slice(0, 10) >= from && item.dueDate.slice(0, 10) <= to,
          ),
        );
        setIbadah(ib.logs);
        setAttendance(att.records);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [cid, token, studentId, from, to]);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (p === "THIS_WEEK") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setFrom(d.toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (p === "THIS_MONTH") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(d.toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (p === "LAST_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setFrom(first.toISOString().slice(0, 10));
      setTo(last.toISOString().slice(0, 10));
    } else if (p === "LAST_90_DAYS") {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      setFrom(d.toISOString().slice(0, 10));
      setTo(todayStr);
    }
  };

  const student = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);

  const downloadPdf = async () => {
    if (!reportRef.current || !student) return;
    setExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import("html2canvas-pro").then((m) => m.default),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#fff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const width = 190;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, width, height);
      pdf.save(`${student.name.replace(/\s+/g, "_")}_Individual_Report.pdf`);
    } catch (error) {
      console.error("Failed to export report", error);
    } finally {
      setExporting(false);
    }
  };

  const count = (status: string) => attendance.filter((a) => a.status === status).length;

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Individual Student Report</h1>
            <p className="text-sm text-gray-500">Homework, ibadah tracking, and attendance overview</p>
          </div>
          <button
            onClick={downloadPdf}
            disabled={!student || exporting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
              Student
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-sm font-normal bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.adno}) {s.class ? `· ${s.class.name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-1 lg:col-span-2 flex flex-col justify-end">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">
                Date Range Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "THIS_WEEK", label: "This Week" },
                    { id: "THIS_MONTH", label: "This Month" },
                    { id: "LAST_MONTH", label: "Last Month" },
                    { id: "LAST_90_DAYS", label: "Last 90 Days" },
                    { id: "CUSTOM", label: "Custom Range" },
                  ] as { id: DatePreset; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                      preset === p.id
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">From:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">To:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {student && (
          <div ref={reportRef} className="space-y-4 bg-gray-50/50 p-1">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Admission No: {student.adno} · {student.class?.name ?? ""}
                  </p>
                </div>
                <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {from} to {to}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
                <Loader2 className="mx-auto w-8 h-8 animate-spin text-emerald-600 mb-2" />
                <p className="text-xs text-gray-400">Loading student analytics...</p>
              </div>
            ) : (
              <>
                <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Homework ({homework.length})</h3>
                  {homework.length ? (
                    <div className="divide-y divide-gray-100">
                      {homework.map((h) => (
                        <div key={h.id} className="flex justify-between py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{h.title}</span>
                            <span className="text-xs text-gray-400 ml-2">Due {h.dueDate.slice(0, 10)}</span>
                          </div>
                          <span className="font-semibold text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700">
                            {(h.submission.status as string).replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No homework in this period.</p>
                  )}
                </section>

                <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">
                    Ibada Tracking ({ibadah.length} days recorded)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                      <b className="text-xl text-emerald-700">
                        {ibadah.reduce((n, l) => n + (l.quranPages || 0), 0)}
                      </b>
                      <p className="text-xs text-emerald-600 mt-0.5">Quran pages read</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                      <b className="text-xl text-amber-700">
                        {ibadah.filter((l) => l.fajr || l.dhuhr || l.asr || l.maghrib || l.isha).length}
                      </b>
                      <p className="text-xs text-amber-600 mt-0.5">Prayer days recorded</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                      <b className="text-xl text-blue-700">
                        {
                          ibadah.filter(
                            (l) =>
                              l.fajr === "JAMA" ||
                              l.dhuhr === "JAMA" ||
                              l.asr === "JAMA" ||
                              l.maghrib === "JAMA" ||
                              l.isha === "JAMA",
                          ).length
                        }
                      </b>
                      <p className="text-xs text-blue-600 mt-0.5">Days with Jama'a</p>
                    </div>
                    <div className="rounded-xl bg-purple-50 p-4 border border-purple-100">
                      <b className="text-xl text-purple-700">
                        {
                          ibadah.filter(
                            (l) =>
                              l.fajr === "ADA" ||
                              l.dhuhr === "ADA" ||
                              l.asr === "ADA" ||
                              l.maghrib === "ADA" ||
                              l.isha === "ADA",
                          ).length
                        }
                      </b>
                      <p className="text-xs text-purple-600 mt-0.5">Days with Ada'</p>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Attendance</h3>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {["PRESENT", "ABSENT", "LEAVE", "SICK", "LATE"].map((s) => (
                      <span
                        key={s}
                        className={cn(
                          "rounded-xl px-4 py-2.5 font-medium border flex items-center gap-2",
                          s === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : s === "ABSENT"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-amber-50 text-amber-700 border-amber-100",
                        )}
                      >
                        <b className="text-base">{count(s)}</b> {s.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {!student && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
            <FileText className="mx-auto mb-3 w-8 h-8 text-gray-300" />
            <p className="font-semibold text-gray-700">Select a student</p>
            <p className="text-xs text-gray-400 mt-1">
              Choose a student and date range above to view their consolidated report.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
