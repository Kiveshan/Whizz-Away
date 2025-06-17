import { pool, query } from "../config/database.js";
import cron from "node-cron";

async function generateMonthlyStatements() {
  console.log("Starting monthly statement generation process...");

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

  console.log(`Today: ${today.toISOString().split("T")[0]}`);
  console.log(`Current Month: ${currentMonth}, Current Year: ${currentYear}`);
  console.log(
    `Previous Month: ${previousMonth}, Previous Year: ${previousYear}`
  );
  console.log(
    `Generating statements for invoices confirmed between ${formattedInvoiceStartDate} and ${formattedInvoiceEndDate}`
  );
  console.log(
    `Fetching payments between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
  );

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query("BEGIN");

    const clientsResult = await query("SELECT m5clientkey FROM m5_client", []);
    const clients = clientsResult.rows;

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

    for (const client of clients) {
      const clientId = client.m5clientkey;

      const existingStatement = await dbClient.query(
        "SELECT statement_key FROM statements WHERE clientid = $1 AND generation_date = $2",
        [clientId, formattedGenDate]
      );

      if (existingStatement.rows.length > 0) {
        console.log(
          `Client ${clientId}: Statement #${existingStatement.rows[0].statement_key} already exists for ${formattedGenDate}, skipping`
        );
        continue;
      }

      const invoicesQuery = `
        SELECT 
          SUM(m1.total_cost) as total_amount,
          i.groupid as invoice_group_id
        FROM invoice i
        JOIN m1_controller m1 ON i.m1key = m1.m1key
        WHERE i.clientid = $1 AND i.date BETWEEN $2 AND $3
        GROUP BY i.groupid
      `;
      const invoicesResult = await dbClient.query(invoicesQuery, [
        clientId,
        formattedInvoiceStartDate,
        formattedInvoiceEndDate,
      ]);
      const invoices = invoicesResult.rows;

      const totalPayments = paymentsMap.get(clientId) || 0;
      console.log(
        `Client ${clientId}: Total payments from ${formattedPaymentStartDate} to ${formattedPaymentEndDate}: R${totalPayments}`
      );

      if (invoices.length === 0 && totalPayments === 0) {
        console.log(
          `Client ${clientId}: No invoices or payments found between ${formattedInvoiceStartDate} and ${formattedInvoiceEndDate}, skipping`
        );
        continue;
      }

      let invoice_group_id = null;
      if (invoices.length > 0) {
        invoice_group_id = invoices[0].invoice_group_id;
        console.log(
          `Client ${clientId}: Using invoice groupid ${invoice_group_id}`
        );
      } else {
        console.log(`Client ${clientId}: No invoices, setting groupid to null`);
      }

      const previousStatementQuery = `
        SELECT s.agingid
        FROM statements s
        WHERE s.clientid = $1 AND s.generation_date < $2
        ORDER BY s.generation_date DESC
        LIMIT 1
      `;
      const previousStatementResult = await dbClient.query(
        previousStatementQuery,
        [clientId, formattedGenDate]
      );
      let openingBalance = 0;

      if (previousStatementResult.rows.length > 0) {
        const previousAgingId = previousStatementResult.rows[0].agingid;
        const previousAgingQuery = `
          SELECT current, "30days", "60days", "90days"
          FROM aging_analysis
          WHERE aging_key = $1
        `;
        const previousAgingResult = await dbClient.query(previousAgingQuery, [
          previousAgingId,
        ]);
        if (previousAgingResult.rows.length > 0) {
          const row = previousAgingResult.rows[0];
          openingBalance =
            (Number.parseFloat(row.current) || 0) +
            (Number.parseFloat(row["30days"]) || 0) +
            (Number.parseFloat(row["60days"]) || 0) +
            (Number.parseFloat(row["90days"]) || 0);
        }
      }
      console.log(
        `Client ${clientId}: Opening balance (sum of previous current, 30days, 60days, 90days): R${openingBalance}`
      );

      const totalInvoices =
        invoices.length > 0
          ? Number.parseFloat(invoices[0].total_amount) || 0
          : 0;

      const agingQuery = `
        SELECT aging_key, current, "30days", "60days", "90days"
        FROM aging_analysis
        WHERE clientid = $1
        ORDER BY aging_key DESC
        LIMIT 1
      `;
      const agingResult = await dbClient.query(agingQuery, [clientId]);
      let newCurrent, new30days, new60days, new90days;

      if (agingResult.rows.length > 0) {
        const previousAging = agingResult.rows[0];
        newCurrent = totalInvoices;
        let raw30days = Number.parseFloat(previousAging.current) || 0;
        let remaining30days = raw30days - totalPayments;
        let excessPayment = 0;

        if (remaining30days < 0) {
          let raw60days = Number.parseFloat(previousAging["30days"]) || 0;
          let remaining60days = raw60days + remaining30days;

          if (raw60days === 0) {
            new30days = remaining30days;
            new60days = 0;
            new90days =
              (Number.parseFloat(previousAging["60days"]) || 0) +
              (Number.parseFloat(previousAging["90days"]) || 0);
          } else if (remaining60days < 0) {
            new30days = 0;
            new60days = 0;
            excessPayment = -remaining60days;
            let raw90days =
              (Number.parseFloat(previousAging["60days"]) || 0) +
              (Number.parseFloat(previousAging["90days"]) || 0);
            new90days = raw90days - excessPayment;
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
        console.log(
          `Client ${clientId}: Aging update - Current: R${newCurrent} (March 2025 invoices: R${totalInvoices}), 30days: R${new30days} (February 2025 invoices R${raw30days} - February payments R${totalPayments}), 60days: R${new60days}, 90days: R${new90days}`
        );
      } else {
        newCurrent = totalInvoices;
        let remaining30days = 0 - totalPayments;
        if (remaining30days < 0) {
          new30days = remaining30days;
          new60days = 0;
          new90days = 0;
        } else {
          new30days = remaining30days;
          new60days = 0;
          new90days = 0;
        }
        console.log(
          `Client ${clientId}: Initial aging - Current: R${newCurrent} (March 2025 invoices: R${totalInvoices}), 30days: R${new30days} (after deducting February 2025 payments R${totalPayments}), 60days: R${new60days}, 90days: R${new90days}`
        );
      }

      const insertAgingQuery = `
        INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING aging_key
      `;
      const agingValues = [
        clientId,
        newCurrent,
        new30days,
        new60days,
        new90days,
      ];
      const agingInsertResult = await dbClient.query(
        insertAgingQuery,
        agingValues
      );
      const newAgingId = agingInsertResult.rows[0].aging_key;

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
      console.log(
        `Client ${clientId}: Generated statement #${
          statementInsertResult.rows[0].statement_key
        } for group ${
          invoice_group_id || "null"
        } with opening balance R${openingBalance}`
      );
    }

    await dbClient.query("COMMIT");
    console.log("Monthly statement generation completed successfully");
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Error generating monthly statements:", error);
    throw error;
  } finally {
    if (dbClient) dbClient.release();
  }
}

// Schedule the statement generation to run on the 2nd day of each month at 1:00 AM
cron.schedule("0 1 11 * *", async () => {
  console.log("Running scheduled statement generation task");
  await generateMonthlyStatements();
});

export { generateMonthlyStatements };
