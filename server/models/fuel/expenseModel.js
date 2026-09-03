import { pool } from "../../config/database.js";

const getExpensesByTruckId = async (truckId) => {
  const queryText = `
    SELECT * FROM public.expenses_m2 
    WHERE truckid = $1
    ORDER BY slipuploaddate DESC
  `;
  const result = await pool.query(queryText, [truckId]);
  return result.rows;
};

const insertFuelExpense = async ({
  type = "fuel",
  documentFrom,
  expenseCost,
  description = "",
  slipName,
  s3Key,
  slipUploadDate,
  truckId,
  driverId,
  orderno,
}) => {
  const query = `
    INSERT INTO public.expenses_m2 
    (type, documentfrom, expensecost, description, slipname, s3key, slipuploaddate, truckid, driverid, orderno)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ekey
  `;
  const values = [
    type,
    documentFrom,
    expenseCost,
    description,
    slipName,
    s3Key,
    slipUploadDate,
    truckId || null,
    driverId || null,
    orderno,
  ];

  try {
    console.log("Inserting fuel expense with values:", values);
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error inserting fuel expense:", error);
    throw error; // Let the controller handle fallbacks
  }
};

const insertFuelExpenseWithoutS3Key = async ({
  type = "fuel",
  documentFrom,
  expenseCost,
  description = "",
  slipName,
  slipUploadDate,
  truckId,
  driverId,
  orderno,
}) => {
  const query = `
    INSERT INTO public.expenses_m2 
    (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid, orderno)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING ekey
  `;
  const values = [
    type,
    documentFrom,
    expenseCost,
    description,
    slipName,
    slipUploadDate,
    truckId || null,
    driverId || null,
    orderno,
  ];

  try {
    console.log("Inserting fuel expense without s3key with values:", values);
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error inserting fuel expense without s3key:", error);
    throw error; // Let the controller handle fallbacks
  }
};

const getExpenseDocumentById = async (id) => {
  const columnsResult = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'expenses_m2' 
    AND table_schema = 'public'
  `);
  const columnNames = columnsResult.rows.map((row) =>
    row.column_name.toLowerCase()
  );

  const selectColumns = ["slipname"];
  if (columnNames.includes("s3key")) {
    selectColumns.push("s3key");
  }

  const queryText = `
    SELECT ${selectColumns.join(", ")} 
    FROM expenses_m2 
    WHERE ekey = $1
  `;
  const result = await pool.query(queryText, [id]);

  if (result.rows.length === 0) {
    return { success: false, message: "Document not found" };
  }

  const { s3key } = result.rows[0];
  if (!s3key) {
    return { success: false, message: "Document not found or S3 key missing" };
  }

  return { success: true, data: result.rows[0] };
};
const getPOExpensesByTruckId = async (truckId) => {
  const queryText = `
    SELECT 
      e.*,
      CASE 
        WHEN e.ponum IS NOT NULL THEN CONCAT(e.documentfrom, ' (PO: ', e.ponum, ')')
        ELSE e.documentfrom
      END as documentfrom_display
    FROM public.expenses_with_po_v e
    WHERE e.truckid = $1
    ORDER BY e.expense_date DESC
  `;
  const result = await pool.query(queryText, [truckId]);
  return result.rows;
};

export {
  getExpensesByTruckId,
  insertFuelExpense,
  insertFuelExpenseWithoutS3Key,
  getExpenseDocumentById,getPOExpensesByTruckId
};
