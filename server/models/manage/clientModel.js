import { pool } from "../../config/database.js";

const checkClientEmailExists = async (email) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT 1 FROM m5_client WHERE email = $1",
      [email]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("Error checking email existence:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getAllClients = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM m5_client ORDER BY m5clientkey"
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching clients:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getClientById = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM m5_client WHERE m5clientkey = $1",
      [id]
    );
    if (!result.rows.length) {
      return { success: false, message: "Client not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error fetching client ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const createClient = async (clientData) => {
  let client;
  try {
    client = await pool.connect();
    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      starting_point,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
    } = clientData;

    // Basic input validation
    if (!clientName || !email || !representative) {
      throw new Error(
        "Missing required fields: client, email, or representative"
      );
    }

    const result = await client.query(
      `INSERT INTO m5_client (
         client, representative, companyaddress, suburb, postalcode,
         email, client_reg_num, cellnum, vatregno, city, streetaddress, 
         payment_type, starting_point, destination, driver_six_meter_rate, 
         driver_twelve_meter_rate, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        clientName,
        representative,
        companyaddress,
        suburb,
        postalcode,
        email,
        client_reg_num,
        cellnum,
        vatregno,
        city,
        streetaddress,
        payment_type,
        starting_point,
        destination,
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        true, // status
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Error creating client:", err.code, err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateClient = async (id, clientData) => {
  let client;
  try {
    client = await pool.connect();
    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      starting_point,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
    } = clientData;

    // Basic input validation
    if (!clientName || !email || !representative) {
      throw new Error(
        "Missing required fields: client, email, or representative"
      );
    }

    const result = await client.query(
      `UPDATE m5_client
       SET client = $1, representative = $2, companyaddress = $3, suburb = $4,
           postalcode = $5, email = $6, client_reg_num = $7, cellnum = $8,
           vatregno = $9, city = $10, streetaddress = $11, payment_type = $12,
           starting_point = $13, destination = $14, driver_six_meter_rate = $15,
           driver_twelve_meter_rate = $16
       WHERE m5clientkey = $17
       RETURNING *`,
      [
        clientName,
        representative,
        companyaddress,
        suburb,
        postalcode,
        email,
        client_reg_num,
        cellnum,
        vatregno,
        city,
        streetaddress,
        payment_type,
        starting_point,
        destination,
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        id,
      ]
    );
    if (!result.rowCount) {
      return { success: false, message: "Client not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error updating client ${id}:`, err.code, err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const toggleClientStatus = async (id, status) => {
  let client;
  try {
    client = await pool.connect();
    const checkResult = await client.query(
      "SELECT m5clientkey FROM m5_client WHERE m5clientkey = $1",
      [id]
    );
    if (!checkResult.rows.length) {
      return { success: false, message: "Client not found" };
    }
    const result = await client.query(
      `UPDATE m5_client
       SET status = $1
       WHERE m5clientkey = $2
       RETURNING m5clientkey, client, representative, email, status`,
      [status, id]
    );
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error toggling client ${id} status:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const deleteClient = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const checkResult = await client.query(
      "SELECT m5clientkey FROM m5_client WHERE m5clientkey = $1",
      [id]
    );
    if (!checkResult.rows.length) {
      return { success: false, message: "Client not found" };
    }
    await client.query("DELETE FROM m5_client WHERE m5clientkey = $1", [id]);
    return { success: true, message: "Client deleted successfully" };
  } catch (err) {
    console.error(`Error deleting client ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export {
  checkClientEmailExists,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
};