import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Clock3, X } from "lucide-react";
import {
  Drawer as BaseDrawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Side = "right" | "bottom" | "responsive";

export interface ResponsivePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: Side;
  drawerOnDesktop?: boolean;
  compact?: boolean;
  fullHeight?: boolean;
  title?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

/** A controlled drawer: wide from the right on desktop, responsive on mobile. When fullHeight=true, renders a fixed full-screen div without drawer motion. */
export function ResponsivePopover({
  open,
  onOpenChange,
  side = "responsive",
  drawerOnDesktop = false,
  compact = false,
  fullHeight = false,
  title,
  headerAction,
  footer,
  description,
  children,
  className,
  contentClassName,
  showCloseButton = true,
  showBackButton = fullHeight,
  onBack,
}: ResponsivePopoverProps) {
  const isDesktop = useIsDesktop();
  const wideDesktopDrawer = !compact && isDesktop && !drawerOnDesktop;
  const swipeDirection = compact ? "down" : wideDesktopDrawer ? "right" : side === "bottom" || (side === "responsive" && !isDesktop) ? "down" : "right";
  const isBottom = swipeDirection === "down";

  const renderClose = !showBackButton && showCloseButton;

  React.useEffect(() => {
    if (!fullHeight || !open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onBack) onBack();
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullHeight, open, onBack, onOpenChange]);

  if (fullHeight) {
    if (!open) return null;

    const fullHeightContent = (
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-0 z-50 flex h-dvh max-h-dvh w-screen flex-col bg-white text-gray-900 shadow-2xl",
          className,
        )}
      >
        {(title || description || headerAction || renderClose || showBackButton) && (
          <header
            className={cn(
              "relative shrink-0 border-b border-gray-100 px-5 pb-4 pt-4",
              (showBackButton || renderClose) && "min-h-14",
            )}
          >
            {(title || description || headerAction) && (
              <div
                className={cn(
                  "min-w-0 space-y-0.5 text-left",
                  showBackButton && "pl-8",
                  renderClose && "pr-11",
                )}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {title && (
                    <h2 className="min-w-0 break-words text-base font-extrabold tracking-tight">
                      {title}
                    </h2>
                  )}
                  {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>
                {description && (
                  <p className="text-xs text-gray-500">{description}</p>
                )}
              </div>
            )}
            {showBackButton && (
              <button
                type="button"
                aria-label="Back"
                onClick={onBack ?? (() => onOpenChange(false))}
                className="absolute left-2 top-4 flex size-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:size-9"
              >
                <ChevronLeft className="size-6 md:size-5" />
              </button>
            )}
            {renderClose && (
              <button
                type="button"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
                className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:size-9"
              >
                <X className="size-6 md:size-5" />
              </button>
            )}
          </header>
        )}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            contentClassName,
          )}
        >
          {children}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    );

    return typeof document !== "undefined"
      ? createPortal(fullHeightContent, document.body)
      : fullHeightContent;
  }

  return (
    <BaseDrawer open={open} onOpenChange={onOpenChange} swipeDirection={swipeDirection} showSwipeHandle={false}>
      <DrawerContent
        className={cn(
          "bg-white text-gray-900 shadow-2xl",
          compact ? "mx-auto w-full max-w-md max-h-[92dvh]" : isBottom ? "max-h-[92dvh]" : wideDesktopDrawer ? "h-full max-h-dvh max-w-none" : "h-full max-h-dvh w-full sm:max-w-md",
          className,
        )}
        style={wideDesktopDrawer ? { "--drawer-content-width": "90vw" } as React.CSSProperties : undefined}
      >
        {(title || description || headerAction || showCloseButton || showBackButton) && (
          <DrawerHeader className={cn("relative shrink-0", compact ? "px-4 pb-2 pt-3" : isBottom ? "px-5 pb-3.5 pt-5" : "px-5 pb-4 pt-4", (showBackButton || showCloseButton) && "min-h-14")}>
            {(title || description || headerAction) && (
              <div className={cn("min-w-0 space-y-0.5 text-left", showBackButton && "pl-8", renderClose && "pr-11")}>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {title && <DrawerTitle className="min-w-0 break-words text-base font-extrabold tracking-tight">{title}</DrawerTitle>}
                  {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>
                {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
              </div>
            )}
            {showBackButton && <button type="button" aria-label="Back" onClick={onBack ?? (() => onOpenChange(false))} className="absolute left-2 top-4 flex size-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:size-9"><ChevronLeft className="size-6 md:size-5" /></button>}
            {renderClose && <DrawerClose aria-label="Close" className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:size-9"><X className="size-6 md:size-5" /></DrawerClose>}
          </DrawerHeader>
        )}
        <div className={cn("min-h-0 overflow-y-auto overscroll-contain", compact ? "flex-auto" : "flex-1", contentClassName)}>{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </DrawerContent>
    </BaseDrawer>
  );
}

const HOURS = Array.from({ length: 12 }, (_, hour) => hour + 1);
const MINUTE_PRESETS = Array.from({ length: 12 }, (_, slot) => String(slot * 5).padStart(2, "0"));
const currentLocalTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label?: string;
  placeholder?: string;
  hourLabel?: string;
  minuteLabel?: string;
  clearLabel?: string;
  doneLabel?: string;
}

/** An input trigger with a responsive time-selection drawer. Values use 24-hour HH:mm. */
export function TimePicker({
  value,
  onChange,
  id,
  label = "Arrival time",
  placeholder = "Select time",
  hourLabel = "Hour",
  minuteLabel = "Minute",
  clearLabel = "Clear time",
  doneLabel = "Done",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pickerValue, setPickerValue] = React.useState(value);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  const hour24 = match ? Number(match[1]) : null;
  const displayValue = match && hour24 !== null
    ? `${String(hour24 % 12 || 12).padStart(2, "0")}:${match[2]} ${hour24 >= 12 ? "PM" : "AM"}`
    : "";
  const openPicker = () => {
    setPickerValue(value || currentLocalTime());
    setOpen(true);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          readOnly
          value={displayValue}
          placeholder={placeholder}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
              event.preventDefault();
              openPicker();
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="h-11 cursor-pointer bg-white pr-10 text-base tabular-nums"
        />
        <Clock3 aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
      </div>
      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        title={label}
        compact
        footer={
          <div className="border-t border-gray-100 p-4">
            <Button type="button" size="lg" onClick={() => { onChange(pickerValue); setOpen(false); }} className="w-full">
              {doneLabel}
            </Button>
          </div>
        }
      >
        <div className="px-5 pb-5 pt-2">
          {open && <TimePickerPanel
            value={pickerValue}
            onChange={setPickerValue}
            id={`${id}-picker`}
            label={label}
            hourLabel={hourLabel}
            minuteLabel={minuteLabel}
            clearLabel={clearLabel}
          />}
        </div>
      </ResponsivePopover>
    </div>
  );
}

function TimePickerPanel({
  value,
  onChange,
  id,
  label,
  hourLabel,
  minuteLabel,
  clearLabel,
}: Required<Pick<TimePickerProps, "value" | "onChange" | "id" | "label" | "hourLabel" | "minuteLabel" | "clearLabel">>) {
  const [draftMinute, setDraftMinute] = React.useState("00");
  const [draftPeriod, setDraftPeriod] = React.useState<"AM" | "PM">("AM");
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  const hour24 = match ? Number(match[1]) : null;
  const hour12 = hour24 === null ? null : hour24 % 12 || 12;
  const minute = match?.[2] ?? draftMinute;
  const period = hour24 === null ? draftPeriod : hour24 >= 12 ? "PM" : "AM";
  const [minuteInput, setMinuteInput] = React.useState(minute);

  React.useEffect(() => {
    setMinuteInput(minute);
  }, [minute]);

  const formatHour = (hour: number, nextPeriod: "AM" | "PM") =>
    String(hour % 12 + (nextPeriod === "PM" ? 12 : 0)).padStart(2, "0");
  const resolvedMinute = /^\d{1,2}$/.test(minuteInput) && Number(minuteInput) <= 59
    ? minuteInput.padStart(2, "0")
    : minute;

  const chooseHour = (hour: number) => onChange(`${formatHour(hour, period)}:${resolvedMinute}`);
  const chooseMinute = (nextMinute: string) => {
    setDraftMinute(nextMinute);
    setMinuteInput(nextMinute);
    if (hour24 !== null) onChange(`${String(hour24).padStart(2, "0")}:${nextMinute}`);
  };
  const choosePeriod = (nextPeriod: "AM" | "PM") => {
    setDraftPeriod(nextPeriod);
    if (hour12 !== null) onChange(`${formatHour(hour12, nextPeriod)}:${resolvedMinute}`);
  };
  const commitMinuteInput = () => {
    if (!/^\d{1,2}$/.test(minuteInput) || Number(minuteInput) > 59) {
      setMinuteInput(minute);
      return;
    }
    chooseMinute(minuteInput.padStart(2, "0"));
  };

  return (
    <div role="group" aria-label={label} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" className="size-5 shrink-0 text-primary-600" />
            <span className="text-xl font-semibold tabular-nums text-gray-900" aria-live="polite">
              {hour12 === null ? "--:--" : `${String(hour12).padStart(2, "0")}:${minute} ${period}`}
            </span>
          </div>
          <Tabs value={period} onValueChange={(next) => choosePeriod(next as "AM" | "PM")}>
            <TabsList className="bg-gray-200/70 p-0.5">
              <TabsTrigger value="AM" className="px-2.5 py-1 text-xs">AM</TabsTrigger>
              <TabsTrigger value="PM" className="px-2.5 py-1 text-xs">PM</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p id={`${id}-hours-label`} className="mb-2 text-xs font-semibold text-gray-600">{hourLabel}</p>
            <div role="group" aria-labelledby={`${id}-hours-label`} className="grid grid-cols-3 gap-1">
              {HOURS.map((hour) => (
                <Button
                  key={hour}
                  type="button"
                  variant={hour12 === hour ? "default" : "ghost"}
                  aria-pressed={hour12 === hour}
                  onClick={() => chooseHour(hour)}
                  className={cn("h-10 w-full rounded-lg px-0 tabular-nums", hour12 !== hour && "bg-white hover:bg-gray-100")}
                >
                  {String(hour).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label id={`${id}-minutes-label`} htmlFor={`${id}-minute`} className="text-xs font-semibold text-gray-600">{minuteLabel}</label>
              <Input
                id={`${id}-minute`}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={minuteInput}
                onChange={(event) => {
                  if (/^\d{0,2}$/.test(event.target.value)) setMinuteInput(event.target.value);
                }}
                onFocus={(event) => event.target.select()}
                onBlur={commitMinuteInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    chooseMinute(String((Number(minute) + (event.key === "ArrowUp" ? 1 : 59)) % 60).padStart(2, "0"));
                  }
                }}
                className="h-8 w-14 bg-white text-center tabular-nums"
                aria-label={`${minuteLabel} (00–59)`}
              />
            </div>
            <div role="group" aria-labelledby={`${id}-minutes-label`} className="grid grid-cols-4 gap-1">
              {MINUTE_PRESETS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={minute === option ? "default" : "ghost"}
                  aria-pressed={minute === option}
                  onClick={() => chooseMinute(option)}
                  className={cn("h-9 w-full rounded-lg px-0 text-xs tabular-nums", minute !== option && "bg-white hover:bg-gray-100")}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {hour12 !== null && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setDraftMinute("00"); setDraftPeriod("AM"); onChange(""); }} className="mt-3 text-gray-600">
            {clearLabel}
          </Button>
        )}
    </div>
  );
}
