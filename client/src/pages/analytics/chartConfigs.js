// Colours. Each category keeps one colour on every chart (a category's colour
// follows the category, never its position). The expense hues are ordered so
// neighbouring stacked segments stay distinguishable, including for colour-blind
// readers (validated: adjacent CVD ΔE >= 9, normal vision ΔE >= 16). Aging
// buckets are an ordered scale, so they use one hue from light (current) to
// dark (90+ days) rather than unrelated colours.
const COLOR = {
  blue: "#2a78d6",
  violet: "#4a3aa7",
  gray: "#a3a19a",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
};
const AGING_RAMP = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
export const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };
// Plain bars for a ranking whose flagged rows are the point (fuel bands).
const RANK_NEUTRAL = "#b4b2aa";

const CATEGORY = {
  invoices: { label: "Invoices", color: COLOR.blue },
  instructions: { label: "Instructions", color: COLOR.blue },
  addons: { label: "Add-ons", color: COLOR.violet },
  creditNotes: { label: "Credit notes", color: COLOR.gray },
  fuel: { label: "Fuel", color: COLOR.orange },
  parts: { label: "Parts & maintenance", color: COLOR.aqua },
  maintenance: { label: "Maintenance & other", color: COLOR.aqua },
  subcontractors: { label: "Subcontractors", color: COLOR.yellow },
  wages: { label: "Wages", color: COLOR.magenta },
  subcontractorTurnover: { label: "Subcontractor turnover", color: COLOR.yellow },
  subcontractorExpense: { label: "Subcontractor expense", color: COLOR.yellow },
  current: { label: "Current", color: AGING_RAMP[0] },
  thirtyDays: { label: "30 days", color: AGING_RAMP[1] },
  sixtyDays: { label: "60 days", color: AGING_RAMP[2] },
  ninetyDays: { label: "90+ days", color: AGING_RAMP[3] },
  invoicePayments: { label: "Invoice payments", color: COLOR.blue },
  addonPayments: { label: "Add-on payments", color: COLOR.violet },
  otherPayments: { label: "Other payments", color: COLOR.gray },
};

// Categories placed in one stack (one bar per row).
const inStack = (stack, ...keys) => keys.map((key) => ({ key, stack, ...CATEGORY[key] }));

const TURNOVER = ["invoices", "addons", "creditNotes"];
const TRUCK_INCOME = ["instructions", "addons", "creditNotes"];

const NET = { label: "Net (income − expenses)", plus: "income", minus: ["expense"] };

// Headline figures above each chart. Each receives the chart's points (VAT
// basis already applied) through a small helper:
//   t.row(i)        total of the i-th row        t.stack(s)  a stack's total
//   t.cat(key)      a category's total            t.count     number of rows
//   t.top()         the row with the largest total
// and returns [{ label, value, format: "money" | "percent" | "count", tone, note }].
const share = (part, whole) => (whole ? (part / whole) * 100 : 0);

const comparisonTiles = (firstLabel, secondLabel) => (t) => {
  const first = t.row(0);
  const second = t.count > 1 ? t.row(1) : null;
  return [
    { label: firstLabel, value: first, format: "money" },
    second !== null && { label: t.name(1) || secondLabel, value: second, format: "money" },
    second !== null && {
      label: `${secondLabel} share`,
      value: share(second, first),
      format: "percent",
    },
  ].filter(Boolean);
};

const netTiles = (incomeOf, expenseOf) => (t) => {
  const income = incomeOf(t);
  const expense = expenseOf(t);
  const net = income - expense;
  return [
    { label: "Income", value: income, format: "money" },
    { label: "Expenses", value: expense, format: "money" },
    { label: "Net", value: net, format: "money", tone: net >= 0 ? "positive" : "negative" },
    { label: "Margin", value: share(net, income), format: "percent", tone: net >= 0 ? "positive" : "negative" },
  ];
};

const rankingTiles = (totalLabel) => (t) => {
  const top = t.top();
  const total = t.stack("all");
  return [
    { label: totalLabel, value: total, format: "money" },
    {
      label: "Average per truck",
      value: t.count ? total / t.count : 0,
      format: "money",
      note: `${t.count} truck${t.count === 1 ? "" : "s"}`,
    },
    top && { label: "Highest", value: top.total, format: "money", note: top.name },
  ].filter(Boolean);
};

// Fuel per truck for the month: over R50,000 is flagged, under R15,000 is low,
// anything in between is average.
const FUEL_HIGH = 50000;
const FUEL_LOW = 15000;

