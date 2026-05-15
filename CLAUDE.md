# CLAUDE.md — madrasa-new-frontend

## Project Overview

Next.js 16 frontend for a multi-tenant SaaS Madrasa Management System.
Serves admins, teachers, parents, and committee members across multiple madrasas (tenants).
PWA-capable. Bilingual: English + Malayalam (`ml`).

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **React**: 19
- **Styling**: Tailwind CSS v4 + class-variance-authority + clsx + tailwind-merge
- **UI Primitives**: Radix UI (dialog, dropdown, select, tabs, switch, slider, etc.)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State**: Zustand v5
- **Icons**: lucide-react
- **i18n**: custom via `lib/i18n.ts` (en + ml)

## App Structure

```
app/
├── page.tsx               # Root → redirects to /super-admin/login
├── layout.tsx             # RootLayout with PwaRegister
├── super-admin/login/     # Super-admin login (platform-level)
├── m/[slug]/              # Tenant-scoped routes
│   ├── login/             # Redirects to /m/[slug]/admin/login
│   ├── admin/login/       # CLIENT_ADMIN login
│   ├── teacher/login/     # TEACHER login
│   └── parent/login/      # PARENT login (OTP or password)
├── admin/                 # Admin dashboard + sub-pages
│   ├── page.tsx           # Dashboard
│   ├── students/          # Student list + [id] detail
│   ├── teachers/          # Teacher list
│   ├── attendance/        # View attendance
│   ├── absent/ present/   # Quick views
│   ├── fees/ (paid/unpaid)
│   ├── exams/
│   ├── reports/
│   ├── seats/             # Exam seat plan
│   ├── elections/
│   ├── notifications/
│   ├── id-cards/
│   ├── posters/
│   ├── config/            # Madrasa settings
│   └── sksbv/
├── teacher/               # Teacher dashboard + sub-pages
│   ├── attendance/        # Mark + history + stats — WIRED TO REAL API
│   ├── present/ absent/
│   ├── homework/ homework-list/
│   ├── diary/
│   ├── ibadah/
│   ├── exams/
│   ├── performance/
│   ├── elections/
│   └── notifications/
├── parent/                # Parent portal
│   ├── attendance/
│   ├── fees/
│   ├── results/
│   ├── homework/
│   ├── ibadah/
│   ├── elections/
│   └── notifications/
└── committee/             # Committee portal
    ├── attendance/
    ├── finance/ expenses/
    ├── students/
    ├── elections/
    ├── announcements/
    └── reports/

lib/
├── attendance-api.ts      # Attendance CRUD API client (REAL API, typed)
├── auth-api.ts            # Auth API client (all login flows)
├── tenant-routing.ts      # Tenant slug detection, path helpers
├── i18n.ts                # Translation helper t(namespace, key, lang)
└── utils.ts               # cn() utility

store/                     # Zustand stores (directory exists, files being added)
components/                # Shared components (directory exists, files being added)
mock-data/                 # Mock data used by pages NOT yet wired to API
```

## Multi-Tenant Routing

Tenants are detected two ways:

1. **Path**: `/m/[slug]/...` — primary for local dev
2. **Subdomain**: `slug.domain.com` — for production deployments

`lib/tenant-routing.ts` handles both. Key helpers:

- `getTenantSlugFromPath(pathname)` — extracts slug from `/m/[slug]/`
- `detectTenantSlug(pathname, hostname)` — tries path then subdomain
- `roleHomePath({ role, actorType, tenantSlug })` — builds correct home URL
- `tenantLoginPath(tenantSlug)` — `/m/[slug]/admin/login` or `/super-admin/login`

## Auth System

**API client**: `lib/auth-api.ts`
**Backend endpoint**: `${API_ORIGIN}/api/v2/auth/*`

| Function                                           | Endpoint                        | Role         |
| -------------------------------------------------- | ------------------------------- | ------------ |
| `loginSuperAdmin(identifier, password)`            | `POST /auth/super-admin/login`  | SUPER_ADMIN  |
| `loginMadrasa(identifier, slug, password)`         | `POST /auth/madrasa/login`      | CLIENT_ADMIN |
| `loginTeacher(identifier, password, slug?)`        | `POST /auth/teacher/login`      | TEACHER      |
| `requestParentOtp(slug, phone)`                    | `POST /auth/parent/request-otp` | —            |
| `loginParent(slug, phone, {otpCode, challengeId})` | `POST /auth/parent/login`       | PARENT       |

