import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CrmDropdownItem {
  value: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface CrmChipDropdownProps {
  label: string;
  value: string;
  options: CrmDropdownItem[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  isActive?: boolean;
  activeClassName?: string;
  className?: string;
  align?: "left" | "right";
  maxHeight?: string;
  minWidth?: string;
}

export const CrmChipDropdown: React.FC<CrmChipDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  isActive = false,
  activeClassName = "bg-primary-50 text-primary-900 border-primary-300 font-semibold",
  className,
  align = "left",
  maxHeight = "max-h-72",
  minWidth = "min-w-[190px]",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "h-7 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-2xs select-none active:scale-95",
          isActive
            ? activeClassName
            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
          className
        )}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate max-w-[125px] sm:max-w-[140px]">{label}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 opacity-60 shrink-0 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1.5 z-50 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200/90 p-1 space-y-0.5 animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            maxHeight,
            minWidth
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary-50 text-primary-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
