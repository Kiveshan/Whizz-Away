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
        m1.task as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1.fileref as file_no, 
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
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex + 1}`;
      queryParams.push(year, month);
      paramIndex += 2;
    } else if (year) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    } else if (month) {
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY m1.pickupdate DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);
    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

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
        m1.task as instruction_no,
        s.shipmenttype as shipment_type,
        m1.fileref as file_no,
        c.client as client_name,
        c.m5clientkey,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        c.suburb as client_suburb,
        m1.pickup,
        m1.dropoff,
        m1.pickupdate,
        m1.description,
        m1.total_cost,  
        m1.vat,
        m1.rateweight,
        m1.booking_ref,
        m1.vessel_name,
        i.invoice_num,
        i.doc_num,
        i.date,
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

    const containerQuery = `
      SELECT 
        containernum as container_number, 
        weight
      FROM 
        public.container c
      INNER JOIN
        invoice i ON i.m1key = c.m1key
      WHERE
        i.ikey = $1
    `;
    const containerResult = await query(containerQuery, [id]);
    console.log(
      `Container query returned ${containerResult.rows.length} rows for invoice ID ${id}`
    );

    return {
      success: true,
      data: {
        ...result.rows[0],
        containers: containerResult.rows,
      },
    };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
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
    const count = parseInt(result.rows[0].count, 10);

    return {
      success: true,
      exists: count > 0
    };
  } catch (error) {
    console.error("Error checking if invoice exists:", error);
    return {
      success: false,
      message: error.message,
      exists: false
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
        message: "Invoice already exists for this instruction"
      };
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXX where XXXX is a sequential number)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the next sequential number for today
    const seqQueryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE invoice_num LIKE $1
    `;
    const seqResult = await query(seqQueryText, [`INV-${dateStr}-%`]);
    const seqNum = parseInt(seqResult.rows[0].count, 10) + 1;
    
    // Format the invoice number
    const invoiceNum = `INV-${dateStr}-${String(seqNum).padStart(4, '0')}`;
    
    // Insert the new invoice
    const insertQueryText = `
      INSERT INTO public.invoice
      (clientid, m1key, invoice_num, date)
      VALUES ($1, $2, $3, $4)
      RETURNING ikey
    `;

    const result = await query(insertQueryText, [clientId, m1key, invoiceNum, today]);
    
    return {
      success: true,
      data: {
        ikey: result.rows[0].ikey,
        invoice_num: invoiceNum
      }
    };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return {
      success: false,
      message: error.message
    };
  }
};

export { getCompletedInvoices, getInvoiceDetails, checkInvoiceExists, createInvoice };
