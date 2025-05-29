import express from "express";

const router = express.Router();

router.get("/statements", async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { supplierId, fromDate, toDate } = req.query;

    console.log("Received request for /api/statements with params:", { supplierId, fromDate, toDate });

    let query = `
      SELECT 
        po.po_id,
        po.ponum,
        po.date,
        s.supplier,
        s.supplier_id,
        e.expense AS expense_type,
        po.total,
        po.description,
        po.quantity,
        po.unit_price,
        po.subbie,
        po.attention_to,
        po.received_by,
        po.reg_no
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN expense_types e ON po.expense_type_id = e.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (supplierId) {
      query += ` AND po.supplier_id = $${paramIndex++}`;
      values.push(supplierId);
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

    console.log("Query result:", result.rows.length, "rows found");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch statement data: ${error.message}` });
  }
});
router.get("/supplier-summary", async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { year, month } = req.query;

    console.log("Fetching supplier statements with params:", { year, month });

    let query = `
      SELECT 
        s.supplier_id,
        s.supplier,
        EXTRACT(YEAR FROM po.date) as year,
        EXTRACT(MONTH FROM po.date) as month,
        TO_CHAR(po.date, 'Month') as month_name,
        COUNT(po.po_id) as order_count,
        SUM(po.total) as total_amount,
        MIN(po.date) as first_order_date,
        MAX(po.date) as last_order_date
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (year && year !== "All") {
      query += ` AND EXTRACT(YEAR FROM po.date) = $${paramIndex++}`;
      values.push(year);
    }

    if (month && month !== "All") {
      const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(month) + 1;

      query += ` AND EXTRACT(MONTH FROM po.date) = $${paramIndex++}`;
      values.push(monthIndex);
    }

    query += `
      GROUP BY s.supplier_id, s.supplier, EXTRACT(YEAR FROM po.date), EXTRACT(MONTH FROM po.date), TO_CHAR(po.date, 'Month')
      ORDER BY year DESC, month DESC, s.supplier
    `;

    console.log("Executing supplier summary query:", query);
    console.log("With values:", values);

    const result = await pool.query(query, values);

    console.log("Supplier summary result:", result.rows.length, "supplier-month combinations found");

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching supplier statements:", error);
    res.status(500).json({ error: `Failed to fetch supplier statements: ${error.message}` });
  }
});


export default router;