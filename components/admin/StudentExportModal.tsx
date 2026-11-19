import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Loader2,
  Filter,
  Users,
  CheckSquare,
  ArrowUpDown,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadStudentsXlsx,
  downloadStudentsCsv,
  type ExportStudentsParams,
} from "@/lib/students-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StudentExportModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  token: string;
  totalCount: number;
  filteredCount?: number;
  selectedIds: string[];
  activeClassId?: string;
  activeClassName?: string;
  gender?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  initialScope?: "all" | "filtered" | "selected";
}

export function StudentExportModal({
  open,
  onClose,
  clientId,
  token,
  totalCount,
  filteredCount,
  selectedIds,
  activeClassId,
  activeClassName,
  gender,
  status,
  search,
  sortBy,
  sortOrder = "asc",
  initialScope = "all",
}: StudentExportModalProps) {
  const hasActiveFilters = Boolean(
    (activeClassId && activeClassId !== "all") ||
      (gender && gender !== "all") ||
      (status && status !== "all") ||
      (search && search.trim().length > 0),
  );

  const defaultScope =
    selectedIds.length > 0
      ? "selected"
      : hasActiveFilters
        ? "filtered"
        : "all";

  const [scope, setScope] = useState<"all" | "filtered" | "selected">(
    initialScope === "selected" && selectedIds.length > 0
      ? "selected"
      : defaultScope,
  );
  const [selectedSort, setSelectedSort] = useState<string>(
    sortBy ? "table" : "default",
  );
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      if (initialScope === "selected" && selectedIds.length > 0) {
        setScope("selected");
      } else if (hasActiveFilters) {
        setScope("filtered");
      } else {
        setScope("all");
      }
      setSelectedSort(sortBy ? "table" : "default");
      setIsExporting(false);
      setProgressStatus("");
    }
  }, [open, selectedIds.length, hasActiveFilters, initialScope, sortBy]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, isExporting]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setProgressStatus("");
  };

  const handleClose = () => {
    if (isExporting) {
      handleCancel();
    }
    onClose();
  };

  const handleExport = async () => {
    if (!clientId || !token) {
      toast.error("Authentication required to export data");
      return;
    }

    setIsExporting(true);
    setProgressStatus("Preparing export...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const params: ExportStudentsParams = {
      signal: abortController.signal,
    };

    if (selectedSort === "default") {
      params.sortBy = "default";
      params.sortOrder = "asc";
    } else if (selectedSort === "table" && sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    } else {
      params.sortBy = selectedSort;
      params.sortOrder = "asc";
    }

    if (scope === "selected") {
      params.ids = selectedIds;
    } else if (scope === "filtered") {
      if (activeClassId && activeClassId !== "all") params.classId = activeClassId;
      if (gender && gender !== "all" && (gender === "MALE" || gender === "FEMALE")) {
        params.gender = gender;
      }
      if (status && status !== "all") params.status = status;
      if (search && search.trim()) params.search = search.trim();
    }

    try {
      if (format === "xlsx") {
        const { count, filename } = await downloadStudentsXlsx(
          clientId,
          token,
          params,
          (status) => setProgressStatus(status),
        );
        toast.success(`Exported ${count} student${count === 1 ? "" : "s"} to ${filename}`);
      } else {
        setProgressStatus("Streaming CSV download...");
        const { filename } = await downloadStudentsCsv(clientId, token, params);
        toast.success(`Downloaded ${filename}`);
      }
      onClose();
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Export cancelled");
      } else {
        console.error("Export error:", err);
        toast.error(err.message || "Failed to export students. Please try again.");
      }
    } finally {
      setIsExporting(false);
      setProgressStatus("");
      abortControllerRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-dialog-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h2 id="export-dialog-title" className="text-base font-bold text-gray-900">
                  Export Students
                </h2>
                <p className="text-xs text-gray-500">
                  Matches existing import template format (all 20 fields)
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Export Scope
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Option: All Students */}
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  disabled={isExporting}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all",
                    scope === "all"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Users className={cn("h-4 w-4", scope === "all" ? "text-primary-600" : "text-gray-400")} />
                    <span className="text-[11px] font-bold tabular-nums text-gray-700 bg-white/80 px-1.5 py-0.5 rounded-md border border-gray-100">
                      {totalCount}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">All Students</span>
                  <span className="text-[11px] text-gray-500 mt-0.5">Entire roster</span>
                </button>

                {/* Option: Filtered */}
                <button
                  type="button"
                  onClick={() => setScope("filtered")}
                  disabled={isExporting || !hasActiveFilters}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all",
                    !hasActiveFilters
                      ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                      : scope === "filtered"
                        ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Filter className={cn("h-4 w-4", scope === "filtered" ? "text-primary-600" : "text-gray-400")} />
                    <span className="text-[11px] font-bold tabular-nums text-gray-700 bg-white/80 px-1.5 py-0.5 rounded-md border border-gray-100">
                      {filteredCount ?? totalCount}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">Filtered</span>
                  <span className="text-[11px] text-gray-500 mt-0.5 truncate max-w-full">
                    {hasActiveFilters ? activeClassName || "Current filters" : "No filters"}
                  </span>
                </button>

                {/* Option: Selected */}
                <button
                  type="button"
                  onClick={() => setScope("selected")}
                  disabled={isExporting || selectedIds.length === 0}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all",
                    selectedIds.length === 0
                      ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                      : scope === "selected"
                        ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <CheckSquare className={cn("h-4 w-4", scope === "selected" ? "text-primary-600" : "text-gray-400")} />
                    <span className="text-[11px] font-bold tabular-nums text-gray-700 bg-white/80 px-1.5 py-0.5 rounded-md border border-gray-100">
                      {selectedIds.length}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">Selected</span>
                  <span className="text-[11px] text-gray-500 mt-0.5">Checked rows</span>
                </button>
              </div>
            </div>

            {/* Sort Order Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Sort Order
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelectedSort("default")}
                  disabled={isExporting}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                    selectedSort === "default"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 mb-0.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary-600" />
                    <span>Class & Adm No</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Standard academic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSort("name")}
                  disabled={isExporting}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                    selectedSort === "name"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 mb-0.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-primary-600" />
                    <span>Name (A–Z)</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Alphabetical</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSort("adno")}
                  disabled={isExporting}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-2xl border text-left transition-all",
                    selectedSort === "adno"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 mb-0.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-primary-600" />
                    <span>Admission No</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Numerical order</span>
                </button>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                File Format
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Excel Option */}
                <button
                  type="button"
                  onClick={() => setFormat("xlsx")}
                  disabled={isExporting}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all",
                    format === "xlsx"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mt-0.5">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">Excel (.xlsx)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-md">
                        Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      Data sheet, formatted columns, 100% template compatible for re-import
                    </p>
                  </div>
                </button>

                {/* CSV Option */}
                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  disabled={isExporting}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all",
                    format === "csv"
                      ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 mt-0.5">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">CSV (.csv)</span>
                      <span className="text-[10px] bg-sky-100 text-sky-700 font-semibold px-1.5 py-0.5 rounded-md">
                        Fast Stream
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      High-performance UTF-8 BOM stream for very large rosters
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Template Integrity Banner */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-900">100% Round-trip Re-importable:</span> All 20 columns
                (Name, Admission No, Class, Gender, DOB, Phone, Guardian, Address, Blood Group, etc.) are exported with identical header names and ordering.
              </div>
            </div>

            {/* Export In-Progress Feedback */}
            {isExporting && (
              <div className="rounded-2xl bg-primary-50/80 border border-primary-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary-900">Exporting in progress</p>
                    <p className="text-[11px] text-primary-700 mt-0.5">{progressStatus || "Processing..."}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="bg-white text-xs shadow-none border-primary-200 hover:bg-primary-100"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isExporting}
              className="bg-white shadow-none"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2 shadow-none min-w-[130px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>
                    Export {scope === "selected" ? `${selectedIds.length} ` : ""}
                    {format.toUpperCase()}
                  </span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
