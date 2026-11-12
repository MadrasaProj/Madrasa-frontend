import { ChevronDown, School } from "lucide-react";
import { DrawerSelector, type DrawerSelectorOption } from "@/components/DrawerSelector";
import { cn } from "@/lib/utils";

interface ClassPickerProps {
  options: readonly DrawerSelectorOption[];
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClassPicker({
  options,
  value,
  onChange,
  title = "Select class",
  placeholder = "Class",
  disabled = false,
  className,
}: ClassPickerProps) {
  const selectedClass = options.find((option) => option.value === value);

  return (
    <DrawerSelector
      title={title}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      triggerItem={
        <button
          type="button"
          className={cn(
            "inline-flex max-w-40 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
        >
          <School aria-hidden="true" className="size-4 shrink-0 text-primary-600" />
          <span className="truncate">{selectedClass?.label ?? placeholder}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </button>
      }
    />
  );
}
