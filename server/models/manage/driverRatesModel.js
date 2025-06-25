import { pool } from "../../config/database.js"

const getAllDriverRates = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "" } = options

    // Build WHERE clause for filtering
    let whereClause = "WHERE 1=1"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(dr.startingpoint) LIKE LOWER($${paramIndex}) OR 
        LOWER(dr.destination) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      ${whereClause}
    `
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results
    const dataQuery = `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      ${whereClause}
      ORDER BY dr.m5ratekey DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      driverRates: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching driver rates:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getDriverRateById = async (id) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      WHERE dr.m5ratekey = $1
    `,
      [id],
    )
    if (!result.rows.length) {
      return { success: false, message: "Driver rate not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error fetching driver rate ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createDriverRate = async (driverRateData) => {
  let client
  try {
    client = await pool.connect()
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = driverRateData

    // Validate required fields
    if (!startingpoint || !destination) {
      throw new Error("Starting point and destination are required")
    }

    // Validate required driver rates
    if (
      driver_six_meter_rate == null ||
      driver_six_meter_rate === "" ||
      isNaN(Number.parseFloat(driver_six_meter_rate)) ||
      driver_twelve_meter_rate == null ||
      driver_twelve_meter_rate === "" ||
      isNaN(Number.parseFloat(driver_twelve_meter_rate))
    ) {
      throw new Error("Driver 6m and 12m rates are required and must be valid numbers")
    }

    // Process subie rates - convert empty strings to null
    const processedSubieSixRate =
      subie_six_meter_rate === "" || subie_six_meter_rate == null ? null : Number.parseFloat(subie_six_meter_rate)

    const processedSubieTwelveRate =
      subie_twelve_meter_rate === "" || subie_twelve_meter_rate == null
        ? null
        : Number.parseFloat(subie_twelve_meter_rate)

    // Validate subie rates if they are provided (not null/empty)
    if (
      (processedSubieSixRate !== null && isNaN(processedSubieSixRate)) ||
      (processedSubieTwelveRate !== null && isNaN(processedSubieTwelveRate))
    ) {
      throw new Error("Subie rates must be valid numbers if provided")
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
        Number.parseFloat(driver_six_meter_rate),
        Number.parseFloat(driver_twelve_meter_rate),
        processedSubieSixRate,
        processedSubieTwelveRate,
      ],
    )
    return result.rows[0]
  } catch (err) {
    console.error("Error creating driver rate:", err.code, err.message)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateDriverRate = async (id, driverRateData) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id])
    if (!checkResult.rows.length) {
      return { success: false, message: "Driver rate not found" }
    }

    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = driverRateData

    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    if (startingpoint !== undefined) {
      updateFields.push(`startingpoint = $${paramCounter}`)
      queryParams.push(startingpoint)
      paramCounter++
    }
    if (destination !== undefined) {
      updateFields.push(`destination = $${paramCounter}`)
      queryParams.push(destination)
      paramCounter++
    }
    if (driver_six_meter_rate !== undefined) {
      updateFields.push(`driver_six_meter_rate = $${paramCounter}`)
      queryParams.push(Number.parseFloat(driver_six_meter_rate))
      paramCounter++
    }
    if (driver_twelve_meter_rate !== undefined) {
      updateFields.push(`driver_twelve_meter_rate = $${paramCounter}`)
      queryParams.push(Number.parseFloat(driver_twelve_meter_rate))
      paramCounter++
    }
    if (subie_six_meter_rate !== undefined) {
      updateFields.push(`subie_six_meter_rate = $${paramCounter}`)
      // Handle null/empty values for subie rates
      const processedValue =
        subie_six_meter_rate === "" || subie_six_meter_rate == null ? null : Number.parseFloat(subie_six_meter_rate)
      queryParams.push(processedValue)
      paramCounter++
    }
    if (subie_twelve_meter_rate !== undefined) {
      updateFields.push(`subie_twelve_meter_rate = $${paramCounter}`)
      // Handle null/empty values for subie rates
      const processedValue =
        subie_twelve_meter_rate === "" || subie_twelve_meter_rate == null
          ? null
          : Number.parseFloat(subie_twelve_meter_rate)
      queryParams.push(processedValue)
      paramCounter++
    }

    if (updateFields.length === 0) {
      return { success: false, message: "No fields to update" }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    queryParams.push(id)

    const updateQuery = `
      UPDATE m5_driver_rate 
      SET ${updateFields.join(", ")} 
      WHERE m5ratekey = $${paramCounter} 
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error updating driver rate ${id}:`, err.code, err.message)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteDriverRate = async (id) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id])
    if (!checkResult.rows.length) {
      return { success: false, message: "Driver rate not found" }
    }
    await client.query("DELETE FROM m5_driver_rate WHERE m5ratekey = $1", [id])
    return { success: true, message: "Driver rate deleted successfully" }
  } catch (err) {
    console.error(`Error deleting driver rate ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export { getAllDriverRates, getDriverRateById, createDriverRate, updateDriverRate, deleteDriverRate }
