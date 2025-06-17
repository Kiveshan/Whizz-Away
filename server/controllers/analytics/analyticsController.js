import {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getWagesPerMonth,
} from "../../models/analytics/analyticsModel.js";
import { pool } from "../../config/database.js";

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

const getFuelExpensesHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(`Fetching fuel expenses for month: ${month}, year: ${year}`);
    client = await pool.connect();
    const result = await getFuelExpenses(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching fuel expenses:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching fuel expenses: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getTurnoverPerMonthHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(`Fetching turnover for month: ${month} ${year}`);
    client = await pool.connect();
    const result = await getTurnoverPerMonth(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching turnover per month:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching turnover per month: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getAgingAnalysisHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(`Fetching aging analysis for month: ${month}, year: ${year}`);
    client = await pool.connect();
    const result = await getAgingAnalysis(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching aging analysis:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching aging analysis: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getTurnoverVsDieselCostHandler = async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log(
      "DEBUG: Running updated /api/turnover-vs-diesel-cost endpoint (version 2025-05-14)"
    );
    if (!month || !year || isNaN(year)) {
      console.error(`Invalid input: month=${month}, year=${year}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid month or year" });
    }
    const numericMonth = monthNames[month];
    if (!numericMonth) {
      console.error(`Invalid month name: ${month}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid month name" });
    }
    const result = await getTurnoverVsDieselCost(numericMonth, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching turnover vs diesel cost:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllExpensesHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(
      `Fetching income and expenses for month: ${month}, year: ${year}`
    );
    client = await pool.connect();
    const result = await getAllExpenses(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching income and expenses:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching income and expenses: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getTurnoverPerTruckHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(`Fetching turnover per truck for month: ${month} ${year}`);
    client = await pool.connect();
    const result = await getTurnoverPerTruck(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching turnover per truck:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching turnover per truck: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getWagesPerMonthHandler = async (req, res) => {
  let client;
  try {
    const { month, year } = req.query;
    console.log(`Fetching wages for month: ${month}, year: ${year}`);
    client = await pool.connect();
    const result = await getWagesPerMonth(client, month, year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching wages per month:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching wages per month: ${error.message}`,
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

export {
  getFuelExpensesHandler,
  getTurnoverPerMonthHandler,
  getAgingAnalysisHandler,
  getTurnoverVsDieselCostHandler,
  getAllExpensesHandler,
  getTurnoverPerTruckHandler,
  getWagesPerMonthHandler,
};
