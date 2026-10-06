import api from "../../api.js";

// Utility Functions
export const calculateStatus = (cost) => {
  if (cost <= 3500) return "good";
  if (cost <= 4500) return "warning";
  return "bad";
};

// Dropdown data
export const fetchClients = async (setClients, setError) => {
  try {
    const response = await api.get("/api/get-clients");
    if (response.data.success) {
      setClients(response.data.data);
    } else {
      setError("Failed to fetch clients");
    }
  } catch (err) {
    setError(`Failed to fetch clients: ${err.message}`);
  }
};

export const fetchSubcontractors = async (setSubcontractors, setError) => {
  try {
    const response = await api.get("/api/get-subcontractors");
    if (response.data.success) {
      setSubcontractors(response.data.data);
    } else {
      setError("Failed to fetch subcontractors");
    }
  } catch (err) {
    setError(`Failed to fetch subcontractors: ${err.message}`);
  }
};

export const fetchTrucks = async (setTrucks, setError) => {
  try {
    const response = await api.get("/api/get-trucks");
    console.log("Raw /api/get-trucks response:", response);
    if (response.data.success) {
      const truckData = response.data.data.filter(
        (truck) => !truck.issubcontractor
      );
      console.log("Filtered trucks (non-subcontractors):", truckData);
      if (truckData.length === 0) {
        console.warn(
          "No non-subcontractor trucks found in /api/get-trucks response"
        );
        setError("No trucks available");
        setTrucks([]);
        return;
      }
      setTrucks(
        truckData.map((truck) => ({
          ...truck,
          truckregnumber:
            truck.truckregnum ||
            truck.reg_number ||
            truck.truck_reg ||
            truck.registration_number ||
            `Truck ID ${truck.m5truckskey}`,
        }))
      );
    } else {
      console.error("API error in /api/get-trucks:", response.data.message);
      setError("Failed to fetch trucks: " + response.data.message);
      setTrucks([]);
    }
  } catch (err) {
    console.error("Error fetching trucks:", err);
    setError(`Failed to fetch trucks: ${err.message}`);
    setTrucks([]);
  }
};

export const fetchPaymentClients = async (month, year, setPaymentClients, setError) => {
  try {
    const response = await api.get("/api/payment-clients", {
      params: { month, year },
    });
    if (response.data.success) {
      setPaymentClients(response.data.data);
    } else {
      setError("Failed to fetch payment clients");
    }
  } catch (err) {
    setError(`Failed to fetch payment clients: ${err.message}`);
  }
};

// Data fetching for the charts. Every analytics endpoint returns rows whose
// values are categories ({ [key]: { ex, vat } }); these turn them into chart
// rows { name, categories }.
const fetchCategoryRows = async (endpoint, params, toName, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await api.get(endpoint, {
      params: { ...params, _t: new Date().getTime() },
    });
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch data");
    }
    return response.data.data.map((item) => ({
      name: toName(item),
      categories: item.categories || {},
    }));
  } catch (err) {
    console.error(`Error fetching ${endpoint}:`, err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

const totalFirst = (totalName) => (rows) =>
  [...rows].sort((a, b) => (a.name === totalName ? -1 : b.name === totalName ? 1 : 0));

export const fetchFuelData = (month, year, setIsLoading, setError) =>
  fetchCategoryRows("/api/fuel-expenses", { month, year }, (i) => i.truckregnum, setIsLoading, setError);

export const fetchTurnoverData = (month, year, clientId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/turnover-per-month",
    { month, year, clientId: clientId || undefined },
    (i) => i.client,
    setIsLoading,
    setError
  ).then(totalFirst("Total Turnover"));

export const fetchAgingAnalysisData = (month, year, clientId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/aging-analysis",
    { month, year, clientId: clientId || undefined },
    (i) => i.client || "Total Aging",
    setIsLoading,
    setError
  );

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const fetchTurnoverVsDieselCost = (month, year, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/turnover-vs-diesel-cost",
    { month: MONTH_NAMES.indexOf(month) + 1, year },
    (i) => i.month,
    setIsLoading,
    setError
  );

// Income is the month's total turnover; expenses are the expense categories.
export const fetchIncomeVsExpenses = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    const params = { month, year, _t: new Date().getTime() };
    const [turnoverResponse, expensesResponse] = await Promise.all([
      api.get("/api/turnover-per-month", { params }),
      api.get("/api/all-expenses", { params }),
    ]);
    if (!turnoverResponse.data.success) {
      throw new Error(turnoverResponse.data.message || "Failed to fetch turnover data");
    }
    if (!expensesResponse.data.success) {
      throw new Error(expensesResponse.data.message || "Failed to fetch expenses data");
    }
    const total = turnoverResponse.data.data.find((item) => item.client === "Total Turnover");
    const expenses = expensesResponse.data.data.expenses[0];
    return [
      { name: "Income", categories: total?.categories || {} },
      { name: "Expenses", categories: expenses?.categories || {} },
    ];
  } catch (err) {
    console.error("Error fetching income vs expenses:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverPerTruck = (month, year, setIsLoading, setError) =>
  fetchCategoryRows("/api/turnover-per-truck", { month, year }, (i) => i.truckregnumber, setIsLoading, setError);

export const fetchWagesVsExpenses = (month, year, setIsLoading, setError) =>
  fetchCategoryRows("/api/wages-vs-expenses", { month, year }, (i) => i.name, setIsLoading, setError);

export const fetchSubcontractorTurnoverPerMonth = (month, year, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/subcontractor-turnover-per-month",
    { month, year },
    (i) => i.name,
    setIsLoading,
    setError
  );

export const fetchSubcontractorVsTurnover = (month, year, subcontractorId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/subcontractor-vs-turnover",
    { month, year, subcontractorId: subcontractorId || undefined },
    (i) => i.name,
    setIsLoading,
    setError
  );

export const fetchTurnoverVsSubbieExpense = (month, year, subcontractorId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/turnover-vs-subbie-expense",
    { month, year, subcontractorId: subcontractorId || undefined },
    (i) => i.name,
    setIsLoading,
    setError
  );

export const fetchTurnoverVsFuelPerTruck = (month, year, truckId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/turnover-vs-fuel-per-truck",
    { month, year, truckId: truckId || undefined },
    (i) => i.truckregnumber,
    setIsLoading,
    setError
  );

export const fetchTruckIncomeVsExpense = (month, year, truckId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/truck-income-vs-expense",
    { month, year, truckId: truckId || undefined },
    (i) => i.truckregnumber || "Unassigned / Workshop",
    setIsLoading,
    setError
  );

export const fetchPaymentsReceivedPerMonth = (month, year, clientId, setIsLoading, setError) =>
  fetchCategoryRows(
    "/api/payments-received-per-month",
    { month, year, clientId: clientId || undefined },
    (i) => i.name,
    setIsLoading,
    setError
  ).then(totalFirst("Total Payments"));
