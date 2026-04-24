import { jest } from "@jest/globals";

// ─── Mock the database pool ────────────────────────────────────────────────
const mockQuery  = jest.fn();
const mockClient = { query: mockQuery, release: jest.fn() };
jest.mock("../../config/database.js", () => ({
  pool: { connect: jest.fn().mockResolvedValue(mockClient) },
}));

import { getAllPlans, getPlanByKey, getPlanFeatures, checkFeatureAccess, isValidPlanKey } from "../../models/billing/planModel.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isValidPlanKey", () => {
  test("accepts valid plan keys", () => {
    expect(isValidPlanKey("lite")).toBe(true);
    expect(isValidPlanKey("professional")).toBe(true);
    expect(isValidPlanKey("growth")).toBe(true);
    expect(isValidPlanKey("enterprise")).toBe(true);
  });
  test("rejects invalid keys", () => {
    expect(isValidPlanKey("free")).toBe(false);
    expect(isValidPlanKey("")).toBe(false);
    expect(isValidPlanKey(null)).toBe(false);
  });
});

describe("getAllPlans", () => {
  test("returns all active plans ordered by sort_order", async () => {
    const rows = [
      { plan_key: "lite", display_name: "Lite", sort_order: 1 },
      { plan_key: "professional", display_name: "Professional", sort_order: 2 },
    ];
    mockQuery.mockResolvedValueOnce({ rows });
    const result = await getAllPlans();
    expect(result).toEqual(rows);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("is_active = true"));
  });
});

describe("getPlanByKey", () => {
  test("returns plan when found", async () => {
    const plan = { plan_key: "lite", max_users: 2, max_trucks: 5 };
    mockQuery.mockResolvedValueOnce({ rows: [plan] });
    const result = await getPlanByKey("lite");
    expect(result).toEqual(plan);
  });
  test("returns null when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getPlanByKey("nonexistent");
    expect(result).toBeNull();
  });
});

describe("getPlanFeatures", () => {
  test("returns array of feature_keys for a plan", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ feature_key: "instructions" }, { feature_key: "invoice" }],
    });
    const features = await getPlanFeatures("lite");
    expect(features).toEqual(["instructions", "invoice"]);
  });
});

describe("checkFeatureAccess", () => {
  test("returns true when feature exists for plan", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    expect(await checkFeatureAccess("professional", "analytics")).toBe(true);
  });
  test("returns false when feature does not exist for plan", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await checkFeatureAccess("lite", "analytics")).toBe(false);
  });
});
