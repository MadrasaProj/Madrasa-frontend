import * as React from "react"
import { cn } from "cn"
import {
  DayPicker,
  DateLib,
  defaultLocale,
  getDefaultClassNames,
  useDayPicker,
  type DayButton,
  type Locale,
  type MonthCaptionProps,
  type RootProps,
} from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fixedWeeks = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks={fixedWeeks}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        MonthCaption: CalendarMonthCaption,
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

type CalendarPicker = {
  view: "months" | "years"
  date: Date
  offset: number
  yearPage: number
}

const CalendarPickerContext = React.createContext<
  ((picker: CalendarPicker) => void) | null
>(null)

const calendarCaptionButtonClassName = cn(
  "h-(--cell-size) cursor-pointer rounded-lg border-gray-200/60 bg-linear-to-b from-white to-gray-50 px-2 text-sm text-gray-700",
  "shadow-[inset_0_1px_0_#ffffffb3,0_1px_2px_#0000000a] hover:to-gray-100 active:shadow-none",
  "dark:border-white/10 dark:from-neutral-800 dark:to-neutral-800 dark:text-neutral-100 dark:shadow-none dark:hover:to-neutral-700"
)

function CalendarMonthCaption({
  calendarMonth,
  displayIndex,
  children: _children,
  ...props
}: MonthCaptionProps) {
  const openPicker = React.useContext(CalendarPickerContext)
  const { dayPickerProps, months, formatters } = useDayPicker()
  const date = calendarMonth.date
  const offset = dayPickerProps.reverseMonths
    ? months.length - 1 - displayIndex
    : displayIndex

  return (
    <div {...props}>
      <div className="relative z-10 flex items-center gap-1">
        {(["months", "years"] as const).map((view) => (
          <Button
            key={view}
            type="button"
            variant="ghost"
            size="sm"
            className={calendarCaptionButtonClassName}
            aria-label={view === "months" ? "Choose month" : "Choose year"}
            disabled={dayPickerProps.disableNavigation}
            data-calendar-picker={`${offset}-${view}`}
            onClick={() => openPicker?.({
              view,
              date,
              offset,
              yearPage: Math.floor(date.getFullYear() / 12) * 12,
            })}
          >
            {view === "months"
              ? date.toLocaleString(dayPickerProps.locale?.code, {
                  month: "long",
                  timeZone: dayPickerProps.timeZone,
                })
              : formatters.formatYearDropdown(date)}
          </Button>
        ))}
      </div>
    </div>
  )
}

