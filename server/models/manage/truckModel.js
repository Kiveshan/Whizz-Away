import { pool } from "../../config/database.js"

const getAllTrucks = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "" } = options

    // Build WHERE clause for filtering - EXCLUDE subcontractor trucks
    let whereClause = "WHERE (is_subcontractor = false OR is_subcontractor IS NULL)"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(truckregnum) LIKE LOWER($${paramIndex}) OR 
        LOWER(model) LIKE LOWER($${paramIndex}) OR 
        LOWER(vin_num) LIKE LOWER($${paramIndex}) OR
        LOWER(trailersize) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM m5_trucks ${whereClause}`
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results
    const dataQuery = `
      SELECT * FROM m5_trucks 
      ${whereClause}
      ORDER BY m5truckskey DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      trucks: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching trucks:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getTruckById = async (id) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT * FROM m5_trucks WHERE m5truckskey = $1", [id])
    if (!result.rows.length) {
      return { success: false, message: "Truck not found" }
    }

    const truck = result.rows[0]

    // Format dates for consistent handling
    if (truck.truckpurchasedate) {
      truck.truckpurchasedate = new Date(truck.truckpurchasedate).toISOString().split("T")[0]
    }
    if (truck.truck_license_expiry) {
      truck.truck_license_expiry = new Date(truck.truck_license_expiry).toISOString().split("T")[0]
    }

    return { success: true, data: truck }
  } catch (err) {
    console.error(`Error fetching truck ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createTruck = async (truckData, documentKeys) => {
  let client
  try {
    client = await pool.connect()
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      truck_license_expiry,
    } = truckData

    const document_url1 = documentKeys[0] || null
    const document_url2 = documentKeys[1] || null
    const document_url3 = documentKeys[2] || null

    const result = await client.query(
      `INSERT INTO m5_trucks (
         truckregnum, trailersize, truckpurchasedate, year, model,
         purchase_price, current_evaluation, vin_num, is_subcontractor,
         truck_license_expiry, document_url1, document_url2, document_url3
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor || false, // Default to false for company trucks
        truck_license_expiry,
        document_url1,
        document_url2,
        document_url3,
      ],
    )
    return result.rows[0]
  } catch (err) {
    console.error("Error creating truck:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateTruck = async (id, truckData, newDocKeys) => {
  let client
  try {
    client = await pool.connect()
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      truck_license_expiry,
    } = truckData

    const existingResult = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_trucks WHERE m5truckskey = $1",
      [id],
    )
    if (!existingResult.rows.length) {
      return { success: false, message: "Truck not found" }
    }

    let { document_url1, document_url2, document_url3 } = existingResult.rows[0]
    const currentDocs = [document_url1, document_url2, document_url3]

    let newIndex = 0
    for (let i = 0; i < currentDocs.length && newIndex < newDocKeys.length; i++) {
      if (!currentDocs[i]) {
        currentDocs[i] = newDocKeys[newIndex]
        newIndex++
      }
    }
    ;[document_url1, document_url2, document_url3] = currentDocs

    const result = await client.query(
      `UPDATE m5_trucks
       SET truckregnum = $1, trailersize = $2, truckpurchasedate = $3,
           year = $4, model = $5, purchase_price = $6,
           current_evaluation = $7, vin_num = $8, is_subcontractor = $9,
           truck_license_expiry = $10, document_url1 = $11, document_url2 = $12, document_url3 = $13
       WHERE m5truckskey = $14
       RETURNING *`,
      [
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor || false,
        truck_license_expiry,
        document_url1,
        document_url2,
        document_url3,
        id,
      ],
    )
    if (!result.rowCount) {
      return { success: false, message: "Truck not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error updating truck ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// New function to get trucks with expiring licenses (EXCLUDE subcontractor trucks)
const getTrucksWithExpiringLicenses = async (daysAhead = 30) => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT truckregnum, truck_license_expiry, 
             (truck_license_expiry - CURRENT_DATE) as days_until_expiry
      FROM m5_trucks 
      WHERE truck_license_expiry IS NOT NULL 
        AND truck_license_expiry <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        AND truck_license_expiry >= CURRENT_DATE
        AND (is_subcontractor = false OR is_subcontractor IS NULL)
      ORDER BY truck_license_expiry ASC
    `

    const result = await client.query(query)
    return result.rows
  } catch (err) {
    console.error("Error fetching trucks with expiring licenses:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// New function to get expired licenses (EXCLUDE subcontractor trucks)
const getTrucksWithExpiredLicenses = async () => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT truckregnum, truck_license_expiry,
             (CURRENT_DATE - truck_license_expiry) as days_expired
      FROM m5_trucks 
      WHERE truck_license_expiry IS NOT NULL 
        AND truck_license_expiry < CURRENT_DATE
        AND (is_subcontractor = false OR is_subcontractor IS NULL)
      ORDER BY truck_license_expiry ASC
    `

    const result = await client.query(query)
    return result.rows
  } catch (err) {
    console.error("Error fetching trucks with expired licenses:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteTruckDocument = async (truckId, url) => {
  let client
  try {
    client = await pool.connect()
    const { rows } = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_trucks WHERE m5truckskey = $1",
      [truckId],
    )
    if (!rows.length) {
      return { success: false, message: "Truck not found" }
    }

    let updateField = null
    const storedUrls = [rows[0].document_url1, rows[0].document_url2, rows[0].document_url3]
    for (let i = 0; i < storedUrls.length; i++) {
      if (storedUrls[i]) {
        let storedKey
        try {
          storedKey = decodeURIComponent(new URL(storedUrls[i]).pathname.substring(1))
        } catch {
          storedKey = storedUrls[i]
        }
        if (storedKey === url) {
          updateField = `document_url${i + 1}`
          break
        }
      }
    }

    if (updateField) {
      await client.query(`UPDATE m5_trucks SET ${updateField} = NULL WHERE m5truckskey = $1`, [truckId])
      return { success: true, message: "Document deleted successfully" }
    }
    return { success: false, message: "No matching document URL found" }
  } catch (err) {
    console.error("Error deleting truck document:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteTruck = async (id) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT m5truckskey FROM m5_trucks WHERE m5truckskey = $1", [id])
    if (!checkResult.rows.length) {
      return { success: false, message: "Truck not found" }
    }
    await client.query("DELETE FROM m5_trucks WHERE m5truckskey = $1", [id])
    return { success: true, message: "Truck deleted successfully" }
  } catch (err) {
    console.error(`Error deleting truck ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  getAllTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruckDocument,
  deleteTruck,
  getTrucksWithExpiringLicenses,
  getTrucksWithExpiredLicenses,
}
