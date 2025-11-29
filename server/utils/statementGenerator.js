import { pool, query } from "../config/database.js";

// ==================== DATE UTILITIES ====================
function calculateStatementDates() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const generationDate = new Date(currentYear, currentMonth, 1, 12, 0, 0);
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const invoiceStartDate = new Date(previousYear, previousMonth, 1, 12, 0, 0);
  const invoiceEndDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0);
  const formattedInvoiceStartDate = invoiceStartDate
    .toISOString()
    .split("T")[0];
  const formattedInvoiceEndDate = invoiceEndDate.toISOString().split("T")[0];

  const paymentMonth = previousMonth === 0 ? 11 : previousMonth - 1;
  const paymentYear = previousMonth === 0 ? previousYear - 1 : previousYear;
  const paymentStartDate = new Date(paymentYear, paymentMonth, 1, 12, 0, 0);
  const paymentEndDate = new Date(paymentYear, paymentMonth + 1, 0, 12, 0, 0);
  const formattedPaymentStartDate = paymentStartDate
    .toISOString()
    .split("T")[0];
  const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

  return {
    today,
    currentMonth,
    currentYear,
    previousMonth,
    previousYear,
    formattedGenDate,
    formattedInvoiceStartDate,
    formattedInvoiceEndDate,
    formattedPaymentStartDate,
    formattedPaymentEndDate,
  };
}

function logDateInfo(dates) {
  console.log(`Today: ${dates.today.toISOString().split("T")[0]}`);
  console.log(
    `Current Month: ${dates.currentMonth}, Current Year: ${dates.currentYear}`
  );
  console.log(
    `Previous Month: ${dates.previousMonth}, Previous Year: ${dates.previousYear}`
  );
  console.log(
    `Generating statements for invoices and add-ons confirmed between ${dates.formattedInvoiceStartDate} and ${dates.formattedInvoiceEndDate}`
  );
  console.log(
    `Fetching payments and credit notes between ${dates.formattedPaymentStartDate} and ${dates.formattedPaymentEndDate}`
  );
}

// ==================== CLIENT UTILITIES ====================
async function fetchClients(specificClientId = null) {
  let clientsQuery = "SELECT m5clientkey FROM m5_client";
  let clientsParams = [];

  if (specificClientId) {
    clientsQuery += " WHERE m5clientkey = $1";
    clientsParams = [specificClientId];
  }

  const clientsResult = await query(clientsQuery, clientsParams);
  return clientsResult.rows;
}

function validateClients(clients, specificClientId) {
  if (clients.length === 0) {
    const message = specificClientId
      ? `Client ${specificClientId} not found`
      : "No clients found";
    console.log(message);
    return {
      success: false,
      message,
    };
  }
  return { success: true };
}

// ==================== PAYMENT AND CREDIT NOTE UTILITIES ====================
async function fetchPaymentsMap(
  dbClient,
  formattedPaymentStartDate,
  formattedPaymentEndDate
) {
  const paymentsResult = await dbClient.query(
    `SELECT 
       clientid,
       SUM(amount) as total_payments
     FROM payment_m3
     WHERE fileupload BETWEEN $1 AND $2
     GROUP BY clientid`,
    [formattedPaymentStartDate, formattedPaymentEndDate]
  );

  const paymentsMap = new Map(
    paymentsResult.rows.map((row) => [
      row.clientid,
      Number.parseFloat(row.total_payments) || 0,
    ])
  );

  console.log(
    `Fetched payments for ${paymentsResult.rows.length} clients between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
  );

  return paymentsMap;
}

async function fetchCreditNotesMap(
  dbClient,
  formattedPaymentStartDate,
  formattedPaymentEndDate
) {
  const creditNotesResult = await dbClient.query(
    `SELECT 
       cn.client_id,
       SUM(cn_amount.amount) as total_credit_notes
     FROM credit_notes cn
     CROSS JOIN LATERAL unnest(cn.amount) AS cn_amount(amount)
     WHERE cn.creditnote_date BETWEEN $1 AND $2
     GROUP BY cn.client_id`,
    [formattedPaymentStartDate, formattedPaymentEndDate]
  );

  const creditNotesMap = new Map(
    creditNotesResult.rows.map((row) => [
      row.client_id,
      Number.parseFloat(row.total_credit_notes) || 0,
    ])
  );

  console.log(
    `Fetched credit notes for ${creditNotesResult.rows.length} clients between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
  );

  return creditNotesMap;
}

