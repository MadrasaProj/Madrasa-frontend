import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { getStudentHomework, type StudentHomeworkItem } from "@/lib/homework-api";
import { getStudentIbadah, type StudentIbadahLog } from "@/lib/ibadah-api";
import { getStudentAttendance, type AttendanceRecord } from "@/lib/attendance-api";
import { Download, Loader2, FileText } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function IndividualStudentReportPage() {
  const { user, accessToken } = useAuthStore();
  const cid = user?.clientId ?? "";
  const token = accessToken ?? "";
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [homework, setHomework] = useState<StudentHomeworkItem[]>([]);
  const [ibadah, setIbadah] = useState<StudentIbadahLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (cid && token) getStudents(cid, token, { limit: 1000, status: "ACTIVE" }).then(r => setStudents(r.data)); }, [cid, token]);
  useEffect(() => {
    if (!cid || !token || !studentId || from > to) return;
    setLoading(true);
    Promise.all([
      getStudentHomework(cid, token, studentId),
      getStudentIbadah(cid, token, studentId, { from, to, limit: 500 }),
      getStudentAttendance(cid, token, studentId, { from, to, take: 500 }),
    ]).then(([hw, ib, att]) => {
      setHomework(hw.homework.filter(item => item.dueDate.slice(0, 10) >= from && item.dueDate.slice(0, 10) <= to));
      setIbadah(ib.logs); setAttendance(att.records);
    }).finally(() => setLoading(false));
  }, [cid, token, studentId, from, to]);

  const student = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);
  const downloadPdf = async () => {
    if (!reportRef.current || !student) return;
    setExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([import("html2canvas-pro").then(m => m.default), import("jspdf")]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#fff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4" }); const width = 190; const height = canvas.height * width / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, width, height); pdf.save(`${student.name.replace(/\s+/g, "_")}_Individual_Report.pdf`);
    } catch (error) { console.error("Failed to export report", error); } finally { setExporting(false); }
  };
  const count = (status: string) => attendance.filter(a => a.status === status).length;
  return <DashboardLayout><div className="space-y-5 max-w-5xl mx-auto">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Individual Student Report</h1><p className="text-sm text-gray-500">Homework, ibada and attendance overview</p></div><button onClick={downloadPdf} disabled={!student || exporting} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF</button></div>
    <div className="bg-white rounded-2xl border border-gray-100 p-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold">Student<select value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-2 font-normal"><option value="">Select student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.adno})</option>)}</select></label><label className="text-sm font-semibold">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-2 font-normal" /></label><label className="text-sm font-semibold">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-2 font-normal" /></label></div>
    {student && <div ref={reportRef} className="space-y-4 bg-gray-50 p-1"><div className="bg-white rounded-2xl p-5"><h2 className="text-xl font-bold">{student.name}</h2><p className="text-sm text-gray-500">Admission No: {student.adno} · {student.class?.name ?? ""} · {from} to {to}</p></div>{loading ? <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div> : <><section className="bg-white rounded-2xl p-5"><h3 className="font-bold text-lg">Homework ({homework.length})</h3>{homework.length ? homework.map(h => <div key={h.id} className="flex justify-between border-b py-2 text-sm"><span>{h.title}</span><span className="font-semibold">{(h.submission.status as string).replaceAll("_", " ")}</span></div>) : <p className="text-sm text-gray-400 mt-2">No homework in this period.</p>}</section><section className="bg-white rounded-2xl p-5"><h3 className="font-bold text-lg">Ibada Tracking ({ibadah.length} days)</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"><div className="rounded-xl bg-emerald-50 p-3"><b>{ibadah.reduce((n, l) => n + (l.quranPages || 0), 0)}</b><p className="text-xs">Quran pages</p></div><div className="rounded-xl bg-amber-50 p-3"><b>{ibadah.filter(l => l.fajr || l.dhuhr || l.asr || l.maghrib || l.isha).length}</b><p className="text-xs">Prayer days</p></div></div></section><section className="bg-white rounded-2xl p-5"><h3 className="font-bold text-lg">Attendance</h3><div className="flex flex-wrap gap-3 mt-3 text-sm">{["PRESENT", "ABSENT", "LEAVE", "LATE"].map(s => <span key={s} className="rounded-xl bg-blue-50 px-3 py-2"><b>{count(s)}</b> {s.toLowerCase()}</span>)}</div></section></>}</div>}
    {!student && <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500"><FileText className="mx-auto mb-2" />Select a student to generate the report.</div>}
  </div></DashboardLayout>;
}
