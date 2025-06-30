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
  // Convert instructionId to string to match database type
  const instructionIdStr = String(instructionId);
  const query = `
    SELECT containerkey, containernum, weight, m1key, container_type, cargo_description
    FROM public.container
    WHERE m1key = $1
  `
  
  console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Executing query`, {
    query,
    params: [instructionIdStr],
    instructionId,
    instructionIdType: typeof instructionId,
    instructionIdStr,
    instructionIdStrType: typeof instructionIdStr
  });
  
  const client = await pool.connect()
  try {
    const startTime = Date.now();
    const result = await client.query(query, [instructionIdStr])
    const duration = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Query completed`, {
      instructionId,
      instructionIdStr,
      rowCount: result.rowCount,
      duration: `${duration}ms`,
      sampleRows: result.rows.slice(0, 3) // Log first 3 rows as sample
    });
    
    return result.rows
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getContainersByInstructionId:`, {
      error: error.message,
      stack: error.stack,
      instructionId,
      instructionIdStr,
      query
    });
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
        hazardous, surchages, surcharge, pickuptime, pickupdate, 
        stackdate, deadline, fileref, rateweight, 
        description, status, vat,
        num_six_meters, num_twelve_meters, num_abnormal,
        weight, total_cost, booking_ref, vessel_name, 
        voyage_num, imo_num, flag_reg,
        rateper_6, rateper_12, rateper_abnormal
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING m1key
    `

    // Get container counts
    const numSix = Number(controllerData.num_six_meters || 0)
    const numTwelve = Number(controllerData.num_twelve_meters || 0)
    const numAbnormal = Number(controllerData.num_abnormal || 0)

    // Get rates - only use the provided rates if the corresponding container count is > 0
    const ratePer6 = numSix > 0 ? Number(controllerData.rateper_6 || 0) : 0;
    const ratePer12 = numTwelve > 0 ? Number(controllerData.rateper_12 || 0) : 0;
    const ratePerAbnormal = numAbnormal > 0 ? Number(controllerData.rateper_abnormal || 0) : 0;
    
    // Update the rates in controllerData - set to 0 if count is 0
    controllerData.rateper_6 = ratePer6;
    controllerData.rateper_12 = ratePer12;
    controllerData.rateper_abnormal = ratePerAbnormal;

    console.log('Rates and counts:', {
      sixMeter: { count: numSix, rate: ratePer6, total: numSix * ratePer6 },
      twelveMeter: { count: numTwelve, rate: ratePer12, total: numTwelve * ratePer12 },
      abnormal: { count: numAbnormal, rate: ratePerAbnormal, total: numAbnormal * ratePerAbnormal }
    });

    // Calculate base cost: (rateper_6 × num_six_meters) + (rateper_12 × num_twelve_meters) + (rateper_abnormal × num_abnormal)
    const baseCost = ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal;
    
    // Calculate surcharge amount if surcharges are checked and amount is a positive number
    const surchargeAmount = (controllerData.surcharges && controllerData.surcharges_amount && parseFloat(controllerData.surcharges_amount) > 0)
      ? Math.abs(parseFloat(controllerData.surcharges_amount)) 
      : 0;
      
    console.log('Surcharge calculation:', {
      hasSurcharge: controllerData.surcharges,
      surchargeAmount: surchargeAmount,
      finalSurcharge: surchargeAmount
    });
      
    // Calculate total cost: base cost + surcharge
    const calculatedTotalCost = baseCost + surchargeAmount;
    
    // Update the surcharge amount in controllerData
    controllerData.surcharge = surchargeAmount;

    console.log('Final cost calculation:', {
      baseCost,
      surchargeAmount,
      calculatedTotalCost
    });

    // Format total cost to 2 decimal places and ensure it's a number
    const formattedTotalCost = Number(calculatedTotalCost.toFixed(2));
    
    // Overwrite/ensure total_cost field with formatted value
    controllerData.total_cost = formattedTotalCost;

    const controllerValues = [
      controllerData.clientId || null,
      controllerData.task || null,
      controllerData.shipmentTypeId || null,
      controllerData.pickup || null,
      controllerData.dropoff || null,
      controllerData.hazardous || false,
      controllerData.surcharges || false, // This is the boolean flag
      surchargeAmount, // This is the actual surcharge amount
      controllerData.pickupTime || null,
      controllerData.pickupDate || null,
      controllerData.stackDate || null,
      controllerData.deadline || null,
      controllerData.fileRef || null,
      controllerData.rateWeight || null,
      controllerData.description || null,
      "New",
      controllerData.vat || 15,
      controllerData.num_six_meters || 0,
      controllerData.num_twelve_meters || 0,
      controllerData.num_abnormal || 0,
      controllerData.weight === "" || controllerData.weight === null || controllerData.weight === undefined
        ? null
        : Number(controllerData.weight),
      controllerData.total_cost || 0,
      controllerData.booking_ref || null,
      controllerData.vessel_name || null,
      controllerData.voyage_num || null,
      controllerData.imo_num || null,
      controllerData.flag_reg || null,
      controllerData.rateper_6 || 0,
      controllerData.rateper_12 || 0,
      controllerData.rateper_abnormal || 0
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
        description = $14,
        vat = $15,
        num_six_meters = $16,
        num_twelve_meters = $17,
        num_abnormal = $18,
        total_cost = $19,
        weight = $20,
        status = $21,
        booking_ref = $22,
        vessel_name = $23,
        voyage_num = $24,
        imo_num = $25,
        flag_reg = $26,
        rateper_6 = $27,
        rateper_12 = $28,
        rateper_abnormal = $29
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
      updatedData.surcharges,
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
      updatedData.total_cost,
      updatedData.weight,
      updatedData.status || "In progress",
      bookingRef,
      vesselName,
      voyageNum,
      imoNum,
      flagReg,
      updatedData.rateper_6 || 0,
      updatedData.rateper_12 || 0,
      updatedData.rateper_abnormal || 0,
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

export const getClientStartingPoints = async (clientId) => {
  const query = `
    SELECT DISTINCT starting_point
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ORDER BY starting_point
  `
  console.log(`[MODEL] Executing query for client ${clientId}:`, query)
  
  const client = await pool.connect()
  try {
    const result = await client.query(query, [clientId])
    console.log(`[MODEL] Query result for client ${clientId}:`, {
      rowCount: result.rowCount,
      rows: result.rows
    })
    return result.rows
  } catch (error) {
    console.error(`[MODEL] Error in getClientStartingPoints for client ${clientId}:`, error)
    throw error
  } finally {
    client.release()
  }
}

export const getClientDestinations = async (clientId, startingPoint) => {
  if (!clientId || !startingPoint) {
    throw new Error('Both clientId and startingPoint are required')
  }

  const query = `
    SELECT DISTINCT destination
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point = $2
      AND destination IS NOT NULL 
      AND destination != ''
    ORDER BY destination
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query, [clientId, startingPoint])
    if (result.rows.length === 0) {
      console.warn(`No destinations found for client ${clientId} and starting point ${startingPoint}`)
    }
    return result.rows
  } catch (error) {
    console.error('Error fetching destinations:', error)
    throw error
  } finally {
    client.release()
  }
}

export const checkClientHasRates = async (clientId) => {
  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM public.m5_client_rate 
      WHERE clientid = $1
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ) as has_rates
  `
  const client = await pool.connect()
  try {
    const result = await client.query(query, [clientId])
    console.log(`Client ${clientId} has rates with starting points:`, result.rows[0].has_rates)
    return result.rows[0].has_rates
  } catch (error) {
    console.error('Error in checkClientHasRates:', error)
    throw error
  } finally {
    client.release()
  }
}

export const getClientRates = async (clientId, start, destination) => {
  if (!clientId || !start || !destination) {
    throw new Error('clientId, start, and destination are required');
  }

  const query = `
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
  `;

  const client = await pool.connect();
  try {
    console.log(`[getClientRates] Querying rates for client: ${clientId}, start: ${start}, destination: ${destination}`);
    console.log(`[getClientRates] Executing query:`, query, `with params:`, [clientId, start, destination]);
    
    const result = await client.query(query, [clientId, start, destination]);
    
    console.log(`[getClientRates] Query result:`, {
      rowCount: result.rowCount,
      rows: result.rows
    });
    
    if (result.rows.length === 0) {
      console.log(`[getClientRates] No rates found for client ${clientId}, start: ${start}, destination: ${destination}`);
      return {};
    }

    const rates = result.rows[0];
    console.log('[getClientRates] Retrieved rates:', {
      rawRow: rates,
      sixMeterRate: rates.sixMeterRate,
      twelveMeterRate: rates.twelveMeterRate,
      surcharges: rates.surcharges,
      startingPoint: rates.startingPoint,
      destination: rates.destination
    });

    return rates;
  } catch (error) {
    console.error('Error fetching client rates:', error);
    throw error;
  } finally {
    client.release();
  }
};