async function fetchClientPayments(
  dbClient,
  clientId,
  formattedPaymentStartDate,
  formattedPaymentEndDate
) {
  const paymentsQuery = `
    SELECT SUM(amount) as total_payments
    FROM payment_m3
    WHERE clientid = $1 AND fileupload BETWEEN $2 AND $3
  `;
  const creditNotesQuery = `
    SELECT SUM(cn_amount.amount) as total_credit_notes
    FROM credit_notes cn
    CROSS JOIN LATERAL unnest(cn.amount) AS cn_amount(amount)
    WHERE cn.client_id = $1 AND cn.creditnote_date BETWEEN $2 AND $3
  `;

  const paymentParams = [
    clientId,
    formattedPaymentStartDate,
    formattedPaymentEndDate,
  ];
  const [paymentsResult, creditNotesResult] = await Promise.all([
    dbClient.query(paymentsQuery, paymentParams),
    dbClient.query(creditNotesQuery, paymentParams),
  ]);

  const totalPayments =
    Number.parseFloat(paymentsResult.rows[0]?.total_payments) || 0;
  const totalCreditNotes =
    Number.parseFloat(creditNotesResult.rows[0]?.total_credit_notes) || 0;
  const totalReductions = totalPayments + totalCreditNotes;

  console.log(
    `Client ${clientId}: Total payments R${totalPayments}, Total credit notes R${totalCreditNotes}, Total reductions R${totalReductions}`
  );

  return totalReductions;
}

// ==================== INVOICE UTILITIES ====================
async function fetchClientInvoices(
  dbClient,
  clientId,
  formattedInvoiceStartDate,
  formattedInvoiceEndDate
) {
  const invoicesQuery = `
    SELECT 
      COALESCE(SUM(m1.total_cost), 0) + COALESCE(SUM(a.amount), 0) as total_amount,
      COALESCE(i.groupid, a.group_id) as invoice_group_id
    FROM invoice i
    FULL OUTER JOIN m1_controller m1 ON i.m1key = m1.m1key
    FULL OUTER JOIN add_ons a ON a.client_id = i.clientid AND a.date = i.date
    WHERE (i.clientid = $1 OR a.client_id = $1) 
      AND (i.date BETWEEN $2 AND $3 OR a.date BETWEEN $2 AND $3)
    GROUP BY i.groupid, a.group_id
  `;

  const invoiceParams = [
    clientId,
    formattedInvoiceStartDate,
    formattedInvoiceEndDate,
  ];
  const invoicesResult = await dbClient.query(invoicesQuery, invoiceParams);

  return invoicesResult.rows;
}

// ==================== STATEMENT UTILITIES ====================
async function checkExistingStatement(dbClient, clientId, formattedGenDate) {
  const existingStatement = await dbClient.query(
    "SELECT statement_key, agingid, groupid FROM statements WHERE clientid = $1 AND generation_date = $2",
    [clientId, formattedGenDate]
  );

  return existingStatement.rows.length > 0 ? existingStatement.rows[0] : null;
}

