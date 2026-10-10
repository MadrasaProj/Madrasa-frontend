import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePickerDrawer } from "@/components/DatePickerDrawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  id?: string;
  title: string;
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  disableFuture?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function DatePickerInput({
  id,
  title,
  value,
  onChange,
  disabled = false,
  disableFuture = true,
  allowClear = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("relative", className)}>
        <Input
          type="date"
          size="lg"
          value={value}
          readOnly
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none pr-10 [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={`${title}: ${value || "Select date"}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="absolute inset-0 flex w-full items-center justify-end rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <DatePickerDrawer
        open={open}
        onOpenChange={setOpen}
        date={value}
        onDateChange={onChange}
        title={title}
        disableFuture={disableFuture}
        allowClear={allowClear}
      />
    </>
  );
}
