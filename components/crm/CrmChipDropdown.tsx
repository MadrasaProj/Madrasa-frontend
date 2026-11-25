import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
    maxMenuHeight: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const estimatedWidth = menuRef.current?.offsetWidth || 215;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const neededHeight = Math.min(options.length * 36 + 16, 288);
    const openUpward = spaceBelow < neededHeight && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxMenuHeight = Math.max(100, Math.min(neededHeight, availableSpace));

    const top = openUpward ? Math.max(8, rect.top - 6) : rect.bottom + 6;

    let left = align === "right" ? rect.right - estimatedWidth : rect.left;
    if (left + estimatedWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - estimatedWidth - 12);
    }
    if (left < 12) left = 12;

    setPosition({ top, left, openUpward, maxMenuHeight });
  }, [align, options.length]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "h-7 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-2xs select-none active:scale-95 shrink-0",
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

      {isOpen &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.openUpward ? undefined : `${position.top}px`,
              bottom: position.openUpward
                ? `${window.innerHeight - position.top}px`
                : undefined,
              left: `${position.left}px`,
              maxHeight: `${position.maxMenuHeight}px`,
              maxWidth: "calc(100vw - 24px)",
              zIndex: 99999,
            }}
            className={cn(
              "overflow-y-auto overscroll-contain [scrollbar-width:thin] bg-white rounded-xl shadow-2xl border border-gray-200/90 p-1 space-y-0.5 animate-in fade-in-0 zoom-in-95 select-none",
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
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {opt.badge !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                          isSelected
                            ? "bg-primary-200/80 text-primary-950"
                            : "bg-gray-150 text-gray-600"
                        )}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