async function fetchPreviousStatementAging(
  dbClient,
  clientId,
  formattedGenDate
) {
  const previousStatementQuery = `
    SELECT s.agingid
    FROM statements s
    WHERE s.clientid = $1 AND s.generation_date < $2
    ORDER BY s.generation_date DESC
    LIMIT 1
  `;

  const previousStatementResult = await dbClient.query(previousStatementQuery, [
    clientId,
    formattedGenDate,
  ]);

  if (previousStatementResult.rows.length === 0) {
    return { openingBalance: 0, agingData: null };
  }

  const previousAgingId = previousStatementResult.rows[0].agingid;
  const previousAgingQuery = `
    SELECT current, "30days", "60days", "90days"
    FROM aging_analysis
    WHERE aging_key = $1
  `;

  const previousAgingResult = await dbClient.query(previousAgingQuery, [
    previousAgingId,
  ]);

  if (previousAgingResult.rows.length === 0) {
    return { openingBalance: 0, agingData: null };
  }

  const row = previousAgingResult.rows[0];
  const openingBalance =
    (Number.parseFloat(row.current) || 0) +
    (Number.parseFloat(row["30days"]) || 0) +
    (Number.parseFloat(row["60days"]) || 0) +
    (Number.parseFloat(row["90days"]) || 0);

  return {
    openingBalance,
    agingData: row,
    agingId: previousAgingId,
  };
}

// ==================== AGING CALCULATION UTILITIES ====================
function calculateAgingBuckets(
  previousAging,
  totalInvoices,
  totalReductions,
  isUpdate = false
) {
  if (!previousAging) {
    const newCurrent = totalInvoices;
    const remaining30days = 0 - totalReductions;

    return {
      newCurrent,
      new30days: remaining30days < 0 ? remaining30days : remaining30days,
      new60days: 0,
      new90days: 0,
    };
  }

  const newCurrent = totalInvoices;
  const raw30days = Number.parseFloat(previousAging.current) || 0;
  const remaining30days = raw30days - totalReductions;
  let new30days, new60days, new90days;

  if (remaining30days < 0) {
    const raw60days = Number.parseFloat(previousAging["30days"]) || 0;
    const remaining60days = raw60days + remaining30days;

    if (raw60days === 0) {
      new30days = remaining30days;
      new60days = 0;
      new90days =
        (Number.parseFloat(previousAging["60days"]) || 0) +
        (Number.parseFloat(previousAging["90days"]) || 0);
    } else if (remaining60days < 0) {
      new30days = 0;
      new60days = 0;
      const excessReduction = -remaining60days;
      const raw90days =
        (Number.parseFloat(previousAging["60days"]) || 0) +
        (Number.parseFloat(previousAging["90days"]) || 0);
      new90days = raw90days - excessReduction;
    } else {
      new30days = 0;
      new60days = remaining60days;
      new90days =
        (Number.parseFloat(previousAging["60days"]) || 0) +
        (Number.parseFloat(previousAging["90days"]) || 0);
    }
  } else {
    new30days = remaining30days;
    new60days = Number.parseFloat(previousAging["30days"]) || 0;
    new90days =
      (Number.parseFloat(previousAging["60days"]) || 0) +
      (Number.parseFloat(previousAging["90days"]) || 0);
  }

  return { newCurrent, new30days, new60days, new90days };
}

// ==================== DATABASE OPERATIONS ====================
async function createAgingAnalysis(
  dbClient,
  clientId,
  newCurrent,
  new30days,
  new60days,
  new90days
) {
  const insertAgingQuery = `
    INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING aging_key
  `;

  const agingValues = [clientId, newCurrent, new30days, new60days, new90days];
  const agingInsertResult = await dbClient.query(insertAgingQuery, agingValues);

  return agingInsertResult.rows[0].aging_key;
}

async function updateAgingAnalysis(
  dbClient,
  existingAgingId,
  newCurrent,
  new30days,
  new60days,
  new90days
) {
  const updateAgingQuery = `
    UPDATE aging_analysis 
    SET current = $2, "30days" = $3, "60days" = $4, "90days" = $5
    WHERE aging_key = $1
  `;

  await dbClient.query(updateAgingQuery, [
    existingAgingId,
    newCurrent,
    new30days,
    new60days,
    new90days,
  ]);
  return existingAgingId;
}

