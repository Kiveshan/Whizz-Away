import {
  fetchClients,
  fetchShipmentTypes,
  fetchStartingPoints,
  fetchDestinations,
  fetchRates,
  fetchSetRate,
  fetchInstruction,
  updateInstruction,
  deleteInstruction,
  generateInvoice,
  checkInvoiceStatus,
  checkContainerLegsExist,
  saveInstruction,
} from "../../../services/instructionService";

jest.mock("../../../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import api from "../../../api";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchClients", () => {
  it("calls correct endpoint and returns data", async () => {
    api.get.mockResolvedValue({ data: [{ id: 1, name: "ACME" }] });
    const result = await fetchClients();
    expect(api.get).toHaveBeenCalledWith("/api/instructions/active-clients");
    expect(result).toEqual([{ id: 1, name: "ACME" }]);
  });

  it("throws when api rejects", async () => {
    api.get.mockRejectedValue(new Error("Network error"));
    await expect(fetchClients()).rejects.toThrow("Network error");
  });
});

describe("fetchShipmentTypes", () => {
  it("calls correct endpoint and returns data", async () => {
    api.get.mockResolvedValue({ data: [{ id: 1, name: "Import" }] });
    const result = await fetchShipmentTypes();
    expect(api.get).toHaveBeenCalledWith("/api/instructions/shipment-types");
    expect(result).toEqual([{ id: 1, name: "Import" }]);
  });
});

describe("fetchStartingPoints", () => {
  it("calls correct endpoint with clientId", async () => {
    api.get.mockResolvedValue({ data: [{ starting_point: "Cape Town" }] });
    const result = await fetchStartingPoints(42);
    expect(api.get).toHaveBeenCalledWith("/api/instructions/client/42/starting-points");
    expect(result).toEqual([{ starting_point: "Cape Town" }]);
  });
});

describe("fetchDestinations", () => {
  it("encodes pickup in the URL", async () => {
    api.get.mockResolvedValue({ data: [{ destination: "Durban" }] });
    const result = await fetchDestinations(5, "Cape Town Port");
    expect(api.get).toHaveBeenCalledWith(
      "/api/instructions/client/5/destinations/Cape%20Town%20Port"
    );
    expect(result).toEqual([{ destination: "Durban" }]);
  });
});

describe("fetchRates", () => {
  it("passes start and destination as query params", async () => {
    api.get.mockResolvedValue({ data: { rateper_6: 1500 } });
    const result = await fetchRates(3, "CPT", "JHB");
    expect(api.get).toHaveBeenCalledWith("/api/instructions/client/3/rates", {
      params: { start: "CPT", destination: "JHB" },
    });
    expect(result).toEqual({ rateper_6: 1500 });
  });
});

describe("fetchSetRate", () => {
  it("encodes both pickup and dropoff", async () => {
    api.get.mockResolvedValue({ data: { set_rate: 5000 } });
    const result = await fetchSetRate(7, "Cape Town", "Jo burg");
    expect(api.get).toHaveBeenCalledWith(
      "/api/instructions/client/7/set-rate/Cape%20Town/Jo%20burg"
    );
    expect(result).toEqual({ set_rate: 5000 });
  });
});

describe("fetchInstruction", () => {
  it("calls fc/instruction/:id and returns data", async () => {
    api.get.mockResolvedValue({ data: { id: 99, pickup: "CPT" } });
    const result = await fetchInstruction(99);
    expect(api.get).toHaveBeenCalledWith("/api/instructions/fc/instruction/99");
    expect(result).toEqual({ id: 99, pickup: "CPT" });
  });
});

describe("updateInstruction", () => {
  it("sends put with correct payload shape", async () => {
    api.put.mockResolvedValue({ data: { success: true } });
    const instructionData = { pickup: "CPT" };
    const containers = [{ containerNum: "ABCD1234567" }];
    const weightData = [];
    const result = await updateInstruction(10, instructionData, containers, weightData);
    expect(api.put).toHaveBeenCalledWith("/api/instructions/fc/update/10", {
      instructionData,
      containers,
      weightData,
    });
    expect(result).toEqual({ success: true });
  });
});

describe("deleteInstruction", () => {
  it("calls delete on the correct endpoint", async () => {
    api.delete.mockResolvedValue({ data: { deleted: true } });
    const result = await deleteInstruction(55);
    expect(api.delete).toHaveBeenCalledWith("/api/instructions/fc/instruction/55");
    expect(result).toEqual({ deleted: true });
  });
});

describe("generateInvoice", () => {
  it("posts to generate-invoice with m1key", async () => {
    api.post.mockResolvedValue({ data: { invoiceId: "INV001" } });
    const result = await generateInvoice("M1KEY123");
    expect(api.post).toHaveBeenCalledWith("/generate-invoice/M1KEY123");
    expect(result).toEqual({ invoiceId: "INV001" });
  });
});

describe("checkInvoiceStatus", () => {
  it("checks invoice existence by m1key", async () => {
    api.get.mockResolvedValue({ data: { exists: true } });
    const result = await checkInvoiceStatus("M1KEY123");
    expect(api.get).toHaveBeenCalledWith("/api/invoice/check/M1KEY123");
    expect(result).toEqual({ exists: true });
  });
});

describe("checkContainerLegsExist", () => {
  it("encodes containerNum in URL", async () => {
    api.get.mockResolvedValue({ data: { hasLegs: true } });
    const result = await checkContainerLegsExist(10, "ABCD 1234567");
    expect(api.get).toHaveBeenCalledWith(
      "/api/instructions/fc/container/10/ABCD%201234567/legs-exists"
    );
    expect(result).toEqual({ hasLegs: true });
  });

  it("returns false for container without legs", async () => {
    api.get.mockResolvedValue({ data: { hasLegs: false } });
    const result = await checkContainerLegsExist(10, "ABCD1234567");
    expect(result).toEqual({ hasLegs: false });
  });
});

describe("saveInstruction", () => {
  it("posts to save-instruction with correct payload", async () => {
    api.post.mockResolvedValue({ data: { success: true, instructionId: 7 } });
    const controllerData = { pickup: "CPT", dropoff: "DBN" };
    const containerData = [];
    const weightData = null;
    const result = await saveInstruction(controllerData, containerData, weightData);
    expect(api.post).toHaveBeenCalledWith("/api/instructions/save-instruction", {
      controllerData,
      containerData,
      weightData,
    });
    expect(result).toEqual({ success: true, instructionId: 7 });
  });

  it("throws when api rejects", async () => {
    api.post.mockRejectedValue(new Error("500"));
    await expect(saveInstruction({}, [], null)).rejects.toThrow("500");
  });
});
