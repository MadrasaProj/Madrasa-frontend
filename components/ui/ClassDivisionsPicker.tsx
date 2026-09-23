import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const PREDEFINED_DIVISIONS = ["A", "B", "C", "D", "E", "F"];

export interface GradeLevelEntry {
  id: string;
  name: string;
  level: number;
}

interface ClassDivisionsPickerProps {
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
  gradeLevels: GradeLevelEntry[];
  emptyLabel?: string;
}

export function ClassDivisionsPicker({ value, onChange, gradeLevels, emptyLabel }: ClassDivisionsPickerProps) {
  const [customInput, setCustomInput] = useState<Record<string, string>>({});

  if (gradeLevels.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-6">
        {emptyLabel ?? "Select an education system to see available classes"}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      {gradeLevels.map((gl) => {
        const divs = value[gl.id] ?? [];
        const customDivs = divs.filter(
          (d) => !PREDEFINED_DIVISIONS.includes(d),
        );

        const toggleDiv = (d: string) => {
          onChange((prev) => {
            const current = prev[gl.id] ?? [];
            const next = current.includes(d)
              ? current.filter((x) => x !== d)
              : [...current, d].sort();
            return { ...prev, [gl.id]: next };
          });
        };

        const addCustomDiv = (name: string) => {
          onChange((prev) => {
            const current = prev[gl.id] ?? [];
            if (current.includes(name)) return prev;
            return { ...prev, [gl.id]: [...current, name].sort() };
          });
        };

        return (
          <div
            key={gl.id}
            className="flex items-start gap-3 py-2 border-b border-gray-100"
          >
            <div className="w-24 shrink-0 pt-1">
              <span className="text-xs font-bold text-gray-700">
                {gl.name}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 items-center">
                {PREDEFINED_DIVISIONS.map((d) => {
                  const active = divs.includes(d);
                  return (
                    <Button
                      size="icon"
                      key={d}
                      type="button"
                      onClick={() => toggleDiv(d)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-bold border transition-all",
                        active
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100",
                      )}
                    >
                      {d}
                    </Button>
                  );
                })}
                {customDivs.map((d) => (
                  <Button
                    size="icon"
                    key={d}
                    type="button"
                    onClick={() => toggleDiv(d)}
                    className="w-8 h-8 rounded-lg text-xs font-bold border bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  >
                    {d}
                  </Button>
                ))}
                {divs.length === 0 && (
                  <Button
                    variant="ghost" size="sm"
                    type="button"
                    onClick={() =>
                      onChange((prev) => {
                        const current = prev[gl.id] ?? [];
                        if (current.includes("A")) return prev;
                        return { ...prev, [gl.id]: [...current, "A"].sort() };
                      })
                    }
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    + Add
                  </Button>
                )}
                <Input
                  value={customInput[gl.id] ?? ""}
                  onChange={(e) =>
                    setCustomInput((prev) => ({
                      ...prev,
                      [gl.id]: e.target.value.toUpperCase(),
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = customInput[gl.id]?.trim().toUpperCase();
                      if (!val) return;
                      addCustomDiv(val);
                      setCustomInput((prev) => ({ ...prev, [gl.id]: "" }));
                    }
                  }}
                  className="h-8 w-12 px-1.5 py-1 text-xs rounded-lg"
                  placeholder="+"
                  maxLength={10}
                />
                <Button
                  variant="ghost" size="sm"
                  type="button"
                  onClick={() => {
                    const val = customInput[gl.id]?.trim().toUpperCase();
                    if (!val) return;
                    addCustomDiv(val);
                    setCustomInput((prev) => ({ ...prev, [gl.id]: "" }));
                  }}
                  disabled={!customInput[gl.id]?.trim()}
                  className="h-8 px-2 text-xs text-emerald-600"
                >
                  Add
                </Button>
                {divs.length > 0 && (
                  <Button
                    variant="ghost" size="sm"
                    type="button"
                    onClick={() =>
                      onChange((prev) => {
                        const next = { ...prev };
                        delete next[gl.id];
                        return next;
                      })
                    }
                    className="px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-50 rounded-lg transition-all"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
