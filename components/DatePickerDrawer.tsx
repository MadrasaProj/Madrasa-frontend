"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";

interface DatePickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onDateChange: (date: string) => void;
  title: string;
  disableFuture?: boolean;
  minDate?: string;
  allowClear?: boolean;
  clearLabel?: string;
  largeText?: boolean;
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
  minDate,
  allowClear = false,
  clearLabel = "Clear date",
  largeText = false,
}: DatePickerDrawerProps) {
  return (
    <ResponsivePopover
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={title}
      footer={allowClear && date ? (
        <div className="border-t border-gray-100 p-4">
          <Button type="button" variant="outline" className={cn("w-full", largeText && "text-base")} onClick={() => {
            onDateChange("");
            onOpenChange(false);
          }}>
            {clearLabel}
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
        disabled={[
          ...(minDate ? [{ before: new Date(`${minDate}T00:00:00`) }] : []),
          ...(disableFuture ? [{ after: new Date() }] : []),
        ]}
        className={cn("p-4 w-full", largeText && "[&_*]:text-base!")}
      />
    </ResponsivePopover>
  );
}
