# Page style guide

Use this guide when creating or updating a page in the Smart Madrasa frontend.

## Header

- Render the shared `PageHeader` with the page title only: `<PageHeader title="Page title" />` from `@/components/ui/PageHeader`.
- Keep subtitles, icons, actions, filters, and controls out of the header. Place page controls in the content below it.

## Controls and inputs

- Use the existing shadcn components in [`components/ui/`](../components/ui/) for buttons, inputs, textareas, tabs, checkboxes, and other standard controls. Import the shared component instead of making a page-specific copy.
- Use [`DatePickerDrawer.tsx`](../components/DatePickerDrawer.tsx) for single-date picking. Control it with `open`, `onOpenChange`, `date` (a `YYYY-MM-DD` string), `onDateChange`, and `title`.
- Use [`DrawerSelector.tsx`](../components/DrawerSelector.tsx) for option selection. Supply `title`, `options`, `value`, and `onChange`; use its optional trigger props when the layout needs a custom trigger.
- Use `ResponsivePopover` from [`responsivePopover.tsx`](../components/ui/responsivePopover.tsx) for page drawers and detail panels. Keep `open` and `onOpenChange` controlled by the page, and use its `title`, `description`, and `footer` slots as needed.

## Stats

- Follow the **daily stats** in [`app/teacher/ibadah/page.tsx`](../app/teacher/ibadah/page.tsx), especially `DailyIbadahStats`.
- Use one compact, two-column stats grid with a soft background gradient, rounded corners, and thin internal dividers. Keep labels small, values prominent and tabular, and spacing tight (`p-2.5 sm:p-3` in the reference).
- For richer metrics, pair the value with the reference's small bar chart treatment. For simpler metrics, pair the label with a small icon. Match the data and number of stats to the page; do not copy Ibadah-specific labels or values.

## Lists

- Follow the **All fee types** list in [`app/teacher/fees/page.tsx`](../app/teacher/fees/page.tsx).
- Use a single white, rounded list container with `divide-y divide-gray-100`, `overflow-hidden`, and **no shadow**. Use full-width rows with `px-4 py-4`, left-aligned primary and secondary text, and a right-aligned value, status, progress indicator, or chevron when relevant.
- Make interactive rows keyboard accessible and give them the reference hover and visible focus treatment. Keep the list readable on mobile and desktop.

## Surface rule

- Do not use shadowed cards anywhere in the page content. Use spacing, subtle background colors, borders, and dividers for separation. If a shared card style adds a shadow, override it with `shadow-none` or use a plain container.
