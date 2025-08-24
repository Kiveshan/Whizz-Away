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

    // Add year filter if provided
    if (filters.year) {
      queryText += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      queryParams.push(filters.year);
      paramIndex++;
    }

    // Add month filter if provided
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

    // Generate invoice number (format: ADN-YYYYMMDD-XXX where XXX is a sequential number)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Get the next sequential number for today
    const seqQueryText = `
      SELECT COUNT(*) as count
      FROM public.addons
      WHERE invoice_number LIKE $1
    `;
    const seqResult = await query(seqQueryText, [`ADN-${dateStr}-%`]);
    const seqNum = Number.parseInt(seqResult.rows[0].count, 10) + 1;

    // Format the invoice number
    const invoiceNumber = `ADN-${dateStr}-${String(seqNum).padStart(3, "0")}`;

    // Insert the new add-on
    const insertQueryText = `
      INSERT INTO public.addons (
        client_id, 
        description, 
        amount, 
        category, 
        date, 
        invoice_number,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING addon_id
    `;

    const result = await query(insertQueryText, [
      addonData.client_id,
      addonData.description,
      addonData.amount,
      addonData.category,
      addonData.date,
      invoiceNumber,
      today,
    ]);

    return {
      success: true,
      data: {
        addon_id: result.rows[0].addon_id,
        invoice_number: invoiceNumber,
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
      FROM public.addons a
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

    // Validate inputs
    if (!addonId) {
      return {
        success: false,
        message: "Add-on ID is required",
      };
    }

    const queryText = `
      UPDATE public.addons 
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

    const queryText = `DELETE FROM public.addons WHERE addon_id = $1`;
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

export {
  getAddonsByClient,
  createAddon,
  getAddonById,
  updateAddon,
  deleteAddon,
};