// Report navigation, in display order.
export const REPORT_GROUPS = [
  { label: "Overview", reports: ["incomeVsExpense", "wagesVsExpenses"] },
  { label: "Revenue", reports: ["turnoverPerMonth", "paymentsReceivedPerMonth"] },
  { label: "Debtors", reports: ["agingAnalysis"] },
  {
    label: "Trucks",
    reports: [
      "truckIncomeVsExpense",
      "turnoverPerTruck",
      "turnoverVsFuelPerTruck",
      "fuel",
      "turnoverVsDieselCost",
    ],
  },
  {
    label: "Subcontractors",
    reports: ["subcontractorVsTurnover", "subcontractorTurnoverPerMonth", "turnoverVsSubbieExpense"],
  },
];

// Every chart starts on Incl. VAT; the toggle choice is then remembered per chart.
//
//   categories    which categories are stacked, and into which stack
//   stackLabels   names for side-by-side stacks (legend groups, tooltip, table)
//   totals        with no truck selected, collapse all trucks into one row
//   horizontal    rank many rows as horizontal bars (long truck lists): one
//                 single-colour bar per row (its total), value at the end; the
//                 category split is in the tooltip and table
//   ranking       bar colour for a ranking, optional colours above / below a
//                 value, and dashed marker lines
//   filter        which extra filter the chart uses: client | subcontractor | truck
export const CHARTS = {
  fuel: {
    title: "Fuel per Truck",
    description: "Fuel spend per truck for the month. Red is over R50,000, green is under R15,000, grey is average.",
    noun: "fuel",
    categories: inStack("all", "fuel"),
    horizontal: true,
    showShare: true,
    ranking: {
      color: RANK_NEUTRAL,
      above: { value: FUEL_HIGH, color: STATUS.critical },
      below: { value: FUEL_LOW, color: STATUS.good },
      markers: [
        { value: FUEL_LOW, label: "R15k" },
        { value: FUEL_HIGH, label: "R50k" },
      ],
    },
    statusLabel: (total) =>
      total > FUEL_HIGH
        ? "Exceeds R50,000"
        : total < FUEL_LOW
          ? "Under R15,000"
          : "Average (R15,000 – R50,000)",
    tiles: rankingTiles("Total fuel"),
  },
  turnoverPerMonth: {
    title: "Turnover per Month vs Client",
    description: "Invoices and add-ons less credit notes — for all clients, or compare one client.",
    noun: "turnover",
    categories: inStack("all", ...TURNOVER),
    filter: "client",
    tiles: (t) => [
      ...comparisonTiles("Total turnover", "Client")(t),
      t.count === 1 && { label: "Invoices", value: t.cat("invoices"), format: "money" },
      t.count === 1 && { label: "Credit notes", value: t.cat("creditNotes"), format: "money" },
    ].filter(Boolean),
  },
  agingAnalysis: {
    title: "Debtors Age Analysis",
    description: "What clients owed at the close of the previous month, by how long it has been outstanding.",
    noun: "aging analysis",
    // Each bucket in its own stack, so the buckets are separate bars side by side.
    categories: ["current", "thirtyDays", "sixtyDays", "ninetyDays"].flatMap((key) =>
      inStack(key, key)
    ),
    filter: "client",
    tiles: (t) => {
      const total = t.grand;
      return [
        { label: "Total outstanding", value: total, format: "money" },
        { label: "Current", value: t.cat("current"), format: "money" },
        { label: "90+ days", value: t.cat("ninetyDays"), format: "money" },
        {
          label: "90+ days share",
          value: share(t.cat("ninetyDays"), total),
          format: "percent",
          tone: share(t.cat("ninetyDays"), total) > 25 ? "negative" : undefined,
        },
      ];
    },
  },
  subcontractorVsTurnover: {
    title: "Subbie vs Turnover",
    description: "One subcontractor's share of turnover against total turnover.",
    noun: "subbie vs turnover",
    categories: inStack("all", ...TRUCK_INCOME, "subcontractorTurnover"),
    filter: "subcontractor",
    tiles: comparisonTiles("Total turnover", "Subcontractor"),
  },
  subcontractorTurnoverPerMonth: {
    title: "Turnover vs Total Subbie",
    description: "All subcontractors' share of turnover against total turnover.",
    noun: "turnover vs total subcontractor",
    categories: inStack("all", ...TRUCK_INCOME, "subcontractorTurnover"),
    tiles: comparisonTiles("Total turnover", "Subcontractor"),
  },
  wagesVsExpenses: {
    title: "Wages vs Expenses",
    description: "Monthly wages against fuel, parts and subcontractor costs.",
    noun: "wages vs expenses",
    categories: inStack("all", "wages", "fuel", "parts", "subcontractors"),
    tiles: (t) => {
      const wages = t.row(0);
      const expenses = t.count > 1 ? t.row(1) : 0;
      return [
        { label: "Wages", value: wages, format: "money" },
        { label: "Expenses", value: expenses, format: "money" },
        { label: "Combined", value: wages + expenses, format: "money" },
        { label: "Wages share", value: share(wages, wages + expenses), format: "percent" },
      ];
    },
  },
  turnoverVsDieselCost: {
    title: "Turnover vs Diesel Cost",
    description: "Turnover for the month against what was spent on diesel.",
    noun: "turnover vs diesel cost",
    categories: [...inStack("turnover", ...TURNOVER), ...inStack("diesel", "fuel")],
    stackLabels: { turnover: "Turnover", diesel: "Diesel" },
    tiles: (t) => [
      { label: "Turnover", value: t.stack("turnover"), format: "money" },
      { label: "Diesel", value: t.stack("diesel"), format: "money" },
      {
        label: "Diesel as % of turnover",
        value: share(t.stack("diesel"), t.stack("turnover")),
        format: "percent",
      },
    ],
  },
  turnoverPerTruck: {
    title: "Turnover per Truck",
    description: "What each truck earned this month, split by the work it did.",
    noun: "turnover per truck",
    categories: inStack("all", ...TRUCK_INCOME),
    horizontal: true,
    showShare: true,
    ranking: { color: COLOR.blue },
    tiles: rankingTiles("Total turnover"),
  },
  incomeVsExpense: {
    title: "Income vs Expenses",
    description: "Turnover against every cost for the month, with the net result.",
    noun: "income vs expenses",
    categories: inStack("all", ...TURNOVER, "fuel", "parts", "subcontractors", "wages"),
    tiles: netTiles(
      (t) => t.row(0),
      (t) => (t.count > 1 ? t.row(1) : 0)
    ),
  },
  turnoverVsSubbieExpense: {
    title: "Turnover vs Subbie Expense",
    description: "Turnover against what one subcontractor was paid for the month.",
    noun: "turnover vs subbie expense",
    categories: inStack("all", ...TURNOVER, "subcontractorExpense"),
    filter: "subcontractor",
    tiles: comparisonTiles("Total turnover", "Subcontractor"),
  },
  turnoverVsFuelPerTruck: {
    title: "Turnover per Truck vs Diesel",
    description: "Truck turnover against diesel — all trucks together, or pick one.",
    noun: "turnover vs fuel per truck",
    categories: [...inStack("turnover", ...TRUCK_INCOME), ...inStack("fuel", "fuel")],
    stackLabels: { turnover: "Turnover", fuel: "Diesel" },
    totals: "All trucks",
    filter: "truck",
    tiles: (t) => [
      { label: "Turnover", value: t.stack("turnover"), format: "money" },
      { label: "Diesel", value: t.stack("fuel"), format: "money" },
      {
        label: "Diesel as % of turnover",
        value: share(t.stack("fuel"), t.stack("turnover")),
        format: "percent",
      },
    ],
  },
  truckIncomeVsExpense: {
    title: "Truck Income vs Expenses",
    description: "Truck income against fuel and maintenance — all trucks together, or pick one.",
    noun: "truck income vs expense",
    categories: [
      ...inStack("income", ...TRUCK_INCOME),
      ...inStack("expense", "fuel", "maintenance"),
    ],
    stackLabels: { income: "Income", expense: "Expenses" },
    net: NET,
    totals: "All trucks",
    filter: "truck",
    tiles: netTiles(
      (t) => t.stack("income"),
      (t) => t.stack("expense")
    ),
  },
  paymentsReceivedPerMonth: {
    title: "Payments Received",
    description: "Payments received in the month, by what they settled.",
    noun: "payments received",
    categories: inStack("all", "invoicePayments", "addonPayments", "otherPayments"),
    filter: "paymentClient",
    tiles: (t) => [
      ...comparisonTiles("Total payments", "Client")(t),
      t.count === 1 && { label: "Invoice payments", value: t.cat("invoicePayments"), format: "money" },
      t.count === 1 && { label: "Add-on payments", value: t.cat("addonPayments"), format: "money" },
    ].filter(Boolean),
  },
};
