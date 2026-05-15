import {
  calcBreakBulkCost,
  calculateTotalCostFromRates,
  calcContainerBasedCost,
} from "../../../utils/instructions/costCalculation";

// ── calcBreakBulkCost ────────────────────────────────────────────────────────

describe("calcBreakBulkCost", () => {
  const rows = [
    { weight: "100" },
    { weight: "200" },
    { weight: "50" },
  ];

  it("weight mode: sum(weights) × unitRate", () => {
    expect(calcBreakBulkCost(rows, 5)).toBe(1750); // 350 × 5
  });

  it("weight mode: skips null / empty / NaN weight rows", () => {
    const mixed = [{ weight: "100" }, { weight: "" }, { weight: null }, { weight: "abc" }];
    expect(calcBreakBulkCost(mixed, 10)).toBe(1000); // 100 × 10
  });

  it("weight mode: empty rows gives 0", () => {
    expect(calcBreakBulkCost([], 10)).toBe(0);
  });

  it("set-rate mode: setRateAmount × rowCount", () => {
    expect(calcBreakBulkCost(rows, 0, { isSetRateMode: true, setRateAmount: 500 })).toBe(1500);
  });

  it("set-rate mode: uses length 1 minimum when rows is empty", () => {
    expect(calcBreakBulkCost([], 0, { isSetRateMode: true, setRateAmount: 500 })).toBe(500);
  });

  it("set-rate mode: returns 0 when setRateAmount is 0 (caller must resolve historicalSetRate before passing)", () => {
    // calcBreakBulkCost has no knowledge of historicalSetRate.
    // The caller (useRateManagement / performSave) is responsible for
    // resolving the fallback before calling this function.
    expect(calcBreakBulkCost([{}], 0, { isSetRateMode: true, setRateAmount: 0 })).toBe(0);
  });
});

// ── calculateTotalCostFromRates ──────────────────────────────────────────────

describe("calculateTotalCostFromRates", () => {
  it("base cost with no containers", () => {
    expect(calculateTotalCostFromRates(100, 200, 300, 2, 1, 1)).toBe(700);
  });

  it("adds surcharge amounts for flagged containers", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 50, surcharge_12m_amount: 0 },
      { addSurcharges: true, is_12m_surcharge: true, surchargeAmount: 0, surcharge_12m_amount: 80 },
      { addSurcharges: false, surchargeAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(130);
  });

  it("adds hazardous amounts", () => {
    const containers = [
      { hazardous: true, hazardousAmount: 75 },
      { hazardous: false, hazardousAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(75);
  });

  it("adds VGM amounts", () => {
    const containers = [
      { vgm: true, vgmAmount: 30 },
      { vgm: false, vgmAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(30);
  });

  it("sums base + surcharge + hazardous + VGM", () => {
    const containers = [
      {
        addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 50, surcharge_12m_amount: 0,
        hazardous: true, hazardousAmount: 25,
        vgm: true, vgmAmount: 10,
      },
    ];
    // base: 100×1 = 100, surcharge: 50, hazardous: 25, vgm: 10 → 185
    expect(calculateTotalCostFromRates(100, 0, 0, 1, 0, 0, containers)).toBe(185);
  });
});

// ── calcContainerBasedCost ───────────────────────────────────────────────────

describe("calcContainerBasedCost", () => {
  const baseFormData = {
    sixMeterRate: "100",
    twelveMeterRate: "200",
    abnormalRate: "300",
    rateper_breakbulk: "50",
    num_six_meters: 2,
    num_twelve_meters: 1,
    num_abnormal: 1,
    num_breakbulk: 3,
    rateWeight: "Container",
  };

  it("calculates 6m + 12m + abnormal costs", () => {
    // 100×2 + 200×1 + 300×1 = 700
    expect(calcContainerBasedCost(baseFormData, [])).toBe(700);
  });

  it("includes break bulk cost only when isCrossHaul=true AND rateWeight=Container", () => {
    // 700 + 50×3 = 850
    expect(calcContainerBasedCost(baseFormData, [], { isCrossHaul: true })).toBe(850);
  });

  it("excludes break bulk when not cross-haul", () => {
    expect(calcContainerBasedCost(baseFormData, [], { isCrossHaul: false })).toBe(700);
  });

  it("excludes break bulk when rateWeight is not Container", () => {
    const fd = { ...baseFormData, rateWeight: "kg" };
    expect(calcContainerBasedCost(fd, [], { isCrossHaul: true })).toBe(700);
  });

  it("adds surcharge totals from containers", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 40, surcharge_12m_amount: 0 },
    ];
    const fd = { ...baseFormData, sixMeterRate: "0", twelveMeterRate: "0", abnormalRate: "0" };
    expect(calcContainerBasedCost(fd, containers)).toBe(40);
  });
});
