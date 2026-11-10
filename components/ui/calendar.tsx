"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatCalendarMonthDropdownIt } from "@/lib/ui/calendar-locale"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
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
      className={cn(
        // Fixed compact cell size — avoid aspect-square rows stretching with wide captions.
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        // Always Italian month labels in dropdown (app copy is it-IT).
        formatMonthDropdown: formatCalendarMonthDropdownIt,
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit max-w-[17.5rem]", defaultClassNames.root, classNames?.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months,
          classNames?.months
        ),
        month: cn(
          "flex flex-col w-full gap-3",
          defaultClassNames.month,
          classNames?.month
        ),
        month_grid: cn(
          // Equal 7 columns; do not inherit flex/grid from RDP defaults onto <table>.
          "w-full table-fixed border-collapse",
          classNames?.month_grid
        ),
        nav: cn(
          // pointer-events-none so month/year <select> receive taps on iOS Safari;
          // only the prev/next buttons re-enable pointer events.
          "z-10 flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between pointer-events-none",
          defaultClassNames.nav,
          classNames?.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "relative z-20 size-9 min-h-9 min-w-9 aria-disabled:opacity-50 p-0 select-none pointer-events-auto",
          defaultClassNames.button_previous,
          classNames?.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "relative z-20 size-9 min-h-9 min-w-9 aria-disabled:opacity-50 p-0 select-none pointer-events-auto",
          defaultClassNames.button_next,
          classNames?.button_next
        ),
        month_caption: cn(
          captionLayout === "label"
            ? "pointer-events-none relative z-0 flex items-center justify-center h-9 w-full px-10"
            : "pointer-events-auto relative z-30 flex items-center justify-center h-9 w-full px-10",
          defaultClassNames.month_caption,
          classNames?.month_caption
        ),
        dropdowns: cn(
          "relative z-40 w-full flex items-center justify-center h-9 gap-1.5 pointer-events-auto",
          classNames?.dropdowns
        ),
        dropdown_root: cn(
          "relative z-40 inline-flex h-9 items-center rounded-md border border-input bg-background shadow-xs has-focus:border-ring has-focus:ring-ring/50 has-focus:ring-[3px]",
          classNames?.dropdown_root
        ),
        // Visible native select (≥16px) — opacity-0 overlays break month/year taps on iOS Safari.
        dropdown: cn(
          "relative z-50 h-9 min-w-[3.75rem] appearance-auto bg-transparent px-1.5 text-base font-medium text-foreground outline-none",
          classNames?.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "sr-only",
          defaultClassNames.caption_label,
          classNames?.caption_label
        ),
        // RDP v9 usa <table>/<tr>/<td>: niente display:grid/flex sulle righe.
        weekdays: cn("w-full", classNames?.weekdays),
        weekday: cn(
          "w-[14.2857%] text-muted-foreground rounded-md font-normal text-[0.7rem] select-none text-center align-middle h-8 p-0",
          classNames?.weekday
        ),
        week: cn("w-full", classNames?.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header,
          classNames?.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number,
          classNames?.week_number
        ),
        day: cn(
          "relative w-[14.2857%] h-8 p-0 text-center align-middle select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day",
          classNames?.day
        ),
        day_button: cn(defaultClassNames.day_button, classNames?.day_button),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start,
          classNames?.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle, classNames?.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end, classNames?.range_end),
        today: cn(
          "rounded-md bg-transparent text-primary ring-1 ring-primary/45 data-[selected=true]:bg-transparent data-[selected=true]:ring-0",
          defaultClassNames.today,
          classNames?.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
          classNames?.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
          classNames?.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden, classNames?.hidden),
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Dropdown: ({ options, value, onChange, className, ...props }) => {
          return (
            <select
              data-slot="calendar-dropdown"
              value={value}
              onChange={onChange}
              className={cn(
                "relative z-50 h-9 min-w-[3.75rem] max-w-[7.5rem] appearance-auto rounded-md border-0 bg-transparent px-1.5 text-base font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                className
              )}
              {...props}
            >
              {options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
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

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString("it-IT")}
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
        // Fixed cell size (no w-full aspect-square) so rows stay compact when caption is wide.
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground mx-auto flex size-(--cell-size) max-h-(--cell-size) max-w-(--cell-size) flex-col items-center justify-center gap-0 p-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-[10px] [&>span]:opacity-70",
        modifiers.today &&
          !modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle &&
          "bg-transparent text-primary ring-1 ring-primary/45",
        defaultClassNames.day_button,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
