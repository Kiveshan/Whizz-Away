import { pool, query } from "../../config/database.js";

const getAddonsByClient = async (clientId, filters = {}) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        addon_id,
        client_id,
        description,
        amount,
        category,
        date,
        invoice_number,
        created_at
      FROM public.add_ons 
      WHERE client_id = $1
    `;

    const queryParams = [clientId];
    let paramIndex = 2;

    if (filters.year) {
      queryText += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      queryParams.push(filters.year);
      paramIndex++;
    }

    if (filters.month) {
      queryText += ` AND EXTRACT(MONTH FROM date) = $${paramIndex}`;
      queryParams.push(filters.month);
      paramIndex++;
    }

    queryText += ` ORDER BY date DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);
    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

const createAddon = async (addonData) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Generate invoice_number
    const seqQueryText = `
      SELECT COUNT(*) as count
      FROM public.add_ons
      WHERE invoice_number LIKE $1
    `;
    const seqResult = await query(seqQueryText, [`ADN-${dateStr}-%`]);
    const seqNum = Number.parseInt(seqResult.rows[0].count, 10) + 1;
    const invoiceNumber = `ADN-${dateStr}-${String(seqNum).padStart(3, "0")}`;

    // Generate group_id
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    const monthName = monthNames[currentMonth - 1];
    const groupId = `${addonData.client_id}-${monthName}${currentYear}`;

    // Insert into add_ons table
    const insertQueryText = `
      INSERT INTO public.add_ons (
        client_id, 
        description, 
        amount, 
        category, 
        date, 
        invoice_number,
        group_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING addon_id, invoice_number, group_id
    `;

    const result = await query(insertQueryText, [
      addonData.client_id,
      addonData.description,
      addonData.amount,
      addonData.category,
      addonData.date,
      invoiceNumber,
      groupId,
      today,
    ]);

    return {
      success: true,
      data: {
        addon_id: result.rows[0].addon_id,
        invoice_number: result.rows[0].invoice_number,
        group_id: result.rows[0].group_id,
        ...addonData,
      },
    };
  } catch (error) {
    console.error("Error creating add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const getAddonById = async (addonId) => {
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
        a.addon_id,
        a.client_id,
        a.description,
        a.amount,
        a.category,
        a.date,
        a.invoice_number,
        a.created_at,
        c.client as client_name
      FROM public.add_ons a
      LEFT JOIN public.m5_client c ON a.client_id = c.m5clientkey
      WHERE a.addon_id = $1
    `;

    const result = await query(queryText, [addonId]);

    if (result.rows.length === 0) {
      return { success: false, message: "Add-on not found" };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const updateAddon = async (addonId, addonData) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    if (!addonId) {
      return {
        success: false,
        message: "Add-on ID is required",
      };
    }

    const queryText = `
      UPDATE public.add_ons 
      SET description = $1, amount = $2, category = $3, date = $4
      WHERE addon_id = $5
      RETURNING addon_id, description, amount, category, date, invoice_number
    `;

    console.log("Executing update query:", queryText, "with params:", [
      addonData.description,
      addonData.amount,
      addonData.category,
      addonData.date,
      addonId,
    ]);
    const result = await query(queryText, [
      addonData.description,
      addonData.amount,
      addonData.category,
      addonData.date,
      addonId,
    ]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Add-on not found",
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error updating add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const deleteAddon = async (addonId) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `DELETE FROM public.add_ons WHERE addon_id = $1`;
    const result = await query(queryText, [addonId]);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: "Add-on not found",
      };
    }

    return {
      success: true,
      message: "Add-on deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const getCompanyInfo = async () => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    const queryText = `
      SELECT 
        companyname AS name,
        address,
        suburb AS city,
        cell_num AS phone,
        email,
        vat_reg_num,
        account_num,
        name_of_acc,
        bank,
        branch_code,
        swift_code
      FROM public.usertable 
      WHERE userid = 1 AND status = 'active'
    `;
    const result = await query(queryText);
    if (result.rows.length === 0) {
      return { success: false, message: "Company info not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching company info:", error);
    throw error;
  }
};

const getClientById = async (clientId) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    const queryText = `
      SELECT 
        client AS name,
        streetaddress AS address,
        city,
        cellnum AS telephone,
        email,
        vatregno AS vat_reg_num
      FROM public.m5_client
      WHERE m5clientkey = $1 AND status = true
    `;
    const result = await query(queryText, [clientId]);
    if (result.rows.length === 0) {
      return { success: false, message: "Client not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching client info:", error);
    throw error;
  }
};

export {
  getAddonsByClient,
  createAddon,
  getAddonById,
  updateAddon,
  deleteAddon,
  getCompanyInfo,
  getClientById,
};
