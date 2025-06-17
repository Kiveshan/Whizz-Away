import { pool } from "../../config/database.js";

const createPayment = async (clientId, { amount, fileupload }) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    const queryText = `
      INSERT INTO payment_m3 (clientid, amount, filename, fileupload)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const queryParams = [clientId, amount, null, fileupload];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getPayment = async (clientId, paymentId) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    const queryText = `
      SELECT 
        fileupload,
        amount,
        filename
      FROM 
        payment_m3
      WHERE 
        clientid = $1 AND paykey = $2
    `;
    const queryParams = [clientId, paymentId];

    const result = await client.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return { success: false, message: "Payment not found" };
    }

    return { success: true, data: result.rows[0] };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getClientPayments = async (clientId, { year, month }) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    let queryText = `
      SELECT 
        paykey,
        fileupload,
        amount,
        filename
      FROM 
        payment_m3
      WHERE 
        clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM fileupload) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM fileupload) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY fileupload DESC`;

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { createPayment, getPayment, getClientPayments };
