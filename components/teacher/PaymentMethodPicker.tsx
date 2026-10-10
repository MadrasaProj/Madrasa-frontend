"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsivePopover } from "@/components/ui/responsivePopover";
import { cn } from "@/lib/utils";

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "OTHER",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const METHOD_ICONS: Record<PaymentMethod, string> = {
  CASH: "/icons/fees/cash.webp",
  BANK_TRANSFER: "/icons/fees/bank-transfer.webp",
  UPI: "/icons/fees/upi.webp",
  CHEQUE: "/icons/fees/cheque.webp",
  OTHER: "/icons/fees/other.webp",
};

function getMethodName(method: PaymentMethod) {
  return method
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function MethodItem({ method, selected }: { method: PaymentMethod; selected: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <img
        src={METHOD_ICONS[method]}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 object-contain"
      />
      <span className="min-w-0 flex-1 truncate font-medium">{getMethodName(method)}</span>
      
    </span>
  );
}

export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (method: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const method = PAYMENT_METHODS.find((item) => item === value);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-auto min-h-16 w-full justify-between px-3 py-2"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={method ? `Payment method: ${getMethodName(method)}` : "Choose payment method"}
      >
        {method ? (
          <MethodItem method={method} selected={false} />
        ) : (
          <span className="text-muted-foreground">Choose payment method</span>
        )}
        <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>
      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        title="Payment method"
        showCloseButton={false}
        contentClassName="p-2"
      >
        <div className="grid gap-1">
          {PAYMENT_METHODS.map((option) => (
            <Button
              key={option}
              type="button"
              variant="ghost"
              size="lg"
              className={cn(
                "h-auto w-full justify-start px-3 py-2",
                option === method && "bg-accent",
              )}
              aria-pressed={option === method}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <MethodItem method={option} selected={option === method} />
            </Button>
          ))}
        </div>
      </ResponsivePopover>
    </>
  );
}
