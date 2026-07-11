import { useState, useCallback, useRef, useEffect } from "react"
import {
 Upload, Download, CheckCircle2, XCircle, AlertCircle,
 Loader2, ChevronLeft, FileSpreadsheet, TriangleAlert,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// ── Public types (imported by each module's config) ──────────────────────────

export type ImportContext = Record<string, unknown>

/** Return `{ ok: false, error }` from `parse` to signal a parse error. */
export type ParseResult =
 | { ok: true; value: unknown }
 | { ok: false; error: string }

export interface ImportColumnDef {
 /** Exact Excel column header — matched case-insensitively. */
 header: string
 /** Target field name in the payload object. */
 field: string
 required?: boolean
 /**
 * Transform raw cell string → payload value.
 * Return `{ ok: false, error }` to signal a problem (e.g. class not found).
 * Return any other value directly to use it as-is.
 */
 parse?: (rawValue: string, context: ImportContext) => ParseResult | unknown
 /** Extra validation after parse. Return error string or null. */
 validate?: (parsedValue: unknown, partialRow: Record<string, unknown>) => string | null
 /** Shown in the auto-generated template's example row. */
 example?: string
}

export interface ImportConfig<TPayload = Record<string, unknown>> {
 entityName: string
 templateFilename: string
 columns: ImportColumnDef[]
 /**
 * Called once per valid row. Must throw on failure.
 * If `createBulk` is also provided, `createBulk` wins.
 */
 createRow: (row: TPayload) => Promise<unknown>
 /**
 * Optional: send all valid rows in a single bulk call instead of looping
 * `createRow`. The callback must throw on failure (throw a normal Error —
 * the message will be shown to the user). Rows referenced in the error
 * metadata are auto-marked failed; other rows are auto-marked imported.
 */
 createBulk?: (rows: TPayload[]) => Promise<{
  imported?: Array<{ rowIndex: number; action?: "created" | "updated" }>
  failed?: Array<{ rowIndex: number; message: string }>
 }>
 /** Passed as second arg to every `parse` / `validate` callback. */
 context?: ImportContext
}

// ── Internal ─────────────────────────────────────────────────────────────────

type Screen = "upload" | "preview" | "importing" | "results"

interface ParsedRow {
 index: number
 raw: Record<string, string>
 parsed: Record<string, unknown>
 errors: string[]
 status: "valid" | "invalid" | "imported" | "failed"
 failMessage?: string
}

// Single lazy-load cache
let xlsxMod: typeof import("xlsx") | null = null
async function getXlsx() {
 if (!xlsxMod) xlsxMod = await import("xlsx")
 return xlsxMod
}

async function downloadTemplate(columns: ImportColumnDef[], filename: string) {
 const XLSX = await getXlsx()
 const wb = XLSX.utils.book_new()
 const headers = columns.map(c => c.header)
 const examples = columns.map(c => c.example ?? "")
 const ws = XLSX.utils.aoa_to_sheet([headers, examples])

 // Style header row (bold + light fill) and example row (italic + grey)
 const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "10B981" } } }
 const exampleStyle = { font: { italic: true, color: { rgb: "6B7280" } } }
 const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
 for (let c = range.s.c; c <= range.e.c; c++) {
  const addr = XLSX.utils.encode_cell({ r: 0, c })
  ws[addr] = ws[addr] ?? { t: "s", v: headers[c] }
  ws[addr].s = headerStyle
  const exAddr = XLSX.utils.encode_cell({ r: 1, c })
  if (ws[exAddr]) ws[exAddr].s = exampleStyle
 }
 // Set reasonable column widths
 ws["!cols"] = columns.map(c => ({ wch: Math.max(14, (c.header.length + 4)) }))

 XLSX.utils.book_append_sheet(wb, ws, "Data")

 // Instructions sheet
 const required = columns.filter(c => c.required).map(c => `• ${c.header} — required`)
 const optional = columns.filter(c => !c.required).map(c => `• ${c.header}`)
 const instructions = [
  ["How to use this template"],
  [],
  ["1. Open the 'Data' sheet — that's where you fill in rows."],
  ["2. The first row is the header. Don't rename or reorder columns."],
  ["3. The second row is an example — replace it with your data."],
  ["4. Save the file as .xlsx and upload it back."],
  [],
  ["Required columns:"],
  ...required.map(line => [line]),
  [],
  ["Optional columns:"],
  ...optional.map(line => [line]),
  [],
  ["Notes:"],
  ["• Leaving an optional column blank is fine."],
  ["• Status accepts ACTIVE or INACTIVE (defaults to ACTIVE)."],
  ["• Existing usernames will be UPDATED, not duplicated."],
 ]
 const instrWs = XLSX.utils.aoa_to_sheet(instructions)
 instrWs["!cols"] = [{ wch: 80 }]
 XLSX.utils.book_append_sheet(wb, instrWs, "Instructions")

 XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function downloadErrorReport(
 rows: ParsedRow[],
 columns: ImportColumnDef[],
 filename: string,
) {
 const XLSX = await getXlsx()
 const failed = rows.filter(r => r.status === "failed" || r.status === "invalid")
 const headers = [...columns.map(c => c.header), "Errors"]
 const dataRows = failed.map(r => [
 ...columns.map(c => r.raw[c.field] ?? ""),
 r.errors.join("; ") || r.failMessage || "",
 ])
 const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
 const wb = XLSX.utils.book_new()
 XLSX.utils.book_append_sheet(wb, ws, "Errors")
 XLSX.writeFile(wb, `${filename}-errors.xlsx`)
}

