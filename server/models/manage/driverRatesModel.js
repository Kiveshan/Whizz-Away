import { pool } from "../../config/database.js"

const getAllDriverRates = async (company_reg_num, options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "" } = options

    // Build WHERE clause for filtering
    let whereClause = "WHERE dr.company_reg_num = $1"
    const queryParams = [company_reg_num]
    let paramIndex = 2

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
      ORDER BY dr.startingpoint ASC, dr.destination ASC, dr.effective_from ASC, dr.m5ratekey ASC
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

const getDriverRateById = async (id, company_reg_num) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `
      SELECT dr.*, e.name, e.surname
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      WHERE dr.m5ratekey = $1
        AND dr.company_reg_num = $2
    `,
      [id, company_reg_num],
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

const createDriverRate = async (driverRateData, company_reg_num) => {
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
      effective_from,
      effective_to,
    } = driverRateData

    // Validate required fields (only starting point and destination)
    if (!startingpoint || !destination) {
      throw new Error("Starting point and destination are required")
    }

    // Process driver rates - convert empty strings to null (now optional)
    const processedDriverSixRate =
      driver_six_meter_rate === "" || driver_six_meter_rate == null ? null : Number.parseFloat(driver_six_meter_rate)

    const processedDriverTwelveRate =
      driver_twelve_meter_rate === "" || driver_twelve_meter_rate == null
        ? null
        : Number.parseFloat(driver_twelve_meter_rate)

    // Process subie rates - convert empty strings to null
    const processedSubieSixRate =
      subie_six_meter_rate === "" || subie_six_meter_rate == null ? null : Number.parseFloat(subie_six_meter_rate)

    const processedSubieTwelveRate =
      subie_twelve_meter_rate === "" || subie_twelve_meter_rate == null
        ? null
        : Number.parseFloat(subie_twelve_meter_rate)

    // Validate all rates if they are provided (not null/empty)
    if (
      (processedDriverSixRate !== null && isNaN(processedDriverSixRate)) ||
      (processedDriverTwelveRate !== null && isNaN(processedDriverTwelveRate)) ||
      (processedSubieSixRate !== null && isNaN(processedSubieSixRate)) ||
      (processedSubieTwelveRate !== null && isNaN(processedSubieTwelveRate))
    ) {
      throw new Error("All rates must be valid numbers if provided")
    }

    // Process effective dates - default to today if not provided
    const effectiveFrom = effective_from || new Date().toISOString().split('T')[0]
    const effectiveTo = effective_to || null

    const result = await client.query(
      `INSERT INTO m5_driver_rate (
        startingpoint, destination,
        driver_six_meter_rate, driver_twelve_meter_rate,
        subie_six_meter_rate, subie_twelve_meter_rate,
        effective_from, effective_to,
        company_reg_num
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        startingpoint,
        destination,
        processedDriverSixRate,
        processedDriverTwelveRate,
        processedSubieSixRate,
        processedSubieTwelveRate,
        effectiveFrom,
        effectiveTo,
        company_reg_num,
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

const updateDriverRate = async (id, driverRateData, company_reg_num) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1 AND company_reg_num = $2", [id, company_reg_num])
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
      effective_from,
      effective_to,
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
      // Handle null/empty values for driver rates (now optional)
      const processedValue =
        driver_six_meter_rate === "" || driver_six_meter_rate == null ? null : Number.parseFloat(driver_six_meter_rate)
      queryParams.push(processedValue)
      paramCounter++
    }
    if (driver_twelve_meter_rate !== undefined) {
      updateFields.push(`driver_twelve_meter_rate = $${paramCounter}`)
      // Handle null/empty values for driver rates (now optional)
      const processedValue =
        driver_twelve_meter_rate === "" || driver_twelve_meter_rate == null
          ? null
          : Number.parseFloat(driver_twelve_meter_rate)
      queryParams.push(processedValue)
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
    if (effective_from !== undefined) {
      updateFields.push(`effective_from = $${paramCounter}`)
      queryParams.push(effective_from || new Date().toISOString().split('T')[0])
      paramCounter++
    }
    if (effective_to !== undefined) {
      updateFields.push(`effective_to = $${paramCounter}`)
      queryParams.push(effective_to || null)
      paramCounter++
    }

    if (updateFields.length === 0) {
      return { success: false, message: "No fields to update" }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    queryParams.push(id)
    queryParams.push(company_reg_num)

    const updateQuery = `
      UPDATE m5_driver_rate
      SET ${updateFields.join(", ")}
      WHERE m5ratekey = $${paramCounter}
        AND company_reg_num = $${paramCounter + 1}
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

const deleteDriverRate = async (id, company_reg_num) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1 AND company_reg_num = $2", [id, company_reg_num])
    if (!checkResult.rows.length) {
      return { success: false, message: "Driver rate not found" }
    }
    await client.query("DELETE FROM m5_driver_rate WHERE m5ratekey = $1 AND company_reg_num = $2", [id, company_reg_num])
    return { success: true, message: "Driver rate deleted successfully" }
  } catch (err) {
    console.error(`Error deleting driver rate ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getDriverRateUsage = async (id, company_reg_num) => {
  let client
  try {
    client = await pool.connect()

    const rateResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1 AND company_reg_num = $2", [id, company_reg_num])
    if (!rateResult.rows.length) {
      return { success: false, message: "Driver rate not found" }
    }

    const rate = rateResult.rows[0]
    const statusValue = "In Progress"

    const legsResult = await client.query(
      `
        SELECT DISTINCT l.m1key, l.driverrate
        FROM legs_m2 l
        INNER JOIN m1_controller c ON c.m1key = l.m1key
        WHERE LOWER(COALESCE(c.status, '')) = LOWER($2)
          AND LOWER(TRIM(COALESCE(l.startingpoint, ''))) = LOWER(TRIM(COALESCE($3, '')))
          AND LOWER(TRIM(COALESCE(l.destination, ''))) = LOWER(TRIM(COALESCE($4, '')))
          AND l.company_reg_num = $6
          AND (
            l.m5ratekey = $1
            OR (
              COALESCE(array_length($5::double precision[], 1), 0) > 0
              AND l.driverrate IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM unnest($5::double precision[]) AS rv(rate)
                WHERE abs(l.driverrate - rv.rate) < 0.005
              )
            )
          )
      `,
      [
        id,
        statusValue,
        rate.startingpoint,
        rate.destination,
        [
          rate.driver_six_meter_rate,
          rate.driver_twelve_meter_rate,
          rate.subie_six_meter_rate,
          rate.subie_twelve_meter_rate,
        ]
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map((v) => Number(v))
          .filter((v) => !Number.isNaN(v)),
        company_reg_num,
      ],
    )

    const usageRows = legsResult.rows || []
    const instructions = [...new Set(usageRows.map((r) => r.m1key).filter((v) => v !== null && v !== undefined))]

    const fieldMap = [
      { field: "driver_six_meter_rate", label: "Driver Rate (6m)" },
      { field: "driver_twelve_meter_rate", label: "Driver Rate (12m)" },
      { field: "subie_six_meter_rate", label: "Subbie Rate (6m)" },
      { field: "subie_twelve_meter_rate", label: "Subbie Rate (12m)" },
    ]

    const usedRateFieldsMap = new Map()
    const unmatchedLegRates = new Set()

    const isMatchingNumber = (a, b) => {
      if (a === null || a === undefined || b === null || b === undefined) return false
      const numA = Number(a)
      const numB = Number(b)
      if (Number.isNaN(numA) || Number.isNaN(numB)) return false
      return Math.abs(numA - numB) < 0.005
    }

    for (const row of usageRows) {
      const legRate = row.driverrate
      const instructionNo = row.m1key
      let matched = false

      for (const fm of fieldMap) {
        if (isMatchingNumber(legRate, rate[fm.field])) {
          matched = true
          if (!usedRateFieldsMap.has(fm.field)) {
            usedRateFieldsMap.set(fm.field, {
              field: fm.field,
              label: fm.label,
              value: rate[fm.field],
              instructions: new Set(),
            })
          }
          if (instructionNo !== null && instructionNo !== undefined) {
            usedRateFieldsMap.get(fm.field).instructions.add(instructionNo)
          }
        }
      }

      if (!matched && legRate !== null && legRate !== undefined && legRate !== "") {
        unmatchedLegRates.add(legRate)
      }
    }

    return {
      success: true,
      data: {
        inUse: instructions.length > 0,
        rateId: rate.m5ratekey,
        startingpoint: rate.startingpoint,
        destination: rate.destination,
        instructions,
        usedRateFields: Array.from(usedRateFieldsMap.values()).map((r) => ({
          field: r.field,
          label: r.label,
          value: r.value,
          instructions: Array.from(r.instructions.values()),
        })),
        unmatchedLegRates: Array.from(unmatchedLegRates.values()),
      },
    }
  } catch (err) {
    console.error(`Error checking usage for driver rate ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Get the appropriate rate for a leg based on its date and route
// This function respects effective dates to determine which rate version applies
export const getRateForLegDate = async (startingpoint, destination, legDate, isSubcontractor = false, containerType = '6m', company_reg_num) => {
  let client
  try {
    client = await pool.connect()

    // Use the date value directly — passing a JS Date object for a 'YYYY-MM-DD' string
    // causes UTC-midnight → local-date shift on UTC+ servers. Let PostgreSQL cast the
    // string to DATE itself to avoid any timezone offset.
    const targetDate = legDate instanceof Date
      ? legDate.toISOString().split('T')[0]
      : legDate

    console.log(`[getRateForLegDate] Querying: ${startingpoint} -> ${destination}, date: ${targetDate}, isSubbie: ${isSubcontractor}, container: ${containerType}`);

    const query = `
      SELECT
        m5ratekey,
        startingpoint,
        destination,
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        subie_six_meter_rate,
        subie_twelve_meter_rate,
        effective_from,
        effective_to
      FROM m5_driver_rate
      WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
        AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE($2, '')))
        AND effective_from <= $3::date
        AND (effective_to IS NULL OR effective_to >= $3::date)
        AND company_reg_num = $4
      ORDER BY effective_from DESC, m5ratekey DESC
      LIMIT 1
    `

    const result = await client.query(query, [
      startingpoint,
      destination,
      targetDate,
      company_reg_num
    ])
    
    console.log(`[getRateForLegDate] Query returned ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log(`[getRateForLegDate] Found rate:`, result.rows[0]);
    } else {
      console.log(`[getRateForLegDate] No rate found for ${targetDate}`);
    }
    
    if (!result.rows.length) {
      return {
        success: false,
        message: `No rate found for route ${startingpoint} to ${destination} effective on ${targetDate}`,
        data: null
      }
    }
    
    const rate = result.rows[0]
    
    // Determine which rate field to return based on driver type and container type
    let applicableRate = null
    let rateField = ''
    
    if (isSubcontractor) {
      if (containerType.toLowerCase() === '12m') {
        applicableRate = rate.subie_twelve_meter_rate
        rateField = 'subie_twelve_meter_rate'
      } else {
        applicableRate = rate.subie_six_meter_rate
        rateField = 'subie_six_meter_rate'
      }
    } else {
      if (containerType.toLowerCase() === '12m') {
        applicableRate = rate.driver_twelve_meter_rate
        rateField = 'driver_twelve_meter_rate'
      } else {
        applicableRate = rate.driver_six_meter_rate
        rateField = 'driver_six_meter_rate'
      }
    }
    
    return {
      success: true,
      data: {
        ...rate,
        applicable_rate: applicableRate,
        rate_field: rateField,
        is_subcontractor: isSubcontractor,
        container_type: containerType
      }
    }
  } catch (err) {
    console.error(`Error fetching rate for leg date ${legDate}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Check for overlapping effective dates for a given route
// Returns warnings if overlaps exist but doesn't block (manual resolution)
export const checkRateDateOverlaps = async (startingpoint, destination, effectiveFrom, effectiveTo, excludeRateId = null, company_reg_num) => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT
        m5ratekey,
        startingpoint,
        destination,
        effective_from,
        effective_to,
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        subie_six_meter_rate,
        subie_twelve_meter_rate
      FROM m5_driver_rate
      WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
        AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE($2, '')))
        AND ($5::int IS NULL OR m5ratekey != $5)
        AND company_reg_num = $6
        AND (
          -- Standard overlap check: two ranges overlap if
          -- existing starts before new ends (or new has no end)
          -- AND existing ends after new starts (or existing has no end)
          (effective_from <= $4 OR $4 IS NULL)
          AND (effective_to >= $3 OR effective_to IS NULL)
        )
      ORDER BY effective_from ASC
    `

    const result = await client.query(query, [
      startingpoint,
      destination,
      effectiveFrom,
      effectiveTo,
      excludeRateId,
      company_reg_num
    ])
    
    return {
      success: true,
      hasOverlaps: result.rows.length > 0,
      overlappingRates: result.rows,
      message: result.rows.length > 0 
        ? `Warning: ${result.rows.length} overlapping rate(s) found for this route and date range`
        : 'No overlapping rates found'
    }
  } catch (err) {
    console.error(`Error checking rate date overlaps:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export { getAllDriverRates, getDriverRateById, createDriverRate, updateDriverRate, deleteDriverRate, getDriverRateUsage }

// ─── Route-grouped functions (new UX) ───────────────────────────────────────

// Return one row per distinct (startingpoint, destination) pair with a period count
export const getDistinctRoutes = async (options = {}) => {
  let client
  try {
    client = await pool.connect()
    const { offset = 0, limit = 10, search = "" } = options

    let whereClause = "WHERE 1=1"
    const queryParams = []
    let paramIndex = 1

    if (search && search.trim() !== "") {
      whereClause += ` AND (LOWER(startingpoint) LIKE LOWER($${paramIndex}) OR LOWER(destination) LIKE LOWER($${paramIndex}))`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    const countQuery = `
      SELECT COUNT(*) FROM (
        SELECT startingpoint, destination
        FROM m5_driver_rate
        ${whereClause}
        GROUP BY startingpoint, destination
      ) AS routes
    `
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = parseInt(countResult.rows[0].count)

    const dataQuery = `
      SELECT
        startingpoint,
        destination,
        COUNT(*) AS period_count,
        MAX(effective_from) AS latest_from
      FROM m5_driver_rate
      ${whereClause}
      GROUP BY startingpoint, destination
      ORDER BY startingpoint ASC, destination ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return { routes: dataResult.rows, totalCount }
  } catch (err) {
    console.error("Error fetching distinct routes:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Return all rate periods for a specific route, ordered oldest → newest
export const getPeriodsForRoute = async (startingpoint, destination) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `SELECT * FROM m5_driver_rate
       WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
         AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE($2, '')))
       ORDER BY effective_from ASC, m5ratekey ASC`,
      [startingpoint, destination],
    )
    return { success: true, data: result.rows }
  } catch (err) {
    console.error("Error fetching periods for route:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Replace-all: delete existing periods for the route then bulk-insert the new set
// Collapse any sequence of whitespace to a single space and strip leading/trailing
// whitespace so "Cape Town " and "Cape  Town" both normalize to "Cape Town".
const normalizeName = (s) => (s || "").trim().replace(/\s+/g, " ")

export const saveRoutePeriods = async (startingpoint, destination, periods, originalStartingpoint, originalDestination) => {
  // Normalize before anything touches the DB so misspaced names can never
  // create phantom duplicate routes.
  startingpoint = normalizeName(startingpoint)
  destination   = normalizeName(destination)
  if (originalStartingpoint) originalStartingpoint = normalizeName(originalStartingpoint)
  if (originalDestination)   originalDestination   = normalizeName(originalDestination)

  const deleteSp = originalStartingpoint || startingpoint
  const deleteDest = originalDestination || destination
  const isRename =
    originalStartingpoint &&
    originalDestination &&
    (startingpoint.trim().toLowerCase() !== originalStartingpoint.trim().toLowerCase() ||
      destination.trim().toLowerCase() !== originalDestination.trim().toLowerCase())

  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    await client.query(
      `DELETE FROM m5_driver_rate
       WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
         AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE($2, '')))`,
      [deleteSp, deleteDest],
    )

    // When renaming, update legs_m2 for in-progress instructions so legs stay in sync
    let renamedInstructions = []
    if (isRename) {
      const legUpdateResult = await client.query(
        `UPDATE legs_m2 l
         SET startingpoint = $3, destination = $4
         FROM m1_controller c
         WHERE c.m1key = l.m1key
           AND LOWER(COALESCE(c.status, '')) = 'in progress'
           AND LOWER(TRIM(COALESCE(l.startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
           AND LOWER(TRIM(COALESCE(l.destination, ''))) = LOWER(TRIM(COALESCE($2, '')))
         RETURNING l.m1key`,
        [deleteSp, deleteDest, startingpoint, destination],
      )
      renamedInstructions = [...new Set(legUpdateResult.rows.map((r) => r.m1key))]
    }

    const processRate = (val) => (val === "" || val == null ? null : parseFloat(val))
    const insertedPeriods = []

    for (const period of periods) {
      // Use string split to avoid UTC-midnight timezone shift on UTC+ servers
      const effectiveFrom = period.effective_from
        ? period.effective_from.toString().split("T")[0]
        : new Date().toISOString().split("T")[0]
      const effectiveTo = period.effective_to ? period.effective_to.toString().split("T")[0] : null

      const result = await client.query(
        `INSERT INTO m5_driver_rate (
          startingpoint, destination,
          driver_six_meter_rate, driver_twelve_meter_rate,
          subie_six_meter_rate, subie_twelve_meter_rate,
          effective_from, effective_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          startingpoint,
          destination,
          processRate(period.driver_six_meter_rate),
          processRate(period.driver_twelve_meter_rate),
          processRate(period.subie_six_meter_rate),
          processRate(period.subie_twelve_meter_rate),
          effectiveFrom,
          effectiveTo,
        ],
      )
      insertedPeriods.push(result.rows[0])
    }

    await client.query("COMMIT")
    return { success: true, data: insertedPeriods, renamedInstructions }
  } catch (err) {
    if (client) await client.query("ROLLBACK")
    console.error("Error saving route periods:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Check if any in-progress instruction legs reference this route
export const getRouteUsage = async (startingpoint, destination) => {
  let client
  try {
    client = await pool.connect()
    const legsResult = await client.query(
      `SELECT DISTINCT l.m1key
       FROM legs_m2 l
       INNER JOIN m1_controller c ON c.m1key = l.m1key
       WHERE LOWER(COALESCE(c.status, '')) = 'in progress'
         AND LOWER(TRIM(COALESCE(l.startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
         AND LOWER(TRIM(COALESCE(l.destination, ''))) = LOWER(TRIM(COALESCE($2, '')))`,
      [startingpoint, destination],
    )
    const instructions = legsResult.rows.map((r) => r.m1key)
    return { success: true, data: { inUse: instructions.length > 0, instructions } }
  } catch (err) {
    console.error("Error checking route usage:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Delete all periods for a route (caller must check usage first)
export const deleteRoute = async (startingpoint, destination) => {
  let client
  try {
    client = await pool.connect()
    await client.query(
      `DELETE FROM m5_driver_rate
       WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
         AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE($2, '')))`,
      [startingpoint, destination],
    )
    return { success: true }
  } catch (err) {
    console.error("Error deleting route:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Distinct startingpoint + destination values for autocomplete in the create form
export const getRouteOptions = async () => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `SELECT DISTINCT startingpoint, destination
       FROM m5_driver_rate
       ORDER BY startingpoint ASC, destination ASC`,
    )
    return { success: true, data: result.rows }
  } catch (err) {
    console.error("Error fetching route options:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// All leg dates for in-progress instructions that use this route — used to check coverage gaps
export const getRouteLegDates = async (startingpoint, destination) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `SELECT l.m1key, l.date::text AS date
       FROM legs_m2 l
       INNER JOIN m1_controller c ON c.m1key = l.m1key
       WHERE LOWER(COALESCE(c.status, '')) = 'in progress'
         AND LOWER(TRIM(COALESCE(l.startingpoint, ''))) = LOWER(TRIM(COALESCE($1, '')))
         AND LOWER(TRIM(COALESCE(l.destination, ''))) = LOWER(TRIM(COALESCE($2, '')))
         AND l.date IS NOT NULL
       ORDER BY l.date ASC`,
      [startingpoint, destination],
    )
    return { success: true, data: result.rows }
  } catch (err) {
    console.error("Error fetching route leg dates:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// Refresh legs_m2.driverrate for a set of instructions, respecting effective dates.
// For each leg, the rate is looked up using the leg's own date so that legs in different
// rate periods within the same instruction each receive the correct rate version.
export const refreshDriverRateLegsForInstructions = async (rateId, instructionIds, company_reg_num) => {
  if (!Array.isArray(instructionIds) || instructionIds.length === 0) {
    return { success: true, updated: 0 }
  }
  let client
  try {
    client = await pool.connect()

    // Resolve the route for this rate record
    const rateRecord = await client.query(
      'SELECT startingpoint, destination FROM m5_driver_rate WHERE m5ratekey = $1 AND company_reg_num = $2',
      [Number(rateId), company_reg_num]
    )
    if (!rateRecord.rows.length) {
      return { success: false, updated: 0 }
    }
    const { startingpoint, destination } = rateRecord.rows[0]

    // Fetch all legs on the affected in-progress instructions that match the route,
    // including the driver's role and the container type for rate field selection.
    const legsResult = await client.query(
      `SELECT
         l.legkey,
         l.driverid,
         l.containernumber,
         l.date,
         COALESCE(e.roleid, 5) AS roleid,
         LOWER(TRIM(COALESCE(c.container_type, '6m'))) AS container_type
       FROM legs_m2 l
       INNER JOIN m1_controller mc ON mc.m1key = l.m1key
       LEFT JOIN m5_employee e ON e.userid = l.driverid
       LEFT JOIN container c
         ON LOWER(TRIM(COALESCE(c.containernum::text, ''))) = LOWER(TRIM(COALESCE(l.containernumber, '')))
         AND c.m1key = l.m1key
       WHERE l.m1key = ANY($1::int[])
         AND LOWER(COALESCE(mc.status, '')) = 'in progress'
         AND LOWER(TRIM(COALESCE(l.startingpoint, ''))) = LOWER(TRIM($2))
         AND LOWER(TRIM(COALESCE(l.destination, ''))) = LOWER(TRIM($3))
         AND l.company_reg_num = $4
         AND l.date IS NOT NULL`,
      [instructionIds.map((v) => Number(v)), startingpoint, destination, company_reg_num]
    )

    await client.query('BEGIN')

    let updated = 0
    for (const leg of legsResult.rows) {
      const legDate = leg.date instanceof Date
        ? leg.date.toISOString().split('T')[0]
        : leg.date

      const isSubcontractor = leg.roleid === 6
      const containerType = leg.container_type || '6m'

      try {
        const rateResult = await getRateForLegDate(startingpoint, destination, legDate, isSubcontractor, containerType, company_reg_num)
        if (rateResult.success && rateResult.data?.applicable_rate != null) {
          await client.query(
            'UPDATE legs_m2 SET driverrate = $1 WHERE legkey = $2',
            [rateResult.data.applicable_rate, leg.legkey]
          )
          updated++
        }
      } catch (legErr) {
        console.error(`Skipping leg ${leg.legkey} during rate refresh:`, legErr.message)
      }
    }

    await client.query('COMMIT')
    return { success: true, updated }
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    throw err
  } finally {
    if (client) client.release()
  }
}
