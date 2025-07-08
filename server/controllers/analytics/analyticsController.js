import { pool } from "../../config/database.js";
import {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
  getWagesVsExpenses,
} from "../../models/analytics/analyticsModel.js";

export const getFuelExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for fuel expenses: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getFuelExpenses(client, month, year);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getFuelExpensesController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getTurnoverPerMonthController = async (req, res) => {
  const { month, year, clientId } = req.query;
  console.log(`Received request for turnover: month=${month}, year=${year}, clientId=${clientId}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getTurnoverPerMonth(client, month, year, clientId || null);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getTurnoverPerMonthController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getAllClientsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, fetching clients...");
      const result = await getAllClients(client);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getAllClientsController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getAllSubcontractorsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, fetching subcontractors...");
      const result = await getAllSubcontractors(client);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getAllSubcontractorsController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getAgingAnalysisController = async (req, res) => {
  const { month, year, clientId } = req.query;
  console.log(`Received request for aging analysis: month=${month}, year=${year}, clientId=${clientId}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getAgingAnalysis(client, month, year, clientId || null);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getAgingAnalysisController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getTurnoverVsDieselCostController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for turnover vs diesel cost: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const numericMonth = monthNames[month];
    if (!numericMonth) {
      console.log("Invalid month provided");
      return res.status(400).json({ success: false, message: "Invalid month" });
    }

    console.log("Connected to database, executing query...");
    const result = await getTurnoverVsDieselCost(numericMonth, year);
    console.log("Query result:", result);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error in getTurnoverVsDieselCostController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getAllExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for all expenses: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getAllExpenses(client, month, year);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getAllExpensesController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getTurnoverPerTruckController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for turnover per truck: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getTurnoverPerTruck(client, month, year);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getTurnoverPerTruckController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getSubcontractorTurnoverPerMonthController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for turnover vs total subcontractor: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getSubcontractorTurnoverPerMonth(client, month, year);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getSubcontractorTurnoverPerMonthController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getSubcontractorVsTurnoverController = async (req, res) => {
  const { month, year, subcontractorId } = req.query;
  console.log(`Received request for subcontractor vs turnover: month=${month}, year=${year}, subcontractorId=${subcontractorId}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getSubcontractorVsTurnover(client, month, year, subcontractorId || null);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getSubcontractorVsTurnoverController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

export const getWagesVsExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for wages vs expenses: month=${month}, year=${year}`);

  if (!month || !year) {
    console.log("Missing month or year in request");
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }

  try {
    const client = await pool.connect();
    try {
      console.log("Connected to database, executing query...");
      const result = await getWagesVsExpenses(client, month, year);
      console.log("Query result:", result);
      res.json({ success: true, data: result });
    } finally {
      client.release();
      console.log("Database client released");
    }
  } catch (err) {
    console.error("Error in getWagesVsExpensesController:", err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

const monthNames = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};