import { pool } from "../../config/database.js";

const getExpensesByTruckId = async (truckId, company_reg_num) => {
  const queryText = `
    SELECT * FROM public.expenses_m2
    WHERE truckid = $1
      AND company_reg_num = $2
    ORDER BY slipuploaddate DESC
  `;
  const result = await pool.query(queryText, [truckId, company_reg_num]);
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
  company_reg_num,
}) => {
  const query = `
    INSERT INTO public.expenses_m2
    (type, documentfrom, expensecost, description, slipname, s3key, slipuploaddate, truckid, driverid, orderno, company_reg_num)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    company_reg_num,
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
  company_reg_num,
}) => {
  const query = `
    INSERT INTO public.expenses_m2
    (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid, orderno, company_reg_num)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    company_reg_num,
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

const getExpenseDocumentById = async (id, company_reg_num) => {
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
    WHERE ekey = $1 AND company_reg_num = $2
  `;
  const result = await pool.query(queryText, [id, company_reg_num]);

  if (result.rows.length === 0) {
    return { success: false, message: "Document not found" };
  }

  const { s3key } = result.rows[0];
  if (!s3key) {
    return { success: false, message: "Document not found or S3 key missing" };
  }

  return { success: true, data: result.rows[0] };
};
const getPOExpensesByTruckId = async (truckId, company_reg_num) => {
  const queryText = `
    SELECT
      e.*,
      po.ponum,
      po.slip_s3key as po_slip_s3key,
      po.invoice_number,
      CASE
        WHEN po.ponum IS NOT NULL THEN CONCAT(e.documentfrom, ' (PO: ', po.ponum, ')')
        ELSE e.documentfrom
      END as documentfrom_display
    FROM public.expenses_m2 e
    LEFT JOIN public.purchase_orders po
      ON e.orderno = po.ponum
      AND po.company_reg_num = $2
    WHERE e.truckid = $1
      AND e.company_reg_num = $2
    ORDER BY e.slipuploaddate DESC
  `;
  const result = await pool.query(queryText, [truckId, company_reg_num]);
  return result.rows;
};

export {
  getExpensesByTruckId,
  insertFuelExpense,
  insertFuelExpenseWithoutS3Key,
  getExpenseDocumentById,getPOExpensesByTruckId
};
