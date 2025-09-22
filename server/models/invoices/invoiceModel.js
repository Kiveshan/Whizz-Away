import { pool, query } from "../../config/database.js";

const getCompletedInvoices = async ({ year, month, type, clientId }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        m1.m1key, 
        m1."ksmFileRef" as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1."clientFileRef" as file_no, 
        m1.status,
        i.ikey,
        i.date as date
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      JOIN
        public.invoice i ON m1.m1key = i.m1key
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (clientId) {
      queryText += ` WHERE m1.client = $${paramIndex}`;
      queryParams.push(clientId);
      paramIndex++;
    }

    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (year && month) {
      queryText += ` AND EXTRACT(YEAR FROM i.date) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM i.date) = $${paramIndex + 1}`;
      queryParams.push(year, month);
      paramIndex += 2;
    } else if (year) {
      queryText += ` AND EXTRACT(YEAR FROM i.date) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    } else if (month) {
      queryText += ` AND EXTRACT(MONTH FROM i.date) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY i.date DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);
    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

// In invoiceModel.js - Update the getInvoiceDetails function
const getInvoiceDetails = async (id) => {
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
        m1.m1key,
        m1."ksmFileRef" as instruction_no,
        s.shipmenttype as shipment_type,
        m1."clientFileRef" as file_no,
        c.client as client_name,
        c.m5clientkey,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        c.suburb as client_suburb,
        m1.description,
        m1.total_cost,  
        m1.vat,
        m1.rateweight,
        m1.booking_ref,
        m1.pickup,
        m1.dropoff,
        m1.vessel_name,
        i.invoice_num,
        i.doc_num,
        i.date,
        i.additional_destination_info,
        ut.cluster_box,
        ut.vat_reg_num,
        ut.address,
        ut.suburb,
        ut.branch_code,
        ut.bank,
        ut.name_of_acc,
        ut.companyname,
        ut.swift_code,
        ut.account_num,
        COALESCE(ut.cell_num, ut.cell_num2) AS phonenumber,
        COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
      FROM 
        invoice i
      INNER JOIN
        public.m1_controller m1 ON i.m1key = m1.m1key
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN 
        public.m5_client c ON i.clientid = c.m5clientkey
      INNER JOIN
        usertable ut ON ut.roleid = 1 AND ut.status = 'active'
      WHERE 
        i.ikey = $1
    `;
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return { success: false, message: "Instruction not found" };
    }

    // Updated container query to include all new fields and truck information
    const containerQuery = `
      SELECT 
        c.containernum as container_number,
        c.weight,
        c.container_type,
        c.cargo_description,
        c."Add Surcharges" as add_surcharges,
        c."Hazardous" as hazardous,
        c."Surcharge Amount" as surcharge_amount,
        c."Hazardous Amount" as hazardous_amount,
        c."vgm amount" as vgm_amount,
        c.vgm,
        l.truckregnumber,
        l.driverrate as rate_per_container,
        l.date as leg_date,
        ROW_NUMBER() OVER (PARTITION BY c.containernum ORDER BY l.date DESC) as rn
      FROM 
        public.container c
      INNER JOIN
        invoice i ON i.m1key = c.m1key
      LEFT JOIN 
        public.legs_m2 l ON c.containernum = l.containernumber AND c.m1key = l.m1key
      WHERE
        i.ikey = $1
      ORDER BY c.containernum, l.date DESC
    `;
    
    const containerResult = await query(containerQuery, [id]);
    
    // Process container data to get the most recent truck for each container
    const containerMap = new Map();
    containerResult.rows.forEach(row => {
      const containerNum = row.container_number;
      if (!containerMap.has(containerNum)) {
        containerMap.set(containerNum, {
          container_number: row.container_number,
          weight: row.weight,
          container_type: row.container_type,
          cargo_description: row.cargo_description,
          add_surcharges: row.add_surcharges || false,
          hazardous: row.hazardous || false,
          surcharge_amount: row.surcharge_amount || 0,
          hazardous_amount: row.hazardous_amount || 0,
          vgm: row.vgm || false,
          vgm_amount: row.vgm_amount || 0,
          truckregnumber: row.truckregnumber || null,
          rate_per_container: row.rate_per_container || 0,
          leg_date: row.leg_date || null
        });
      }
      // Only update truck info if this is the most recent leg (rn = 1)
      if (row.rn === 1 && row.truckregnumber) {
        const existing = containerMap.get(containerNum);
        containerMap.set(containerNum, {
          ...existing,
          truckregnumber: row.truckregnumber,
          leg_date: row.leg_date
        });
      }
    });

    const containers = Array.from(containerMap.values());
    console.log(
      `Container query returned ${containers.length} unique containers for invoice ID ${id}`
    );

    return {
      success: true,
      data: {
        ...result.rows[0],
        containers,
      },
    };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

// Update the updateInstructionDetails function to handle the new field
const updateInstructionDetails = async ({
  m1key,
  dropoff,
  rate,
  invoice_num,
  additional_destination_info, // New parameter
}) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    // Validate inputs
    if (!m1key) {
      return {
        success: false,
        message: "m1key is required",
      };
    }

    if (rate !== undefined && (isNaN(rate) || rate < 0)) {
      return {
        success: false,
        message: "Rate must be a positive number",
      };
    }

    if (
      invoice_num !== undefined &&
      (!invoice_num || typeof invoice_num !== "string")
    ) {
      return {
        success: false,
        message: "Invoice number must be a non-empty string",
      };
    }

    // Validate additional destination info if provided
    if (
      additional_destination_info !== undefined &&
      (additional_destination_info === "" || typeof additional_destination_info !== "string")
    ) {
      return {
        success: false,
        message: "Additional destination info must be a valid string",
      };
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let m1Result = null;
      let invoiceResult = null;

      // Check if invoice_num already exists
      if (invoice_num !== undefined) {
        const invoiceNumCheck = await checkInvoiceNumExists(invoice_num, m1key);
        if (invoiceNumCheck.exists) {
          throw new Error("Invoice number already exists in the database");
        }
      }

      // Update m1_controller table if dropoff or rate is provided
      if (dropoff !== undefined || rate !== undefined) {
        const m1UpdateFields = [];
        const m1QueryParams = [];
        let paramIndex = 1;

        if (dropoff !== undefined) {
          m1UpdateFields.push(`dropoff = $${paramIndex}`);
          m1QueryParams.push(dropoff);
          paramIndex++;
        }

        if (rate !== undefined) {
          m1UpdateFields.push(`total_cost = $${paramIndex}`);
          m1QueryParams.push(rate);
          paramIndex++;
        }

        m1QueryParams.push(m1key);

        const m1QueryText = `
          UPDATE public.m1_controller
          SET ${m1UpdateFields.join(", ")}
          WHERE m1key = $${paramIndex}
          RETURNING m1key, dropoff, total_cost
        `;

        console.log(
          "Executing m1_controller update query:",
          m1QueryText,
          "with params:",
          m1QueryParams
        );
        m1Result = await client.query(m1QueryText, m1QueryParams);

        if (m1Result.rows.length === 0) {
          throw new Error("Instruction not found in m1_controller");
        }
      }

      // Update invoice table if invoice_num or additional_destination_info is provided
      if (invoice_num !== undefined || additional_destination_info !== undefined) {
        const invoiceUpdateFields = [];
        const invoiceQueryParams = [];
        let paramIndex = 1;

        if (invoice_num !== undefined) {
          invoiceUpdateFields.push(`invoice_num = $${paramIndex}`);
          invoiceQueryParams.push(invoice_num);
          paramIndex++;
        }

        if (additional_destination_info !== undefined) {
          invoiceUpdateFields.push(`additional_destination_info = $${paramIndex}`);
          invoiceQueryParams.push(additional_destination_info);
          paramIndex++;
        }

        invoiceQueryParams.push(m1key);

        const invoiceQueryText = `
          UPDATE public.invoice
          SET ${invoiceUpdateFields.join(", ")}
          WHERE m1key = $${paramIndex}
          RETURNING ikey, invoice_num, additional_destination_info
        `;

        console.log(
          "Executing invoice update query:",
          invoiceQueryText,
          "with params:",
          invoiceQueryParams
        );
        invoiceResult = await client.query(invoiceQueryText, invoiceQueryParams);

        if (invoiceResult.rows.length === 0) {
          throw new Error("Invoice not found for the provided m1key");
        }
      }

      await client.query("COMMIT");

      return {
        success: true,
        data: {
          m1key: m1Result ? m1Result.rows[0].m1key : m1key,
          dropoff: m1Result ? m1Result.rows[0].dropoff : undefined,
          total_cost: m1Result ? m1Result.rows[0].total_cost : undefined,
          invoice_num: invoiceResult ? invoiceResult.rows[0].invoice_num : undefined,
          additional_destination_info: invoiceResult ? invoiceResult.rows[0].additional_destination_info : undefined,
        },
        message: "Instruction and/or invoice updated successfully",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating instruction details:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Check if an m1key exists in the invoice table
const checkInvoiceExists = async (m1key) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE m1key = $1
    `;

    const result = await query(queryText, [m1key]);
    const count = Number.parseInt(result.rows[0].count, 10);

    return {
      success: true,
      exists: count > 0,
    };
  } catch (error) {
    console.error("Error checking if invoice exists:", error);
    return {
      success: false,
      message: error.message,
      exists: false,
    };
  }
};

