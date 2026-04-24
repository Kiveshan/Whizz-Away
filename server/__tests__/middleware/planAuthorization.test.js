import { jest } from "@jest/globals";

jest.mock("../../config/database.js", () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

jest.mock("../../models/billing/planModel.js", () => ({
  getPlanFeatures: jest.fn(),
}));

import {
  isSuperAdmin,
  requirePlan,
  PLAN_RANK,
  ROLE_PLAN_MAP,
  ROLEID_NAME_MAP,
} from "../../middleware/planAuthorization.js";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe("PLAN_RANK constants", () => {
  test("lite ranks lowest", () => {
    expect(PLAN_RANK.lite).toBeLessThan(PLAN_RANK.professional);
    expect(PLAN_RANK.professional).toBeLessThan(PLAN_RANK.growth);
    expect(PLAN_RANK.growth).toBeLessThan(PLAN_RANK.enterprise);
  });
});

describe("ROLE_PLAN_MAP", () => {
  test("Finance Clerk requires lite minimum", () => {
    expect(ROLE_PLAN_MAP["Finance Clerk"]).toBe("lite");
  });
  test("Controller requires growth minimum", () => {
    expect(ROLE_PLAN_MAP["Controller"]).toBe("growth");
  });
});

describe("isSuperAdmin", () => {
  const next = jest.fn();

  test("passes when roleid is 7", () => {
    const req = { user: { roleid: 7 } };
    const res = mockRes();
    isSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("returns 403 when roleid is not 7", () => {
    const req = { user: { roleid: 1 } };
    const res = mockRes();
    isSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "NOT_SUPER_ADMIN" }));
  });

  test("returns 401 when no user", () => {
    const req = {};
    const res = mockRes();
    isSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("requirePlan", () => {
  const next = jest.fn();

  test("passes when plan rank is sufficient", () => {
    const req = { user: { subscription_tier: "growth" } };
    const res = mockRes();
    requirePlan("professional")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("blocks when plan rank is insufficient", () => {
    const req = { user: { subscription_tier: "lite" } };
    const res = mockRes();
    requirePlan("professional")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "PLAN_UPGRADE_REQUIRED" })
    );
  });

  test("blocks when tier is none", () => {
    const req = { user: { subscription_tier: "none" } };
    const res = mockRes();
    requirePlan("lite")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
