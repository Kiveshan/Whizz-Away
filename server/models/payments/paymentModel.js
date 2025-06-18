import { pool } from "../../config/database.js";

const createPayment = async (
  clientId,
  { amount, fileupload, invoiceid, filename }
) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    // Insert payment record
    const queryText = `
      INSERT INTO payment_m3 (clientid, amount, filename, fileupload, invoiceid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const queryParams = [clientId, amount, filename, fileupload, invoiceid];

    const result = await client.query(queryText, queryParams);

    // Get additional info for response
    const clientQuery = `SELECT client FROM m5_client WHERE m5clientkey = $1`;
    const clientResult = await client.query(clientQuery, [clientId]);

    const invoiceQuery = `SELECT invoice_num FROM invoice WHERE ikey = $1 AND clientid = $2`;
    const invoiceResult = await client.query(invoiceQuery, [
      invoiceid,
      clientId,
    ]);

    return {
      success: true,
      data: {
        ...result.rows[0],
        clientName: clientResult.rows[0]?.client || "Unknown",
        invoiceNum: invoiceResult.rows[0]?.invoice_num || "Unknown",
      },
    };
  } catch (error) {
    console.error("Error creating payment:", error);
    return {
      success: false,
      message: error.message || "Failed to create payment record",
    };
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
        p.paykey,
        p.fileupload,
        p.amount,
        p.filename,
        p.invoiceid,
        i.invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN m5_client c ON p.clientid = c.m5clientkey
      WHERE 
        p.clientid = $1 AND p.paykey = $2
    `;
    const queryParams = [clientId, paymentId];

    const result = await client.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return { success: false, message: "Payment not found" };
    }

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching payment:", error);
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
        p.paykey,
        p.fileupload,
        p.amount,
        p.filename,
        p.invoiceid,
        i.invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN m5_client c ON p.clientid = c.m5clientkey
      WHERE 
        p.clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM p.fileupload) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM p.fileupload) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY p.fileupload DESC`;

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("Error fetching client payments:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getClientInvoices = async (clientId) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    const queryText = `
      SELECT ikey, invoice_num, date
      FROM invoice
      WHERE clientid = $1
      ORDER BY date DESC
    `;
    const queryParams = [clientId];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("Error fetching client invoices:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { createPayment, getPayment, getClientPayments, getClientInvoices };