function resolveField(rawValue: string, col: ImportColumnDef, context: ImportContext): { value: unknown; error?: string } {
 if (!rawValue) return { value: undefined }
 if (!col.parse) return { value: rawValue }
 const result = col.parse(rawValue, context)
 if (result !== null && typeof result === "object" && "ok" in (result as object)) {
 const r = result as ParseResult
 return r.ok ? { value: r.value } : { value: undefined, error: r.error }
 }
 return { value: result }
}

/** Thrown by `parseFile` when the uploaded file doesn't match the template. */
export class ImportTemplateError extends Error {
 missingHeaders: string[]
 constructor(missingHeaders: string[]) {
  super(
   `Template mismatch — missing required column(s): ${missingHeaders.join(", ")}. ` +
    `Please download the template and re-upload.`,
  )
  this.name = "ImportTemplateError"
  this.missingHeaders = missingHeaders
 }
}

async function parseFile(
 file: File,
 columns: ImportColumnDef[],
 context: ImportContext,
): Promise<ParsedRow[]> {
 const XLSX = await getXlsx()
 const buf = await file.arrayBuffer()
 const wb = XLSX.read(buf, { type: "array" })
 const ws = wb.Sheets[wb.SheetNames[0]]
 const sheetRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" })

 if (sheetRows.length < 2) return []

 const headerRow = sheetRows[0].map(h => String(h ?? "").trim().toLowerCase())

 // Verify template structure: every required column must be present.
 const missing = columns
  .filter((c) => c.required)
  .filter((c) => !headerRow.includes(c.header.toLowerCase()))
  .map((c) => c.header)
 if (missing.length) throw new ImportTemplateError(missing)

 const colMap: Record<string, number> = {}
 for (const col of columns) {
  const idx = headerRow.indexOf(col.header.toLowerCase())
  if (idx >= 0) colMap[col.field] = idx
 }

 const parsed: ParsedRow[] = []
 for (let i = 1; i < sheetRows.length; i++) {
 const row = sheetRows[i]
 if (row.every(c => !String(c ?? "").trim())) continue

 const raw: Record<string, string> = {}
 const fields: Record<string, unknown> = {}
 const errors: string[] = []

 for (const col of columns) {
 const idx = colMap[col.field]
 const rawVal = idx !== undefined ? String(row[idx] ?? "").trim() : ""
 raw[col.field] = rawVal

 if (!rawVal) {
 if (col.required) errors.push(`${col.header} is required`)
 continue
 }

 const { value, error } = resolveField(rawVal, col, context)
 if (error) { errors.push(error); continue }
 if (value !== undefined && col.validate) {
 const ve = col.validate(value, fields)
 if (ve) { errors.push(ve); continue }
 }
 if (value !== undefined) fields[col.field] = value
 }

 parsed.push({ index: i, raw, parsed: fields, errors, status: errors.length ? "invalid" : "valid" })
 }
 return parsed
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function UploadScreen({
 config,
 parsing,
 parseError,
 onFile,
 fileInputRef,
}: {
 config: ImportConfig<unknown>
 parsing: boolean
 parseError: string | null
 onFile: (f: File) => void
 fileInputRef: React.RefObject<HTMLInputElement>
}) {
 const [dragging, setDragging] = useState(false)

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault()
 setDragging(false)
 const file = e.dataTransfer.files[0]
 if (file) onFile(file)
 }

 return (
 <div className="space-y-4">
 {/* Template download */}
 <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-between">
 <div>
 <p className="text-sm font-semibold text-emerald-800">Step 1: Download template</p>
 <p className="text-xs text-emerald-600 mt-0.5">Fill it in, then upload below</p>
 </div>
 <button
 onClick={() => downloadTemplate(config.columns, config.templateFilename)}
 className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shrink-0"
 >
 <Download className="w-4 h-4" /> Template
 </button>
 </div>

 {/* Drop zone */}
 <div
 onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
 onDragLeave={() => setDragging(false)}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 className={cn(
 "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
 dragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50",
 )}
 >
 {parsing ? (
 <div className="flex flex-col items-center gap-2 text-gray-400">
 <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
 <p className="text-sm font-medium">Parsing file…</p>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-2 text-gray-400">
 <Upload className="w-8 h-8 opacity-40" />
 <p className="text-sm font-semibold text-gray-600">Drop file here or tap to select</p>
 <p className="text-xs">.xlsx or .csv</p>
 </div>
 )}
 </div>

 <input
 ref={fileInputRef}
 type="file"
 accept=".xlsx,.xls,.csv"
 className="sr-only"
 onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
 />

 {parseError && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
 <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
 </div>
 )}

 {/* Column reference */}
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Expected columns</p>
 <div className="flex flex-wrap gap-2">
 {config.columns.map(col => (
 <span key={col.field}
 className={cn(
 "text-xs px-2.5 py-1 rounded-lg font-medium",
 col.required
 ? "bg-emerald-100 text-emerald-700"
 : "bg-gray-100 text-gray-600",
 )}
 >
 {col.header}{col.required ? " *" : ""}
 </span>
 ))}
 </div>
 <p className="text-xs text-gray-400 mt-2">* required</p>
 </div>
 </div>
 )
}

