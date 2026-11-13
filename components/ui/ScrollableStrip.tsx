import { useEffect, useState, type ComponentProps, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollableStripProps extends ComponentProps<"div"> {
  stripRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

/** Shared hover controls for horizontal navigators; touch scrolling stays native. */
export function ScrollableStrip({ stripRef, disabled = false, children, ...props }: ScrollableStripProps) {
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const update = () => setEdges({
      left: strip.scrollLeft > 1,
      right: strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1,
    });
    const resize = new ResizeObserver(update);
    const observeSizes = () => {
      resize.disconnect();
      resize.observe(strip);
      Array.from(strip.children).forEach((child) => resize.observe(child));
      update();
    };
    const mutations = new MutationObserver(observeSizes);
    mutations.observe(strip, { childList: true });
    strip.addEventListener("scroll", update, { passive: true });
    observeSizes();
    return () => {
      resize.disconnect();
      mutations.disconnect();
      strip.removeEventListener("scroll", update);
    };
  }, [stripRef]);

  const scroll = (direction: number) => {
    const strip = stripRef.current;
    if (strip) strip.scrollBy({ left: direction * strip.clientWidth * 0.75, behavior: "smooth" });
  };

  return (
    <div className="group/scroll relative min-w-0 flex-1">
      <div ref={stripRef} {...props}>{children}</div>
      {(["left", "right"] as const).map((direction) => {
        if (disabled || !edges[direction]) return null;
        const Icon = direction === "left" ? ChevronLeft : ChevronRight;
        return (
          <button
            key={direction}
            type="button"
            aria-label={`Scroll ${direction}`}
            onClick={() => scroll(direction === "left" ? -1 : 1)}
            className={cn(
              "pointer-events-none absolute inset-y-0 z-10 hidden w-12 items-center justify-center text-gray-900 opacity-0 transition-opacity focus-visible:outline-2 focus-visible:outline-primary-500 md:[@media(hover:hover)_and_(pointer:fine)]:flex md:[@media(hover:hover)_and_(pointer:fine)]:group-hover/scroll:pointer-events-auto md:[@media(hover:hover)_and_(pointer:fine)]:group-hover/scroll:opacity-100",
              direction === "left"
                ? "left-0 bg-gradient-to-r from-white via-white/90 to-transparent"
                : "right-0 bg-gradient-to-l from-white via-white/90 to-transparent",
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
