import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useExamConfig, useUpdateExamConfig } from "@/lib/api-hooks";
import { type ExamConfig, type GradeConfig } from "@/lib/exams-api";
import {
  Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Settings2, SlidersHorizontal,
} from "lucide-react";

const DEFAULT_GRADES = [
  { label: "A+", defaultMin: 90 },
  { label: "A",  defaultMin: 80 },
  { label: "B+", defaultMin: 70 },
  { label: "B",  defaultMin: 60 },
  { label: "C+", defaultMin: 50 },
  { label: "C",  defaultMin: 40 },
  { label: "D+", defaultMin: 36 },
  { label: "D",  defaultMin: 1  },
];

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "A":  "text-teal-700 bg-teal-50 border-teal-200",
  "B+": "text-cyan-700 bg-cyan-50 border-cyan-200",
  "B":  "text-purple-700 bg-purple-50 border-purple-200",
  "C+": "text-amber-700 bg-amber-50 border-amber-200",
  "C":  "text-yellow-700 bg-yellow-50 border-yellow-200",
  "D+": "text-orange-700 bg-orange-50 border-orange-200",
  "D":  "text-red-700 bg-red-50 border-red-200",
};

function gradeConfigToRows(gc: GradeConfig): { label: string; min: number }[] {
  return DEFAULT_GRADES.map((g) => ({
    label: g.label,
    min:   gc[g.label]?.min ?? g.defaultMin,
  }));
}

export function rowsToGradeConfig(rows: { label: string; min: number }[]): GradeConfig {
  const config: GradeConfig = {};
  for (const r of rows) config[r.label] = { min: r.min };
  return config;
}

interface ExamConfigFormProps {
  clientId?: string;
  token?: string;
  embedded?: boolean;
  subjectId?: string;
  onSaved?: () => void;
  onSaveRequested?: (saveFn: () => Promise<void>) => void;
  onConfigChange?: (config: { maxMarks: number | null; gradeConfig: GradeConfig }) => void;
  initialMaxMarks?: number | null;
  initialGradeConfig?: GradeConfig | null;
}

