import { pool } from "../config/database.js";
import cron from "node-cron";

/**
 * Manual function to generate statements for a specific month (for testing/backfill)
 */
const generateStatementsForMonth = async (
  year,
  month,
  specificSubeiRegNum = null
) => {
  let client;

  try {
    client = await pool.connect();

    // Add validation for year and month
    if (!year || !month) {
      throw new Error("Year and month are required");
    }

    // Use the same date calculation logic for consistency
    const invoiceStartDate = new Date(year, month - 1, 1, 12, 0, 0); // First day of target month
    const invoiceEndDate = new Date(year, month, 0, 12, 0, 0); // Last day of target month

    const formattedInvoiceStartDate = invoiceStartDate
      .toISOString()
      .split("T")[0];
    const formattedInvoiceEndDate = invoiceEndDate.toISOString().split("T")[0];

    console.log(`Target month: ${year}-${month.toString().padStart(2, "0")}`);
    console.log(`Invoice start date: ${formattedInvoiceStartDate}`);
    console.log(`Invoice end date: ${formattedInvoiceEndDate}`);
    console.log(
      `Date range: ${formattedInvoiceStartDate} to ${formattedInvoiceEndDate}`
    );

    let subcontractorQuery = `
      SELECT 
        e.subei_reg_num,
        e.companyname,
        e.contact_person,
        ARRAY_AGG(l.legkey) as leg_ids,
        ARRAY_AGG(l.driverrate) as driver_rates,
        SUM(l.driverrate) as total_amount,
        COUNT(l.legkey) as total_legs
      FROM m5_employee e
      INNER JOIN legs_m2 l ON e.userid = l.driverid
      WHERE 
        e.subei_reg_num IS NOT NULL 
        AND e.subei_reg_num != ''
        AND l.date >= $1 
        AND l.date <= $2
        AND l.driverrate IS NOT NULL
        AND l.driverrate > 0
    `;

    const queryParams = [formattedInvoiceStartDate, formattedInvoiceEndDate];

    // Add specific subcontractor filter if provided
    if (specificSubeiRegNum) {
      subcontractorQuery += ` AND e.subei_reg_num = $3`;
      queryParams.push(specificSubeiRegNum);
    }

    subcontractorQuery += `
      GROUP BY e.subei_reg_num, e.companyname, e.contact_person
      HAVING SUM(l.driverrate) > 0
    `;

    console.log("Executing query with params:", queryParams);

    const subcontractorResult = await client.query(
      subcontractorQuery,
      queryParams
    );

    console.log(
      `Found ${subcontractorResult.rows.length} subcontractors with activity`
    );

    if (subcontractorResult.rows.length === 0) {
      const message = specificSubeiRegNum
        ? `No activity found for subcontractor ${specificSubeiRegNum} in ${year}-${month
            .toString()
            .padStart(2, "0")}`
        : `No subcontractors with activity found for ${year}-${month
            .toString()
            .padStart(2, "0")}`;
      return {
        success: true,
        message,
        count: 0,
        stats: { processed: 0, created: 0, updated: 0 },
      };
    }

    // Debug: Log the first result to see the data structure
    if (subcontractorResult.rows.length > 0) {
      console.log(
        "Sample subcontractor data:",
        JSON.stringify(subcontractorResult.rows[0], null, 2)
      );
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const subcontractor of subcontractorResult.rows) {
      const result = await upsertSubcontractorStatement(
        client,
        subcontractor,
        invoiceEndDate
      );
      if (result.created) {
        createdCount++;
      } else if (result.updated) {
        updatedCount++;
      }
      processedCount++;
    }

    const message = specificSubeiRegNum
      ? `Statement processed for subcontractor ${specificSubeiRegNum}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Generated ${processedCount} statements for ${year}-${month
          .toString()
          .padStart(
            2,
            "0"
          )}. Created: ${createdCount}, Updated: ${updatedCount}`;

    return {
      success: true,
      message,
      count: processedCount,
      stats: {
        processed: processedCount,
        created: createdCount,
        updated: updatedCount,
      },
    };
  } catch (error) {
    console.error("Error in generateStatementsForMonth:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Generate statements for current month based on previous month's data
 */
const generateCurrentMonthStatements = async (specificSubeiRegNum = null) => {
  // Use the same date calculation logic as the other statement generation code
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  console.log(`Current date: ${today.toISOString().split("T")[0]}`);
  console.log(
    `Current month: ${currentMonth + 1}, Current year: ${currentYear}`
  );

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  console.log(
    `Previous month: ${previousMonth + 1}, Previous year: ${previousYear}`
  );

  // Pass the previous year and month (adding 1 because our function expects 1-12, not 0-11)
  return await generateStatementsForMonth(
    previousYear,
    previousMonth + 1,
    specificSubeiRegNum
  );
};

/**
 * Insert or update a statement record for a subcontractor (UPSERT)
 */
const upsertSubcontractorStatement = async (
  client,
  subcontractor,
  statementDate
) => {
  try {
    console.log(
      `Processing subcontractor: ${subcontractor.companyname || "Unknown"} (${
        subcontractor.subei_reg_num || "No reg num"
      })`
    );

    // Validate required fields
    if (!subcontractor.subei_reg_num) {
      console.log("Skipping subcontractor - no registration number");
      return { created: false, updated: false };
    }

    if (!statementDate) {
      throw new Error("Statement date is required");
    }

    // Validate and prepare leg details for JSON storage
    if (!subcontractor.leg_ids || !Array.isArray(subcontractor.leg_ids)) {
      console.log("No leg IDs found for subcontractor");
      return { created: false, updated: false };
    }

    if (
      !subcontractor.driver_rates ||
      !Array.isArray(subcontractor.driver_rates)
    ) {
      console.log("No driver rates found for subcontractor");
      return { created: false, updated: false };
    }

    const legDetails = subcontractor.leg_ids.map((legId, index) => ({
      legkey: legId,
      driverrate: subcontractor.driver_rates[index] || 0,
    }));

    console.log(`Leg details for ${subcontractor.companyname}:`, legDetails);

    // Validate total amount
    const totalAmount = Number.parseFloat(subcontractor.total_amount) || 0;
    if (totalAmount <= 0) {
      console.log("Skipping subcontractor - total amount is 0 or invalid");
      return { created: false, updated: false };
    }

    // Check if statement already exists for this month
    const existingStatementQuery = `
      SELECT sub_state_id 
      FROM subcontractor_statements 
      WHERE subbie_reg_num = $1 
      AND EXTRACT(YEAR FROM date) = $2 
      AND EXTRACT(MONTH FROM date) = $3
    `;

    const existingResult = await client.query(existingStatementQuery, [
      subcontractor.subei_reg_num,
      statementDate.getFullYear(),
      statementDate.getMonth() + 1,
    ]);

    if (existingResult.rows.length > 0) {
      // Update existing statement
      const existingStatementId = existingResult.rows[0].sub_state_id;
      const updateQuery = `
        UPDATE subcontractor_statements 
        SET amount = $2, legids = $3, date = $4
        WHERE sub_state_id = $1
      `;

      const updateParams = [
        existingStatementId,
        totalAmount,
        JSON.stringify(legDetails),
        statementDate.toISOString().split("T")[0],
      ];

      await client.query(updateQuery, updateParams);

      console.log(
        `✅ Updated statement ${existingStatementId} for ${subcontractor.companyname} - Amount: R${totalAmount} (${subcontractor.total_legs} legs)`
      );
      return { created: false, updated: true };
    } else {
      // Insert new statement
      const insertQuery = `
        INSERT INTO subcontractor_statements (
          subbie_reg_num, 
          date, 
          amount, 
          legids
        ) VALUES ($1, $2, $3, $4)
        RETURNING sub_state_id
      `;

      const insertParams = [
        subcontractor.subei_reg_num,
        statementDate.toISOString().split("T")[0],
        totalAmount,
        JSON.stringify(legDetails),
      ];

      console.log("Insert params:", insertParams);

      const insertResult = await client.query(insertQuery, insertParams);

      console.log(
        `✅ Created statement ${insertResult.rows[0].sub_state_id} for ${subcontractor.companyname} - Amount: R${totalAmount} (${subcontractor.total_legs} legs)`
      );
      return { created: true, updated: false };
    }
  } catch (error) {
    console.error(
      `❌ Error upserting statement for ${
        subcontractor.companyname || "Unknown"
      }:`,
      error
    );
    throw error;
  }
};

// Schedule the statement generation to run on the 1st day of each month at 1:00 AM
cron.schedule("0 1 1 * *", async () => {
  console.log("🚀 Starting monthly statement generation...");

  try {
    const result = await generateCurrentMonthStatements();
    console.log("✅ Statement generation completed successfully:", result);
  } catch (error) {
    console.error("❌ Statement generation failed:", error);
  }
});

export { generateStatementsForMonth, generateCurrentMonthStatements };
