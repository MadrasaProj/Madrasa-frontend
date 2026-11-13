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

interface DrawerSelectorBaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  description?: ReactNode;
  showCloseButton?: boolean;
  title: string;
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
  /** Custom content for each option; the selector keeps selection and keyboard behavior. */
  renderOption?: (option: DrawerSelectorOption, selected: boolean) => ReactNode;
}

export type DrawerSelectorProps = DrawerSelectorBaseProps & (
  | {
      options: readonly DrawerSelectorOption[];
      value: string;
      onChange: (value: string) => void;
      children?: never;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children: ReactNode;
      options?: never;
      value?: never;
      onChange?: never;
    }
);

export function DrawerSelector({
  title,
  options = [],
  value,
  onChange,
  open: controlledOpen,
  onOpenChange,
  description,
  showCloseButton = true,
  children,
  placeholder = "Select an option",
  placeholderImage,
  triggerLabel,
  triggerItem,
  triggerVariant = "outline",
  triggerIcon,
  disabled = false,
  className,
  optionClassName,
  renderOption,
}: DrawerSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
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
      {children != null && triggerItem == null ? null : triggerItem != null ? customTrigger : (
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
        title={title}
        description={description}
        showCloseButton={showCloseButton}
        className="mx-auto w-full max-w-lg rounded-t-2xl"
        
      >
        {children != null && (title || description) && (
          <div className="hidden px-4 pt-4 md:block">
            <h2 className="text-sm font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        {children ?? <div className="grid gap-1">
          {options.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              size="lg"
              disabled={option.disabled}
              aria-pressed={option.value === value}
              onClick={() => {
                onChange?.(option.value);
                setOpen(false);
              }}
              className={cn(
                "h-auto w-full justify-start gap-3 px-3  py-1.5 text-left",
                optionClassName,
                option.value === value && "bg-accent",
              )}
            >
              {renderOption ? (
                <span className="flex min-w-0 flex-1 items-center gap-3">{renderOption(option, option.value === value)}</span>
              ) : (
                <>
                  {option.icon && <span aria-hidden="true" className="shrink-0">{option.icon}</span>}
                  {option.image && <img src={option.image} alt="" className="h-10 w-10 shrink-0 object-contain" />}
                  <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                </>
              )}
              {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </Button>
          ))}
        </div>}
      </ResponsivePopover>
    </>
  );
}
