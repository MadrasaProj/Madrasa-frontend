import type { ImportColumnDef, ParseResult } from "@/components/ui/ImportModal";
import type { BulkUpsertTeacherRow } from "@/lib/teachers-api";

export const TEACHER_IMPORT_COLUMNS: ImportColumnDef[] = [
  {
    header: "Name",
    field: "name",
    required: true,
    example: "Abdul Rahman",
    validate: (val) => {
      const v = String(val ?? "").trim();
      if (v.length < 2) return "Name must be at least 2 characters";
      return null;
    },
  },
  {
    header: "Username",
    field: "username",
    required: true,
    example: "abdulrahman",
    parse: (val): ParseResult => {
      const v = val.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(v)) {
        return {
          ok: false,
          error: "Username must be 3–30 chars (a–z, 0–9, . _ -)",
        };
      }
      return { ok: true, value: v };
    },
  },
  {
    header: "Password",
    field: "password",
    required: false,
    example: "pass123",
    validate: (val) => {
      const v = String(val ?? "");
      if (!v) return null;
      if (v.length < 6) return "Password must be at least 6 characters";
      return null;
    },
  },
  {
    header: "Phone",
    field: "phone",
    required: false,
    example: "9876543210",
    parse: (val): ParseResult => {
      const v = val.trim();
      if (!v) return { ok: true, value: undefined };
      const digits = v.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return { ok: false, error: `Phone "${val}" looks invalid` };
      }
      return { ok: true, value: digits };
    },
  },
  {
    header: "Email",
    field: "email",
    required: false,
    example: "abdul@madrasa.org",
    parse: (val): ParseResult => {
      const v = val.trim();
      if (!v) return { ok: true, value: undefined };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return { ok: false, error: `Email "${val}" is not valid` };
      }
      return { ok: true, value: v.toLowerCase() };
    },
  },
  {
    header: "Qualification",
    field: "qualification",
    required: false,
    example: "B.Ed, M.Sc",
  },
  {
    header: "Address",
    field: "address",
    required: false,
    example: "123 Main St",
  },
  {
    header: "City",
    field: "city",
    required: false,
    example: "Kozhikode",
  },
  {
    header: "State",
    field: "state",
    required: false,
    example: "Kerala",
  },
  {
    header: "Country",
    field: "country",
    required: false,
    example: "India",
  },
  {
    header: "Pincode",
    field: "pincode",
    required: false,
    example: "673001",
  },
  {
    header: "Date of Birth",
    field: "dateOfBirth",
    required: false,
    example: "15/06/1990",
  },
  {
    header: "Blood Group",
    field: "bloodGroup",
    required: false,
    example: "O+",
  },
  {
    header: "Gender",
    field: "gender",
    required: false,
    example: "MALE",
    parse: (val): ParseResult => {
      const v = val.trim().toUpperCase();
      if (!v) return { ok: true, value: undefined };
      if (v !== "MALE" && v !== "FEMALE") {
        return { ok: false, error: `Gender must be MALE or FEMALE (got "${val}")` };
      }
      return { ok: true, value: v };
    },
  },
  {
    header: "Emergency Contact Name",
    field: "emergencyContactName",
    required: false,
    example: "Spouse Name",
  },
  {
    header: "Emergency Contact Phone",
    field: "emergencyContactPhone",
    required: false,
    example: "9876543210",
    parse: (val): ParseResult => {
      const v = val.trim();
      if (!v) return { ok: true, value: undefined };
      const digits = v.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return { ok: false, error: `Emergency phone "${val}" looks invalid` };
      }
      return { ok: true, value: digits };
    },
  },
  {
    header: "Status",
    field: "status",
    required: false,
    example: "ACTIVE",
    parse: (val): ParseResult => {
      const v = val.trim().toUpperCase();
      if (!v) return { ok: true, value: undefined };
      if (v !== "ACTIVE" && v !== "INACTIVE") {
        return { ok: false, error: `Status must be ACTIVE or INACTIVE (got "${val}")` };
      }
      return { ok: true, value: v };
    },
  },
];

export function toBulkUpsertTeacherRow(
  parsed: Record<string, unknown>,
): BulkUpsertTeacherRow {
  return {
    name: String(parsed.name ?? "").trim(),
    username: String(parsed.username ?? "").trim().toLowerCase(),
    password: parsed.password ? String(parsed.password) : undefined,
    phone: parsed.phone ? String(parsed.phone) : undefined,
    email: parsed.email ? String(parsed.email) : undefined,
    qualification: parsed.qualification ? String(parsed.qualification) : undefined,
    address: parsed.address ? String(parsed.address) : undefined,
    city: parsed.city ? String(parsed.city) : undefined,
    state: parsed.state ? String(parsed.state) : undefined,
    country: parsed.country ? String(parsed.country) : undefined,
    pincode: parsed.pincode ? String(parsed.pincode) : undefined,
    dateOfBirth: parsed.dateOfBirth ? String(parsed.dateOfBirth) : undefined,
    bloodGroup: parsed.bloodGroup ? String(parsed.bloodGroup) : undefined,
    gender: parsed.gender ? String(parsed.gender) : undefined,
    emergencyContactName: parsed.emergencyContactName ? String(parsed.emergencyContactName) : undefined,
    emergencyContactPhone: parsed.emergencyContactPhone ? String(parsed.emergencyContactPhone) : undefined,
    status: (parsed.status as "ACTIVE" | "INACTIVE" | undefined) ?? "ACTIVE",
  };
}
