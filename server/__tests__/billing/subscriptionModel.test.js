import { jest } from "@jest/globals";

const mockQuery  = jest.fn();
const mockClient = { query: mockQuery, release: jest.fn() };

jest.mock("../../config/database.js", () => ({
  pool: { connect: jest.fn().mockResolvedValue(mockClient) },
}));

import {
  getCompanySubscription,
  recordBillingEvent,
  getCurrentUsage,
} from "../../models/billing/subscriptionModel.js";

beforeEach(() => jest.clearAllMocks());

describe("getCompanySubscription", () => {
  test("returns subscription row for a company admin", async () => {
    const row = { subscription_tier: "professional", subscription_status: "active" };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await getCompanySubscription("REG123");
    expect(result).toEqual(row);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE company_reg_num = $1"),
      ["REG123"]
    );
  });
  test("returns null when company not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getCompanySubscription("UNKNOWN");
    expect(result).toBeNull();
  });
});

describe("recordBillingEvent", () => {
  test("inserts a billing event record", async () => {
    mockQuery.mockResolvedValueOnce({});
    await recordBillingEvent(mockClient, {
      company_reg_num: "REG123",
      event_type: "plan_assigned",
      new_value: "lite",
      performed_by: "admin@wa.co.za",
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO billing_events"),
      expect.arrayContaining(["REG123", "plan_assigned"])
    );
  });
});

describe("getCurrentUsage", () => {
  test("returns user and truck counts", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "3" }] })
      .mockResolvedValueOnce({ rows: [{ count: "7" }] });
    const usage = await getCurrentUsage("REG123");
    expect(usage).toEqual({ user_count: 3, truck_count: 7 });
  });
});