function CalendarRoot({ rootRef, children, ...props }: RootProps) {
  const { dayPickerProps, goToMonth, months, formatters } = useDayPicker()
  const [picker, setPicker] = React.useState<CalendarPicker | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const returnFocus = React.useRef<string | null>(null)
  const dateLib = new DateLib({
    locale: { ...defaultLocale, ...dayPickerProps.locale },
    timeZone: dayPickerProps.timeZone,
    numerals: dayPickerProps.numerals,
  }, dayPickerProps.dateLib)
  const start = dayPickerProps.startMonth
    ? dateLib.startOfMonth(dayPickerProps.startMonth)
    : undefined
  const end = dayPickerProps.endMonth
    ? dateLib.startOfMonth(dayPickerProps.endMonth)
    : undefined
  const activeDate = picker
    ? months[dayPickerProps.reverseMonths ? months.length - 1 - picker.offset : picker.offset]?.date
    : undefined

  React.useEffect(() => {
    if (!picker && returnFocus.current) {
      containerRef.current?.querySelector<HTMLButtonElement>(
        `[data-calendar-picker="${returnFocus.current}"]`
      )?.focus()
      returnFocus.current = null
    }
  }, [picker])

  function closePicker(date?: Date) {
    if (!picker) return
    if (date) {
      const boundedDate = start && date < start ? start : end && date > end ? end : date
      goToMonth(dateLib.addMonths(boundedDate, -picker.offset))
    }
    returnFocus.current = `${picker.offset}-${picker.view}`
    setPicker(null)
  }

  function pageDisabled(direction: number) {
    if (!picker) return false
    const year = picker.view === "years"
      ? picker.yearPage + direction * 12
      : picker.date.getFullYear() + direction
    return direction < 0
      ? !!start && year + (picker.view === "years" ? 11 : 0) < start.getFullYear()
      : !!end && year > end.getFullYear()
  }

  function renderPageButton(direction: -1 | 1) {
    if (!picker) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-(--cell-size) p-0 rtl:rotate-180"
        aria-label={`${direction < 0 ? "Previous" : "Next"} ${picker.view === "years" ? "years" : "year"}`}
        disabled={pageDisabled(direction)}
        onClick={() => setPicker(picker.view === "years"
          ? { ...picker, yearPage: picker.yearPage + direction * 12 }
          : { ...picker, date: dateLib.addYears(picker.date, direction) })}
      >
        {direction < 0 ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
      </Button>
    )
  }

  return (
    <div
      {...props}
      data-slot="calendar"
      ref={(node) => {
        containerRef.current = node
        if (typeof rootRef === "function") return rootRef(node)
        if (rootRef) rootRef.current = node
      }}
    >
      <CalendarPickerContext.Provider value={setPicker}>
        <div className="relative">
          <div
            className={picker ? "invisible" : undefined}
            aria-hidden={picker ? true : undefined}
            inert={!!picker}
          >
            {children}
          </div>
          {picker && (
            <div
              className="absolute inset-0 flex min-w-[calc(var(--cell-size)*7)] flex-col gap-4"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  event.stopPropagation()
                  closePicker()
                }
              }}
            >
              <div className="flex h-(--cell-size) shrink-0 items-center justify-between">
                {renderPageButton(-1)}
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className={calendarCaptionButtonClassName} aria-label="Choose month" onClick={() => setPicker({ ...picker, view: "months" })}>
                    {picker.date.toLocaleString(dayPickerProps.locale?.code, {
                      month: "long",
                      timeZone: dayPickerProps.timeZone,
                    })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={calendarCaptionButtonClassName}
                    aria-label="Choose year"
                    onClick={() => setPicker({
                      ...picker,
                      view: "years",
                      yearPage: Math.floor(picker.date.getFullYear() / 12) * 12,
                    })}
                  >
                    {picker.view === "years"
                      ? `${picker.yearPage} – ${picker.yearPage + 11}`
                      : formatters.formatYearDropdown(picker.date)}
                  </Button>
                </div>
                {renderPageButton(1)}
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 justify-between gap-2" role="group" aria-label={picker.view === "years" ? "Choose year" : "Choose month"}>
                {Array.from({ length: 12 }, (_, index) => {
                  const date = picker.view === "years"
                    ? dateLib.setYear(dateLib.startOfMonth(picker.date), picker.yearPage + index)
                    : dateLib.setMonth(dateLib.startOfMonth(picker.date), index)
                  const year = date.getFullYear()
                  const disabled = picker.view === "years"
                    ? (!!start && year < start.getFullYear()) || (!!end && year > end.getFullYear())
                    : (!!start && date < start) || (!!end && date > end)
                  const active = !!activeDate && (picker.view === "years"
                    ? year === activeDate.getFullYear()
                    : dateLib.isSameMonth(date, activeDate))

                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={active ? "default" : "ghost"}
                      className="h-full w-full min-w-0 cursor-pointer px-2 text-sm inset-ring inset-ring-border/60"
                      disabled={disabled}
                      aria-pressed={active}
                      autoFocus={!disabled && index === (picker.view === "years" ? picker.date.getFullYear() - picker.yearPage : picker.date.getMonth())}
                      onClick={() => closePicker(date)}
                    >
                      {picker.view === "years" ? formatters.formatYearDropdown(date) : formatters.formatMonthDropdown(date)}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CalendarPickerContext.Provider>
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
