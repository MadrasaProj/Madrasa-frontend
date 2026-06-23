import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IbadahCounterProps {
  label: string;
  icon?: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

export function IbadahCounter({ label, icon, value, onChange, min = 0, max = 1000, suffix }: IbadahCounterProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commit();
    }
    if (e.key === "Escape") {
      setDraft(String(value));
      setEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-emerald-500">{icon}</span>}
          <p className="text-sm font-semibold text-gray-700">{label}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            {editing ? (
              <input
                ref={inputRef}
                type="number"
                min={min}
                max={max}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className="w-14 text-right text-lg font-bold text-emerald-700 bg-transparent outline-none border-b-2 border-emerald-300"
              />
            ) : (
              <button onClick={() => setEditing(true)} className="focus:outline-none">
                <span className="text-lg font-bold text-emerald-700">{value}</span>
              </button>
            )}
            {suffix && <span className="text-xs text-gray-400 font-medium">{suffix}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChange(Math.max(min, value - 1))}
              disabled={value <= min}
              className={cn(
                "w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-90",
                value > min
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "bg-gray-50 text-gray-300 cursor-not-allowed",
              )}
            >−</button>
            <button
              onClick={() => onChange(Math.min(max, value + 1))}
              disabled={value >= max}
              className={cn(
                "w-9 h-9 rounded-xl text-lg font-bold flex items-center justify-center transition-all active:scale-90",
                value < max
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed",
              )}
            >+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
