import { cloneElement, isValidElement, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";

export interface DrawerSelectorOption {
  value: string;
  label: string;
  icon?: ReactNode;
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
  /** Replaces the default button. Use a button or a component that forwards button props. */
  triggerItem?: ReactNode;
  triggerVariant?: "outline" | "ghost";
  /** Render an icon-only trigger, retaining the title and selection as its accessible label. */
  triggerIcon?: ReactNode;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
}

export function DrawerSelector({
  title,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  placeholderImage,
  triggerLabel,
  triggerItem,
  triggerVariant = "outline",
  triggerIcon,
  disabled = false,
  className,
  optionClassName,
}: DrawerSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const triggerImage = selected ? selected.image : placeholderImage;
  const triggerDisabled = disabled || options.length === 0;
  const triggerDescription = `${title}: ${selected?.label ?? placeholder}`;
  const customTrigger = isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(triggerItem)
    ? cloneElement(triggerItem, {
        type: triggerItem.props.type ?? "button",
        disabled: triggerDisabled || triggerItem.props.disabled,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-label": triggerItem.props["aria-label"] ?? triggerDescription,
        title: triggerItem.props.title ?? triggerDescription,
        onClick: (event) => {
          if (triggerDisabled || triggerItem.props.disabled) return;
          triggerItem.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
        },
      })
    : triggerItem;

  return (
    <>
      {triggerItem != null ? customTrigger : (
        <Button
          type="button"
          variant={triggerVariant}
          size="lg"
          disabled={triggerDisabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerIcon ? triggerDescription : undefined}
          title={triggerIcon ? triggerDescription : undefined}
          onClick={() => setOpen(true)}
          className={cn("h-11 w-full justify-between !shadow-none  gap-3 px-3 py-3.5 text-left", triggerIcon != null && "w-11 shrink-0 justify-center p-0", className)}
        >
          {triggerIcon ? (
            <span aria-hidden="true">{triggerIcon}</span>
          ) : (
            <>
              <span className="flex min-w-0 items-center gap-3">
                {selected?.icon ? <span aria-hidden="true" className="shrink-0">{selected.icon}</span> : triggerImage && <img src={triggerImage} alt="" className="h-10 w-10 shrink-0 object-contain" />}
                <span className="flex min-w-0 flex-col items-start">
                  {triggerLabel && <span className="text-xs font-normal text-muted-foreground">{triggerLabel}</span>}
                  <span className={cn("w-full truncate font-medium", !selected && "text-muted-foreground")}>
                    {selected?.label ?? placeholder}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Button>
      )}

      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        drawerOnDesktop
        title={title}
        className="mx-auto w-full max-w-lg rounded-t-2xl"
        contentClassName="p-2 pb-5"
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
                optionClassName,
                option.value === value && "bg-accent",
              )}
            >
              {option.icon && <span aria-hidden="true" className="shrink-0">{option.icon}</span>}
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
