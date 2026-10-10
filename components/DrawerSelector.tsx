import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";

export interface DrawerSelectorOption {
  value: string;
  label: string;
  image?: string;
  disabled?: boolean;
}

export interface DrawerSelectorProps {
  title: string;
  options: readonly DrawerSelectorOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderImage?: string;
  triggerLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function DrawerSelector({
  title,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  placeholderImage,
  triggerLabel,
  disabled = false,
  className,
}: DrawerSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const triggerImage = selected ? selected.image : placeholderImage;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={disabled || options.length === 0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn("h-auto w-full justify-between gap-3 px-3 py-3.5 text-left", className)}
      >
        <span className="flex min-w-0 items-center gap-3">
          {triggerImage && <img src={triggerImage} alt="" className="h-10 w-10 shrink-0 object-contain" />}
          <span className="flex min-w-0 flex-col items-start">
            {triggerLabel && <span className="text-xs font-normal text-muted-foreground">{triggerLabel}</span>}
            <span className={cn("w-full truncate font-medium", !selected && "text-muted-foreground")}>
              {selected?.label ?? placeholder}
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>

      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        drawerOnDesktop
        title={title}
        className="mx-auto w-full max-w-lg rounded-t-2xl"
        contentClassName="p-2"
      >
        <div className="grid gap-1">
          {options.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              size="lg"
              disabled={option.disabled}
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "h-auto w-full justify-start gap-3 px-3 py-3.5 text-left",
                option.value === value && "bg-accent",
              )}
            >
              {option.image && <img src={option.image} alt="" className="h-10 w-10 shrink-0 object-contain" />}
              <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </Button>
          ))}
        </div>
      </ResponsivePopover>
    </>
  );
}