async function createStatement(
  dbClient,
  invoice_group_id,
  formattedGenDate,
  clientId,
  newAgingId,
  openingBalance
) {
  const insertStatementQuery = `
    INSERT INTO statements (groupid, generation_date, clientid, agingid, opening_balance)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING statement_key
  `;

  const statementValues = [
    invoice_group_id,
    formattedGenDate,
    clientId,
    newAgingId,
    openingBalance,
  ];
  const statementInsertResult = await dbClient.query(
    insertStatementQuery,
    statementValues
  );

  return statementInsertResult.rows[0].statement_key;
}

async function updateStatement(
  dbClient,
  statementKey,
  invoice_group_id,
  openingBalance,
  formattedGenDate
) {
  const updateStatementQuery = `
    UPDATE statements 
    SET groupid = $2, opening_balance = $3, generation_date = $4
    WHERE statement_key = $1
  `;

  await dbClient.query(updateStatementQuery, [
    statementKey,
    invoice_group_id,
    openingBalance,
    formattedGenDate,
  ]);
}

// ==================== CLIENT PROCESSING ====================
async function processClient(
  dbClient,
  clientId,
  dates,
  paymentsMap,
  creditNotesMap
) {
  const {
    formattedGenDate,
    formattedInvoiceStartDate,
    formattedInvoiceEndDate,
    formattedPaymentStartDate,
    formattedPaymentEndDate,
  } = dates;

  // Check if statement already exists
  const existingStatement = await checkExistingStatement(
    dbClient,
    clientId,
    formattedGenDate
  );
  const isUpdate = existingStatement !== null;
  let updateRequired = false;

  if (isUpdate) {
    // Check if there are any invoices, add-ons, payments, or credit notes that would change the statement
    const invoices = await fetchClientInvoices(
      dbClient,
      clientId,
      formattedInvoiceStartDate,
      formattedInvoiceEndDate
    );
    const totalPayments = paymentsMap.get(clientId) || 0;
    const totalCreditNotes = creditNotesMap.get(clientId) || 0;

    // If no invoices, add-ons, payments, or credit notes for this period, skip update
    if (
      invoices.length === 0 &&
      totalPayments === 0 &&
      totalCreditNotes === 0
    ) {
      console.log(
        `Client ${clientId}: No invoices, add-ons, payments, or credit notes found for period, skipping update`
      );
      return { processed: true, created: false, updated: false };
    }

    console.log(
      `Client ${clientId}: Update required - found invoices, add-ons, payments, or credit notes for period`
    );
    updateRequired = true;
  }

  // Only fetch invoices/add-ons and payments/credit notes if we're creating new statement or update is required
  if (!isUpdate || updateRequired) {
    const invoices = await fetchClientInvoices(
      dbClient,
      clientId,
      formattedInvoiceStartDate,
      formattedInvoiceEndDate
    );
    const totalReductions = await fetchClientPayments(
      dbClient,
      clientId,
      formattedPaymentStartDate,
      formattedPaymentEndDate
    );

    console.log(
      `Client ${clientId}: Total reductions (payments + credit notes) from ${formattedPaymentStartDate} to ${formattedPaymentEndDate}: R${totalReductions}`
    );

    if (invoices.length === 0 && totalReductions === 0) {
      console.log(
        `Client ${clientId}: No invoices, add-ons, payments, or credit notes found, skipping`
      );
      return { processed: false, created: false, updated: false };
    }

    let invoice_group_id = null;
    if (invoices.length > 0) {
      invoice_group_id = invoices[0].invoice_group_id;
      console.log(
        `Client ${clientId}: Using invoice/add-on groupid ${invoice_group_id}`
      );
    } else {
      console.log(
        `Client ${clientId}: No invoices or add-ons, setting groupid to null`
      );
    }

    const { openingBalance, agingData } = await fetchPreviousStatementAging(
      dbClient,
      clientId,
      formattedGenDate
    );
    console.log(
      `Client ${clientId}: Opening balance (sum of previous current, 30days, 60days, 90days): R${openingBalance}`
    );

    const totalInvoices =
      invoices.length > 0
        ? Number.parseFloat(invoices[0].total_amount) || 0
        : 0;

    // Calculate aging buckets
    const { newCurrent, new30days, new60days, new90days } =
      calculateAgingBuckets(
        agingData,
        totalInvoices,
        totalReductions,
        isUpdate
      );

    if (isUpdate) {
      console.log(
        `Client ${clientId}: Updated aging (REPLACED) - Current: R${newCurrent}, 30days: R${new30days}, 60days: R${new60days}, 90days: R${new90days}`
      );
    } else {
      console.log(
        `Client ${clientId}: New statement aging - Current: R${newCurrent}, 30days: R${new30days}, 60days: R${new60days}, 90days: R${new90days}`
      );
    }

    if (isUpdate) {
      // Update existing aging analysis and statement
      const existingAgingId = existingStatement.agingid;
      await updateAgingAnalysis(
        dbClient,
        existingAgingId,
        newCurrent,
        new30days,
        new60days,
        new90days
      );
      await updateStatement(
        dbClient,
        existingStatement.statement_key,
        invoice_group_id,
        openingBalance,
        formattedGenDate
      );

      console.log(
        `Client ${clientId}: Updated existing statement #${existingStatement.statement_key} for ${formattedGenDate}`
      );
      return { processed: true, created: false, updated: true };
    } else {
      // Create new aging analysis and statement
      const newAgingId = await createAgingAnalysis(
        dbClient,
        clientId,
        newCurrent,
        new30days,
        new60days,
        new90days
      );
      const statementKey = await createStatement(
        dbClient,
        invoice_group_id,
        formattedGenDate,
        clientId,
        newAgingId,
        openingBalance
      );

      console.log(
        `Client ${clientId}: Generated new statement #${statementKey} for group ${
          invoice_group_id || "null"
        } with opening balance R${openingBalance}`
      );
      return { processed: true, created: true, updated: false };
    }
  } else if (isUpdate) {
    return { processed: true, created: false, updated: false };
  }

  return { processed: false, created: false, updated: false };
}