function PreviewScreen({
 rows,
 columns,
 validCount,
 invalidCount,
 onImport,
}: {
 rows: ParsedRow[]
 columns: ImportColumnDef[]
 validCount: number
 invalidCount: number
 onImport: () => void
}) {
 const nameField = columns[0]?.field ?? ""
 const adnoField = columns[1]?.field ?? ""

 return (
 <div className="space-y-4">
 {/* Summary bar */}
 <div className="flex gap-3">
 <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
 <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
 <p className="text-xs text-emerald-600 mt-0.5">Valid</p>
 </div>
 <div className={cn("flex-1 rounded-xl p-3 text-center", invalidCount > 0 ? "bg-red-50" : "bg-gray-50")}>
 <p className={cn("text-2xl font-bold", invalidCount > 0 ? "text-red-600" : "text-gray-400")}>{invalidCount}</p>
 <p className={cn("text-xs mt-0.5", invalidCount > 0 ? "text-red-500" : "text-gray-400")}>Invalid</p>
 </div>
 <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
 <p className="text-2xl font-bold text-gray-700">{rows.length}</p>
 <p className="text-xs text-gray-500 mt-0.5">Total</p>
 </div>
 </div>

 {invalidCount > 0 && (
 <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
 <TriangleAlert className="w-4 h-4 shrink-0" />
 Invalid rows will be skipped. Fix the file and re-upload to include them.
 </div>
 )}

 {/* Preview table */}
 <div className="overflow-x-auto rounded-xl border border-gray-100">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100">
 <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">#</th>
 <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">
 {columns.find(c => c.field === nameField)?.header ?? "Name"}
 </th>
 <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">
 {columns.find(c => c.field === adnoField)?.header ?? "ID"}
 </th>
 <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Status</th>
 </tr>
 </thead>
 <tbody>
 {rows.map(row => (
 <tr key={row.index} className="border-b border-gray-50 last:border-0">
 <td className="px-3 py-2 text-gray-400">{row.index}</td>
 <td className="px-3 py-2 font-medium text-gray-800">{row.raw[nameField] || "—"}</td>
 <td className="px-3 py-2 text-gray-600">{row.raw[adnoField] || "—"}</td>
 <td className="px-3 py-2">
 {row.status === "valid" ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
 ) : (
 <div className="flex items-start gap-1.5">
 <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
 <span className="text-red-600 leading-tight">{row.errors.join(", ")}</span>
 </div>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <button
 disabled={validCount === 0}
 onClick={onImport}
 className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base shadow-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
 >
 Import {validCount} {validCount === 1 ? "row" : "rows"}
 </button>
 </div>
 )
}

function ImportingScreen({ progress }: { progress: { done: number; total: number } }) {
 const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
 return (
 <div className="py-8 space-y-6">
 <div className="flex flex-col items-center gap-3 text-gray-500">
 <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
 <p className="text-sm font-semibold">Importing… do not close</p>
 <p className="text-xs text-gray-400">{progress.done} / {progress.total}</p>
 </div>
 <div className="space-y-2">
 <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-emerald-500 rounded-full"
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ ease: "easeOut" }}
 />
 </div>
 <p className="text-right text-xs font-bold text-emerald-700">{pct}%</p>
 </div>
 </div>
 )
}

function ResultsScreen({
 rows,
 failedRows,
 columns,
 entityName,
 templateFilename,
 onDone,
}: {
 rows: ParsedRow[]
 failedRows: Array<{ index: number; name: string; error: string }>
 columns: ImportColumnDef[]
 entityName: string
 templateFilename: string
 onDone: () => void
}) {
 const imported = rows.filter(r => r.status === "imported").length
 const failed = rows.filter(r => r.status === "failed").length

 return (
 <div className="space-y-4">
 <div className="flex gap-3">
 <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
 <p className="text-2xl font-bold text-emerald-700">{imported}</p>
 <p className="text-xs text-emerald-600 mt-0.5">Imported</p>
 </div>
 {failed > 0 && (
 <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
 <p className="text-2xl font-bold text-red-600">{failed}</p>
 <p className="text-xs text-red-500 mt-0.5">Failed</p>
 </div>
 )}
 </div>

 {failedRows.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Failed rows</p>
 <div className="overflow-x-auto rounded-xl border border-red-100 max-h-48 overflow-y-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-red-50 border-b border-red-100">
 <th className="px-3 py-2 text-left text-red-600 font-semibold">Row</th>
 <th className="px-3 py-2 text-left text-red-600 font-semibold">Name</th>
 <th className="px-3 py-2 text-left text-red-600 font-semibold">Error</th>
 </tr>
 </thead>
 <tbody>
 {failedRows.map(r => (
 <tr key={r.index} className="border-b border-red-50 last:border-0">
 <td className="px-3 py-2 text-gray-500">{r.index}</td>
 <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
 <td className="px-3 py-2 text-red-600">{r.error}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <button
 onClick={() => downloadErrorReport(rows, columns, templateFilename)}
 className="flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline"
 >
 <Download className="w-4 h-4" /> Download error report
 </button>
 </div>
 )}

 {imported > 0 && failed === 0 && (
 <div className="flex flex-col items-center gap-2 py-4 text-center">
 <CheckCircle2 className="w-10 h-10 text-emerald-500" />
 <p className="font-semibold text-gray-800">All {entityName} imported successfully!</p>
 </div>
 )}

 <button
 onClick={onDone}
 className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-[0.98] transition-transform"
 >
 Done
 </button>
 </div>
 )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ImportModalProps<TPayload> {
 show: boolean
 config: ImportConfig<TPayload>
 onComplete: () => void
 onClose: () => void
}

export function ImportModal<TPayload>({ show, config, onComplete, onClose }: ImportModalProps<TPayload>) {
 const [screen, setScreen] = useState<Screen>("upload")
 const [rows, setRows] = useState<ParsedRow[]>([])
 const [parseError, setParseError] = useState<string | null>(null)
 const [parsing, setParsing] = useState(false)
 const [progress, setProgress] = useState({ done: 0, total: 0 })
 const [failedRows, setFailedRows] = useState<Array<{ index: number; name: string; error: string }>>([])
 const fileInputRef = useRef<HTMLInputElement>(null!)

 const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
 useEffect(() => {
 const checkMobile = () => setIsMobile(window.innerWidth < 768);
 window.addEventListener("resize", checkMobile);
 return () => window.removeEventListener("resize", checkMobile);
 }, []);

 // Reset internal state each time the modal opens
 useEffect(() => {
 if (show) {
 setScreen("upload")
 setRows([])
 setParseError(null)
 setParsing(false)
 setProgress({ done: 0, total: 0 })
 setFailedRows([])
 }
 }, [show])

 const handleFile = useCallback(async (file: File) => {
  setParsing(true)
  setParseError(null)
  try {
  const parsed = await parseFile(file, config.columns, config.context ?? {})
  setRows(parsed)
  setScreen("preview")
  } catch (e) {
  if (e instanceof ImportTemplateError) {
  setParseError(e.message)
  } else {
  setParseError(`Failed to parse: ${(e as Error).message}`)
  }
  } finally {
  setParsing(false)
  }
  }, [config])

  const handleImport = async () => {
  const valid = rows.filter(r => r.status === "valid")
  const nameField = config.columns[0]?.field ?? ""
  const updated = rows.map(r => ({ ...r }))
  const failed: typeof failedRows = []

  setProgress({ done: 0, total: valid.length })
  setScreen("importing")

  if (config.createBulk) {
  // Single network round-trip; backend reports per-row status.
  try {
  const result = await config.createBulk(valid.map(r => r.parsed as TPayload))
  const importedSet = new Set((result.imported ?? []).map(r => r.rowIndex))
  const failedMap = new Map(
   (result.failed ?? []).map(f => [f.rowIndex, f.message] as const),
  )
  for (const row of valid) {
   const idx = updated.findIndex(r => r.index === row.index)
   if (idx < 0) continue
   if (failedMap.has(row.index)) {
   const msg = failedMap.get(row.index) || "Failed"
   updated[idx].status = "failed"
   updated[idx].failMessage = msg
   failed.push({
   index: row.index,
   name: String(row.raw[nameField] ?? `Row ${row.index}`),
   error: msg,
   })
   } else {
   updated[idx].status = "imported"
   }
   void importedSet
  }
  setProgress({ done: valid.length, total: valid.length })
  } catch (e) {
  // Whole-batch failure: mark every valid row as failed.
  const msg = (e as Error).message || "Import failed"
  for (const row of valid) {
   const idx = updated.findIndex(r => r.index === row.index)
   if (idx >= 0) {
   updated[idx].status = "failed"
   updated[idx].failMessage = msg
   }
   failed.push({
   index: row.index,
   name: String(row.raw[nameField] ?? `Row ${row.index}`),
   error: msg,
   })
  }
  setProgress({ done: valid.length, total: valid.length })
  }
  } else {
  // Per-row fallback loop.
  for (let i = 0; i < valid.length; i++) {
   const row = valid[i]
   const idx = updated.findIndex(r => r.index === row.index)
   try {
   await config.createRow(row.parsed as TPayload)
   if (idx >= 0) updated[idx].status = "imported"
   } catch (e) {
   const msg = (e as Error).message || "Failed"
   if (idx >= 0) { updated[idx].status = "failed"; updated[idx].failMessage = msg }
   failed.push({ index: row.index, name: String(row.raw[nameField] ?? `Row ${row.index}`), error: msg })
   }
   setProgress({ done: i + 1, total: valid.length })
  }
  }

  setRows(updated)
  setFailedRows(failed)
  setScreen("results")
  }

 const validCount = rows.filter(r => r.status === "valid").length
 const invalidCount = rows.filter(r => r.status === "invalid").length

 const subtitle =
 screen === "upload" ? "Upload an Excel or CSV file" :
 screen === "preview" ? `${validCount} valid · ${invalidCount} invalid` :
 screen === "importing" ? `Importing ${progress.done} / ${progress.total}…` :
 "Import complete"

 return (
 <AnimatePresence>
 {show && (
 <>
 <motion.div
 key="import-backdrop"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={screen !== "importing" ? onClose : undefined}
 className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
 />
 <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none md:p-4">
 <motion.div
 key="import-drawer"
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
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
 <div className="w-10 h-1 bg-gray-300 rounded-full" />
 </div>

 <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
 <div className="flex items-center gap-3">
 {screen === "preview" && (
 <button
 onClick={() => setScreen("upload")}
 className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 )}
 <div>
 <h2 className="font-bold text-gray-900 text-lg">
 <FileSpreadsheet className="w-4 h-4 inline mr-1.5 text-emerald-600" />
 Import {config.entityName}
 </h2>
 <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
 </div>
 </div>
 {screen !== "importing" && (
 <button
 onClick={onClose}
 className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
 >
 ✕
 </button>
 )}
 </div>

 <div className="overflow-y-auto flex-1 px-5 py-4 pb-8">
 {screen === "upload" && (
 <UploadScreen
 config={config as ImportConfig<unknown>}
 parsing={parsing}
 parseError={parseError}
 onFile={handleFile}
 fileInputRef={fileInputRef}
 />
 )}
 {screen === "preview" && (
 <PreviewScreen
 rows={rows}
 columns={config.columns}
 validCount={validCount}
 invalidCount={invalidCount}
 onImport={handleImport}
 />
 )}
 {screen === "importing" && <ImportingScreen progress={progress} />}
 {screen === "results" && (
 <ResultsScreen
 rows={rows}
 failedRows={failedRows}
 columns={config.columns}
 entityName={config.entityName}
 templateFilename={config.templateFilename}
 onDone={() => { onComplete(); onClose() }}
 />
 )}
 </div>
 </motion.div>
 </div>
 </>
 )}
 </AnimatePresence>
 )
}
