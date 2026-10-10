"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";

interface DatePickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onDateChange: (date: string) => void;
  title: string;
  disableFuture?: boolean;
  allowClear?: boolean;
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
  disableFuture = true,
  allowClear = false,
}: DatePickerDrawerProps) {
  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={title}
      footer={allowClear && date ? (
        <div className="border-t border-gray-100 p-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => {
            onDateChange("");
            onOpenChange(false);
          }}>
            Clear date
          </Button>
        </div>
      ) : undefined}
    >
      <Calendar
        mode="single"
        selected={date ? new Date(`${date}T00:00:00`) : undefined}
        onSelect={(selectedDate) => {
          if (!selectedDate) return;
          onDateChange(toLocalISO(selectedDate));
          onOpenChange(false);
        }}
        disabled={disableFuture ? { after: new Date() } : undefined}
        className="p-4 w-full"
      />
    </ResponsivePopover>
  );
}
