# CLAUDE.md — madrasa-new-frontend

## Project Overview

Vite + React 19 frontend for multi-tenant SaaS Madrasa Management System.
Serves admins, teachers, parents, committee members across multiple madrasas (tenants).
PWA-capable. Bilingual: English + Malayalam (`ml`).
**Path**: `D:\nestjs\madrasa-new-frontend`
**Backend path**: `D:\nestjs\madrasproj-nest-backend`

## Tech Stack

- **Framework**: Vite 8 + React 19 + React Router v7 (NOT Next.js)
- **Styling**: Tailwind CSS v4 + class-variance-authority + clsx + tailwind-merge
- **UI Primitives**: Radix UI (dialog, dropdown, select, tabs, switch, slider, etc.)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State**: Zustand v5
- **Icons**: lucide-react
- **i18n**: custom via `lib/i18n.ts` (en + ml)
- **Router**: `src/App.tsx` — all routes defined with `<Routes>/<Route>`
- **Entry**: `src/main.tsx` → `src/App.tsx`

## App Structure

```
app/                           # Page components (imported by src/App.tsx)
├── admin/students/page.tsx    # Student list — DataTable, gender filter, import, edit
├── admin/students/[id]/page.tsx # Student detail — edit drawer, delete
├── admin/teachers/page.tsx    # Teacher list — DataTable
├── admin/page.tsx             # Dashboard
└── ...                        # Other pages

lib/
├── students-api.ts    # GET /api/madrasa/:clientId/students (pagination, filters, sort)
├── attendance-api.ts  # Attendance CRUD
├── auth-api.ts        # All login flows
├── classes-api.ts     # GET /api/v2/:clientId/classes
├── teachers-api.ts    # GET /api/v2/:clientId/teachers
└── i18n.ts            # t(namespace, key, lang)

components/
├── DashboardLayout.tsx
├── ui/DataTable.tsx   # Generic table: desktop table + mobile cards, sort, pageSize dropdown
├── ui/ImportModal.tsx # Generic import base: ImportConfig<TPayload> pattern, xlsx lazy-load
├── ui/PageHeader.tsx
├── ui/Cards.tsx
└── ui/StatusBadge.tsx

store/
├── auth.ts            # useAuthStore (Zustand persist) — user, accessToken, activeClientId
└── language.ts        # useLanguageStore — lang: "en" | "ml"
```

## Multi-Tenant Routing

1. **Path**: `/m/[slug]/...` — local dev primary
2. **Subdomain**: `slug.domain.com` — production

`lib/tenant-routing.ts` key helpers:
- `getTenantSlugFromPath(pathname)` — extract slug from `/m/[slug]/`
- `detectTenantSlug(pathname, hostname)` — path then subdomain fallback
- `roleHomePath({ role, actorType, tenantSlug })` — correct home URL
- `tenantLoginPath(tenantSlug)` — `/m/[slug]/admin/login` or `/super-admin/login`

## Auth System

**API client**: `lib/auth-api.ts`  
**Backend endpoint**: `${VITE_API_ORIGIN}/api/v2/auth/*`

| Function | Endpoint | Role |
|---|---|---|
| `loginSuperAdmin(identifier, password)` | `POST /auth/super-admin/login` | SUPER_ADMIN |
| `loginMadrasa(identifier, slug, password)` | `POST /auth/madrasa/login` | CLIENT_ADMIN |
| `loginTeacher(identifier, password, slug?)` | `POST /auth/teacher/login` | TEACHER |
| `requestParentOtp(slug, phone)` | `POST /auth/parent/request-otp` | — |
| `loginParent(slug, phone, {otpCode, challengeId})` | `POST /auth/parent/login` | PARENT |

Auth stored in `useAuthStore`. Access: `const { user, accessToken, activeClientId } = useAuthStore()`.

## Students API

`lib/students-api.ts` — `V1_BASE = ${VITE_API_ORIGIN}/api/madrasa`

