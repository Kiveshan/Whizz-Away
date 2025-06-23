import { pool } from "../../config/database.js"

export const getShipmentTypes = async () => {
  const query = `
    SELECT shipkey, shipmenttype
    FROM public.shipment
    ORDER BY shipkey
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const getContainersByInstructionId = async (instructionId) => {
  const query = `
    SELECT containerkey, containernum, weight, m1key, container_type, cargo_description
    FROM public.container
    WHERE m1key = $1
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query, [instructionId])
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const saveInstruction = async ({ controllerData, containerData }) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const controllerQuery = `
      INSERT INTO public.m1_controller (
        client, task, shipment_type, pickup, dropoff, 
        hazardous, surchages, pickuptime, pickupdate, 
        stackdate, deadline, fileref, rateweight, 
        rate, description, status, vat,
        num_six_meters, num_twelve_meters, num_abnormal,
        weight, total_cost, booking_ref, vessel_name, 
        voyage_num, imo_num, flag_reg
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      ) RETURNING m1key
    `
        // Calculate total_cost: Σ(rate × qty) for each container type
    const sixRate = Number(controllerData.sixMeterRate || controllerData.six_meter_rate || controllerData.rate || 0)
    const twelveRate = Number(controllerData.twelveMeterRate || controllerData.twelve_meter_rate || controllerData.rate || 0)
    const abnormalRate = Number(controllerData.abnormalRate || controllerData.abnormal_rate || controllerData.rate || 0)

    const numSix = Number(controllerData.num_six_meters || 0)
    const numTwelve = Number(controllerData.num_twelve_meters || 0)
    const numAbnormal = Number(controllerData.num_abnormal || 0)

    const calculatedTotalCost = sixRate * numSix + twelveRate * numTwelve + abnormalRate * numAbnormal

    // Overwrite/ensure total_cost field
    controllerData.total_cost = calculatedTotalCost

    const controllerValues = [
      controllerData.clientId,
      controllerData.task,
      controllerData.shipmentTypeId,
      controllerData.pickup,
      controllerData.dropoff,
      controllerData.hazardous,
      controllerData.surcharges,
      controllerData.pickupTime,
      controllerData.pickupDate,
      controllerData.stackDate,
      controllerData.deadline,
      controllerData.fileRef,
      controllerData.rateWeight,
      controllerData.rate,
      controllerData.description,
      "New",
      controllerData.vat || 15,
      controllerData.num_six_meters || 0,
      controllerData.num_twelve_meters || 0,
      controllerData.num_abnormal || 0,
      controllerData.weight,
      controllerData.total_cost,
      controllerData.booking_ref || "",
      controllerData.vessel_name || "",
      controllerData.voyage_num || "",
      controllerData.imo_num || "",
      controllerData.flag_reg || "",
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
        container.weight,
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
  let query = `
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
    query += ` WHERE m.client = $1`
    queryParams.push(clientId)
  }
  query += ` ORDER BY m.pickupdate DESC`
  const client = await pool.connect()
  try {
    const result = await client.query(query, queryParams)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const getInstructionById = async (instructionId) => {
  const query = `
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
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query, [instructionId])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const updateInstruction = async (instructionId, updatedData) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const bookingRef = updatedData.booking_ref !== undefined ? updatedData.booking_ref : ""
    const vesselName = updatedData.vessel_name !== undefined ? updatedData.vessel_name : ""
    const voyageNum = updatedData.voyage_num !== undefined ? updatedData.voyage_num : ""
    const imoNum = updatedData.imo_num !== undefined ? updatedData.imo_num : ""
    const flagReg = updatedData.flag_reg !== undefined ? updatedData.flag_reg : ""

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
        rate = $14,
        description = $15,
        vat = $16,
        num_six_meters = $17,
        num_twelve_meters = $18,
        num_abnormal = $19,
        total_cost = $20,
        weight = $21,
        status = $22,
        booking_ref = $23,
        vessel_name = $24,
        voyage_num = $25,
        imo_num = $26,
        flag_reg = $27
      WHERE m1key = $28
      RETURNING *
    `
    const values = [
      updatedData.client,
      updatedData.task,
      updatedData.shipment_type,
      updatedData.pickup,
      updatedData.dropoff,
      updatedData.hazardous,
      updatedData.surcharges,
      updatedData.pickuptime,
      updatedData.pickupdate,
      updatedData.stackdate,
      updatedData.deadline,
      updatedData.fileref,
      updatedData.rateweight,
      updatedData.rate,
      updatedData.description,
      updatedData.vat || 15,
      updatedData.num_six_meters || 0,
      updatedData.num_twelve_meters || 0,
      updatedData.num_abnormal || 0,
      updatedData.total_cost,
      updatedData.weight,
      updatedData.status || "In progress",
      bookingRef,
      vesselName,
      voyageNum,
      imoNum,
      flagReg,
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

export const getStartingPoints = async () => {
  const query = `
    SELECT DISTINCT startingpoint
    FROM public.m5_driver_rate
    WHERE startingpoint IS NOT NULL AND startingpoint != ''
    ORDER BY startingpoint
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const getDestinations = async () => {
  const query = `
    SELECT DISTINCT destination
    FROM public.m5_driver_rate
    WHERE destination IS NOT NULL AND destination != ''
    ORDER BY destination
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export const getActiveClients = async () => {
  const query = `
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
  const client = await pool.connect()
  try {
    const result = await client.query(query)
    return result.rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}
