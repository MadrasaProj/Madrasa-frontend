import { ScrollableStrip } from "@/components/ui/ScrollableStrip";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SubjectTab {
  id: string;
  name: string;
}

interface ScrollableSubjectNavigatorProps {
  subjects: SubjectTab[];
  value: string;
  onChange: (subjectId: string) => void;
  disabled?: boolean;
}

export function ScrollableSubjectNavigator({
  subjects,
  value,
  onChange,
  disabled = false,
}: ScrollableSubjectNavigatorProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const selected = selectedRef.current;
    if (!strip || !selected) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [value, subjects]);

  if (subjects.length === 0) return null;

  return (
    <ScrollableStrip
      stripRef={stripRef}
      disabled={disabled}
      role="tablist"
      aria-label="Select subject"
      className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {subjects.map((subject, index) => {
        const selected = subject.id === value;
        return (
          <button
            key={subject.id}
            ref={selected ? selectedRef : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(subject.id)}
            onKeyDown={(event) => {
              let nextIndex: number;
              if (event.key === "ArrowRight") nextIndex = (index + 1) % subjects.length;
              else if (event.key === "ArrowLeft") nextIndex = (index - 1 + subjects.length) % subjects.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = subjects.length - 1;
              else return;
              event.preventDefault();
              onChange(subjects[nextIndex].id);
              stripRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
            }}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50",
              selected
                ? "border-gray-950 bg-gray-950 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {subject.name}
          </button>
        );
      })}
    </ScrollableStrip>
  );
}