```ts
getStudents(clientId, token, {
  page?, limit?,          // pagination
  search?,                // searches name + adno
  classId?, gender?,      // filters (sent as JSON: filters={"classId":"...","gender":"MALE"})
  status?,                // "ACTIVE" | "INACTIVE"
  sortBy?, sortOrder?,    // "asc" | "desc" — backend supports any field
})
// returns { data: StudentRecord[], total, page, limit }
```

## DataTable Component

`components/ui/DataTable.tsx` — reuse for all list pages.

```tsx
<DataTable
  columns={columns}          // Column<T>[] — set sortable:true for sortable cols
  data={data}
  keyExtractor={(r) => r.id}
  loading={loading}
  onSort={handleSort}        // (key, dir) => void
  sortKey={sortBy}
  sortDir={sortDir}
  pagination={{
    page, totalPages, total,
    pageSize,                // current items per page
    pageSizeOptions: [10,20,50,100],
    onPageChange: setPage,
    onPageSizeChange: (sz) => { setPageSize(sz); setPage(1); },
  }}
  mobileRender={(row) => <.../>}   // mobile card view
  onRowClick={(row) => navigate(...)}
/>
```

## ImportModal Component

`components/ui/ImportModal.tsx` — extend for any module.

```tsx
const config = useMemo<ImportConfig<CreateXPayload>>(() => ({
  entityName: "Students",
  templateFilename: "student-import-template",
  columns: IMPORT_COLUMNS,    // static ImportColumnDef[] — parse/validate callbacks
  createRow: (row) => createStudent(clientId!, token!, row),
  context: { classes },       // passed to parse() callbacks
}), [clientId, token, classes])

<ImportModal show={showImport} config={config} onComplete={reload} onClose={() => setShowImport(false)} />
```

## Environment Variables

```
VITE_API_ORIGIN=http://localhost:9000
VITE_API_BASE_PATH=/api/v2
```

## Dev Commands

```bash
npm run dev      # Vite dev server (default port 9000)
npm run build    # tsc -b && vite build → dist/
npm run preview  # Preview dist/
npm run lint     # ESLint
```

## i18n Pattern

```ts
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

const { lang } = useLanguageStore();  // "en" | "ml"
t("namespace", "key", lang)
```

Namespaces: `common`, `nav`, `adminDash`, `teacherDash`, `teacherPages`, `parentPages`, `adminPages`

## Component Patterns

All dashboard pages wrap with `<DashboardLayout>`.  
UI: `<StatCard>`, `<ActionCard>` from `@/components/ui/Cards`; `<PageHeader>`, `<SectionHeader>` from `@/components/ui/PageHeader`; `cn()` from `@/lib/utils`.  
Animations: framer-motion `initial/animate` pattern on page entry.

## Static Hosting (Cloudflare Pages)

`public/_redirects` — `/* /index.html 200` — already in place.  
Build cmd: `npm run build`. Output: `dist/`.

## Mock Data Status

| Page | Status |
|---|---|
| `teacher/attendance` | **REAL API** |
| `admin/students`, `admin/teachers` | **REAL API** |
| Everything else | Mock data |

Wire new pages: import from `lib/*-api.ts`, get `{ user, accessToken }` from `useAuthStore`, pass `user.clientId` + `accessToken`, handle loading/error.

## Backend Contract Notes

- Students API: `GET /api/madrasa/:clientId/students` — filters JSON supports `classId`, `gender`, `status`, `sectionId`
- Sort: pass `sortBy` + `sortOrder` query params (any Prisma field name)
- Attendance `classId` must be real UUID from DB
- `academicYearId` → `user.defaultAcademicYearId` from JWT
- Parent only calls `getStudentAttendance` for IDs in `user.accessibleStudentIds`
- Errors: `{ message: string, errors: [{field, fieldName, message}][] }`
- `AccademicYear` — double-c typo intentional in DB, don't fix
