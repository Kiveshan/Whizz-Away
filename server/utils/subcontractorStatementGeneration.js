import { pool } from "../config/database.js";
import cron from "node-cron";

/**
 * Manual function to generate statements for a specific month (for testing/backfill)
 */
const generateStatementsForMonth = async (year, month) => {
  let client;

  try {
    client = await pool.connect();

    // Add validation for year and month
    if (!year || !month) {
      throw new Error("Year and month are required");
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    console.log(
      `Manually generating statements for ${year}-${month
        .toString()
        .padStart(2, "0")}`
    );
    console.log(
      `Date range: ${firstDay.toISOString().split("T")[0]} to ${
        lastDay.toISOString().split("T")[0]
      }`
    );

    const subcontractorQuery = `
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
      GROUP BY e.subei_reg_num, e.companyname, e.contact_person
      HAVING SUM(l.driverrate) > 0
    `;

    console.log("Executing query with params:", [
      firstDay.toISOString().split("T")[0],
      lastDay.toISOString().split("T")[0],
    ]);

    const subcontractorResult = await client.query(subcontractorQuery, [
      firstDay.toISOString().split("T")[0],
      lastDay.toISOString().split("T")[0],
    ]);

    console.log(
      `Found ${subcontractorResult.rows.length} subcontractors with activity`
    );

    // Debug: Log the first result to see the data structure
    if (subcontractorResult.rows.length > 0) {
      console.log(
        "Sample subcontractor data:",
        JSON.stringify(subcontractorResult.rows[0], null, 2)
      );
    }

    for (const subcontractor of subcontractorResult.rows) {
      await insertSubcontractorStatement(client, subcontractor, lastDay);
    }

    return {
      success: true,
      message: `Generated ${
        subcontractorResult.rows.length
      } statements for ${year}-${month.toString().padStart(2, "0")}`,
      count: subcontractorResult.rows.length,
    };
  } catch (error) {
    console.error("Error in generateStatementsForMonth:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Insert a statement record for a subcontractor
 */
const insertSubcontractorStatement = async (
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
      return;
    }

    if (!statementDate) {
      throw new Error("Statement date is required");
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
      console.log(
        `Statement already exists for ${subcontractor.companyname} (${
          subcontractor.subei_reg_num
        }) for ${statementDate.getFullYear()}-${(statementDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`
      );
      return;
    }

    // Validate and prepare leg details for JSON storage
    if (!subcontractor.leg_ids || !Array.isArray(subcontractor.leg_ids)) {
      console.log("No leg IDs found for subcontractor");
      return;
    }

    if (
      !subcontractor.driver_rates ||
      !Array.isArray(subcontractor.driver_rates)
    ) {
      console.log("No driver rates found for subcontractor");
      return;
    }

    const legDetails = subcontractor.leg_ids.map((legId, index) => ({
      legkey: legId,
      driverrate: subcontractor.driver_rates[index] || 0,
    }));

    console.log(`Leg details for ${subcontractor.companyname}:`, legDetails);

    // Validate total amount
    const totalAmount = parseFloat(subcontractor.total_amount) || 0;
    if (totalAmount <= 0) {
      console.log("Skipping subcontractor - total amount is 0 or invalid");
      return;
    }

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
  } catch (error) {
    console.error(
      `❌ Error inserting statement for ${
        subcontractor.companyname || "Unknown"
      }:`,
      error
    );
    throw error;
  }
};

// Schedule the statement generation to run on the 2nd day of each month at 1:00 AM
cron.schedule("* * * * *", async () => {
  console.log("🚀 Starting test statement generation...");

  // Test with current month - 1 (previous month)
  const now = new Date();
  const testYear = now.getFullYear();
  const testMonth = now.getMonth(); // This will be previous month (0-based)

  // If current month is January, test with December of previous year
  const finalYear = testMonth === 0 ? testYear - 1 : testYear;
  const finalMonth = testMonth === 0 ? 12 : testMonth;

  console.log(`Testing with year: ${finalYear}, month: ${finalMonth}`);

  const result = await generateStatementsForMonth(finalYear, finalMonth);

  console.log("✅ Test completed successfully:", result);
});

export { generateStatementsForMonth };
