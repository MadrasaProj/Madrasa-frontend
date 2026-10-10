import * as React from "react";
import { X } from "lucide-react";
import {
  Drawer as BaseDrawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Side = "right" | "bottom" | "responsive";

export interface ResponsivePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: Side;
  drawerOnDesktop?: boolean;
  title?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

/** A controlled drawer: wide from the right on desktop, responsive on mobile. */
export function ResponsivePopover({
  open,
  onOpenChange,
  side = "responsive",
  drawerOnDesktop = false,
  title,
  headerAction,
  footer,
  description,
  children,
  className,
  contentClassName,
  showCloseButton = true,
}: ResponsivePopoverProps) {
  const isDesktop = useIsDesktop();
  const wideDesktopDrawer = isDesktop && !drawerOnDesktop;
  const swipeDirection = wideDesktopDrawer ? "right" : side === "bottom" || (side === "responsive" && !isDesktop) ? "down" : "right";
  const isBottom = swipeDirection === "down";

  return (
    <BaseDrawer open={open} onOpenChange={onOpenChange} swipeDirection={swipeDirection} showSwipeHandle={false}>
      <DrawerContent
        className={cn(
          "bg-white text-gray-900 shadow-2xl",
          isBottom ? "max-h-[92dvh]" : wideDesktopDrawer ? "h-full max-h-dvh max-w-none" : "h-full max-h-dvh w-full sm:max-w-md",
          className,
        )}
        style={wideDesktopDrawer ? { "--drawer-content-width": "90vw" } as React.CSSProperties : undefined}
      >
        {(title || description || headerAction || showCloseButton) && (
          <DrawerHeader className={cn("relative shrink-0 px-5", isBottom ? "pb-3.5 pt-5" : "pb-4 pt-4")}>
            {(title || description || headerAction) && (
              <div className={cn("min-w-0 space-y-0.5 text-left", showCloseButton && "pr-9")}>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {title && <DrawerTitle className="min-w-0 break-words text-base font-extrabold tracking-tight">{title}</DrawerTitle>}
                  {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>
                {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
              </div>
            )}
            {showCloseButton && <DrawerClose aria-label="Close" className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"><X className="h-4 w-4" /></DrawerClose>}
          </DrawerHeader>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}>{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </DrawerContent>
    </BaseDrawer>
  );
}
