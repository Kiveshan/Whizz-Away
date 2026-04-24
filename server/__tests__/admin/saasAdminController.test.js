import { jest } from "@jest/globals";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockQuery   = jest.fn();
const mockClient  = { query: mockQuery, release: jest.fn() };

jest.mock("../../config/database.js", () => ({
  pool: { connect: jest.fn().mockResolvedValue(mockClient) },
}));

jest.mock("../../models/billing/subscriptionModel.js", () => ({
  updateSubscriptionTier: jest.fn().mockResolvedValue(undefined),
  recordBillingEvent:     jest.fn().mockResolvedValue(undefined),
  getBillingEvents:       jest.fn().mockResolvedValue([]),
  getAllBillingEvents:     jest.fn().mockResolvedValue({ events: [], total: 0 }),
  getCurrentUsage:        jest.fn().mockResolvedValue({ user_count: 1, truck_count: 2 }),
}));

jest.mock("../../models/billing/planModel.js", () => ({
  getPlanByKey:   jest.fn().mockResolvedValue({ plan_key: "lite", max_users: 2, max_trucks: 5 }),
  isValidPlanKey: jest.fn().mockReturnValue(true),
  getAllPlans:     jest.fn().mockResolvedValue([]),
}));

jest.mock("../../middleware/planAuthorization.js", () => ({
  PLAN_RANK:       { lite: 1, professional: 2, growth: 3, enterprise: 4 },
  ROLE_PLAN_MAP:   { Controller: "growth" },
  ROLEID_NAME_MAP: { 2: "Controller" },
}));

import { assignPlan, suspendCompany, listBillingEvents } from "../../controllers/admin/saasAdminController.js";

const mockRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockClient.query.mockReset();
  // Default: BEGIN/COMMIT succeed, company exists
  mockClient.query
    .mockResolvedValueOnce({})                                   // BEGIN
    .mockResolvedValueOnce({ rows: [{ subscription_tier: "none" }] }) // company check
    .mockResolvedValueOnce({});                                  // COMMIT
});

describe("assignPlan", () => {
  test("returns 400 when plan is missing", async () => {
    const req = { params: { company_reg_num: "123" }, body: {}, user: { email: "a@b.com" } };
    const res = mockRes();
    await assignPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 200 and success on valid assignment", async () => {
    const { isValidPlanKey } = await import("../../models/billing/planModel.js");
    isValidPlanKey.mockReturnValue(true);

    const req = {
      params: { company_reg_num: "123" },
      body:   { plan: "lite", setup_fee_paid: true, billing_anchor_day: 1 },
      user:   { email: "admin@wa.co.za" },
    };
    const res = mockRes();
    await assignPlan(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, plan: "lite" }));
  });
});

describe("suspendCompany", () => {
  test("returns 400 when reason is missing", async () => {
    const req = { params: { company_reg_num: "123" }, body: {}, user: { email: "a@b.com" } };
    const res = mockRes();
    await suspendCompany(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("listBillingEvents", () => {
  test("returns paginated results", async () => {
    const { getAllBillingEvents } = await import("../../models/billing/subscriptionModel.js");
    getAllBillingEvents.mockResolvedValueOnce({ events: [], total: 0 });

    const req = { query: { page: "1", limit: "10" } };
    const res = mockRes();
    await listBillingEvents(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ events: [], total: 0, page: 1 })
    );
  });
});
