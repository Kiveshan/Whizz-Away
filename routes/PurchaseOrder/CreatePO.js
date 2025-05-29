import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const router = express.Router();
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number.parseInt(process.env.POSTGRES_PORT),
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
});

// GET all expense types
router.get("/expense-types", async (req, res) => {
  try {
    console.log("Fetching expense types from database...");
    
    const query = `
      SELECT id , expense 
      FROM expense_types
      ORDER BY expense
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} expense types`);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching expense types:", error);
    res.status(500).json({ 
      error: "Failed to fetch expense types",
      message: error.message
    });
  }
});

export default router;