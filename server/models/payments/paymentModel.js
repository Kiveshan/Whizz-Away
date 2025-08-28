import { pool } from "../../config/database.js";

const createPayment = async (
  clientId,
  { amount, fileupload, invoiceid, addon_id, reference }
) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    // Validate that exactly one of invoiceid or addon_id is provided
    if (invoiceid && addon_id) {
      throw new Error(
        "Payment cannot be linked to both an invoice and an add-on"
      );
    }
    if (!invoiceid && !addon_id) {
      throw new Error(
        "Payment must be linked to either an invoice or an add-on"
      );
    }

    // Fetch client
    const clientQuery = `SELECT client FROM m5_client WHERE m5clientkey = $1`;
    const clientResult = await client.query(clientQuery, [clientId]);
    if (clientResult.rows.length === 0) {
      throw new Error("Client not found");
    }

    let invoice_num = null;
    if (invoiceid) {
      // Fetch invoice_num for invoice
      const invoiceQuery = `SELECT invoice_num FROM invoice WHERE ikey = $1 AND clientid = $2`;
      const invoiceResult = await client.query(invoiceQuery, [
        invoiceid,
        clientId,
      ]);
      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
      }
      invoice_num = invoiceResult.rows[0].invoice_num;
    } else if (addon_id) {
      // Fetch invoice_number for add-on
      const addonQuery = `SELECT invoice_number FROM add_ons WHERE addon_id = $1 AND client_id = $2`;
      const addonResult = await client.query(addonQuery, [addon_id, clientId]);
      if (addonResult.rows.length === 0) {
        throw new Error("Add-on not found");
      }
      invoice_num = addonResult.rows[0].invoice_number;
    }

    const queryText = `
      INSERT INTO payment_m3 (clientid, amount, reference, fileupload, invoiceid, addon_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const queryParams = [
      clientId,
      amount,
      reference,
      fileupload,
      invoiceid || null,
      addon_id || null,
    ];

    const result = await client.query(queryText, queryParams);
    return {
      success: true,
      data: {
        ...result.rows[0],
        clientname: clientResult.rows[0].client,
        invoice_num: invoice_num,
      },
    };
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
        p.paykey,
        p.fileupload,
        p.amount,
        p.reference,
        p.invoiceid,
        p.addon_id,
        COALESCE(i.invoice_num, a.invoice_number) AS invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN add_ons a ON p.addon_id = a.addon_id
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
        p.reference,
        p.invoiceid,
        p.addon_id,
        COALESCE(i.invoice_num, a.invoice_number) AS invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN add_ons a ON p.addon_id = a.addon_id
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
      SELECT 
        'Invoice' AS type,
        ikey AS id,
        invoice_num,
        date
      FROM invoice
      WHERE clientid = $1
      UNION ALL
      SELECT 
        'Add-on' AS type,
        addon_id AS id,
        invoice_number AS invoice_num,
        date
      FROM add_ons
      WHERE client_id = $1
      ORDER BY date DESC
    `;
    const queryParams = [clientId];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { createPayment, getPayment, getClientPayments, getClientInvoices };
