/**
 * Display helpers shared by the controller instruction screens (client list,
 * instruction list, view, create) so type labels, status colours, money and
 * dates read the same everywhere.
 */

export const SHIPMENT_TYPE_LABELS = {
  1: "Import",
  2: "Export",
  3: "Cross-Haul",
  4: "Cross-Haul (Break Bulk)",
  5: "Add-On",
};

// Rows arrive with the type in different shapes depending on the endpoint
// (shipment_type id, type_text slug, shipmenttype name), so normalise to the id.
const TYPE_NAME_TO_ID = {
  import: "1",
  export: "2",
  "cross-haul": "3",
  "cross haul": "3",
  "cross-haul-break-bulk": "4",
  "cross-haul(break bulk)": "4",
  "cross-haul (break bulk)": "4",
  "cross haul(break bulk)": "4",
  "add-on": "5",
  "add on": "5",
};

export const shipmentTypeId = (item = {}) => {
  const id = String(item.shipment_type ?? "");
  if (SHIPMENT_TYPE_LABELS[id]) return id;
  const name = (item.type_text || item.type || item.shipmenttype || "").toLowerCase().trim();
  return TYPE_NAME_TO_ID[name] || "";
};

export const shipmentTypeLabel = (item = {}) =>
  SHIPMENT_TYPE_LABELS[shipmentTypeId(item)] || item.type_text || item.shipmenttype || "—";

// Units that switch an instruction from per-container to per-weight pricing.
export const WEIGHT_UNITS = ["kg", "ton", "m³"];

export const statusPillClass = (status) => {
  switch ((status || "").toLowerCase()) {
    case "new":
      return "wa-pill-new";
    case "in progress":
      return "wa-pill-progress";
    case "completed":
      return "wa-pill-completed";
    default:
      return "wa-pill-neutral";
  }
};

// Same money format as the rest of the app ("R245,377.81") — see
// Creditors/subContractors/services/statementFormatting.js for why en-US.
export const formatRand = (value) =>
  `R${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Compact day-first date, e.g. "05 Mar 2026"; "—" when missing. */
export const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};
