"use client";

import { Calendar } from "@/components/ui/calendar";
import { ResponsivePopover } from "@/components/ui/responsivePopover";

interface DatePickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onDateChange: (date: string) => void;
  title: string;
}

function toLocalISO(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function DatePickerDrawer({
  open,
  onOpenChange,
  date,
  onDateChange,
  title,
}: DatePickerDrawerProps) {
  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={title}
    >
      <Calendar
        mode="single"
        selected={new Date(`${date}T00:00:00`)}
        onSelect={(selectedDate) => {
          if (!selectedDate) return;
          onDateChange(toLocalISO(selectedDate));
          onOpenChange(false);
        }}
        disabled={{ after: new Date() }}
        className="p-4 w-full"
      />
    </ResponsivePopover>
  );
}
