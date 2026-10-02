/**
 * Component tests for the instruction search on the client overview page
 * (CompanyInstructionView) and the per-client instruction list (CompanyInstructions).
 *
 * All API calls are mocked; the search endpoint's responses are controlled per test.
 */

import React, { act } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import CompanyInstructionView from "../../pages/instructions/lists/views/CompanyInstructionView";
import CompanyInstructions from "../../pages/instructions/lists/views/CompanyInstructions";

jest.mock("../../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import api from "../../api";

const CLIENTS = [
  { m5clientkey: 7, companyname: "AFRICA GLOBAL LOGISTICS", representative: "A", email: "a@x", new_count: 0, in_progress_count: 1, completed_count: 0 },
  { m5clientkey: 9, companyname: "Carizo Trade", representative: "C", email: "c@x", new_count: 0, in_progress_count: 0, completed_count: 2 },
];

const result = (overrides) => ({
  m1key: 2383,
  client: 7,
  companyname: "AFRICA GLOBAL LOGISTICS",
  ksm_file_ref: "SEP 92",
  client_ref: "REF1",
  booking_ref: "BK1",
  status: "In Progress",
  matched_fields: ["KSM file ref"],
  matched_containers: null,
  ...overrides,
});

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

// Renders the target route's received state so navigation can be asserted.
const StateProbe = ({ name }) => {
  const location = useLocation();
  return <div data-testid="probe">{`${name}:${JSON.stringify(location.state)}`}</div>;
};

const renderOverview = () =>
  render(
    <MemoryRouter initialEntries={["/CompanyInstructionView"]}>
      <Routes>
        <Route path="/CompanyInstructionView" element={<CompanyInstructionView />} />
        <Route path="/Viewcontrollerinstructions" element={<StateProbe name="instruction" />} />
        <Route path="/CompanyInstructions" element={<StateProbe name="clientList" />} />
      </Routes>
    </MemoryRouter>,
  );

const typeSearch = (value) =>
  fireEvent.change(screen.getByPlaceholderText(/Search by container/), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("CompanyInstructionView search", () => {
  test("shows matching instructions instead of clients, and opens one directly", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("client-instruction-stats")) return Promise.resolve({ data: CLIENTS });
      if (url.includes("/search")) return Promise.resolve({ data: [result()] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderOverview();
    await screen.findByText("Carizo Trade");

    typeSearch("SEP 92");

    expect(await screen.findByText("Instruction 2383")).toBeInTheDocument();
    expect(screen.getByText("KSM file ref")).toBeInTheDocument();
    expect(screen.getByText(/1 matching instruction across 1 client/)).toBeInTheDocument();
    // The client table (and its unrelated clients) is replaced while searching
    expect(screen.queryByText("Carizo Trade")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Open"));
    const probe = await screen.findByTestId("probe");
    expect(probe.textContent).toContain("instruction:");
    expect(probe.textContent).toContain('"instructionId":2383');
    expect(probe.textContent).toContain('"clientId":7');
  });

  test("a slow response for a partial term does not overwrite the final term's results", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("client-instruction-stats")) return Promise.resolve({ data: CLIENTS });
      const q = new URLSearchParams(url.split("?")[1]).get("q");
      if (q === "SEP") {
        // Broad term: many clients, and slow
        return delay(900, { data: [result(), result({ m1key: 2408, client: 9, companyname: "Carizo Trade", ksm_file_ref: "SEP 109" })] });
      }
      if (q === "SEP 92") return delay(10, { data: [result()] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderOverview();
    await screen.findByText("Carizo Trade");

    typeSearch("SEP");
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining("q=SEP")), { timeout: 1000 });
    typeSearch("SEP 92");

    expect(await screen.findByText("Instruction 2383", {}, { timeout: 1500 })).toBeInTheDocument();
    // Let the stale "SEP" response land
    await act(() => delay(1000));
    expect(screen.queryByText("Instruction 2408")).not.toBeInTheDocument();
    expect(screen.queryByText("Carizo Trade")).not.toBeInTheDocument();
  });

  test("a failed search says so and can be retried, instead of showing every client", async () => {
    let fail = true;
    api.get.mockImplementation((url) => {
      if (url.includes("client-instruction-stats")) return Promise.resolve({ data: CLIENTS });
      if (url.includes("/search")) return fail ? Promise.reject(new Error("boom")) : Promise.resolve({ data: [result()] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderOverview();
    await screen.findByText("Carizo Trade");
    typeSearch("SEP 92");

    expect(await screen.findByText(/Search failed/)).toBeInTheDocument();
    expect(screen.queryByText("Carizo Trade")).not.toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(await screen.findByText("Instruction 2383")).toBeInTheDocument();
  });
});

describe("CompanyInstructions search", () => {
  test("finds a match outside the selected month and status tab, and clearing restores the filters", async () => {
    const now = new Date();
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 15).toISOString();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    api.get.mockImplementation((url) => {
      if (url === "/api/instructions/instructions") {
        return Promise.resolve({
          data: [
            { m1key: 2383, client: 7, status: "Completed", startingdate: lastYear, ksm_file_ref: "SEP 92" },
            { m1key: 2500, client: 7, status: "New", startingdate: thisMonth, ksm_file_ref: "OCT 1" },
          ],
        });
      }
      if (url.includes("/search")) return Promise.resolve({ data: [result({ status: "Completed" })] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/CompanyInstructions", state: { clientId: 7, clientName: "AGL", activeFilter: "New" } }]}>
        <Routes>
          <Route path="/CompanyInstructions" element={<CompanyInstructions />} />
        </Routes>
      </MemoryRouter>,
    );

    // Default view: current month, "New" tab — the old completed instruction is hidden
    expect(await screen.findByText("Instruction 2500")).toBeInTheDocument();
    expect(screen.queryByText("Instruction 2383")).not.toBeInTheDocument();

    typeSearch("SEP92");
    expect(await screen.findByText("Instruction 2383")).toBeInTheDocument();
    expect(screen.queryByText("Instruction 2500")).not.toBeInTheDocument();
    expect(screen.getByText(/1 match across all/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/search\?q=SEP92&clientId=7/));

    fireEvent.click(screen.getByText("Clear search"));
    expect(await screen.findByText("Instruction 2500")).toBeInTheDocument();
    expect(screen.queryByText("Instruction 2383")).not.toBeInTheDocument();
  });
});