JWT payload (from `AuthSessionPayload`):

```ts
{
  access_token: string,
  user: {
    sub: string,
    name: string,
    role: string,            // SUPER_ADMIN | CLIENT_ADMIN | TEACHER | PARENT
    actorType?: string,
    clientId?: string,
    defaultAcademicYearId?: string | null,
    parentPhone?: string,
    accessibleStudentIds?: string[],  // PARENT only
    client?: { id, slug, subdomain }
  }
}
```

Auth state is stored in `useAuthStore` (Zustand, `store/auth` — being built).
Access via `const { user, accessToken } = useAuthStore()`.

## Attendance API

**API client**: `lib/attendance-api.ts`
**Backend endpoint**: `${API_BASE}/[clientId]/attendance`

```ts
// Bulk mark attendance (teacher saves)
bulkUpsertAttendance(clientId, token, {
  classId: string,
  date: "YYYY-MM-DD",
  academicYearId?: string,
  records: { studentId, status: "PRESENT"|"ABSENT"|"LATE"|"EXCUSED", notes? }[]
})

// Get class attendance for a date
getClassAttendance(clientId, token, { date, classId?, academicYearId? })

// Get student attendance history (parent/teacher)
getStudentAttendance(clientId, token, studentId, { from?, to?, academicYearId? })

// Update single record
updateAttendanceRecord(clientId, token, attendanceId, { status?, notes? })
```

**Important**: `teacher/attendance/page.tsx` currently uses placeholder classId UUIDs (`"class-4-uuid-placeholder"`). Once the backend has a `/classes` endpoint, replace `CLASS_ID_MAP` with real IDs from the user's JWT or a classes API call.

## Environment Variables

```
NEXT_PUBLIC_API_ORIGIN=http://localhost:9000   # Backend base URL
NEXT_PUBLIC_API_BASE_PATH=/api/v2              # API path prefix
```

## Dev Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## i18n Pattern

```ts
import { t } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";

const { lang } = useLanguageStore();   // "en" | "ml"
t("namespace", "key", lang)            // returns translated string
```

Namespaces in use: `common`, `nav`, `adminDash`, `teacherDash`, `teacherPages`, `parentPages`

## Component Patterns

All dashboard pages use `<DashboardLayout>` as wrapper.
UI components used:

- `<StatCard>`, `<ActionCard>` — from `@/components/ui/Cards`
- `<PageHeader>`, `<SectionHeader>` — from `@/components/ui/PageHeader`
- `cn()` from `@/lib/utils` for conditional className merging

Dashboard uses `framer-motion` for page-entry animations — keep `initial/animate` pattern consistent.

## Mock Data Status

Most pages still use `mock-data/` imports — not yet connected to real API.

| Page                 | Status                                    |
| -------------------- | ----------------------------------------- |
| `teacher/attendance` | **REAL API** (bulkUpsertAttendance wired) |
| Everything else      | Mock data                                 |

When wiring a page to the real API:

1. Import from `lib/*-api.ts` (or create new api file)
2. Get `{ user, accessToken }` from `useAuthStore`
3. Pass `user.clientId` and `accessToken` to API calls
4. Handle loading/error states

## Backend Contract Notes

- Backend prefix is `/api/v2/` — do NOT use `/api/` alone (that's legacy V1)
- Attendance `classId` must be a real UUID from the DB (Class model)
- `academicYearId` should be `user.defaultAcademicYearId` from JWT when available
- Parent can only call `getStudentAttendance` for IDs in `user.accessibleStudentIds`
- API returns validation errors as `{ message: string, errors: [{field, fieldName, message}][] }`

## Known Issues / In-Progress

- `store/` and `components/` directories are empty — being populated
- `useAuthStore` is used in pages but the store file isn't written yet — create `store/auth.ts`
- `useLanguageStore` used in pages but `store/language.ts` isn't written yet — create it
- Teacher attendance page classIds are hardcoded placeholders — needs `/classes` endpoint
- Parent OTP login — `devOtpCode` is returned by backend in non-prod; no SMS integration yet
- PWA service worker registered via `components/PwaRegister` — component file not yet created
