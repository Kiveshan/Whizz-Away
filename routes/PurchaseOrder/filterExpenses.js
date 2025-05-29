import express from "express"
import dotenv from "dotenv"
import pkg from "pg"
const { Pool } = pkg

dotenv.config()

const router = express.Router()
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number.parseInt(process.env.POSTGRES_PORT),
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

router.get("/purchase-orders", async (req, res) => {
  const pool = req.app.locals.pool; 
  try {
    const result = await pool.query(`
      SELECT 
        po.po_id,
        po.date,
        po.total,
        et.expense AS expense_type,
        s.supplier AS supplier_name
      FROM purchase_orders po
      JOIN expense_types et ON po.expense_type_id = et.id
      JOIN suppliers s ON po.supplier_id = s.supplier_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching purchase orders:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router