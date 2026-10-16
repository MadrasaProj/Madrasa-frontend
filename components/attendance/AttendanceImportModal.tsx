import { useState, useRef, useMemo, useEffect } from "react";
import {
  X, Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertCircle, AlertTriangle, Loader2, ArrowRight, RefreshCw,
  Users, Calendar
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { bulkUpsertAttendance, type AttendanceEntry, type AttendanceStatus } from "@/lib/attendance-api";
import { type ClassRecord } from "@/lib/classes-api";

interface AttendanceImportModalProps {
  clientId: string;
  token: string;
  academicYearId?: string | null;
  classes: ClassRecord[];
  initialClassId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_MAP: Record<string, AttendanceStatus | null> = {
  p: "PRESENT",
  present: "PRESENT",
  "1": "PRESENT",
  a: "ABSENT",
  absent: "ABSENT",
  "0": "ABSENT",
  l: "LEAVE",
  leave: "LEAVE",
  s: "SICK",
  sick: "SICK",
  // Ignored / Holiday codes:
  h: null,
  holiday: null,
  off: null,
  "-": null,
  "": null,
};

interface ParsedDayEntry {
  date: string; // YYYY-MM-DD
  records: AttendanceEntry[];
}

export function AttendanceImportModal({
  clientId,
  token,
  academicYearId,
  classes,
  initialClassId,
  onClose,
  onSuccess,
}: AttendanceImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Month & Year default: Previous month
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed: 0=Jan, 11=Dec
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || (classes[0]?.id ?? "")
  );

  // Students for the chosen class
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Parse state
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedDays, setParsedDays] = useState<ParsedDayEntry[]>([]);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedDatesCount, setImportedDatesCount] = useState(0);

  // Load students when class changes
  useEffect(() => {
    if (!selectedClassId || !clientId || !token) return;
    let active = true;
    setLoadingStudents(true);
    getStudents(clientId, token, { classId: selectedClassId, status: "ACTIVE", limit: 300 })
      .then((res) => {
        if (active) setStudents(res.data ?? []);
      })
      .catch((err) => {
        toast.error(`Failed to load students: ${err.message}`);
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });
    return () => {
      active = false;
    };
  }, [clientId, token, selectedClassId]);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  // Number of days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Total summary of parsed items
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let sick = 0;
    let total = 0;

    for (const d of parsedDays) {
      for (const r of d.records) {
        total++;
        if (r.status === "PRESENT") present++;
        else if (r.status === "ABSENT") absent++;
        else if (r.status === "LEAVE") leave++;
        else if (r.status === "SICK") sick++;
      }
    }

    return { total, present, absent, leave, sick, datesCount: parsedDays.length };
  }, [parsedDays]);

  // ── Download Sample Excel Template ──────────────────────────────────────
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. Matrix Register Sheet (Standard school attendance register format)
    const headers = ["Admission No", "Student Name"];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayStr = String(day).padStart(2, "0");
      headers.push(`${dayStr} (${weekday})`);
    }

    const dataRows: (string | number)[][] = [];
    if (students.length > 0) {
      students.forEach((s, idx) => {
        const row: (string | number)[] = [s.adno, s.name];
        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(selectedYear, selectedMonth, day);
          const isSunday = d.getDay() === 0;
          const isFriday = d.getDay() === 5;
          // Provide realistic sample: mark P by default, A occasionally, leave blank for weekend
          if (isSunday || isFriday) {
            row.push("-");
          } else if (idx === 0 && day === 3) {
            row.push("A");
          } else if (idx === 1 && day === 5) {
            row.push("L");
          } else {
            row.push("P");
          }
        }
        dataRows.push(row);
      });
    } else {
      // Demo placeholder rows if class has no students loaded
      dataRows.push(
        ["ADM001", "Abdullah Ameen", ...Array(daysInMonth).fill("P")],
        ["ADM002", "Fathima Zahra", ...Array(daysInMonth).fill("P")],
        ["ADM003", "Muhammed Bilal", ...Array(daysInMonth).fill("P")]
      );
    }

    const wsRegister = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    // Set auto column widths
    wsRegister["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      ...Array(daysInMonth).fill({ wch: 10 }),
    ];
    XLSX.utils.book_append_sheet(wb, wsRegister, "Monthly Register");

    // 2. Instructions Sheet
    const instructions = [
      ["PREVIOUS MONTH ATTENDANCE IMPORT GUIDE"],
      [""],
      ["Month:", `${MONTH_NAMES[selectedMonth]} ${selectedYear}`],
      ["Class:", activeClass?.name || "All Classes"],
      [""],
      ["STATUS CODES ALLOWED IN CELLS:"],
      ["Code", "Status", "Description"],
      ["P or PRESENT", "Present", "Student was present on this day"],
      ["A or ABSENT", "Absent", "Student was absent on this day"],
      ["L or LEAVE", "Leave", "Student was on excused / approved leave"],
      ["S or SICK", "Sick", "Student was reported sick"],
      ["- or Blank or H", "Holiday / Skip", "No attendance marked (weekend/holiday)"],
      [""],
      ["TIPS:"],
      ["1. Keep the 'Admission No' column accurate as it is used to identify the student."],
      ["2. You can leave columns blank or use '-' for holidays or non-working days."],
      ["3. You can also import row-by-row lists with columns: 'Admission No', 'Date', 'Status'."],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions & Legend");

    const cleanClassName = (activeClass?.name || "class")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    const cleanMonth = MONTH_NAMES[selectedMonth].toLowerCase();
    XLSX.writeFile(wb, `attendance-template-${cleanClassName}-${cleanMonth}-${selectedYear}.xlsx`);
    toast.success("Sample Excel template downloaded!");
  };

  // ── Parse Excel File in Frontend ─────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setParseErrors([]);
    setParseWarnings([]);
    setParsedDays([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];

        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        if (rawData.length === 0) {
          setParseErrors(["The uploaded spreadsheet contains no data rows."]);
          setParsing(false);
          return;
        }

        // Build adno map for the students in this class
        const adnoMap = new Map<string, StudentRecord>();
        for (const s of students) {
          adnoMap.set(s.adno.trim().toLowerCase(), s);
        }

        const errors: string[] = [];
        const warnings: string[] = [];
        const dayMap = new Map<string, AttendanceEntry[]>();

        // Check if row-by-row format or matrix format
        const firstRow = rawData[0];
        const keys = Object.keys(firstRow);
        const lowerKeys = keys.map((k) => k.toLowerCase().trim());

        const hasDateCol = lowerKeys.some((k) => k === "date");
        const hasStatusCol = lowerKeys.some((k) => k === "status");

        if (hasDateCol && hasStatusCol) {
          // ── Format A: Row-by-Row list (Admission No, Date, Status) ──
          const adnoKey = keys.find((k) => /admission|adno/i.test(k)) || keys[0];
          const dateKey = keys.find((k) => /^date$/i.test(k)) || "Date";
          const statusKey = keys.find((k) => /^status$/i.test(k)) || "Status";

          rawData.forEach((row, idx) => {
            const rawAdno = String(row[adnoKey] || "").trim();
            const rawDate = String(row[dateKey] || "").trim();
            const rawStatus = String(row[statusKey] || "").trim();

            if (!rawAdno && !rawDate) return; // empty row

            const student = adnoMap.get(rawAdno.toLowerCase());
            if (!student) {
              errors.push(`Row ${idx + 2}: Student with Admission No '${rawAdno}' not found in class.`);
              return;
            }

            // Parse Date
            let isoDate = "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
              isoDate = rawDate;
            } else {
              const d = new Date(rawDate);
              if (isNaN(d.getTime())) {
                errors.push(`Row ${idx + 2}: Invalid date format '${rawDate}'. Expected YYYY-MM-DD.`);
                return;
              }
              isoDate = d.toISOString().slice(0, 10);
            }

            const statusNormalized = STATUS_MAP[rawStatus.toLowerCase()];
            if (statusNormalized === undefined) {
              warnings.push(`Row ${idx + 2}: Unknown status '${rawStatus}'. Ignored.`);
              return;
            }
            if (statusNormalized === null) return; // holiday

            if (!dayMap.has(isoDate)) dayMap.set(isoDate, []);
            dayMap.get(isoDate)!.push({
              studentId: student.id,
              status: statusNormalized,
            });
          });
        } else {
          // ── Format B: Monthly Matrix Grid (Cols: 01, 02..31 or 1..31) ──
          const adnoKey =
            keys.find((k) => /admission|adno/i.test(k)) ||
            keys.find((k) => /adm/i.test(k)) ||
            keys[0];

          // Identify Day columns
          const dayColumns: { key: string; dayNum: number }[] = [];
          for (const k of keys) {
            // Match "01 (Mon)", "1", "01", "Day 1", etc.
            const match = k.match(/^(\d{1,2})/);
            if (match) {
              const dayNum = parseInt(match[1], 10);
              if (dayNum >= 1 && dayNum <= 31) {
                dayColumns.push({ key: k, dayNum });
              }
            }
          }

          if (dayColumns.length === 0) {
            errors.push(
              "Could not find any day columns (e.g. '01', '02', '1', '2'...) or a 'Date' column in the Excel sheet."
            );
          } else {
            rawData.forEach((row, rowIdx) => {
              const rawAdno = String(row[adnoKey] || "").trim();
              if (!rawAdno) return;

              const student = adnoMap.get(rawAdno.toLowerCase());
              if (!student) {
                warnings.push(`Row ${rowIdx + 2}: Student '${rawAdno}' not found in active class roster.`);
                return;
              }

              for (const col of dayColumns) {
                const cellVal = String(row[col.key] || "").trim();
                if (!cellVal || cellVal === "-" || cellVal.toLowerCase() === "h") continue;

                const status = STATUS_MAP[cellVal.toLowerCase()];
                if (status === undefined) {
                  warnings.push(
                    `Row ${rowIdx + 2} (${student.name}), Day ${col.dayNum}: Unknown code '${cellVal}'. Skipped.`
                  );
                  continue;
                }
                if (status === null) continue;

                // Build ISO Date
                const dayStr = String(col.dayNum).padStart(2, "0");
                const monthStr = String(selectedMonth + 1).padStart(2, "0");
                const dateISO = `${selectedYear}-${monthStr}-${dayStr}`;

                if (!dayMap.has(dateISO)) dayMap.set(dateISO, []);
                dayMap.get(dateISO)!.push({
                  studentId: student.id,
                  status,
                });
              }
            });
          }
        }

        const daysList: ParsedDayEntry[] = Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, records]) => ({ date, records }));

        setParsedDays(daysList);
        setParseErrors(errors);
        setParseWarnings(warnings);
      } catch (err) {
        setParseErrors([`Failed to read spreadsheet: ${(err as Error).message}`]);
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ── Import All Parsed Days via API ────────────────────────────────────────
  const handleImport = async () => {
    if (parsedDays.length === 0) {
      toast.error("No valid attendance entries to import.");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportedDatesCount(0);

    let completed = 0;
    let failedDates = 0;

    for (const item of parsedDays) {
      try {
        await bulkUpsertAttendance(clientId, token, {
          classId: selectedClassId,
          date: item.date,
          academicYearId: academicYearId || undefined,
          records: item.records,
        });
        completed++;
        setImportedDatesCount(completed);
      } catch (err) {
        failedDates++;
        console.error(`Failed to import attendance for ${item.date}:`, err);
      }
      setImportProgress(Math.round(((completed + failedDates) / parsedDays.length) * 100));
    }

    setImporting(false);

    if (failedDates > 0) {
      toast.warning(
        `Imported ${completed} dates successfully. ${failedDates} dates encountered errors.`
      );
    } else {
      toast.success(
        `Successfully imported attendance for ${completed} dates (${stats.total} student records)!`
      );
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Import Previous Month Attendance
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload class attendance spreadsheet with client-side verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Select Target Class & Month */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>1. Target Period & Class</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Class Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Class {loadingStudents && <Loader2 className="w-3 h-3 inline animate-spin text-emerald-600" />}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setParsedDays([]);
                    setFileName(null);
                  }}
                  disabled={importing}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value, 10));
                    setParsedDays([]);
                    setFileName(null);
                  }}
                  disabled={importing}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                    setParsedDays([]);
                    setFileName(null);
                  }}
                  disabled={importing}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">
                Active students loaded: <strong className="text-gray-800">{students.length}</strong>
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={loadingStudents || importing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample Excel
              </button>
            </div>
          </div>

          {/* Step 2: Upload Area */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>2. Upload Completed Attendance File</span>
            </div>

            <div
              onClick={() => !importing && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                fileName
                  ? "border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50"
                  : "border-gray-200 hover:border-emerald-400 bg-gray-50/50 hover:bg-white"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center text-emerald-600">
                {parsing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                ) : fileName ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {fileName ? (
                <div>
                  <p className="text-sm font-bold text-gray-900">{fileName}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Click to choose another file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Click to select or drag & drop Excel spreadsheet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepts .xlsx or .xls (Monthly register format or Date list)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Errors & Warnings */}
          {parseErrors.length > 0 && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Found {parseErrors.length} validation errors:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5 pl-1 max-h-32 overflow-y-auto">
                {parseErrors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 10 && (
                  <li>...and {parseErrors.length - 10} more error(s)</li>
                )}
              </ul>
            </div>
          )}

          {parseWarnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Notice: {parseWarnings.length} skipped row(s) or unknown codes</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5 pl-1 max-h-24 overflow-y-auto">
                {parseWarnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {parseWarnings.length > 5 && (
                  <li>...and {parseWarnings.length - 5} more note(s)</li>
                )}
              </ul>
            </div>
          )}

          {/* Parsed Summary Preview */}
          {parsedDays.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Parsed Attendance Preview
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {stats.datesCount} working days detected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Present</p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.present}</p>
                </div>
                <div className="bg-red-50/70 border border-red-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-red-800 uppercase">Absent</p>
                  <p className="text-xl font-bold text-red-700 mt-0.5">{stats.absent}</p>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-amber-800 uppercase">Leave</p>
                  <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.leave}</p>
                </div>
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-blue-800 uppercase">Sick</p>
                  <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.sick}</p>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Dates to be imported: <strong>{parsedDays[0]?.date}</strong> to{" "}
                  <strong>{parsedDays[parsedDays.length - 1]?.date}</strong>
                </span>
                <span>
                  Total records: <strong>{stats.total} entries</strong>
                </span>
              </div>
            </div>
          )}

          {/* Progress bar when importing */}
          {importing && (
            <div className="space-y-2 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span>Importing attendance records...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-700 text-center mt-1">
                Completed {importedDatesCount} of {parsedDays.length} dates
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || parsedDays.length === 0 || parseErrors.length > 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Attendance ({stats.total})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
