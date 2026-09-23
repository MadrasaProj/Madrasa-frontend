# shadcn Component Migration

Scope: every file under `app/` and `components/` in this repository.

## Completion gate

- [x] No native `button`, `input`, `select`, or `textarea` remains in page/component files except the shared primitive implementations.
- [ ] Custom modal overlays use `Dialog`.
- [ ] Custom drawers use the shared `Drawer`.
- [ ] Repeated control styling is removed in favor of shared primitives.
- [ ] TypeScript/build validation passes.

## Batches

- [x] Shared primitives: Button, Input, Textarea, Select, Dialog.
- [x] Shared UI: DataTable, ClassDivisionsPicker, IbadahCounter, Cards, PageHeader, ApiErrorBanner, Drawer.
- [x] Auth, navigation, dashboard layout, and install controls.
- [x] Admin pages and admin-specific components.
- [x] Teacher pages and teacher-specific components.
- [x] Parent pages.
- [x] Committee and shared report pages.
- [x] Exam, profile, student, import, and social-frame components.
- [x] Run repository-wide native-control scan and fix all remaining results.

## Current overlay audit

The native-control migration is complete. The remaining overlay surfaces are being converted from fixed-position motion wrappers to `Dialog`/`Drawer`; the current audit finds 43 overlay-bearing files, including admin, teacher, parent, committee, profile, import, and exam flows. `CropperModal` and `ExcelImportModal` now use `Dialog`.