// Check if an invoice number already exists in the invoice table
const checkInvoiceNumExists = async (invoice_num, m1key) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE invoice_num = $1 AND m1key != $2
    `;

    const result = await query(queryText, [invoice_num, m1key]);
    const count = Number.parseInt(result.rows[0].count, 10);

    return {
      success: true,
      exists: count > 0,
    };
  } catch (error) {
    console.error("Error checking if invoice number exists:", error);
    return {
      success: false,
      message: error.message,
      exists: false,
    };
  }
};

// Create a new invoice for an instruction
const createInvoice = async ({ m1key, clientId }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    // Check if invoice already exists for this m1key
    const existsCheck = await checkInvoiceExists(m1key);
    if (existsCheck.exists) {
      return {
        success: false,
        message: "Invoice already exists for this instruction",
      };
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXX where XXXX is a sequential number)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Get the next sequential number for today
    const seqQueryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE invoice_num LIKE $1
    `;
    const seqResult = await query(seqQueryText, [`INV-${dateStr}-%`]);
    const seqNum = Number.parseInt(seqResult.rows[0].count, 10) + 1;

    // Format the invoice number
    const invoiceNum = `INV-${dateStr}-${String(seqNum).padStart(4, "0")}`;

    // Insert the new invoice
    const insertQueryText = `
      INSERT INTO public.invoice
      (clientid, m1key, invoice_num, date)
      VALUES ($1, $2, $3, $4)
      RETURNING ikey
    `;

    const result = await query(insertQueryText, [
      clientId,
      m1key,
      invoiceNum,
      today,
    ]);

    return {
      success: true,
      data: {
        ikey: result.rows[0].ikey,
        invoice_num: invoiceNum,
      },
    };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};



export {
  getCompletedInvoices,
  getInvoiceDetails,
  checkInvoiceExists,
  checkInvoiceNumExists,
  createInvoice,
  updateInstructionDetails,
};
