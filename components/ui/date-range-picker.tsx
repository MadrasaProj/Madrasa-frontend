import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawerView";

interface DateRangePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: DateRange;
  onApply: (range: DateRange | undefined) => void;
  title?: string;
}

export function DateRangePicker({
  open,
  onOpenChange,
  value,
  onApply,
  title = "Filter history",
}: DateRangePickerProps) {
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(value);

  useEffect(() => {
    if (open) setDraftRange(value);
  }, [open, value]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="bottom" title={title}>
      <div className="w-full px-4 pb-8">
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          numberOfMonths={1}
          className="w-full"
        />
        <div className="mx-auto flex w-full max-w-sm  gap-2 ">
          <Button
            type="button"
            variant="outline"
             size="lg"
className={"ml-auto"}
            onClick={() => setDraftRange(undefined)}
          >
            Clear range
          </Button>
          <Button
            type="button"
            size="lg"
              onClick={() => {
              onApply(draftRange);
              onOpenChange(false);
            }}
          >
            Set filter
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
