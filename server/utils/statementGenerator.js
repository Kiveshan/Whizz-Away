import { pool, query } from "../config/database.js";

async function generateMonthlyStatements(specificClientId = null) {
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

    // Get clients - either specific client or all clients
    let clientsQuery = "SELECT m5clientkey FROM m5_client";
    let clientsParams = [];

    if (specificClientId) {
      clientsQuery += " WHERE m5clientkey = $1";
      clientsParams = [specificClientId];
    }

    const clientsResult = await query(clientsQuery, clientsParams);
    const clients = clientsResult.rows;

    if (clients.length === 0) {
      console.log(
        specificClientId
          ? `Client ${specificClientId} not found`
          : "No clients found"
      );
      return {
        success: false,
        message: specificClientId
          ? `Client ${specificClientId} not found`
          : "No clients found",
      };
    }

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

    let processedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    for (const client of clients) {
      const clientId = client.m5clientkey;

      // Check if statement already exists for this client and generation date
      const existingStatement = await dbClient.query(
        "SELECT statement_key, agingid, groupid FROM statements WHERE clientid = $1 AND generation_date = $2",
        [clientId, formattedGenDate]
      );

      const isUpdate = existingStatement.rows.length > 0;
      let updateRequired = false;

      if (isUpdate) {
        // Check if there are any invoices or payments that would change the statement
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

        // If no invoices or payments for this period, skip update
        if (invoices.length === 0 && totalPayments === 0) {
          console.log(
            `Client ${clientId}: No invoices or payments found for period, skipping update`
          );
          processedCount++;
          continue;
        }

        console.log(
          `Client ${clientId}: Update required - found invoices or payments for period`
        );
        updateRequired = true;
      }

      // Only fetch invoices and payments if we're creating new statement or update is required
      if (!isUpdate || updateRequired) {
        const invoicesQuery = `
          SELECT 
            SUM(m1.total_cost) as total_amount,
            i.groupid as invoice_group_id
          FROM invoice i
          JOIN m1_controller m1 ON i.m1key = m1.m1key
          WHERE i.clientid = $1 AND i.date BETWEEN $2 AND $3
          GROUP BY i.groupid
        `;

        const invoiceParams = [
          clientId,
          formattedInvoiceStartDate,
          formattedInvoiceEndDate,
        ];

        const invoicesResult = await dbClient.query(
          invoicesQuery,
          invoiceParams
        );
        const invoices = invoicesResult.rows;

        const paymentsQuery = `
          SELECT SUM(amount) as total_payments
          FROM payment_m3
          WHERE clientid = $1 AND fileupload BETWEEN $2 AND $3
        `;

        const paymentParams = [
          clientId,
          formattedPaymentStartDate,
          formattedPaymentEndDate,
        ];

        const clientPaymentsResult = await dbClient.query(
          paymentsQuery,
          paymentParams
        );
        const totalPayments =
          Number.parseFloat(clientPaymentsResult.rows[0]?.total_payments) || 0;

        console.log(
          `Client ${clientId}: Total payments from ${formattedPaymentStartDate} to ${formattedPaymentEndDate}: R${totalPayments}`
        );

        if (invoices.length === 0 && totalPayments === 0) {
          console.log(
            `Client ${clientId}: No invoices or payments found, skipping`
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
          console.log(
            `Client ${clientId}: No invoices, setting groupid to null`
          );
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

        let newCurrent, new30days, new60days, new90days;

        if (isUpdate) {
          // UPDATE LOGIC: Recalculate aging based on previous statement + current period transactions
          // Get the previous statement's aging to use as base
          const previousStatementQuery2 = `
            SELECT s.agingid
            FROM statements s
            WHERE s.clientid = $1 AND s.generation_date < $2
            ORDER BY s.generation_date DESC
            LIMIT 1
          `;
          const previousStatementResult2 = await dbClient.query(
            previousStatementQuery2,
            [clientId, formattedGenDate]
          );

          if (previousStatementResult2.rows.length > 0) {
            const previousAgingId = previousStatementResult2.rows[0].agingid;
            const previousAgingQuery = `
              SELECT current, "30days", "60days", "90days"
              FROM aging_analysis
              WHERE aging_key = $1
            `;
            const previousAgingResult = await dbClient.query(
              previousAgingQuery,
              [previousAgingId]
            );

            if (previousAgingResult.rows.length > 0) {
              const previousAging = previousAgingResult.rows[0];

              // REPLACE (not add) - recalculate the entire aging based on previous + current period
              newCurrent = totalInvoices;
              const raw30days = Number.parseFloat(previousAging.current) || 0;
              const remaining30days = raw30days - totalPayments;

              if (remaining30days < 0) {
                const raw60days =
                  Number.parseFloat(previousAging["30days"]) || 0;
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
                  const excessPayment = -remaining60days;
                  const raw90days =
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
                `Client ${clientId}: Updated aging (REPLACED) - Current: R${newCurrent}, 30days: R${new30days}, 60days: R${new60days}, 90days: R${new90days}`
              );
            }
          } else {
            // No previous statement, treat as new
            newCurrent = totalInvoices;
            const remaining30days = 0 - totalPayments;
            if (remaining30days < 0) {
              new30days = remaining30days;
              new60days = 0;
              new90days = 0;
            } else {
              new30days = remaining30days;
              new60days = 0;
              new90days = 0;
            }
          }
        } else {
          // NEW STATEMENT LOGIC: Calculate aging based on previous statement
          // Use the previous statement's aging, not just the most recent aging analysis
          if (previousStatementResult.rows.length > 0) {
            const previousAgingId = previousStatementResult.rows[0].agingid;
            const previousAgingQuery = `
              SELECT current, "30days", "60days", "90days"
              FROM aging_analysis
              WHERE aging_key = $1
            `;
            const previousAgingResult = await dbClient.query(
              previousAgingQuery,
              [previousAgingId]
            );

            if (previousAgingResult.rows.length > 0) {
              const previousAging = previousAgingResult.rows[0];
              newCurrent = totalInvoices;
              const raw30days = Number.parseFloat(previousAging.current) || 0;
              const remaining30days = raw30days - totalPayments;
              let excessPayment = 0;

              if (remaining30days < 0) {
                const raw60days =
                  Number.parseFloat(previousAging["30days"]) || 0;
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
                  excessPayment = -remaining60days;
                  const raw90days =
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
                `Client ${clientId}: New statement aging - Current: R${newCurrent} (new invoices: R${totalInvoices}), 30days: R${new30days} (June current R${raw30days} - payments R${totalPayments}), 60days: R${new60days} (June 30days: R${
                  Number.parseFloat(previousAging["30days"]) || 0
                }), 90days: R${new90days}`
              );
            }
          } else {
            newCurrent = totalInvoices;
            const remaining30days = 0 - totalPayments;
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
              `Client ${clientId}: Initial aging - Current: R${newCurrent} (new invoices: R${totalInvoices}), 30days: R${new30days}, 60days: R${new60days}, 90days: R${new90days}`
            );
          }
        }

        let newAgingId;

        if (isUpdate) {
          // Update existing aging analysis
          const existingAgingId = existingStatement.rows[0].agingid;
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
          newAgingId = existingAgingId;

          // Update existing statement
          const updateStatementQuery = `
          UPDATE statements 
          SET groupid = $2, opening_balance = $3, generation_date = $4
          WHERE statement_key = $1
        `;
          await dbClient.query(updateStatementQuery, [
            existingStatement.rows[0].statement_key,
            invoice_group_id,
            openingBalance,
            formattedGenDate,
          ]);

          console.log(
            `Client ${clientId}: Updated existing statement #${existingStatement.rows[0].statement_key} for ${formattedGenDate}`
          );
          updatedCount++;
        } else {
          // Create new aging analysis
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
          newAgingId = agingInsertResult.rows[0].aging_key;

          // Create new statement
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
            `Client ${clientId}: Generated new statement #${
              statementInsertResult.rows[0].statement_key
            } for group ${
              invoice_group_id || "null"
            } with opening balance R${openingBalance}`
          );
          createdCount++;
        }

        processedCount++;
      } else if (isUpdate) {
        processedCount++;
      }
    }

    await dbClient.query("COMMIT");

    const message = specificClientId
      ? `Statement processed for client ${specificClientId}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Monthly statement generation completed. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}`;

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
