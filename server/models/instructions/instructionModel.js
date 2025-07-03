import { pool, query } from "../../config/database.js"

export const getShipmentTypes = async () => {
  const sql = `
    SELECT shipkey, shipmenttype
    FROM public.shipment
    ORDER BY shipkey
  `
  const result = await query(sql)
  return result.recordset || result.rows
}

export const getContainersByInstructionId = async (instructionId) => {
  // Convert instructionId to string to match database type
  const instructionIdStr = String(instructionId)
  const sql = `
    SELECT containerkey, containernum, weight, m1key, container_type, cargo_description
    FROM public.container
    WHERE m1key = $1
  `

  console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Executing query`, {
    sql,
    params: [instructionIdStr],
    instructionId,
    instructionIdType: typeof instructionId,
    instructionIdStr,
    instructionIdStrType: typeof instructionIdStr,
  })

  try {
    const result = await query(sql, [instructionIdStr])
    const duration = result.duration || 0

    console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Query completed`, {
      instructionId,
      instructionIdStr,
      rowCount: result.rowCount || result.recordset?.length || 0,
      duration: `${duration}ms`,
      sampleRows: (result.rows || result.recordset || []).slice(0, 3), // Log first 3 rows as sample
    })

    return result.rows || result.recordset || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getContainersByInstructionId:`, {
      error: error.message,
      stack: error.stack,
      instructionId,
      instructionIdStr,
      sql,
    })
    throw error
  }
}

export const saveInstruction = async ({ controllerData, containerData }) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const controllerQuery = `
      INSERT INTO public.m1_controller (
        client, task, shipment_type, pickup, dropoff, 
        hazardous, surchages, surcharge, pickuptime, pickupdate, 
        stackdate, deadline, fileref, rateweight, 
        description, status, vat,
        num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
        weight, total_cost, booking_ref, vessel_name,
        rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING m1key
    `

    // Helper function to format date to YYYY-MM-DD
    const formatDate = (dateStr) => {
      if (!dateStr) return null
      try {
        const date = new Date(dateStr)
        return date.toISOString().split("T")[0] // Returns YYYY-MM-DD
      } catch (e) {
        console.error("Error formatting date:", e)
        return null
      }
    }

    // Helper function to format time to HH:MM:SS
    const formatTime = (timeStr) => {
      if (!timeStr) return null
      try {
        // Handle both 'HH:MM' and 'HH:MM:SS' formats
        const [hours, minutes] = timeStr.split(":")
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`
      } catch (e) {
        console.error("Error formatting time:", e)
        return null
      }
    }

    // Log all received fields for debugging
    console.log("Raw controller data received for saving:", JSON.stringify(controllerData, null, 2))

    // Extract all possible field name variations and ensure correct types/nulls
    const fields = {
      // Client
      client: controllerData.client || controllerData.clientId,

      // Shipment
      shipmentType: controllerData.shipmentTypeId || controllerData.shipment_type,

      // Dates
      pickupDate: controllerData.pickupDate || controllerData.pickupdate,
      pickupTime: controllerData.pickupTime || controllerData.pickuptime,
      stackDate: controllerData.stackDate || controllerData.stackdate,
      deadline: controllerData.deadline,

      // File reference
      fileRef: controllerData.fileRef || controllerData.file_ref || controllerData.fileref,

      // Other fields
      task: controllerData.task,
      pickup: controllerData.pickup,
      dropoff: controllerData.dropoff,
      hazardous: Boolean(controllerData.hazardous) || false,
      surcharges: Boolean(controllerData.surcharges) || false,
      surchargeAmount: controllerData.surcharge || 0, // Use the already calculated surcharge
      rateWeight: controllerData.rateWeight,
      description: controllerData.description,
      bookingRef: controllerData.booking_ref || controllerData.bookingRef,
      vesselName: controllerData.vessel_name, // Already null if cross-haul from frontend
      weight: controllerData.weight, // Already null if container-based from frontend
      unitrate: controllerData.unitrate, // Already null if container-based from frontend
      vat: controllerData.vat || 15,
      total_cost: controllerData.total_cost || 0,

      // Container counts and rates (already handled for null/0 by frontend)
      num_six_meters: controllerData.num_six_meters || 0,
      num_twelve_meters: controllerData.num_twelve_meters || 0,
      num_abnormal: controllerData.num_abnormal || 0,
      num_breakbulk: controllerData.num_breakbulk || 0,
      rateper_6: controllerData.rateper_6,
      rateper_12: controllerData.rateper_12,
      rateper_abnormal: controllerData.rateper_abnormal,
      rateper_breakbulk: controllerData.rateper_breakbulk,
    }

    console.log("Processed fields for saving:", {
      client: fields.client,
      task: fields.task,
      shipmentType: fields.shipmentType,
      pickup: fields.pickup,
      dropoff: fields.dropoff,
      hazardous: fields.hazardous,
      surcharges: fields.surcharges,
      surchargeAmount: fields.surchargeAmount,
      pickupTime: formatTime(fields.pickupTime),
      pickupDate: formatDate(fields.pickupDate),
      stackDate: formatDate(fields.stackDate),
      deadline: formatDate(fields.deadline),
      fileRef: fields.fileRef,
      rateWeight: fields.rateWeight,
      description: fields.description,
      status: "New",
      vat: fields.vat,
      num_six_meters: fields.num_six_meters,
      num_twelve_meters: fields.num_twelve_meters,
      num_abnormal: fields.num_abnormal,
      num_breakbulk: fields.num_breakbulk,
      weight: fields.weight,
      total_cost: fields.total_cost,
      bookingRef: fields.bookingRef,
      vesselName: fields.vesselName,
      rateper_6: fields.rateper_6,
      rateper_12: fields.rateper_12,
      rateper_abnormal: fields.rateper_abnormal,
      rateper_breakbulk: fields.rateper_breakbulk,
      unitrate: fields.unitrate,
    })

    const controllerValues = [
      fields.client,
      fields.task,
      fields.shipmentType,
      fields.pickup,
      fields.dropoff,
      fields.hazardous,
      fields.surcharges,
      fields.surchargeAmount,
      formatTime(fields.pickupTime),
      formatDate(fields.pickupDate),
      formatDate(fields.stackDate), // Will be null if cross-haul
      formatDate(fields.deadline),
      fields.fileRef,
      fields.rateWeight,
      fields.description,
      "New",
      fields.vat,
      fields.num_six_meters,
      fields.num_twelve_meters,
      fields.num_abnormal,
      fields.num_breakbulk,
      fields.weight, // Will be null if container-based
      fields.total_cost,
      fields.bookingRef,
      fields.vesselName, // Will be null if cross-haul
      fields.rateper_6, // Will be null if weight-based
      fields.rateper_12, // Will be null if weight-based
      fields.rateper_abnormal, // Will be null if weight-based
      fields.rateper_breakbulk, // Will be null if weight-based or not cross-haul/container
      fields.unitrate, // Will be null if container-based
    ]

    const controllerResult = await client.query(controllerQuery, controllerValues)
    const m1key = controllerResult.rows[0].m1key

    for (const container of containerData) {
      const containerQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key, container_type, cargo_description
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `
      const containerValues = [
        container.containerNum,
        container.weight, // Already null if not import from frontend
        m1key,
        container.container_type,
        container.cargo_description || "",
      ]
      await client.query(containerQuery, containerValues)
    }

    await client.query("COMMIT")
    return { m1key }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export const getClientInstructionStats = async () => {
  const statusCheckQuery = `
    SELECT DISTINCT status FROM public.m1_controller
  `
  const query = `
    SELECT 
      c.m5clientkey,
      c.client AS companyname,
      c.representative,
      c.email,
      c.cellnum,
      MAX(m.pickupdate) as latest_date,
      SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
    FROM 
      public.m5_client c
    LEFT JOIN 
      public.m1_controller m ON c.m5clientkey = m.client
    WHERE 
      c.status = true
    GROUP BY 
      c.m5clientkey, c.client, c.representative, c.email
    ORDER BY 
      c.client
  `
  const client = await pool.connect()
  try {
    const statusResult = await client.query(statusCheckQuery)
    console.log(
      "Available status values in database:",
      statusResult.rows.map((row) => row.status),
    )
    const result = await client.query(query)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const getInstructions = async (clientId) => {
  let sql = `
    SELECT 
      m.m1key,
      m.fileref as fileno,
      m.shipment_type,
      s.shipmenttype as type_text,
      m.status,
      m.pickupdate,
      m.client,
      c.client AS companyname
    FROM 
      public.m1_controller m
    JOIN 
      public.m5_client c ON m.client = c.m5clientkey
    LEFT JOIN
      public.shipment s ON m.shipment_type = s.shipkey
  `
  const queryParams = []
  if (clientId) {
    sql += ` WHERE m.client = $1`
    queryParams.push(clientId)
  }
  sql += ` ORDER BY m.pickupdate DESC`

  const result = await query(sql, queryParams)
  return result.recordset || result.rows
}

export const getInstructionById = async (instructionId) => {
  const sql = `
    WITH instruction_data AS (
      SELECT 
        m.*,
        c.client AS companyname,
        c.representative,
        c.cellnum,
        c.email,
        s.shipmenttype
      FROM 
        public.m1_controller m
      JOIN 
        public.m5_client c ON m.client = c.m5clientkey
      JOIN
        public.shipment s ON m.shipment_type = s.shipkey
      WHERE 
        m.m1key = $1
    ),
    container_data AS (
      SELECT 
        containerkey,
        containernum,
        weight,
        container_type,
        cargo_description,
        m1key
      FROM 
        public.container
      WHERE 
        m1key = $1
    )
    SELECT 
      i.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'containerkey', c.containerkey,
              'containernum', c.containernum,
              'weight', c.weight,
              'container_type', c.container_type,
              'cargo_description', c.cargo_description,
              'm1key', c.m1key
            )
            ORDER BY c.containerkey
          )
          FROM container_data c
          WHERE c.m1key = i.m1key
        ),
        '[]'::json
      ) AS containers
    FROM 
      instruction_data i`
  const result = await query(sql, [instructionId])
  return (result.recordset || result.rows || []).length > 0 ? (result.recordset || result.rows)[0] : null
}

export const updateInstruction = async (instructionId, updatedData) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const query = `
      UPDATE public.m1_controller
      SET 
        client = $1,
        task = $2,
        shipment_type = $3,
        pickup = $4,
        dropoff = $5,
        hazardous = $6,
        surchages = $7,
        pickuptime = $8,
        pickupdate = $9,
        stackdate = $10,
        deadline = $11,
        fileref = $12,
        rateweight = $13,
        description = $14,
        vat = $15,
        num_six_meters = $16,
        num_twelve_meters = $17,
        num_abnormal = $18,
        num_breakbulk = $19,
        total_cost = $20,
        weight = $21,
        status = $22,
        booking_ref = $23,
        vessel_name = $24,
        rateper_6 = $25,
        rateper_12 = $26,
        rateper_abnormal = $27,
        rateper_breakbulk = $28,
        unitrate = $29
      WHERE m1key = $30
      RETURNING *
    `

    const values = [
      updatedData.client,
      updatedData.task,
      updatedData.shipment_type,
      updatedData.pickup,
      updatedData.dropoff,
      updatedData.hazardous,
      updatedData.surchages,
      updatedData.pickuptime,
      updatedData.pickupdate,
      updatedData.stackdate,
      updatedData.deadline,
      updatedData.fileref,
      updatedData.rateweight,
      updatedData.description,
      updatedData.vat || 15,
      updatedData.num_six_meters || 0,
      updatedData.num_twelve_meters || 0,
      updatedData.num_abnormal || 0,
      updatedData.num_breakbulk || 0,
      updatedData.total_cost,
      updatedData.weight,
      updatedData.status || "In progress",
      updatedData.booking_ref,
      updatedData.vessel_name,
      updatedData.rateper_6,
      updatedData.rateper_12,
      updatedData.rateper_abnormal,
      updatedData.rateper_breakbulk,
      updatedData.unitrate,
      instructionId,
    ]

    const result = await client.query(query, values)
    await client.query("COMMIT")
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export const updateContainersByInstructionId = async (instructionId, containerData) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Delete existing containers
    const deleteQuery = `
      DELETE FROM public.container
      WHERE m1key = $1
    `
    const deleteResult = await client.query(deleteQuery, [instructionId])
    console.log(`Deleted ${deleteResult.rowCount} existing containers for instruction ID: ${instructionId}`)

    // Insert new containers
    const insertResults = []
    for (const container of containerData) {
      const containerNum = container.containernum || container.containerNum || ""
      const weight =
        container.weight !== null && container.weight !== undefined ? Number.parseFloat(container.weight) : null
      const containerType = container.containerType || container.container_type || ""
      const cargoDescription = container.cargoDescription || container.cargo_description || ""

      console.log(
        `Inserting container: containerNum=${containerNum}, weight=${weight}, m1key=${instructionId}, container_type=${containerType}, cargo_description=${cargoDescription}`,
      )

      const insertQuery = `
        INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING containerkey
      `
      const values = [containerNum, weight, instructionId, containerType, cargoDescription]

      const result = await client.query(insertQuery, values)
      console.log(`Inserted container with ID: ${result.rows[0].containerkey}`)
      insertResults.push(result.rows[0])
    }

    await client.query("COMMIT")
    console.log(`Successfully inserted ${insertResults.length} containers for instruction ID: ${instructionId}`)

    // Verify insertion
    const verifyQuery = `
      SELECT COUNT(*) FROM public.container WHERE m1key = $1
    `
    const verifyResult = await client.query(verifyQuery, [instructionId])
    console.log(`Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`)

    return { data: insertResults }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export const getActiveClients = async () => {
  const sql = `
    SELECT 
      m5clientkey,
      client AS companyname,
      representative,
      email,
      cellnum
    FROM 
      public.m5_client
    WHERE 
      status = true
    ORDER BY 
      client
  `

  console.log("Executing getActiveClients query:", sql)

  try {
    const result = await query(sql)
    const clients = result.recordset || result.rows || []
    console.log(`Found ${clients.length} active clients`)
    if (clients.length > 0) {
      console.log("Sample client data:", clients[0])
    }
    return clients
  } catch (error) {
    console.error("Error in getActiveClients:", error)
    throw error
  }
}

export const getClientStartingPoints = async (clientId) => {
  const sql = `
    SELECT DISTINCT starting_point
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ORDER BY starting_point
  `
  console.log(`[MODEL] Executing query for client ${clientId}:`, sql)

  try {
    const result = await query(sql, [clientId])
    const startingPoints = result.recordset || result.rows || []
    console.log(`[MODEL] Query result for client ${clientId}:`, {
      rowCount: result.rowCount || startingPoints.length,
      rows: startingPoints,
    })
    return startingPoints
  } catch (error) {
    console.error(`[MODEL] Error in getClientStartingPoints for client ${clientId}:`, error)
    throw error
  }
}

export const getClientDestinations = async (clientId, startingPoint) => {
  if (!clientId || !startingPoint) {
    throw new Error("Both clientId and startingPoint are required")
  }

  const sql = `
    SELECT DISTINCT destination
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point = $2
      AND destination IS NOT NULL 
      AND destination != ''
    ORDER BY destination
  `

  try {
    const result = await query(sql, [clientId, startingPoint])
    const destinations = result.recordset || result.rows || []
    if (destinations.length === 0) {
      console.warn(`No destinations found for client ${clientId} and starting point ${startingPoint}`)
    }
    return destinations
  } catch (error) {
    console.error("Error fetching destinations:", error)
    throw error
  }
}

export const checkClientHasRates = async (clientId) => {
  const sql = `
    SELECT EXISTS (
      SELECT 1 
      FROM public.m5_client_rate 
      WHERE clientid = $1
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ) as has_rates
  `

  try {
    const result = await query(sql, [clientId])
    const hasRates = (result.recordset || result.rows || [])[0]?.has_rates || false
    console.log(`Client ${clientId} has rates with starting points:`, hasRates)
    return hasRates
  } catch (error) {
    console.error("Error in checkClientHasRates:", error)
    throw error
  }
}

export const getClientRates = async (clientId, start, destination) => {
  if (!clientId || !start || !destination) {
    throw new Error("clientId, start, and destination are required")
  }

  const sql = `
    SELECT 
      "6m_rate" as "sixMeterRate",
      "12m_rate" as "twelveMeterRate",
      surcharges,
      starting_point as "startingPoint",
      destination
    FROM public.m5_client_rate
    WHERE clientid = $1
      AND starting_point = $2
      AND destination = $3
    ORDER BY client_rate_id DESC
    LIMIT 1
  `

  try {
    console.log(`[getClientRates] Querying rates for client: ${clientId}, start: ${start}, destination: ${destination}`)
    console.log(`[getClientRates] Executing query:`, sql, `with params:`, [clientId, start, destination])

    const result = await query(sql, [clientId, start, destination])
    const rates = result.recordset || result.rows || []

    console.log(`[getClientRates] Query result:`, {
      rowCount: result.rowCount || rates.length,
      rows: rates,
    })

    if (rates.length === 0) {
      console.log(
        `[getClientRates] No rates found for client ${clientId}, start: ${start}, destination: ${destination}`,
      )
      return {}
    }

    const rateData = rates[0]
    console.log("[getClientRates] Retrieved rates:", {
      rawRow: rateData,
      sixMeterRate: rateData.sixMeterRate,
      twelveMeterRate: rateData.twelveMeterRate,
      surcharges: rateData.surcharges,
      startingPoint: rateData.startingPoint,
      destination: rateData.destination,
    })

    return rateData
  } catch (error) {
    console.error("Error fetching client rates:", error)
    throw error
  }
}

export const saveInstructionAndContainers = async (controllerData, containerData) => {
  const {
    client,
    representative,
    contactDetails,
    email,
    shipment_type,
    task,
    pickup,
    dropoff,
    hazardous,
    surchages, // Note: This is 'surchages' in the DB, 'surcharges' in frontend
    surcharge,
    num_six_meters,
    num_twelve_meters,
    num_abnormal,
    num_breakbulk,
    pickuptime,
    pickupdate,
    stackdate,
    deadline,
    fileref,
    booking_ref,
    vessel_name,
    rateweight,
    weight,
    unitrate,
    vat,
    description,
    total_cost,
    rateper_6,
    rateper_12,
    rateper_abnormal,
    rateper_breakbulk,
    status,
  } = controllerData

  // Start a transaction
  const transaction = new query.Transaction()
  await transaction.begin()

  try {
    // Insert into m5instructions
    const instructionSql = `
      INSERT INTO m5instructions (
        client_id, representative, contact_details, email, shipment_type_id, task,
        pickup_location, dropoff_location, hazardous, surcharges, surcharge_amount,
        num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
        pickup_time, pickup_date, stack_date, deadline, file_ref, booking_ref,
        vessel_name, rate_weight_unit, weight, unit_rate, vat_rate, description,
        total_cost, rate_per_6m, rate_per_12m, rate_per_abnormal, rate_per_breakbulk, status
      )
      VALUES (
        @client_id, @representative, @contact_details, @email, @shipment_type_id, @task,
        @pickup_location, @dropoff_location, @hazardous, @surcharges, @surcharge_amount,
        @num_six_meters, @num_twelve_meters, @num_abnormal, @num_breakbulk,
        @pickup_time, @pickup_date, @stack_date, @deadline, @file_ref, @booking_ref,
        @vessel_name, @rate_weight_unit, @weight, @unit_rate, @vat_rate, @description,
        @total_cost, @rate_per_6m, @rate_per_12m, @rate_per_abnormal, @rate_per_breakbulk, @status
      );
      SELECT SCOPE_IDENTITY() AS instructionId;
    `

    const instructionResult = await transaction
      .request()
      .input("client_id", client)
      .input("representative", representative)
      .input("contact_details", contactDetails)
      .input("email", email)
      .input("shipment_type_id", shipment_type)
      .input("task", task)
      .input("pickup_location", pickup)
      .input("dropoff_location", dropoff)
      .input("hazardous", hazardous)
      .input("surcharges", surchages) // Use surchages from frontend
      .input("surcharge_amount", surcharge)
      .input("num_six_meters", num_six_meters)
      .input("num_twelve_meters", num_twelve_meters)
      .input("num_abnormal", num_abnormal)
      .input("num_breakbulk", num_breakbulk)
      .input("pickup_time", pickuptime)
      .input("pickup_date", pickupdate)
      .input("stack_date", stackdate)
      .input("deadline", deadline)
      .input("file_ref", fileref)
      .input("booking_ref", booking_ref)
      .input("vessel_name", vessel_name)
      .input("rate_weight_unit", rateweight)
      .input("weight", weight)
      .input("unit_rate", unitrate)
      .input("vat_rate", vat)
      .input("description", description)
      .input("total_cost", total_cost)
      .input("rate_per_6m", rateper_6)
      .input("rate_per_12m", rateper_12)
      .input("rate_per_abnormal", rateper_abnormal)
      .input("rate_per_breakbulk", rateper_breakbulk)
      .input("status", status)
      .query(instructionSql)

    const instructionId = instructionResult.recordset[0].instructionId

    // Insert into m5containerdetails if containerData exists
    if (containerData && containerData.length > 0) {
      for (const container of containerData) {
        const containerSql = `
          INSERT INTO m5containerdetails (
            instruction_id, container_type, container_number, weight_kg, cargo_description
          )
          VALUES (
            @instructionId, @container_type, @container_number, @weight_kg, @cargo_description
          )
        `
        await transaction
          .request()
          .input("instructionId", instructionId)
          .input("container_type", container.container_type)
          .input("container_number", container.containerNum)
          .input("weight_kg", container.weight)
          .input("cargo_description", container.cargo_description)
          .query(containerSql)
      }
    }

    await transaction.commit()
    return { instructionId }
  } catch (error) {
    await transaction.rollback()
    console.error("Database transaction failed:", error)
    throw new Error("Failed to save instruction and container details due to a database error.")
  }
}
