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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

/** Compatibility view for the app's existing controlled drawer API. */
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
  const isDesktop = useIsDesktop();
  const swipeDirection =
    side === "bottom" || (side === "responsive" && !isDesktop)
      ? "down"
      : "right";
  const isBottom = swipeDirection === "down";

  return (
    <BaseDrawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={swipeDirection}
      showSwipeHandle={isBottom}
    >
      <DrawerContent
        className={cn(
          "bg-white text-gray-900 shadow-2xl",
          isBottom ? "max-h-[92dvh]" : "h-full max-h-dvh w-full sm:max-w-md",
          className
        )}
      >
        {(title || description || showCloseButton) && (
          <DrawerHeader
            className={cn(
              "relative shrink-0 px-5",
              isBottom ? "pb-3.5 pt-5" : "pb-4 pt-4",
              "group-data-[swipe-axis=y]/drawer-popup:text-left"
            )}
          >
            {(title || description) && (
              <div className="min-w-0 space-y-0.5 pr-9">
                {title && (
                  <DrawerTitle className="text-base font-extrabold tracking-tight">
                    {title}
                  </DrawerTitle>
                )}
                {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
              </div>
            )}
            {showCloseButton && (
              <DrawerClose
                aria-label="Close"
                className="absolute right-2 top-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </DrawerClose>
            )}
          </DrawerHeader>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}>
          {children}
        </div>
      </DrawerContent>
    </BaseDrawer>
  );
}
