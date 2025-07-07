import {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getWagesPerMonth,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
} from "../../models/analytics/analyticsModel.js";
import { pool } from "../../config/database.js";

const monthNames = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const getFuelExpensesController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getFuelExpenses(client, month, year);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching fuel expenses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverPerMonthController = async (req, res) => {
  const { month, year, clientId } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getTurnoverPerMonth(client, month, year, clientId || null);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching turnover per month:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllClientsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const data = await getAllClients(client);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSubcontractorsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const data = await getAllSubcontractors(client);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching subcontractors:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAgingAnalysisController = async (req, res) => {
  const { month, year, clientId } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getAgingAnalysis(client, month, year, clientId || null);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching aging analysis:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverVsDieselCostController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const numericMonth = Object.keys(monthNames).find(
      (key) => monthNames[key].toLowerCase() === month.toLowerCase()
    );
    if (!numericMonth) {
      return res.status(400).json({ success: false, message: "Invalid month" });
    }
    const data = await getTurnoverVsDieselCost(numericMonth, year);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching turnover vs diesel cost:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllExpensesController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getAllExpenses(client, month, year);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching all expenses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverPerTruckController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getTurnoverPerTruck(client, month, year);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching turnover per truck:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWagesPerMonthController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getWagesPerMonth(client, month, year);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching wages per month:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubcontractorTurnoverPerMonthController = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getSubcontractorTurnoverPerMonth(client, month, year);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching subcontractor turnover:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubcontractorVsTurnoverController = async (req, res) => {
  const { month, year, subcontractorId } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required" });
  }
  try {
    const client = await pool.connect();
    try {
      const data = await getSubcontractorVsTurnover(client, month, year, subcontractorId || null);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching subcontractor vs turnover:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getFuelExpensesController,
  getTurnoverPerMonthController,
  getAllClientsController,
  getAllSubcontractorsController,
  getAgingAnalysisController,
  getTurnoverVsDieselCostController,
  getAllExpensesController,
  getTurnoverPerTruckController,
  getWagesPerMonthController,
  getSubcontractorTurnoverPerMonthController,
  getSubcontractorVsTurnoverController,
};