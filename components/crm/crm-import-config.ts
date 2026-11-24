import type { ImportConfig } from "@/components/ui/ImportModal";
import type { BulkImportLeadItem } from "@/lib/crm-api";
import { LEAD_STATUS_LABELS } from "./crm-types";

export function createCrmImportConfig(
  bulkImportHandler: (items: BulkImportLeadItem[]) => Promise<any>
): ImportConfig<BulkImportLeadItem> {
  return {
    entityName: "Contacts / Leads",
    templateFilename: "crm-contacts-template",
    columns: [
      {
        header: "Madrasa Name",
        field: "name",
        required: false,
        example: "Darul Huda Islamic Academy",
        validate: (val, row) => {
          if (!val && !row.contactName) {
            return "Either Madrasa Name or Contact Name must be provided";
          }
          return null;
        },
      },
      {
        header: "District",
        field: "district",
        required: true,
        example: "Malappuram",
        validate: (val) => (!val || !String(val).trim() ? "District is required" : null),
      },
      { header: "Place / Town", field: "place", required: false, example: "Chemmad" },
      { header: "Primary Contact Person", field: "contactName", required: false, example: "Usthad Ahmad Kabeer" },
      { header: "Primary Phone", field: "contactPhone", required: false, example: "9876543210" },
      { header: "Secondary / Alt Number", field: "secondaryPhone", required: false, example: "9876543211" },
      { header: "Role / Designation", field: "contactRole", required: false, example: "Sadr Usthad" },
      {
        header: "Status",
        field: "status",
        required: false,
        example: "New",
        parse: (raw) => {
          if (!raw) return "NEW";
          const normalized = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");
          for (const [key, label] of Object.entries(LEAD_STATUS_LABELS)) {
            if (
              key === normalized ||
              label.toUpperCase().replace(/[\s-]+/g, "_") === normalized
            ) {
              return key;
            }
          }
          return normalized;
        },
      },
      { header: "Syllabus Type", field: "type", required: false, example: "Samastha" },
      {
        header: "Student Count",
        field: "studentCount",
        required: false,
        example: "250",
        parse: (val) => (val ? Number(String(val).replace(/[^0-9]/g, "")) : 0),
      },
      {
        header: "Teacher Count",
        field: "teacherCount",
        required: false,
        example: "12",
        parse: (val) => (val ? Number(String(val).replace(/[^0-9]/g, "")) : 0),
      },
      { header: "Address", field: "address", required: false, example: "Chemmad P.O, Tirurangadi" },
      {
        header: "Source",
        field: "source",
        required: false,
        example: "WHATSAPP",
        parse: (raw) => (raw ? String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_") : "WHATSAPP"),
      },
      {
        header: "Existing Software",
        field: "existingSoftware",
        required: false,
        example: "Registers, Manual books",
      },
      {
        header: "Initial Notes / Follow-up",
        field: "notes",
        required: false,
        example: "Interested in admission module; requested call next Monday",
      },
    ],
    createRow: async (row: BulkImportLeadItem) => {
      await bulkImportHandler([row]);
    },
    createBulk: async (rows: BulkImportLeadItem[]) => {
      const res = await bulkImportHandler(rows);
      return res || { imported: rows.map((_, idx) => ({ rowIndex: idx, action: "created" })) };
    },
  };
}
