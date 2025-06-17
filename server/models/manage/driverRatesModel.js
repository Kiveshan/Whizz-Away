import { pool } from "../../config/database.js";

const getAllDriverRates = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      ORDER BY dr.m5ratekey
    `);
    return result.rows;
  } catch (err) {
    console.error("Error fetching driver rates:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getDriverRateById = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      WHERE dr.m5ratekey = $1
    `,
      [id]
    );
    if (!result.rows.length) {
      return { success: false, message: "Driver rate not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error fetching driver rate ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const createDriverRate = async (driverRateData) => {
  let client;
  try {
    client = await pool.connect();
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = driverRateData;

    // Validate required fields
    if (!startingpoint || !destination) {
      throw new Error("Starting point and destination are required");
    }
    if (
      driver_six_meter_rate == null ||
      isNaN(parseFloat(driver_six_meter_rate)) ||
      driver_twelve_meter_rate == null ||
      isNaN(parseFloat(driver_twelve_meter_rate)) ||
      subie_six_meter_rate == null ||
      isNaN(parseFloat(subie_six_meter_rate)) ||
      subie_twelve_meter_rate == null ||
      isNaN(parseFloat(subie_twelve_meter_rate))
    ) {
      throw new Error("Rate fields must be valid numbers");
    }

    const result = await client.query(
      `INSERT INTO m5_driver_rate (
        startingpoint, destination,
        driver_six_meter_rate, driver_twelve_meter_rate,
        subie_six_meter_rate, subie_twelve_meter_rate
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        startingpoint,
        destination,
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        subie_six_meter_rate,
        subie_twelve_meter_rate,
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Error creating driver rate:", err.code, err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};
const updateDriverRate = async (id, driverRateData) => {
  let client;
  try {
    client = await pool.connect();
    const checkResult = await client.query(
      "SELECT * FROM m5_driver_rate WHERE m5ratekey = $1",
      [id]
    );
    if (!checkResult.rows.length) {
      return { success: false, message: "Driver rate not found" };
    }

    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = driverRateData;

    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    if (startingpoint !== undefined) {
      updateFields.push(`startingpoint = $${paramCounter}`);
      queryParams.push(startingpoint);
      paramCounter++;
    }
    if (destination !== undefined) {
      updateFields.push(`destination = $${paramCounter}`);
      queryParams.push(destination);
      paramCounter++;
    }
    if (driver_six_meter_rate !== undefined) {
      updateFields.push(`driver_six_meter_rate = $${paramCounter}`);
      queryParams.push(driver_six_meter_rate);
      paramCounter++;
    }
    if (driver_twelve_meter_rate !== undefined) {
      updateFields.push(`driver_twelve_meter_rate = $${paramCounter}`);
      queryParams.push(driver_twelve_meter_rate);
      paramCounter++;
    }
    if (subie_six_meter_rate !== undefined) {
      updateFields.push(`subie_six_meter_rate = $${paramCounter}`);
      queryParams.push(subie_six_meter_rate);
      paramCounter++;
    }
    if (subie_twelve_meter_rate !== undefined) {
      updateFields.push(`subie_twelve_meter_rate = $${paramCounter}`);
      queryParams.push(subie_twelve_meter_rate);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      return { success: false, message: "No fields to update" };
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE m5_driver_rate 
      SET ${updateFields.join(", ")} 
      WHERE m5ratekey = $${paramCounter} 
      RETURNING *
    `;

    const result = await client.query(updateQuery, queryParams);
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error updating driver rate ${id}:`, err.code, err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const deleteDriverRate = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const checkResult = await client.query(
      "SELECT * FROM m5_driver_rate WHERE m5ratekey = $1",
      [id]
    );
    if (!checkResult.rows.length) {
      return { success: false, message: "Driver rate not found" };
    }
    await client.query("DELETE FROM m5_driver_rate WHERE m5ratekey = $1", [id]);
    return { success: true, message: "Driver rate deleted successfully" };
  } catch (err) {
    console.error(`Error deleting driver rate ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export {
  getAllDriverRates,
  getDriverRateById,
  createDriverRate,
  updateDriverRate,
  deleteDriverRate,
};
