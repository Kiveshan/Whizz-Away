import { pool, query } from "../../config/database.js";

const getClientInstructions = async (clientId, { year, month, type }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        m1.m1key, 
        m1.task as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1.fileref as file_no, 
        m1.status,
        m1.pickupdate,
        m1.total_cost,
        i.ikey,
        i.invoice_num,
        i.date as invoice_date,
        i.groupid as invoice_group_id,
        (SELECT statement_key FROM statements WHERE groupid = i.groupid LIMIT 1) as statement_id
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN
        public.invoice i ON m1.m1key = i.m1key
      WHERE 
        m1.client = $1
        AND m1.status = 'Completed'
    `;

    const queryParams = [clientId];
    let paramIndex = 2;

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Handle date filtering - with separate conditions for year and month
    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }

    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    // Order by pickup date descending (newest first)
    queryText += ` ORDER BY m1.pickupdate DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);

    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

export { getClientInstructions };
