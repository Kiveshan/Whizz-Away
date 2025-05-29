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

router.get("/suppliers/:expenseTypeId", async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { expenseTypeId } = req.params

    const query = `
      SELECT s.supplier_id, s.supplier, s.representative, s.email, s.cellnum
      FROM suppliers s
      JOIN supplier_expense_types set ON s.supplier_id = set.se_id
      WHERE set.expense_type_id = $1 AND s.status = true
      ORDER BY s.supplier
    `

    const result = await pool.query(query, [expenseTypeId])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
})

router.post("/calculate", (req, res) => {
  try {
    const { quantity, unitPrice } = req.body

    // Convert to numbers and handle invalid inputs
    const qty = Number(quantity) || 0
    const price = Number(unitPrice) || 0

    const amount = qty * price
    const subtotal = amount
    const vat = subtotal * 0.15
    const total = subtotal + vat

    res.json({
      amount: amount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
    })
  } catch (error) {
    console.error("Error calculating amounts:", error)
    res.status(500).json({ error: "Failed to calculate amounts" })
  }
})

router.post("/create", async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const {
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date,
      total,
    } = req.body

    // Get the current date for PO number prefix
    const currentDate = new Date()
    const datePrefix = `PO-${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}`

    // Find the latest PO number with the same date prefix
    const latestPoQuery = `
      SELECT ponum 
      FROM purchase_orders 
      WHERE ponum LIKE $1 
      ORDER BY ponum DESC 
      LIMIT 1
    `

    const latestPoResult = await pool.query(latestPoQuery, [`${datePrefix}%`])

    let sequenceNumber = 1 

    if (latestPoResult.rows.length > 0) {
      const latestPoNum = latestPoResult.rows[0].ponum
      const latestSequence = Number.parseInt(latestPoNum.split("-")[2], 10)
      sequenceNumber = latestSequence + 1
    }
    const poNum = `${datePrefix}-${sequenceNumber.toString().padStart(3, "0")}`

    const query = `
      INSERT INTO purchase_orders (
        expense_type_id, supplier_id, reg_no, attention_to, received_by,
        quantity, unit_price, description, subbie, date, ponum, total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING po_id
    `

    const values = [
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date || new Date().toISOString().split("T")[0],
      poNum,
      total,
    ]

    const result = await pool.query(query, values)

    res.status(201).json({
      success: true,
      poId: result.rows[0].po_id,
      poNum: poNum,
    })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    res.status(500).json({ error: "Failed to create purchase order" })
  }
})

router.get("/list", async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { supplierId, expenseTypeId, fromDate, toDate, poId } = req.query;

    let query = `
      SELECT po.po_id, po.ponum, po.date, s.supplier, e.expense,
             po.description, po.quantity, po.unit_price,
             (po.quantity * po.unit_price) as amount,
             po.subbie, po.attention_to, po.received_by,po.reg_no
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      JOIN expense_types e ON po.expense_type_id = e.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (poId) {
      query += ` AND po.po_id = $${paramIndex++}`;
      values.push(poId);
    }

    if (supplierId) {
      query += ` AND po.supplier_id = $${paramIndex++}`;
      values.push(supplierId);
    }

    if (expenseTypeId) {
      query += ` AND po.expense_type_id = $${paramIndex++}`;
      values.push(expenseTypeId);
    }

    if (fromDate) {
      query += ` AND po.date >= $${paramIndex++}`;
      values.push(fromDate);
    }

    if (toDate) {
      query += ` AND po.date <= $${paramIndex++}`;
      values.push(toDate);
    }

    query += ` ORDER BY po.date DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});
export default router