export function ExamConfigForm({
  embedded = false,
  subjectId,
  onSaved,
  onSaveRequested,
  onConfigChange,
  initialMaxMarks,
  initialGradeConfig,
}: ExamConfigFormProps) {
  const { data: config, isLoading: loading, error } = useExamConfig();
  const updateMutation = useUpdateExamConfig();
  const [msg, setMsg] = useState<string | null>(null);

  const [passedLabel,   setPassedLabel]   = useState("Passed");
  const [failedLabel,   setFailedLabel]   = useState("Failed");
  const [promotedLabel, setPromotedLabel] = useState("Promoted");
  const [withheldLabel, setWithheldLabel] = useState("With Held");
  const [hideMarks,     setHideMarks]     = useState(false);
  const [defaultMax,    setDefaultMax]    = useState(50);
  const [gradeRows,     setGradeRows]     = useState<{ label: string; min: number }[]>(
    DEFAULT_GRADES.map((g) => ({ label: g.label, min: g.defaultMin })),
  );
  const [initDone, setInitDone] = useState(false);

  const [subjectOverrideMax, setSubjectOverrideMax] = useState<number | "">(
    initialMaxMarks != null ? initialMaxMarks : "",
  );

  const isSubjectMode = !!subjectId;

  // Sync fetched config into local editing state once
  if (config && !initDone) {
    setPassedLabel(config.passedLabel);
    setFailedLabel(config.failedLabel);
    setPromotedLabel(config.promotedLabel);
    setWithheldLabel(config.withheldLabel);
    setHideMarks(config.hideMarks);
    setDefaultMax(config.defaultMaxMarks);
    if (initialGradeConfig) {
      setGradeRows(gradeConfigToRows(initialGradeConfig));
    } else {
      setGradeRows(gradeConfigToRows(config.gradeConfig));
    }
    setInitDone(true);
  }

  useEffect(() => {
    if (!onSaveRequested) return;
    onSaveRequested(handleSave);
  }, [onSaveRequested]);

  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange({
      maxMarks: subjectOverrideMax === "" ? null : Number(subjectOverrideMax),
      gradeConfig: rowsToGradeConfig(gradeRows),
    });
  }, [subjectOverrideMax, gradeRows, onConfigChange]);

  const handleSave = async () => {
    if (isSubjectMode) return;
    setMsg(null);
    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate({
        passedLabel, failedLabel, promotedLabel, withheldLabel,
        hideMarks,
        defaultMaxMarks: defaultMax,
        gradeConfig: rowsToGradeConfig(gradeRows),
      }, {
        onSuccess: () => {
          setMsg("Configuration saved successfully");
          onSaved?.();
          resolve();
        },
        onError: (e: any) => {
          setMsg(`Error: ${e.message}`);
          reject(e);
        },
      });
    });
  };

  const updateGradeMin = (label: string, value: number) => {
    setGradeRows((rows) => rows.map((r) => r.label === label ? { ...r, min: value } : r));
  };

  const gradeValid = gradeRows.every((r, i) =>
    r.min > 0 && (i === 0 || r.min < gradeRows[i - 1].min),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error.message}</div>
    );
  }

  return (
    <div className={cn("space-y-6", !embedded && "max-w-2xl mx-auto px-4 py-6")}>
      {msg && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl text-sm",
          msg.startsWith("Error")
            ? "bg-red-50 text-red-700 border border-red-100"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100",
        )}>
          {msg.startsWith("Error") ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {msg}
        </div>
      )}

      {isSubjectMode && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Subject Override</h2>
            <span className="text-xs text-gray-400 ml-1">Saved for all exams</span>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Override Max Marks
            </label>
            <p className="text-xs text-gray-400 mb-2">Leave empty to use the global default ({defaultMax})</p>
            <input
              type="number"
              min={1}
              max={9999}
              value={subjectOverrideMax}
              onChange={(e) => setSubjectOverrideMax(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={String(defaultMax)}
              className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {!isSubjectMode && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Status Labels</h2>
            <span className="text-xs text-gray-400 ml-1">Shown on result cards and mark lists</span>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            {[
              { id: "passed",   label: "Passed Label",   value: passedLabel,   set: setPassedLabel,   color: "text-emerald-600" },
              { id: "failed",   label: "Failed Label",   value: failedLabel,   set: setFailedLabel,   color: "text-red-600"     },
              { id: "promoted", label: "Promoted Label", value: promotedLabel, set: setPromotedLabel, color: "text-emerald-600"    },
              { id: "withheld", label: "With Held Label",value: withheldLabel, set: setWithheldLabel, color: "text-amber-600"   },
            ].map(({ id, label, value, set, color }) => (
              <div key={id}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                    color,
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSubjectMode && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Display Settings</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Default Maximum Marks
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={defaultMax}
                  onChange={(e) => setDefaultMax(Number(e.target.value))}
                  className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-xs text-gray-400">Applied when no per-subject override is set</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Hide Marks on Result Cards</p>
                <p className="text-xs text-gray-400 mt-0.5">Only grades and percentages shown; raw scores hidden</p>
              </div>
              <button
                onClick={() => setHideMarks(!hideMarks)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                  hideMarks
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300",
                )}
              >
                {hideMarks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {hideMarks ? "Marks Hidden" : "Marks Visible"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📊</span>
            <h2 className="font-semibold text-gray-800">Grade Configuration</h2>
          </div>
          <span className="text-xs text-gray-400">Min % to achieve each grade</span>
        </div>

        <div className="px-5 py-4 space-y-2">
          {!gradeValid && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Grade thresholds must be strictly decreasing and greater than 0.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Range</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {gradeRows.map((row, i) => {
                    const maxPct  = i === 0 ? 100 : gradeRows[i - 1].min - 1;
                    const isPass  = row.label !== "D";
                    const invalid = row.min <= 0 || (i > 0 && row.min >= gradeRows[i - 1].min);
                  return (
                    <tr key={row.label} className={cn("hover:bg-gray-50", invalid && "bg-red-50/30")}>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded-lg text-xs font-bold border",
                          GRADE_COLORS[row.label] ?? "text-gray-600 bg-gray-50 border-gray-200",
                        )}>
                          {row.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={row.min}
                            onChange={(e) => updateGradeMin(row.label, Number(e.target.value))}
                            className={cn(
                              "w-20 px-2.5 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                              invalid ? "border-red-300 bg-red-50" : "border-gray-200",
                            )}
                          />
                          <span className="text-gray-400 text-xs">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.min}% – {maxPct}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-500">Fail</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 pt-1">
            D grade = fail. Students who fail any subject are excluded from class ranking.
            D+ is the pass threshold for subjects with default config (min {gradeRows.find(r => r.label === "D+")?.min ?? 36}%).
          </p>
        </div>
      </div>

    </div>
  );
}
