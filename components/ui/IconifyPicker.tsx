import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_ICONS = [
  "lucide:sparkles",
  "lucide:moon-star",
  "lucide:heart",
  "lucide:book-open",
  "lucide:hand-heart",
  "lucide:star",
  "lucide:sun",
  "lucide:badge-check",
  "lucide:book-heart",
  "lucide:circle-check",
  "lucide:clock",
  "lucide:cloud-moon",
  "lucide:flower-2",
  "lucide:gift",
  "lucide:hand-helping",
  "lucide:lamp",
  "lucide:leaf",
  "lucide:medal",
  "lucide:smile",
  "lucide:sunrise",
  "material-symbols:mosque-outline",
  "material-symbols:self-improvement",
  "material-symbols:volunteer-activism-outline",
  "material-symbols:menu-book-outline",
  "material-symbols:prayer-times-outline",
  "material-symbols:favorite-outline",
  "material-symbols:nightlight-outline",
  "material-symbols:verified-outline",
  "material-symbols:auto-stories-outline",
  "material-symbols:celebration-outline",
  "material-symbols:dark-mode-outline",
  "material-symbols:diversity-1-outline",
  "material-symbols:emoji-events-outline",
  "material-symbols:light-mode-outline",
  "material-symbols:local-library-outline",
  "material-symbols:mindfulness-outline",
  "material-symbols:rewarded-ads-outline",
  "material-symbols:schedule-outline",
  "material-symbols:thumb-up-outline",
  "material-symbols:workspace-premium-outline",
];

interface IconifyPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconifyPicker({ value, onChange }: IconifyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(DEFAULT_ICONS);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const query = search.trim();
    const requestId = ++requestRef.current;
    if (query.length < 2) {
      setResults(DEFAULT_ICONS);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=lucide,material-symbols&limit=48`,
        );
        if (!response.ok) throw new Error("Icon search failed");
        const data = await response.json();
        if (requestId === requestRef.current) setResults(data.icons ?? []);
      } catch {
        if (requestId === requestRef.current) {
          setResults(
            DEFAULT_ICONS.filter((icon) =>
              icon.toLowerCase().includes(query.toLowerCase()),
            ),
          );
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className=" "
          />
        }
      >
        <Icon icon={value || "lucide:sparkles"} className="size-5 text-primary-600" />
        <span className=" ">
          {value?"Change icon": "Choose an icon"}
        </span>
        <ChevronDown className={cn("size-4 text-gray-400 transition-transform", open && "rotate-180")} />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] rounded-2xl border-gray-200 bg-white p-3 gap-3 shadow-xl"
      >
        <Input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Lucide & Material icons"
          className=""
        />

        <div className="grid grid-cols-8 gap-1 max-h-44 overflow-y-auto pr-1">
          {loading ? (
            <div className="col-span-8 py-8 flex justify-center text-primary-500">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : results.length ? (
            results.map((icon) => (
              <Button
                type="button"
                key={icon}
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                  setSearch("");
                }}
                title={icon}
                className={cn(
                  "rounded-lg hover:bg-primary-50 hover:text-primary-700",
                  value === icon
                    ? "bg-primary-100 text-primary-700 ring-1 ring-primary-300"
                    : "text-gray-600",
                )}
              >
                <Icon icon={icon} className="size-5" />
              </Button>
            ))
          ) : (
            <p className="col-span-8 text-xs text-gray-400 text-center py-6">
              No matching icons
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
