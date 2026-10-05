import { calculateStatus } from "./AnalyticsFunctions.js";
import { formatRand } from "./CategoryBarChart.jsx";

// One colour and label per category, shared by every chart.
const CATEGORY = {
  invoices: { label: "Invoices", color: "#4169E1" },
  addons: { label: "Add-ons", color: "#8E7CC3" },
  creditNotes: { label: "Credit notes", color: "#9E9E9E" },
  instructions: { label: "Instructions", color: "#4169E1" },
  fuel: { label: "Fuel", color: "#FF6347" },
  parts: { label: "Parts & maintenance", color: "#FFA726" },
  maintenance: { label: "Maintenance & other", color: "#FFA726" },
  subcontractors: { label: "Subcontractors", color: "#EC407A" },
  wages: { label: "Wages", color: "#26A69A" },
  subcontractorTurnover: { label: "Subcontractor turnover", color: "#FF7043" },
  subcontractorExpense: { label: "Subcontractor expense", color: "#FF7043" },
  current: { label: "Current", color: "#4169E1" },
  thirtyDays: { label: "30 Days", color: "#4CAF50" },
  sixtyDays: { label: "60 Days", color: "#FFC107" },
  ninetyDays: { label: "90 Days", color: "#F44336" },
  invoicePayments: { label: "Invoice payments", color: "#4169E1" },
  addonPayments: { label: "Add-on payments", color: "#8E7CC3" },
  otherPayments: { label: "Other payments", color: "#9E9E9E" },
};

// Categories placed in one stack (one bar per row).
const inStack = (stack, ...keys) => keys.map((key) => ({ key, stack, ...CATEGORY[key] }));

const TURNOVER = ["invoices", "addons", "creditNotes"];
const TRUCK_INCOME = ["instructions", "addons", "creditNotes"];

const FUEL_STATUS = { good: "#4CAF50", warning: "#FFC107", bad: "#F44336" };

const NET = { label: "Net (Income − Expenses)", plus: "income", minus: ["expense"] };

// Each chart starts on the VAT basis it showed before the toggle existed
// (turnover-based charts were VAT-inclusive; truck, fuel and expense charts
// were VAT-exclusive). The toggle choice is then remembered per chart.
//
//   categories    which categories are stacked, and into which stack
//   stackLabels   names for side-by-side stacks (shown in the tooltip)
//   totals        with no truck selected, collapse all trucks into one row
//   wrapLabels    wrap long client / company names on the x-axis
export const CHARTS = {
  fuel: {
    title: "Fuel Per Truck",
    noun: "fuel",
    defaultIncludeVat: false,
    categories: inStack("all", "fuel"),
    showShare: true,
    statusColor: (total) => FUEL_STATUS[calculateStatus(total)],
    legendItems: [
      { label: "Good: R0-R3,500", color: FUEL_STATUS.good },
      { label: "Warning: R3,501-R4,500", color: FUEL_STATUS.warning },
      { label: "High: R4,501+", color: FUEL_STATUS.bad },
    ],
  },
  turnoverPerMonth: {
    title: "Turnover per month vs Client",
    noun: "turnover",
    defaultIncludeVat: true,
    categories: inStack("all", ...TURNOVER),
    wrapLabels: true,
  },
  agingAnalysis: {
    title: "30, 60, 90, Current",
    noun: "aging analysis",
    defaultIncludeVat: true,
    // Each bucket in its own stack, so the buckets are separate bars side by side.
    categories: ["current", "thirtyDays", "sixtyDays", "ninetyDays"].flatMap((key) =>
      inStack(key, key)
    ),
    wrapLabels: true,
  },
  subcontractorVsTurnover: {
    title: "Subbie VS Turnover",
    noun: "subbie vs turnover",
    defaultIncludeVat: true,
    categories: inStack("all", ...TURNOVER, "subcontractorTurnover"),
    wrapLabels: true,
  },
  subcontractorTurnoverPerMonth: {
    title: "Turnover VS Total Subbie",
    noun: "turnover vs total subcontractor",
    defaultIncludeVat: true,
    categories: inStack("all", ...TURNOVER, "subcontractorTurnover"),
    wrapLabels: true,
  },
  wagesVsExpenses: {
    title: "Wages per month VS Expenses",
    noun: "wages vs expenses",
    defaultIncludeVat: false,
    categories: inStack("all", "wages", "fuel", "parts", "subcontractors", "creditNotes"),
  },
  turnoverVsDieselCost: {
    title: "Turnover vs Diesel Cost",
    noun: "turnover vs diesel cost",
    defaultIncludeVat: true,
    categories: [...inStack("turnover", ...TURNOVER), ...inStack("diesel", "fuel")],
    stackLabels: { turnover: "Turnover", diesel: "Diesel" },
  },
  turnoverPerTruck: {
    title: "Turnover Per Truck",
    noun: "turnover per truck",
    defaultIncludeVat: false,
    categories: inStack("all", ...TRUCK_INCOME),
    showShare: true,
  },
  incomeVsExpense: {
    title: "Income vs Expense Per Month",
    noun: "income vs expenses",
    defaultIncludeVat: true,
    categories: inStack("all", ...TURNOVER, "fuel", "parts", "subcontractors", "wages"),
    summary: (data) => {
      const total = (name) => data.find((point) => point.name === name)?.__total_all || 0;
      return `${NET.label}: ${formatRand(total("Income") - total("Expenses"))}`;
    },
  },
  turnoverVsSubbieExpense: {
    title: "Turnover VS Subbie Expense",
    noun: "turnover vs subbie expense",
    defaultIncludeVat: true,
    categories: inStack("all", ...TURNOVER, "subcontractorExpense"),
    wrapLabels: true,
  },
  turnoverVsFuelPerTruck: {
    title: "Turnover Per Truck VS Diesel",
    noun: "turnover vs fuel per truck",
    defaultIncludeVat: false,
    categories: [...inStack("turnover", ...TRUCK_INCOME), ...inStack("fuel", "fuel")],
    stackLabels: { turnover: "Turnover", fuel: "Diesel" },
    totals: "Totals (All Trucks)",
  },
  truckIncomeVsExpense: {
    title: "Truck Income VS Truck Expenses",
    noun: "truck income vs expense",
    defaultIncludeVat: false,
    categories: [
      ...inStack("income", ...TRUCK_INCOME),
      ...inStack("expense", "fuel", "maintenance"),
    ],
    stackLabels: { income: "Income", expense: "Expenses" },
    net: NET,
    totals: "Totals (All Trucks)",
  },
  paymentsReceivedPerMonth: {
    title: "Payments Received per Month",
    noun: "payments received",
    defaultIncludeVat: true,
    categories: inStack("all", "invoicePayments", "addonPayments", "otherPayments"),
    wrapLabels: true,
  },
};
