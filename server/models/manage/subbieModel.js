import { pool } from "../../config/database.js"

const getAllSubcontractors = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "", status = "all" } = options

    // Build WHERE clause for filtering - group by company info
    let whereClause = "WHERE roleid = 6"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(companyname) LIKE LOWER($${paramIndex}) OR 
        LOWER(contact_person) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(truckregnum) LIKE LOWER($${paramIndex}) OR
        LOWER(name) LIKE LOWER($${paramIndex}) OR
        LOWER(surname) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Status filter
    if (status !== "all") {
      whereClause += ` AND status = $${paramIndex}`
      queryParams.push(status === "active")
      paramIndex++
    }

    // Get total count for pagination (count unique companies)
    const countQuery = `
      SELECT COUNT(DISTINCT subei_reg_num) 
      FROM m5_employee 
      ${whereClause}
    `
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results grouped by company
    const dataQuery = `
      WITH company_groups AS (
        SELECT 
          subei_reg_num,
          MIN(userid) as min_userid,
          companyname,
          location,
          contact_person,
          cellnum,
          email,
          status,
          COUNT(*) as driver_count,
          STRING_AGG(DISTINCT truckregnum, ', ' ORDER BY truckregnum) as truck_registrations,
          STRING_AGG(name || ' ' || surname, ', ' ORDER BY name) as driver_names
        FROM m5_employee 
        ${whereClause}
        GROUP BY subei_reg_num, companyname, location, contact_person, cellnum, email, status
        ORDER BY MIN(userid) DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM company_groups
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      subcontractors: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching subcontractors:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getSubcontractorById = async (id) => {
  let client
  try {
    client = await pool.connect()

    // First get the company info from any record with this userid
    const mainResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id])

    if (!mainResult.rows.length) {
      return { success: false, message: "Subcontractor not found" }
    }

    const mainRecord = mainResult.rows[0]

    // Get all records for this company (same subei_reg_num)
    const allRecordsResult = await client.query(
      `SELECT userid, name, surname, truckregnum 
       FROM m5_employee 
       WHERE subei_reg_num = $1 AND roleid = 6 
       ORDER BY userid`,
      [mainRecord.subei_reg_num],
    )

    // Build the trucks array with driver info
    const trucks = allRecordsResult.rows.map((record) => ({
      userid: record.userid,
      reg: record.truckregnum || "",
      driver: `${record.name || ""} ${record.surname || ""}`.trim(),
    }))

    const result = {
      ...mainRecord,
      trucks,
      no_of_trucks: trucks.length,
    }

    return { success: true, data: result }
  } catch (err) {
    console.error(`Error fetching subcontractor ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const checkSubcontractorEmailExists = async (email, excludeSubeiRegNum = null) => {
  let client
  try {
    client = await pool.connect()

    let query = "SELECT 1 FROM m5_employee WHERE email = $1 AND roleid = 6"
    const params = [email]

    if (excludeSubeiRegNum !== null) {
      query += " AND subei_reg_num != $2"
      params.push(excludeSubeiRegNum)
    }

    console.log(`Checking email existence for: ${email}, excluding reg num: ${excludeSubeiRegNum}`)
    const result = await client.query(query, params)
    return result.rows.length > 0
  } catch (err) {
    console.error("Error checking subcontractor email existence:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createSubcontractor = async (subcontractorData) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    const { cellnum, email, companyname, location, contact_person, subei_reg_num, trucks = [] } = subcontractorData

    // Validate email uniqueness
    const emailExists = await checkSubcontractorEmailExists(email)
    if (emailExists) {
      await client.query("ROLLBACK")
      return { success: false, message: "Email already exists" }
    }

    // Validate that we have at least one truck/driver combination
    if (!trucks.length || trucks.every((truck) => !truck.reg && !truck.driver)) {
      await client.query("ROLLBACK")
      return { success: false, message: "At least one truck and driver combination is required" }
    }

    const createdRecords = []

    // Create a record for each truck/driver combination
    for (const truck of trucks) {
      if (!truck.reg && !truck.driver) continue // Skip empty entries

      // Parse driver name into first and last name
      const driverName = (truck.driver || "").trim()
      let firstName = ""
      let lastName = ""

      if (driverName) {
        const nameParts = driverName.split(" ")
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      const result = await client.query(
        `INSERT INTO m5_employee (
          name, surname, cellnum, email, companyname, location, 
          truckregnum, contact_person, subei_reg_num, roleid, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          firstName,
          lastName,
          cellnum,
          email,
          companyname,
          location,
          truck.reg || "",
          contact_person,
          subei_reg_num,
          6, // roleid for subcontractor
          true, // status
        ],
      )

      createdRecords.push(result.rows[0])
    }

    await client.query("COMMIT")
    return { success: true, data: createdRecords[0] } // Return first record as main reference
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error creating subcontractor:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateSubcontractor = async (id, subcontractorData) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    // Get the current record to find the subei_reg_num
    const currentResult = await client.query("SELECT subei_reg_num FROM m5_employee WHERE userid = $1 AND roleid = 6", [
      id,
    ])

    if (!currentResult.rows.length) {
      await client.query("ROLLBACK")
      return { success: false, message: "Subcontractor not found" }
    }

    const currentSubeiRegNum = currentResult.rows[0].subei_reg_num

    const { cellnum, email, companyname, location, contact_person, subei_reg_num, trucks = [] } = subcontractorData

    // Validate email uniqueness (excluding current company)
    const emailExists = await checkSubcontractorEmailExists(email, currentSubeiRegNum)
    if (emailExists) {
      await client.query("ROLLBACK")
      return { success: false, message: "Email already exists" }
    }

    // Delete all existing records for this company
    await client.query("DELETE FROM m5_employee WHERE subei_reg_num = $1 AND roleid = 6", [currentSubeiRegNum])

    // Validate that we have at least one truck/driver combination
    if (!trucks.length || trucks.every((truck) => !truck.reg && !truck.driver)) {
      await client.query("ROLLBACK")
      return { success: false, message: "At least one truck and driver combination is required" }
    }

    const createdRecords = []

    // Create new records for each truck/driver combination
    for (const truck of trucks) {
      if (!truck.reg && !truck.driver) continue // Skip empty entries

      // Parse driver name into first and last name
      const driverName = (truck.driver || "").trim()
      let firstName = ""
      let lastName = ""

      if (driverName) {
        const nameParts = driverName.split(" ")
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      const result = await client.query(
        `INSERT INTO m5_employee (
          name, surname, cellnum, email, companyname, location, 
          truckregnum, contact_person, subei_reg_num, roleid, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          firstName,
          lastName,
          cellnum,
          email,
          companyname,
          location,
          truck.reg || "",
          contact_person,
          subei_reg_num,
          6, // roleid for subcontractor
          true, // status
        ],
      )

      createdRecords.push(result.rows[0])
    }

    await client.query("COMMIT")
    return { success: true, data: createdRecords[0] } // Return first record as main reference
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(`Error updating subcontractor ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const toggleSubcontractorStatus = async (id, status) => {
  let client
  try {
    client = await pool.connect()

    // Get the subei_reg_num for this record
    const currentResult = await client.query("SELECT subei_reg_num FROM m5_employee WHERE userid = $1 AND roleid = 6", [
      id,
    ])

    if (!currentResult.rows.length) {
      return { success: false, message: "Subcontractor not found" }
    }

    const subeiRegNum = currentResult.rows[0].subei_reg_num

    // Update status for all records with the same subei_reg_num
    const result = await client.query(
      `UPDATE m5_employee
       SET status = $1
       WHERE subei_reg_num = $2 AND roleid = 6
       RETURNING *`,
      [status, subeiRegNum],
    )

    if (!result.rowCount) {
      return { success: false, message: "Subcontractor not found" }
    }

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error toggling subcontractor ${id} status:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  getAllSubcontractors,
  getSubcontractorById,
  checkSubcontractorEmailExists,
  createSubcontractor,
  updateSubcontractor,
  toggleSubcontractorStatus,
}
