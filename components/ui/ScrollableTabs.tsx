import { ScrollableStrip } from "@/components/ui/ScrollableStrip";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ScrollableTabOption {
  value: string;
  label: string;
}

interface ScrollableTabsProps {
  options: ScrollableTabOption[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function ScrollableTabs({
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
  disabled = false,
}: ScrollableTabsProps) {
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
  }, [value]);

  return (
    <ScrollableStrip
      stripRef={stripRef}
      disabled={disabled}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={selected ? selectedRef : undefined}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              let nextIndex: number;
              if (event.key === "ArrowRight") nextIndex = (index + 1) % options.length;
              else if (event.key === "ArrowLeft") nextIndex = (index - 1 + options.length) % options.length;
              else if (event.key === "Home") nextIndex = 0;
              else if (event.key === "End") nextIndex = options.length - 1;
              else return;
              event.preventDefault();
              onValueChange(options[nextIndex].value);
              stripRef.current?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
            }}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50",
              selected
                ? "border-gray-950 bg-gray-950 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </ScrollableStrip>
  );
}
