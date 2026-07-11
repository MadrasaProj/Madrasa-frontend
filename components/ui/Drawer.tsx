import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Side = "right" | "bottom" | "responsive";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: Side;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
}

export function Drawer({
  open,
  onOpenChange,
  side = "responsive",
  title,
  description,
  children,
  className,
  contentClassName,
  showCloseButton = true,
}: DrawerProps) {
  const isResponsive = side === "responsive";
  const isBottom = side === "bottom" || isResponsive;

  const animationClass = isResponsive
    ? "drawer-responsive"
    : side === "bottom"
    ? "drawer-spring-bottom"
    : "drawer-spring-right";

  // Position + sizing styles
  // Responsive: right on sm+ (full height), bottom on mobile (90dvh)
  // Right only: full height, capped at 90dvh
  // Bottom only: capped at 92dvh
  const positionClass = isResponsive
    ? cn(
        // Mobile: bottom sheet
        "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl",
        // Desktop: right side
        "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:bottom-auto",
        "sm:h-full sm:max-h-[100dvh] sm:my-0 sm:w-full sm:sm:w-[420px] sm:max-w-md",
        "sm:rounded-t-none sm:rounded-l-2xl"
      )
    : side === "bottom"
    ? cn("inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl")
    : cn(
        "inset-y-0 right-0 h-full max-h-[90dvh] my-auto w-full sm:w-[420px] sm:max-w-md",
        "rounded-l-2xl"
      );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:duration-300 data-[state=closed]:duration-200",
            "data-[state=open]:ease-out data-[state=closed]:ease-in"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-white shadow-2xl outline-none",
            "flex flex-col",
            animationClass,
            positionClass,
            className
          )}
        >
          {/* Drag handle — bottom mode only */}
          <div
            className={cn(
              "absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300 z-10 transition-opacity",
              isResponsive
                ? "opacity-100 sm:opacity-0 sm:hidden"
                : side === "bottom"
                ? "opacity-100"
                : "opacity-0 hidden"
            )}
          />
          {title || showCloseButton ? (
            <div
              className={cn(
                "flex items-start justify-between gap-3 border-b border-gray-100 shrink-0",
                isBottom ? "px-5 pt-5 pb-3.5" : "px-5 pt-4 pb-4"
              )}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                {title && (
                  <DialogPrimitive.Title className="text-base font-extrabold text-gray-900 tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-xs text-gray-500">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {showCloseButton && (
                <DialogPrimitive.Close
                  className="shrink-0 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              )}
            </div>
          ) : null}
          <div className={cn("flex-1 overflow-y-auto overscroll-contain", contentClassName)}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
