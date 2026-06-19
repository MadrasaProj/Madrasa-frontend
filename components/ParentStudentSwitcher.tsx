import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";

export function ParentStudentSwitcher() {
  const { user, activeStudentId, setActiveStudent } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (!user || user.actorType !== "PARENT") return null;

  const students = user.accessibleStudents ?? [];
  const ids = user.accessibleStudentIds ?? [];
  if (ids.length === 0) return null;

  const effectiveId = activeStudentId ?? ids[0];
  const activeStudent = students.find((s) => s.id === effectiveId);
  const activeName = activeStudent?.name ?? `Student ${ids.indexOf(effectiveId) + 1}`;

  if (ids.length === 1) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold max-w-[140px]">
        <span className="truncate">{activeName}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold max-w-[140px]"
      >
        <span className="truncate">{activeName}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
          {ids.map((id) => {
            const info = students.find((s) => s.id === id);
            const name = info?.name ?? `Student`;
            const sub = info?.className ?? info?.adno ?? "";
            return (
              <button
                key={id}
                onClick={() => { setActiveStudent(id); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 transition-colors ${
                  effectiveId === id
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-semibold leading-tight">{name}</p>
                {sub && <p className="text-xs text-gray-400 leading-tight mt-0.5">{sub}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
