import { useState, useRef } from "react";
import { FileDown, Upload, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bulkUpsertResults, type BulkResultItem, type SubjectMeta } from "@/lib/results-api";
import * as XLSX from "xlsx";

interface Student { id: string; name: string; adno: string }

interface Props {
  clientId: string;
  token: string;
  examId: string;
  classId: string;
  accademicYearId: string;
  subjects: SubjectMeta[];
  students: Student[];
  onClose: () => void;
  onSuccess: (saved: number) => void;
}

export function ExcelImportModal({
  clientId, token, examId, classId, accademicYearId,
  subjects, students, onClose, onSuccess,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<BulkResultItem[] | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState<number | null>(null);

  // ── Download sample template ──────────────────────────────────────────────

  const downloadTemplate = () => {
    // Headers: "SubjectName (out of N)" so users know max marks per subject
    const headers = ["AdmissionNo", "StudentName", ...subjects.map((s) => `${s.name} (out of ${s.maxMarks})`)];
    const dataRows = students.map((s) => [s.adno, s.name, ...subjects.map(() => "")]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Column widths
    ws["!cols"] = [{ wch: 14 }, { wch: 28 }, ...subjects.map(() => ({ wch: 14 }))];

    // Style header row (bold)
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "047857" } }, font2: { color: { rgb: "FFFFFF" } } };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, "marks-template.xlsx");
  };

  // ── Parse uploaded file ───────────────────────────────────────────────────

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseErr(null);
    setRows(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        if (raw.length === 0) { setParseErr("Template is empty."); return; }

        const adnoToId = new Map(students.map((s) => [s.adno.trim().toLowerCase(), s.id]));
        // Match both "SubjectName" and "SubjectName (out of N)" header variants
        const subjectNameToId = new Map<string, SubjectMeta>();
        for (const s of subjects) {
          subjectNameToId.set(s.name.trim().toLowerCase(), s);
          subjectNameToId.set(`${s.name.trim().toLowerCase()} (out of ${s.maxMarks})`, s);
        }

        const results: BulkResultItem[] = [];
        const errs: string[] = [];

        for (const row of raw) {
          const adno = String(row["AdmissionNo"] ?? "").trim().toLowerCase();
          const studentId = adnoToId.get(adno);
          if (!studentId) { errs.push(`Unknown AdmissionNo: ${adno}`); continue; }

          for (const [key, val] of Object.entries(row)) {
            if (key === "AdmissionNo" || key === "StudentName") continue;
            const subj = subjectNameToId.get(key.trim().toLowerCase());
            if (!subj) continue;
            const score = parseFloat(String(val));
            if (isNaN(score)) continue; // skip blank/non-numeric
            if (score < 0 || score > subj.maxMarks) {
              errs.push(`${adno} / ${key}: score ${score} out of range (0–${subj.maxMarks})`);
              continue;
            }
            results.push({ studentId, subjectId: subj.id, score, totalMarks: subj.maxMarks });
          }
        }

        if (errs.length > 0) { setParseErr(errs.join("\n")); return; }
        if (results.length === 0) { setParseErr("No valid score rows found."); return; }
        setRows(results);
      } catch {
        setParseErr("Failed to parse file. Ensure it is a valid .xlsx file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!rows) return;
    setSaving(true);
    try {
      const res = await bulkUpsertResults(clientId, token, { examId, classId, accademicYearId, results: rows });
      setSaved(res.saved);
      onSuccess(res.saved);
    } catch (err: any) {
      setParseErr(err.message ?? "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import Marks from Excel</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Step 1 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Step 1 — Download template</p>
            <button onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors">
              <FileDown className="w-4 h-4" />
              Download Template (.xlsx)
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Pre-filled with {students.length} students · {subjects.length} subjects (max marks in header)
            </p>
          </div>

          {/* Step 2 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Step 2 — Fill & upload</p>
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
              rows ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50",
            )}>
              {rows ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">{rows.length} mark entries ready</span>
                  <span className="text-xs text-emerald-500">Click to change file</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Click or drag .xlsx file here</span>
                </>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFile} />
            </label>
          </div>

          {/* Error */}
          {parseErr && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap text-xs">{parseErr}</pre>
            </div>
          )}

          {/* Success */}
          {saved !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              {saved} records saved successfully.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rows || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {saving ? "Uploading…" : "Upload Marks"}
          </button>
        </div>
      </div>
    </div>
  );
}
