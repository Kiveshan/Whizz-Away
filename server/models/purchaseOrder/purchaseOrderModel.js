import { pool } from "../../config/database.js";

export const getPurchaseOrders = async () => {
  const query = `
    SELECT 
      po.po_id,
      po.date,
      po.total,
      et.expense AS expense_type,
      s.supplier AS supplier_name
    FROM purchase_orders po
    JOIN expense_types et ON po.expense_type_id = et.id
    JOIN suppliers s ON po.supplier_id = s.supplier_id
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getExpenseTypes = async () => {
  const query = `
    SELECT id, expense 
    FROM expense_types
    ORDER BY expense
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getStatements = async (supplierId, fromDate, toDate) => {
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

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getSupplierSummary = async (year, month) => {
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
    const monthIndex =
      [
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

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getSuppliersByExpenseType = async (expenseTypeId) => {
  const query = `
    SELECT s.supplier_id, s.supplier, s.representative, s.email, s.cellnum
    FROM suppliers s
    JOIN supplier_expense_types set ON s.supplier_id = set.se_id
    WHERE set.expense_type_id = $1 AND s.status = true
    ORDER BY s.supplier
  `;
  try {
    const result = await pool.query(query, [expenseTypeId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const calculatePurchaseOrder = (quantity, unitPrice) => {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const amount = qty * price;
  const subtotal = amount;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  return {
    amount: amount.toFixed(2),
    subtotal: subtotal.toFixed(2),
    vat: vat.toFixed(2),
    total: total.toFixed(2),
  };
};

export const createPurchaseOrder = async ({
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
}) => {
  const currentDate = new Date();
  const datePrefix = `PO-${currentDate.getFullYear()}${(
    currentDate.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}`;

  const latestPoQuery = `
    SELECT ponum 
    FROM purchase_orders 
    WHERE ponum LIKE $1 
    ORDER BY ponum DESC 
    LIMIT 1
  `;
  const latestPoResult = await pool.query(latestPoQuery, [`${datePrefix}%`]);

  let sequenceNumber = 1;
  if (latestPoResult.rows.length > 0) {
    const latestPoNum = latestPoResult.rows[0].ponum;
    const latestSequence = Number.parseInt(latestPoNum.split("-")[2], 10);
    sequenceNumber = latestSequence + 1;
  }
  const poNum = `${datePrefix}-${sequenceNumber.toString().padStart(3, "0")}`;

  const query = `
    INSERT INTO purchase_orders (
      expense_type_id, supplier_id, reg_no, attention_to, received_by,
      quantity, unit_price, description, subbie, date, ponum, total
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING po_id
  `;
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
  ];

  try {
    const result = await pool.query(query, values);
    return { poId: result.rows[0].po_id, poNum };
  } catch (error) {
    throw error;
  }
};

export const getPurchaseOrderList = async (
  supplierId,
  expenseTypeId,
  fromDate,
  toDate,
  poId
) => {
  let query = `
    SELECT po.po_id, po.ponum, po.date, s.supplier, e.expense,
           po.description, po.quantity, po.unit_price,
           (po.quantity * po.unit_price) as amount,
           po.subbie, po.attention_to, po.received_by, po.reg_no
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

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};
