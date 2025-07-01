import { pool } from "../config/database.js";
import cron from "node-cron";

/**
 * Generate statements for current month based on previous month's legs
 * If running in July: looks at June legs, generation date = July 1st
 */
const generateCurrentMonthStatements = async (specificSubeiRegNum = null) => {
  console.log("Starting subcontractor statement generation process...");

  const today = new Date();
  const currentMonth = today.getMonth(); // July = 6 (0-indexed)
  const currentYear = today.getFullYear(); // 2025

  // Generation date is 1st of current month (when function is called)
  const generationDate = new Date(currentYear, currentMonth, 1, 12, 0, 0); // July 1st, 2025
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  // Look at previous month's legs (June if running in July)
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1; // June = 5
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear; // 2025
  const legsStartDate = new Date(previousYear, previousMonth, 1, 12, 0, 0); // June 1st, 2025
  const legsEndDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0); // June 30th, 2025
  const formattedLegsStartDate = legsStartDate.toISOString().split("T")[0];
  const formattedLegsEndDate = legsEndDate.toISOString().split("T")[0];

  console.log(`Today: ${today.toISOString().split("T")[0]}`);
  console.log(
    `Current Month: ${currentMonth + 1}, Current Year: ${currentYear}`
  );
  console.log(
    `Previous Month: ${previousMonth + 1}, Previous Year: ${previousYear}`
  );
  console.log(`Generation Date: ${formattedGenDate}`);
  console.log(
    `Looking at legs from ${formattedLegsStartDate} to ${formattedLegsEndDate}`
  );

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

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

    const queryParams = [formattedLegsStartDate, formattedLegsEndDate];

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
        ? `No legs found for subcontractor ${specificSubeiRegNum} between ${formattedLegsStartDate} and ${formattedLegsEndDate}`
        : `No subcontractors with legs found between ${formattedLegsStartDate} and ${formattedLegsEndDate}`;

      await client.query("COMMIT");
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
        generationDate,
        formattedGenDate
      );
      if (result.created) {
        createdCount++;
      } else if (result.updated) {
        updatedCount++;
      }
      processedCount++;
    }

    await client.query("COMMIT");

    const message = specificSubeiRegNum
      ? `Statement processed for subcontractor ${specificSubeiRegNum}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Generated ${processedCount} subcontractor statements for ${formattedGenDate}. Created: ${createdCount}, Updated: ${updatedCount}`;

    console.log("Subcontractor statement generation completed successfully");
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
    if (client) await client.query("ROLLBACK");
    console.error("Error generating subcontractor statements:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Manual function to generate statements for a specific month (for testing/backfill)
 */
const generateStatementsForMonth = async (
  year,
  month,
  specificSubeiRegNum = null
) => {
  console.log(
    `Generating subcontractor statements for ${year}-${month
      .toString()
      .padStart(2, "0")}`
  );

  // Add validation for year and month
  if (!year || !month) {
    throw new Error("Year and month are required");
  }

  // Generation date is 1st of the specified month
  const generationDate = new Date(year, month - 1, 1, 12, 0, 0);
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  // Look at previous month's legs
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const legsStartDate = new Date(previousYear, previousMonth - 1, 1, 12, 0, 0);
  const legsEndDate = new Date(previousYear, previousMonth, 0, 12, 0, 0);
  const formattedLegsStartDate = legsStartDate.toISOString().split("T")[0];
  const formattedLegsEndDate = legsEndDate.toISOString().split("T")[0];

  console.log(`Generation Date: ${formattedGenDate}`);
  console.log(
    `Looking at legs from ${formattedLegsStartDate} to ${formattedLegsEndDate}`
  );

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

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

    const queryParams = [formattedLegsStartDate, formattedLegsEndDate];

    // Add specific subcontractor filter if provided
    if (specificSubeiRegNum) {
      subcontractorQuery += ` AND e.subei_reg_num = $3`;
      queryParams.push(specificSubeiRegNum);
    }

    subcontractorQuery += `
      GROUP BY e.subei_reg_num, e.companyname, e.contact_person
      HAVING SUM(l.driverrate) > 0
    `;

    const subcontractorResult = await client.query(
      subcontractorQuery,
      queryParams
    );

    if (subcontractorResult.rows.length === 0) {
      const message = specificSubeiRegNum
        ? `No legs found for subcontractor ${specificSubeiRegNum} between ${formattedLegsStartDate} and ${formattedLegsEndDate}`
        : `No subcontractors with legs found between ${formattedLegsStartDate} and ${formattedLegsEndDate}`;

      await client.query("COMMIT");
      return {
        success: true,
        message,
        count: 0,
        stats: { processed: 0, created: 0, updated: 0 },
      };
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const subcontractor of subcontractorResult.rows) {
      const result = await upsertSubcontractorStatement(
        client,
        subcontractor,
        generationDate,
        formattedGenDate
      );
      if (result.created) {
        createdCount++;
      } else if (result.updated) {
        updatedCount++;
      }
      processedCount++;
    }

    await client.query("COMMIT");

    const message = specificSubeiRegNum
      ? `Statement processed for subcontractor ${specificSubeiRegNum}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Generated ${processedCount} subcontractor statements for ${year}-${month
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
    if (client) await client.query("ROLLBACK");
    console.error("Error in generateStatementsForMonth:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Insert or update a statement record for a subcontractor (UPSERT)
 */
const upsertSubcontractorStatement = async (
  client,
  subcontractor,
  generationDate,
  formattedGenDate
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

    // Check if statement already exists for this generation date
    const existingStatementQuery = `
      SELECT sub_state_id 
      FROM subcontractor_statements 
      WHERE subbie_reg_num = $1 
      AND date = $2
    `;

    const existingResult = await client.query(existingStatementQuery, [
      subcontractor.subei_reg_num,
      formattedGenDate,
    ]);

    if (existingResult.rows.length > 0) {
      // Update existing statement
      const existingStatementId = existingResult.rows[0].sub_state_id;
      const updateQuery = `
        UPDATE subcontractor_statements 
        SET amount = $2, legids = $3
        WHERE sub_state_id = $1
      `;

      const updateParams = [
        existingStatementId,
        totalAmount,
        JSON.stringify(legDetails),
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
        formattedGenDate,
        totalAmount,
        JSON.stringify(legDetails),
      ];

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

export { generateStatementsForMonth, generateCurrentMonthStatements };
