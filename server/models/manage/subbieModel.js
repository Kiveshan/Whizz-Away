import { pool } from "../../config/database.js"

const getAllSubcontractors = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "", status = "all" } = options

    // Build WHERE clause for filtering
    let whereClause = "WHERE roleid = 6"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(companyname) LIKE LOWER($${paramIndex}) OR 
        LOWER(contact_person) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(truckregnum) LIKE LOWER($${paramIndex})
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

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM m5_employee ${whereClause}`
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results
    const dataQuery = `
      SELECT * FROM m5_employee 
      ${whereClause}
      ORDER BY userid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
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
    const result = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id])
    if (!result.rows.length) {
      return { success: false, message: "Subcontractor not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error fetching subcontractor ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const checkSubcontractorEmailExists = async (email, excludeId = null) => {
  let client
  try {
    client = await pool.connect()

    // Convert excludeId to proper type
    let parsedExcludeId = null
    if (excludeId !== null && excludeId !== undefined && excludeId !== "null") {
      parsedExcludeId = Number.parseInt(excludeId)
      if (isNaN(parsedExcludeId)) {
        parsedExcludeId = null
      }
    }

    let query = "SELECT 1 FROM m5_employee WHERE email = $1 AND roleid = 6"
    const params = [email]

    if (parsedExcludeId !== null) {
      query += " AND userid != $2"
      params.push(parsedExcludeId)
    }

    console.log(`Checking email existence for: ${email}, excluding ID: ${parsedExcludeId}`)
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
    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = subcontractorData

    // Validate email uniqueness
    const emailExists = await checkSubcontractorEmailExists(email)
    if (emailExists) {
      return { success: false, message: "Email already exists" }
    }

    // Ensure subdrivername is an array
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
        ? subdrivername
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : []
    if (!subdriverArray.length) {
      return {
        success: false,
        message: "At least one driver name is required",
      }
    }

    const result = await client.query(
      `INSERT INTO m5_employee (
        cellnum, email, companyname, location, truckregnum,
        contact_person, subei_reg_num, no_of_trucks, roleid, status, subdrivername
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        cellnum,
        email,
        companyname,
        location,
        truckregnum,
        contact_person,
        subei_reg_num,
        no_of_trucks,
        6,
        true,
        `{${subdriverArray.map((name) => `"${name.replace(/"/g, '""')}"`).join(",")}}`,
      ],
    )
    return { success: true, data: result.rows[0] }
  } catch (err) {
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

    // Convert id to proper integer
    const parsedId = Number.parseInt(id)
    if (isNaN(parsedId)) {
      return { success: false, message: "Invalid subcontractor ID" }
    }

    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = subcontractorData

    console.log(`Updating subcontractor ID: ${parsedId} with data:`, subcontractorData)

    // Validate email uniqueness (excluding current subcontractor)
    const emailExists = await checkSubcontractorEmailExists(email, parsedId)
    if (emailExists) {
      return { success: false, message: "Email already exists" }
    }

    // Ensure subdrivername is an array
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
        ? subdrivername
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : []
    if (!subdriverArray.length) {
      return {
        success: false,
        message: "At least one driver name is required",
      }
    }

    const result = await client.query(
      `UPDATE m5_employee
       SET cellnum = $1, email = $2, companyname = $3, location = $4,
           truckregnum = $5, contact_person = $6, subei_reg_num = $7,
           no_of_trucks = $8, subdrivername = $9
       WHERE userid = $10 AND roleid = 6
       RETURNING *`,
      [
        cellnum,
        email,
        companyname,
        location,
        truckregnum,
        contact_person,
        subei_reg_num,
        no_of_trucks,
        `{${subdriverArray.map((name) => `"${name.replace(/"/g, '""')}"`).join(",")}}`,
        parsedId,
      ],
    )
    if (!result.rowCount) {
      return { success: false, message: "Subcontractor not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
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

    // Convert id to proper integer
    const parsedId = Number.parseInt(id)
    if (isNaN(parsedId)) {
      return { success: false, message: "Invalid subcontractor ID" }
    }

    const result = await client.query(
      `UPDATE m5_employee
       SET status = $1
       WHERE userid = $2 AND roleid = 6
       RETURNING *`,
      [status, parsedId],
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
