import * as React from "react";
import { X } from "lucide-react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
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
  title?: React.ReactNode;
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

/** A controlled popover on desktop and the app drawer on mobile. */
export function ResponsivePopover({
  open,
  onOpenChange,
  side = "responsive",
  title,
  description,
  children,
  className,
  contentClassName,
  showCloseButton = true,
}: ResponsivePopoverProps) {
  const isDesktop = useIsDesktop();
  const swipeDirection = side === "bottom" || (side === "responsive" && !isDesktop) ? "down" : "right";
  const isBottom = swipeDirection === "down";

  if (isDesktop) {
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            anchor={null}
            className="fixed inset-0 z-50 flex items-center justify-center outline-none"
          >
            <PopoverPrimitive.Popup
              className={cn(
                "w-[min(100vw-2rem,28rem)] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl outline-none",
                className,
              )}
            >
              {(title || description || showCloseButton) && (
                <div className="relative border-b border-gray-100 px-5 py-4">
                  {(title || description) && (
                    <div className="min-w-0 space-y-0.5 pr-8">
                      {title && <PopoverPrimitive.Title className="text-base font-extrabold tracking-tight">{title}</PopoverPrimitive.Title>}
                      {description && <PopoverPrimitive.Description className="text-xs text-gray-500">{description}</PopoverPrimitive.Description>}
                    </div>
                  )}
                  {showCloseButton && (
                    <PopoverPrimitive.Close aria-label="Close" className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
                      <X className="h-4 w-4" />
                    </PopoverPrimitive.Close>
                  )}
                </div>
              )}
              <div className={cn("max-h-[min(80vh,40rem)] overflow-y-auto", contentClassName)}>{children}</div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }

  return (
    <BaseDrawer open={open} onOpenChange={onOpenChange} swipeDirection={swipeDirection} showSwipeHandle={false}>
      <DrawerContent className={cn("bg-white text-gray-900 shadow-2xl", isBottom ? "max-h-[92dvh]" : "h-full max-h-dvh w-full sm:max-w-md", className)}>
        {(title || description || showCloseButton) && (
          <DrawerHeader className={cn("relative shrink-0 px-5", isBottom ? "pb-3.5 pt-5" : "pb-4 pt-4")}>
            {(title || description) && (
              <div className="min-w-0 space-y-0.5 pr-9 text-left">
                {title && <DrawerTitle className="text-base font-extrabold tracking-tight">{title}</DrawerTitle>}
                {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
              </div>
            )}
            {showCloseButton && <DrawerClose aria-label="Close" className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"><X className="h-4 w-4" /></DrawerClose>}
          </DrawerHeader>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}>{children}</div>
      </DrawerContent>
    </BaseDrawer>
  );
}