// ==================== MAIN FUNCTION ====================
async function generateMonthlyStatements(specificClientId = null) {
  console.log("Starting monthly statement generation process...");

  const dates = calculateStatementDates();
  logDateInfo(dates);

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query("BEGIN");

    // Get clients - either specific client or all clients
    const clients = await fetchClients(specificClientId);
    const validation = validateClients(clients, specificClientId);

    if (!validation.success) {
      return validation;
    }

    // Fetch payments and credit notes for all clients
    const [paymentsMap, creditNotesMap] = await Promise.all([
      fetchPaymentsMap(
        dbClient,
        dates.formattedPaymentStartDate,
        dates.formattedPaymentEndDate
      ),
      fetchCreditNotesMap(
        dbClient,
        dates.formattedPaymentStartDate,
        dates.formattedPaymentEndDate
      ),
    ]);

    let processedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    // Process each client
    for (const client of clients) {
      const clientId = client.m5clientkey;
      const result = await processClient(
        dbClient,
        clientId,
        dates,
        paymentsMap,
        creditNotesMap
      );

      if (result.processed) processedCount++;
      if (result.created) createdCount++;
      if (result.updated) updatedCount++;
    }

    await dbClient.query("COMMIT");

    let message;
    if (specificClientId) {
      if (createdCount > 0) {
        message = `Statement processed for client ${specificClientId}. Created new statement.`;
      } else if (updatedCount > 0) {
        message = `Statement processed for client ${specificClientId}. Updated existing statement.`;
      } else {
        message = `Statement processed for client ${specificClientId}. No statement created or updated.`;
      }
    } else {
      message = `Monthly statement generation completed. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}`;
    }

    console.log(message);
    return {
      success: true,
      message,
      stats: {
        processed: processedCount,
        created: createdCount,
        updated: updatedCount,
      },
    };
  } catch (error) {
    if (dbClient) await dbClient.query("ROLLBACK");
    console.error("Error generating monthly statements:", error);
    throw error;
  } finally {
    if (dbClient) dbClient.release();
  }
}

export { generateMonthlyStatements };
