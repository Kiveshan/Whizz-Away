import { pool, query } from "../../config/database.js";

const getClientStatements = async (clientId, { year, month }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        statement_key,
        generation_date
      FROM 
        statements
      WHERE 
        clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM generation_date) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM generation_date) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY generation_date DESC`;

    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

const getStatementDetails = async (statementId) => {
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
        s.statement_key,
        s.groupid,
        s.generation_date,
        s.clientid,
        s.opening_balance,
        c.client AS client_name,
        c.representative AS client_representative,
        c.email AS client_email,
        c.cellnum AS client_phone,
        c.companyaddress AS client_address,
        a.current,
        a."30days",
        a."60days",
        a."90days",
        i.ikey,
        i.date AS invoice_date,
        m1.total_cost AS invoice_amount,
        m1."ksmFileRef" AS invoice_task,
        m1.pickup,
        m1.dropoff,
        i.invoice_num,
        a2.addon_id,
        a2.date AS addon_date,
        a2.amount AS addon_amount,
        a2.items AS addon_items,
        ut.companyname
      FROM 
        statements s
      JOIN 
        m5_client c ON s.clientid = c.m5clientkey
      JOIN 
        aging_analysis a ON s.agingid = a.aging_key
      LEFT JOIN 
        invoice i ON i.groupid = s.groupid
      LEFT JOIN 
        m1_controller m1 ON i.m1key = m1.m1key
      LEFT JOIN 
        add_ons a2 ON a2.group_id = s.groupid
      INNER JOIN
        usertable ut ON ut.roleid = 1 AND ut.status = 'active'
      WHERE 
        s.statement_key = $1
    `;
    const result = await query(queryText, [statementId]);

    if (result.rows.length === 0) {
      return { success: false, message: "Statement not found" };
    }

    const clientId = result.rows[0].clientid;
    const generationDate = new Date(result.rows[0].generation_date);
    const statementMonth =
      generationDate.getMonth() === 0 ? 11 : generationDate.getMonth() - 1;
    const statementYear =
      generationDate.getMonth() === 0
        ? generationDate.getFullYear() - 1
        : generationDate.getFullYear();
    const paymentMonth = statementMonth === 0 ? 11 : statementMonth - 1;
    const paymentYear =
      statementMonth === 0 ? statementYear - 1 : statementYear;
    const paymentStartDate = new Date(paymentYear, paymentMonth, 1, 12, 0, 0);
    const paymentEndDate = new Date(paymentYear, paymentMonth + 1, 0, 12, 0, 0);
    const formattedPaymentStartDate = paymentStartDate
      .toISOString()
      .split("T")[0];
    const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

    const paymentsQuery = `
      SELECT 
        p.paykey,
        p.fileupload AS date,
        p.amount,
        p.reference,
        i.invoice_num
      FROM 
        payment_m3 p
      LEFT JOIN 
        invoice i ON p.invoiceid = i.ikey
      WHERE 
        p.clientid = $1
        AND p.fileupload BETWEEN $2 AND $3
    `;
    const creditNotesQuery = `
      SELECT 
        cn.creditnote_id,
        cn.creditnote_date AS date,
        SUM(cn_amount.amount) AS amount,
        cn.doc_no AS reference,
        cn.description
      FROM 
        credit_notes cn
      CROSS JOIN LATERAL unnest(cn.amount) AS cn_amount(amount)
      WHERE 
        cn.client_id = $1
        AND cn.creditnote_date BETWEEN $2 AND $3
      GROUP BY 
        cn.creditnote_id,
        cn.creditnote_date,
        cn.doc_no,
        cn.description
    `;
    const [paymentsResult, creditNotesResult] = await Promise.all([
      query(paymentsQuery, [
        clientId,
        formattedPaymentStartDate,
        formattedPaymentEndDate,
      ]),
      query(creditNotesQuery, [
        clientId,
        formattedPaymentStartDate,
        formattedPaymentEndDate,
      ]),
    ]);

    const payments = paymentsResult.rows.map((row) => ({
      paykey: row.paykey,
      date: row.date,
      amount: Number.parseFloat(row.amount || 0),
      reference: row.reference || "",
      invoice_num: row.invoice_num || "",
    }));

    const creditNotes = creditNotesResult.rows.map((row) => ({
      creditnote_id: row.creditnote_id,
      date: row.date,
      amount: Number.parseFloat(row.amount || 0),
      reference: row.doc_no || "",
      description: row.description || "",
    }));

    console.log(
      `Fetched ${payments.length} payments for client ${clientId} between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
    );
    console.log(
      `Fetched ${creditNotes.length} credit notes for client ${clientId} between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
    );

    if (payments.length > 0) {
      console.log("Sample payment data:", JSON.stringify(payments[0], null, 2));
    }
    if (creditNotes.length > 0) {
      console.log(
        "Sample credit note data:",
        JSON.stringify(creditNotes[0], null, 2)
      );
    }

    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      opening_balance: Number.parseFloat(result.rows[0].opening_balance || 0),
      company_name: result.rows[0].companyname,
      client: {
        id: result.rows[0].clientid,
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
      },
      aging: {
        current: Number.parseFloat(result.rows[0].current || 0),
        "30days": Number.parseFloat(result.rows[0]["30days"] || 0),
        "60days": Number.parseFloat(result.rows[0]["60days"] || 0),
        "90days": Number.parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: result.rows
        .filter((row) => row.ikey !== null)
        .map((row) => ({
          ikey: row.ikey,
          date: row.invoice_date,
          amount: Number.parseFloat(row.invoice_amount || 0),
          task: row.invoice_task,
          invoice_num: row.invoice_num,
          pickup: row.pickup,
          dropoff: row.dropoff,
        })),
      addons: result.rows
        .filter((row) => row.addon_id !== null)
        .map((row) => ({
          addon_id: row.addon_id,
          date: row.addon_date,
          amount: Number.parseFloat(row.addon_amount || 0),
          items: row.addon_items,
        })),
      payments: payments,
      credit_notes: creditNotes,
    };

    return { success: true, data: statementData };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { getClientStatements, getStatementDetails };
