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
  getTurnoverVsSubbieExpense
} from "../../models/analytics/analyticsModel.js";

const getFuelExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for fuel expenses: month=${month}, year=${year}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getFuelExpenses(client, month, year);
      console.log("Fuel expenses data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getFuelExpensesController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverPerMonthController = async (req, res) => {
  const { month, year, clientId } = req.query;
  console.log(`Received request for turnover: month=${month}, year=${year}, clientId=${clientId}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getTurnoverPerMonth(client, month, year, clientId);
      console.log("Turnover data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getTurnoverPerMonthController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllClientsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const data = await getAllClients(client);
      console.log("Clients data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAllClientsController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSubcontractorsController = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const data = await getAllSubcontractors(client);
      console.log("Subcontractors data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAllSubcontractorsController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAgingAnalysisController = async (req, res) => {
  const { month, year, clientId } = req.query;
  console.log(`Received request for aging analysis: month=${month}, year=${year}, clientId=${clientId}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getAgingAnalysis(client, month, year, clientId);
      console.log("Aging analysis data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAgingAnalysisController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverVsDieselCostController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for turnover vs diesel cost: month=${month}, year=${year}`);
  try {
    const data = await getTurnoverVsDieselCost(month, year);
    console.log("Turnover vs diesel cost data:", data);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getTurnoverVsDieselCostController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for all expenses: month=${month}, year=${year}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getAllExpenses(client, month, year);
      console.log("All expenses data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAllExpensesController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverPerTruckController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for turnover per truck: month=${month}, year=${year}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getTurnoverPerTruck(client, month, year);
      console.log("Turnover per truck data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getTurnoverPerTruckController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubcontractorTurnoverPerMonthController = async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log(`Received request for subcontractor turnover per month: month=${month}, year=${year}`);
    const data = await getSubcontractorTurnoverPerMonth(pool, month, year);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getSubcontractorTurnoverPerMonthController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubcontractorVsTurnoverController = async (req, res) => {
  try {
    const { month, year, subcontractorId } = req.query;
    console.log(`Received request for subcontractor vs turnover: month=${month}, year=${year}, subcontractorId=${subcontractorId}`);
    const data = await getSubcontractorVsTurnover(pool, month, year, subcontractorId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getSubcontractorVsTurnoverController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWagesVsExpensesController = async (req, res) => {
  const { month, year } = req.query;
  console.log(`Received request for wages vs expenses: month=${month}, year=${year}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getWagesVsExpenses(client, month, year);
      console.log("Wages vs expenses data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getWagesVsExpensesController:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTurnoverVsSubbieExpenseController = async (req, res) => {
  const { month, year, subcontractorId } = req.query;
  console.log(`Received request for turnover vs subbie expense: month=${month}, year=${year}, subcontractorId=${subcontractorId}`);
  try {
    const client = await pool.connect();
    try {
      const data = await getTurnoverVsSubbieExpense(client, month, year, subcontractorId);
      console.log("Turnover vs subbie expense data:", data);
      res.status(200).json({ success: true, data });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getTurnoverVsSubbieExpenseController:", error);
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
  getSubcontractorTurnoverPerMonthController,
  getSubcontractorVsTurnoverController,
  getWagesVsExpensesController,
  getTurnoverVsSubbieExpenseController
};