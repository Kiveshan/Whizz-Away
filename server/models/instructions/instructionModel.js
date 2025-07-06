

// import { pool, query } from "../../config/database.js"

// // Helper function to calculate total cost based on rate weight type
// const calculateTotalCost = (instructionData) => {
//   const rateWeight = instructionData.rateweight || instructionData.rateWeight || "Container"
//   const surchargeAmount = instructionData.surchages ? Number(instructionData.surcharge || 0) : 0

//   let baseCost = 0

//   if (rateWeight === "Container") {
//     // Container-based calculation
//     const numSix = Number(instructionData.num_six_meters || 0)
//     const numTwelve = Number(instructionData.num_twelve_meters || 0)
//     const numAbnormal = Number(instructionData.num_abnormal || 0)
//     const numBreakBulk = Number(instructionData.num_breakbulk || 0)

//     const ratePer6 = numSix > 0 ? Number(instructionData.rateper_6 || 0) : 0
//     const ratePer12 = numTwelve > 0 ? Number(instructionData.rateper_12 || 0) : 0
//     const ratePerAbnormal = numAbnormal > 0 ? Number(instructionData.rateper_abnormal || 0) : 0
//     const ratePerBreakBulk = numBreakBulk > 0 ? Number(instructionData.rateper_breakbulk || 0) : 0

//     baseCost =
//       ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal + ratePerBreakBulk * numBreakBulk
//   } else {
//     // Weight-based calculation (kg, ton, m³)
//     const weight = Number(instructionData.weight || 0)
//     const unitRate = Number(instructionData.unitrate || 0)

//     baseCost = weight * unitRate
//   }

//   const totalCost = baseCost + surchargeAmount
//   return Number(totalCost.toFixed(2))
// }

// export const getShipmentTypes = async () => {
//   const sql = `
//     SELECT shipkey, shipmenttype
//     FROM public.shipment
//     ORDER BY shipkey
//   `
//   const result = await query(sql)
//   return result.recordset || result.rows
// }

// export const getContainersByInstructionId = async (instructionId) => {
//   // Convert instructionId to string to match database type
//   const instructionIdStr = String(instructionId)
//   const sql = `
//     SELECT containerkey, containernum, weight, m1key, container_type, cargo_description
//     FROM public.container
//     WHERE m1key = $1
//     ORDER BY containerkey
//   `

//   console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Executing query`, {
//     sql,
//     params: [instructionIdStr],
//     instructionId,
//     instructionIdType: typeof instructionId,
//     instructionIdStr,
//     instructionIdStrType: typeof instructionIdStr,
//   })

//   try {
//     const result = await query(sql, [instructionIdStr])
//     const duration = result.duration || 0

//     console.log(`[${new Date().toISOString()}] getContainersByInstructionId: Query completed`, {
//       instructionId,
//       instructionIdStr,
//       rowCount: result.rowCount || result.recordset?.length || 0,
//       duration: `${duration}ms`,
//       sampleRows: (result.rows || result.recordset || []).slice(0, 3), // Log first 3 rows as sample
//     })

//     return result.rows || result.recordset || []
//   } catch (error) {
//     console.error(`[${new Date().toISOString()}] Error in getContainersByInstructionId:`, {
//       error: error.message,
//       stack: error.stack,
//       instructionId,
//       instructionIdStr,
//       sql,
//     })
//     throw error
//   }
// }

// export const saveInstruction = async ({ controllerData, containerData }) => {
//   const client = await pool.connect()
//   try {
//     await client.query("BEGIN")

//     const controllerQuery = `
//       INSERT INTO public.m1_controller (
//         client, task, shipment_type, pickup, dropoff, 
//         hazardous, surchages, surcharge, pickuptime, pickupdate, 
//         stackdate, deadline, fileref, rateweight, 
//         description, status, vat,
//         num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
//         weight, total_cost, booking_ref, vessel_name,
//         rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
//         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
//         $22, $23, $24, $25, $26, $27, $28, $29, $30
//       ) RETURNING m1key
//     `

//     // Helper function to format date to YYYY-MM-DD
//     const formatDate = (dateStr) => {
//       if (!dateStr) return null
//       try {
//         const date = new Date(dateStr)
//         return date.toISOString().split("T")[0] // Returns YYYY-MM-DD
//       } catch (e) {
//         console.error("Error formatting date:", e)
//         return null
//       }
//     }

//     // Helper function to format time to HH:MM:SS
//     const formatTime = (timeStr) => {
//       if (!timeStr) return null
//       try {
//         // Handle both 'HH:MM' and 'HH:MM:SS' formats
//         const [hours, minutes] = timeStr.split(":")
//         return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`
//       } catch (e) {
//         console.error("Error formatting time:", e)
//         return null
//       }
//     }

//     // Log all received fields for debugging
//     console.log("Raw controller data received for saving:", JSON.stringify(controllerData, null, 2))

//     // Extract all possible field name variations and ensure correct types/nulls
//     const fields = {
//       // Client
//       client: controllerData.client || controllerData.clientId,

//       // Shipment
//       shipmentType: controllerData.shipmentTypeId || controllerData.shipment_type,

//       // Dates
//       pickupDate: controllerData.pickupDate || controllerData.pickupdate,
//       pickupTime: controllerData.pickupTime || controllerData.pickuptime,
//       stackDate: controllerData.stackDate || controllerData.stackdate,
//       deadline: controllerData.deadline,

//       // File reference
//       fileRef: controllerData.fileRef || controllerData.file_ref || controllerData.fileref,

//       // Other fields
//       task: controllerData.task,
//       pickup: controllerData.pickup,
//       dropoff: controllerData.dropoff,
//       hazardous: Boolean(controllerData.hazardous) || false,
//       surcharges: Boolean(controllerData.surcharges) || false,
//       surchargeAmount: controllerData.surcharge || 0, // Use the already calculated surcharge
//       rateWeight: controllerData.rateWeight,
//       description: controllerData.description,
//       bookingRef: controllerData.booking_ref || controllerData.bookingRef,
//       vesselName: controllerData.vessel_name, // Already null if cross-haul from frontend
//       weight: controllerData.weight, // Already null if container-based from frontend
//       unitrate: controllerData.unitrate, // Already null if container-based from frontend
//       vat: controllerData.vat || 15,
//       total_cost: controllerData.total_cost || calculateTotalCost(controllerData),

//       // Container counts and rates (already handled for null/0 by frontend)
//       num_six_meters: controllerData.num_six_meters || 0,
//       num_twelve_meters: controllerData.num_twelve_meters || 0,
//       num_abnormal: controllerData.num_abnormal || 0,
//       num_breakbulk: controllerData.num_breakbulk || 0,
//       rateper_6: controllerData.rateper_6,
//       rateper_12: controllerData.rateper_12,
//       rateper_abnormal: controllerData.rateper_abnormal,
//       rateper_breakbulk: controllerData.rateper_breakbulk,
//     }

//     console.log("Processed fields for saving:", {
//       client: fields.client,
//       task: fields.task,
//       shipmentType: fields.shipmentType,
//       pickup: fields.pickup,
//       dropoff: fields.dropoff,
//       hazardous: fields.hazardous,
//       surcharges: fields.surcharges,
//       surchargeAmount: fields.surchargeAmount,
//       pickupTime: formatTime(fields.pickupTime),
//       pickupDate: formatDate(fields.pickupDate),
//       stackDate: formatDate(fields.stackDate),
//       deadline: formatDate(fields.deadline),
//       fileRef: fields.fileRef,
//       rateWeight: fields.rateWeight,
//       description: fields.description,
//       status: "New",
//       vat: fields.vat,
//       num_six_meters: fields.num_six_meters,
//       num_twelve_meters: fields.num_twelve_meters,
//       num_abnormal: fields.num_abnormal,
//       num_breakbulk: fields.num_breakbulk,
//       weight: fields.weight,
//       total_cost: fields.total_cost,
//       bookingRef: fields.bookingRef,
//       vesselName: fields.vesselName,
//       rateper_6: fields.rateper_6,
//       rateper_12: fields.rateper_12,
//       rateper_abnormal: fields.rateper_abnormal,
//       rateper_breakbulk: fields.rateper_breakbulk,
//       unitrate: fields.unitrate,
//     })

//     const controllerValues = [
//       fields.client,
//       fields.task,
//       fields.shipmentType,
//       fields.pickup,
//       fields.dropoff,
//       fields.hazardous,
//       fields.surcharges,
//       fields.surchargeAmount,
//       formatTime(fields.pickupTime),
//       formatDate(fields.pickupDate),
//       formatDate(fields.stackDate), // Will be null if cross-haul
//       formatDate(fields.deadline),
//       fields.fileRef,
//       fields.rateWeight,
//       fields.description,
//       "New",
//       fields.vat,
//       fields.num_six_meters,
//       fields.num_twelve_meters,
//       fields.num_abnormal,
//       fields.num_breakbulk,
//       fields.weight, // Will be null if container-based
//       fields.total_cost,
//       fields.bookingRef,
//       fields.vesselName, // Will be null if cross-haul
//       fields.rateper_6, // Will be null if weight-based
//       fields.rateper_12, // Will be null if weight-based
//       fields.rateper_abnormal, // Will be null if weight-based
//       fields.rateper_breakbulk, // Will be null if weight-based or not cross-haul/container
//       fields.unitrate, // Will be null if container-based
//     ]

//     const controllerResult = await client.query(controllerQuery, controllerValues)
//     const m1key = controllerResult.rows[0].m1key

//     for (const container of containerData) {
//       const containerQuery = `
//         INSERT INTO public.container (
//           containernum, weight, m1key, container_type, cargo_description
//         ) VALUES (
//           $1, $2, $3, $4, $5
//         )
//       `
//       const containerValues = [
//         container.containerNum,
//         container.weight, // Already null if not import from frontend
//         m1key,
//         container.container_type,
//         container.cargo_description || "",
//       ]
//       await client.query(containerQuery, containerValues)
//     }

//     await client.query("COMMIT")
//     return { m1key }
//   } catch (error) {
//     await client.query("ROLLBACK")
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export const getClientInstructionStats = async () => {
//   const statusCheckQuery = `
//     SELECT DISTINCT status FROM public.m1_controller
//   `
//   const queryText = `
//     SELECT 
//       c.m5clientkey,
//       c.client AS companyname,
//       c.representative,
//       c.email,
//       c.cellnum,
//       MAX(m.pickupdate) as latest_date,
//       SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
//       SUM(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE 0 END) as in_progress_count,
//       SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
//     FROM 
//       public.m5_client c
//     LEFT JOIN 
//       public.m1_controller m ON c.m5clientkey = m.client
//     WHERE 
//       c.status = true
//     GROUP BY 
//       c.m5clientkey, c.client, c.representative, c.email
//     ORDER BY 
//       c.client
//   `
//   const client = await pool.connect()
//   try {
//     const statusResult = await client.query(statusCheckQuery)
//     console.log(
//       "Available status values in database:",
//       statusResult.rows.map((row) => row.status),
//     )
//     const result = await client.query(queryText)
//     return result.rows
//   } catch (error) {
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export const getInstructions = async (clientId) => {
//   let sql = `
//     SELECT 
//       m.m1key,
//       m.fileref as fileno,
//       m.shipment_type,
//       s.shipmenttype as type_text,
//       m.status,
//       m.pickupdate,
//       m.client,
//       c.client AS companyname
//     FROM 
//       public.m1_controller m
//     JOIN 
//       public.m5_client c ON m.client = c.m5clientkey
//     LEFT JOIN
//       public.shipment s ON m.shipment_type = s.shipkey
//   `
//   const queryParams = []
//   if (clientId) {
//     sql += ` WHERE m.client = $1`
//     queryParams.push(clientId)
//   }
//   sql += ` ORDER BY m.pickupdate DESC`

//   const result = await query(sql, queryParams)
//   return result.recordset || result.rows
// }

// export const getInstructionById = async (instructionId) => {
//   const sql = `
//     WITH instruction_data AS (
//       SELECT 
//         m.*,
//         c.client AS companyname,
//         c.representative,
//         c.cellnum,
//         c.email,
//         s.shipmenttype
//       FROM 
//         public.m1_controller m
//       JOIN 
//         public.m5_client c ON m.client = c.m5clientkey
//       JOIN
//         public.shipment s ON m.shipment_type = s.shipkey
//       WHERE 
//         m.m1key = $1
//     ),
//     container_data AS (
//       SELECT 
//         containerkey,
//         containernum,
//         weight,
//         container_type,
//         cargo_description,
//         m1key
//       FROM 
//         public.container
//       WHERE 
//         m1key = $1
//     )
//     SELECT 
//       i.*,
//       COALESCE(
//         (
//           SELECT json_agg(
//             json_build_object(
//               'containerkey', c.containerkey,
//               'containernum', c.containernum,
//               'weight', c.weight,
//               'container_type', c.container_type,
//               'cargo_description', c.cargo_description,
//               'm1key', c.m1key
//             )
//             ORDER BY c.containerkey
//           )
//           FROM container_data c
//           WHERE c.m1key = i.m1key
//         ),
//         '[]'::json
//       ) AS containers
//     FROM 
//       instruction_data i`
//   const result = await query(sql, [instructionId])
//   return (result.recordset || result.rows || []).length > 0 ? (result.recordset || result.rows)[0] : null
// }

// export const updateInstruction = async (instructionId, updatedData) => {
//   const client = await pool.connect()
//   try {
//     await client.query("BEGIN")

//     // Calculate total cost if not provided
//     const totalCost = updatedData.total_cost !== undefined ? updatedData.total_cost : calculateTotalCost(updatedData)

//     const queryText = `
//       UPDATE public.m1_controller
//       SET 
//         client = $1,
//         task = $2,
//         shipment_type = $3,
//         pickup = $4,
//         dropoff = $5,
//         hazardous = $6,
//         surchages = $7,
//         pickuptime = $8,
//         pickupdate = $9,
//         stackdate = $10,
//         deadline = $11,
//         fileref = $12,
//         rateweight = $13,
//         description = $14,
//         vat = $15,
//         num_six_meters = $16,
//         num_twelve_meters = $17,
//         num_abnormal = $18,
//         num_breakbulk = $19,
//         total_cost = $20,
//         weight = $21,
//         status = $22,
//         booking_ref = $23,
//         vessel_name = $24,
//         rateper_6 = $25,
//         rateper_12 = $26,
//         rateper_abnormal = $27,
//         rateper_breakbulk = $28,
//         unitrate = $29,
//         surcharge = $30
//       WHERE m1key = $31
//       RETURNING *
//     `

//     const values = [
//       updatedData.client,
//       updatedData.task,
//       updatedData.shipment_type,
//       updatedData.pickup,
//       updatedData.dropoff,
//       updatedData.hazardous,
//       updatedData.surchages,
//       updatedData.pickuptime,
//       updatedData.pickupdate,
//       updatedData.stackdate,
//       updatedData.deadline,
//       updatedData.fileref,
//       updatedData.rateweight,
//       updatedData.description,
//       updatedData.vat || 15,
//       updatedData.num_six_meters || 0,
//       updatedData.num_twelve_meters || 0,
//       updatedData.num_abnormal || 0,
//       updatedData.num_breakbulk || 0,
//       totalCost,
//       updatedData.weight,
//       updatedData.status,
//       updatedData.booking_ref,
//       updatedData.vessel_name,
//       updatedData.rateper_6,
//       updatedData.rateper_12,
//       updatedData.rateper_abnormal,
//       updatedData.rateper_breakbulk,
//       updatedData.unitrate,
//       updatedData.surcharge,
//       instructionId,
//     ]

//     const result = await client.query(queryText, values)
//     await client.query("COMMIT")
//     return result.rows.length > 0 ? result.rows[0] : null
//   } catch (error) {
//     await client.query("ROLLBACK")
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export const updateContainersByInstructionId = async (instructionId, containerData) => {
//   const client = await pool.connect()
//   try {
//     await client.query("BEGIN")

//     // Delete existing containers
//     const deleteQuery = `
//       DELETE FROM public.container
//       WHERE m1key = $1
//     `
//     const deleteResult = await client.query(deleteQuery, [instructionId])
//     console.log(`Deleted ${deleteResult.rowCount} existing containers for instruction ID: ${instructionId}`)

//     // Insert new containers
//     const insertResults = []
//     for (const container of containerData) {
//       const containerNum = container.containernum || container.containerNum || ""
//       const weight =
//         container.weight !== null && container.weight !== undefined ? Number.parseFloat(container.weight) : null
//       const containerType = container.containerType || container.container_type || ""
//       const cargoDescription = container.cargoDescription || container.cargo_description || ""

//       console.log(
//         `Inserting container: containerNum=${containerNum}, weight=${weight}, m1key=${instructionId}, container_type=${containerType}, cargo_description=${cargoDescription}`,
//       )

//       const insertQuery = `
//         INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING containerkey
//       `
//       const values = [containerNum, weight, instructionId, containerType, cargoDescription]

//       const result = await client.query(insertQuery, values)
//       console.log(`Inserted container with ID: ${result.rows[0].containerkey}`)
//       insertResults.push(result.rows[0])
//     }

//     await client.query("COMMIT")
//     console.log(`Successfully inserted ${insertResults.length} containers for instruction ID: ${instructionId}`)

//     // Verify insertion
//     const verifyQuery = `
//       SELECT COUNT(*) FROM public.container WHERE m1key = $1
//     `
//     const verifyResult = await client.query(verifyQuery, [instructionId])
//     console.log(`Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`)

//     return { data: insertResults }
//   } catch (error) {
//     await client.query("ROLLBACK")
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export const getActiveClients = async () => {
//   const sql = `
//     SELECT 
//       m5clientkey,
//       client AS companyname,
//       representative,
//       email,
//       cellnum
//     FROM 
//       public.m5_client
//     WHERE 
//       status = true
//     ORDER BY 
//       client
//   `

//   console.log("Executing getActiveClients query:", sql)

//   try {
//     const result = await query(sql)
//     const clients = result.recordset || result.rows || []
//     console.log(`Found ${clients.length} active clients`)
//     if (clients.length > 0) {
//       console.log("Sample client data:", clients[0])
//     }
//     return clients
//   } catch (error) {
//     console.error("Error in getActiveClients:", error)
//     throw error
//   }
// }

// export const getClientStartingPoints = async (clientId) => {
//   const sql = `
//     SELECT DISTINCT starting_point
//     FROM public.m5_client_rate
//     WHERE clientid = $1 
//       AND starting_point IS NOT NULL 
//       AND starting_point IS DISTINCT FROM ''
//     ORDER BY starting_point
//   `
//   console.log(`[MODEL] Executing query for client ${clientId}:`, sql)

//   try {
//     const result = await query(sql, [clientId])
//     const startingPoints = result.recordset || result.rows || []
//     console.log(`[MODEL] Query result for client ${clientId}:`, {
//       rowCount: result.rowCount || startingPoints.length,
//       rows: startingPoints,
//     })
//     return startingPoints
//   } catch (error) {
//     console.error(`[MODEL] Error in getClientStartingPoints for client ${clientId}:`, error)
//     throw error
//   }
// }

// export const getClientDestinations = async (clientId, startingPoint) => {
//   if (!clientId || !startingPoint) {
//     throw new Error("Both clientId and startingPoint are required")
//   }

//   const sql = `
//     SELECT DISTINCT destination
//     FROM public.m5_client_rate
//     WHERE clientid = $1 
//       AND starting_point = $2
//       AND destination IS NOT NULL 
//       AND destination != ''
//     ORDER BY destination
//   `

//   try {
//     const result = await query(sql, [clientId, startingPoint])
//     const destinations = result.recordset || result.rows || []
//     if (destinations.length === 0) {
//       console.warn(`No destinations found for client ${clientId} and starting point ${startingPoint}`)
//     }
//     return destinations
//   } catch (error) {
//     console.error("Error fetching destinations:", error)
//     throw error
//   }
// }

// export const checkClientHasRates = async (clientId) => {
//   const sql = `
//     SELECT EXISTS (
//       SELECT 1 
//       FROM public.m5_client_rate 
//       WHERE clientid = $1
//       AND starting_point IS NOT NULL 
//       AND starting_point IS DISTINCT FROM ''
//     ) as has_rates
//   `

//   try {
//     const result = await query(sql, [clientId])
//     const hasRates = (result.recordset || result.rows || [])[0]?.has_rates || false
//     console.log(`Client ${clientId} has rates with starting points:`, hasRates)
//     return hasRates
//   } catch (error) {
//     console.error("Error in checkClientHasRates:", error)
//     throw error
//   }
// }

// export const getClientRates = async (clientId, start, destination) => {
//   if (!clientId || !start || !destination) {
//     throw new Error("clientId, start, and destination are required")
//   }

//   const sql = `
//     SELECT 
//       "6m_rate" as "sixMeterRate",
//       "12m_rate" as "twelveMeterRate",
//       surcharges,
//       starting_point as "startingPoint",
//       destination
//     FROM public.m5_client_rate
//     WHERE clientid = $1
//       AND starting_point = $2
//       AND destination = $3
//     ORDER BY client_rate_id DESC
//     LIMIT 1
//   `

//   try {
//     console.log(`[getClientRates] Querying rates for client: ${clientId}, start: ${start}, destination: ${destination}`)
//     console.log(`[getClientRates] Executing query:`, sql, `with params:`, [clientId, start, destination])

//     const result = await query(sql, [clientId, start, destination])
//     const rates = result.recordset || result.rows || []

//     console.log(`[getClientRates] Query result:`, {
//       rowCount: result.rowCount || rates.length,
//       rows: rates,
//     })

//     if (rates.length === 0) {
//       console.log(
//         `[getClientRates] No rates found for client ${clientId}, start: ${start}, destination: ${destination}`,
//       )
//       return {}
//     }

//     const rateData = rates[0]
//     console.log("[getClientRates] Retrieved rates:", {
//       rawRow: rateData,
//       sixMeterRate: rateData.sixMeterRate,
//       twelveMeterRate: rateData.twelveMeterRate,
//       surcharges: rateData.surcharges,
//       startingPoint: rateData.startingPoint,
//       destination: rateData.destination,
//     })

//     return rateData
//   } catch (error) {
//     console.error("Error fetching client rates:", error)
//     throw error
//   }
// }

// // Helper functions for formatting and comparison
// const formatDateForComparison = (dateValue) => {
//   if (!dateValue) return null

//   try {
//     // Handle different date formats
//     let date
//     if (typeof dateValue === "string") {
//       // Handle MM/DD/YYYY format
//       if (dateValue.includes("/")) {
//         const [month, day, year] = dateValue.split("/")
//         date = new Date(year, month - 1, day)
//       } else {
//         date = new Date(dateValue)
//       }
//     } else {
//       date = new Date(dateValue)
//     }

//     if (isNaN(date.getTime())) {
//       console.warn(`Invalid date value: ${dateValue}`)
//       return null
//     }

//     return date.toISOString().split("T")[0] // Returns YYYY-MM-DD
//   } catch (error) {
//     console.error(`Error formatting date ${dateValue}:`, error)
//     return null
//   }
// }

// const formatTimeForComparison = (timeValue) => {
//   if (!timeValue) return null

//   try {
//     // Handle different time formats
//     const timeStr = String(timeValue).trim()
//     const parts = timeStr.split(":")

//     if (parts.length >= 2) {
//       const hours = parts[0].padStart(2, "0")
//       const minutes = parts[1].padStart(2, "0")
//       const seconds = parts[2] ? parts[2].padStart(2, "0") : "00"
//       return `${hours}:${minutes}:${seconds}`
//     }

//     console.warn(`Invalid time format: ${timeValue}`)
//     return null
//   } catch (error) {
//     console.error(`Error formatting time ${timeValue}:`, error)
//     return null
//   }
// }

// const compareValues = (currentValue, newValue, fieldType = "string") => {
//   // Handle null/undefined cases
//   if (currentValue === null && newValue === null) return true
//   if (currentValue === undefined && newValue === undefined) return true
//   if (currentValue === null && (newValue === "" || newValue === undefined)) return true
//   if ((currentValue === "" || currentValue === undefined) && newValue === null) return true

//   // Handle different field types
//   switch (fieldType) {
//     case "date":
//       const currentDate = formatDateForComparison(currentValue)
//       const newDate = formatDateForComparison(newValue)
//       return currentDate === newDate

//     case "time":
//       const currentTime = formatTimeForComparison(currentValue)
//       const newTime = formatTimeForComparison(newValue)
//       return currentTime === newTime

//     case "number":
//       const currentNum = currentValue === null ? null : Number(currentValue)
//       const newNum = newValue === null || newValue === "" ? null : Number(newValue)
//       return currentNum === newNum

//     case "boolean":
//       return Boolean(currentValue) === Boolean(newValue)

//     default:
//       // String comparison
//       const currentStr = currentValue === null ? null : String(currentValue)
//       const newStr = newValue === null || newValue === "" ? null : String(newValue)
//       return currentStr === newStr
//   }
// }

// const compareContainers = (currentContainers, newContainers) => {
//   // Create maps for easier comparison
//   const currentMap = new Map()
//   const newMap = new Map()

//   // Map current containers by containerkey
//   currentContainers.forEach((container) => {
//     if (container.containerkey) {
//       currentMap.set(container.containerkey, container)
//     }
//   })

//   // Map new containers by containerKey (if exists) or create temporary keys
//   newContainers.forEach((container, index) => {
//     const key = container.containerKey || `new_${index}`
//     newMap.set(key, container)
//   })

//   const changes = {
//     toUpdate: [],
//     toInsert: [],
//     toDelete: [],
//   }

//   // Find containers to update or insert
//   for (const [key, newContainer] of newMap) {
//     const keyStr = String(key) // Convert key to string for comparison
//     if (keyStr.startsWith("new_")) {
//       // This is a new container
//       changes.toInsert.push(newContainer)
//     } else {
//       const currentContainer = currentMap.get(Number(key)) // Convert back to number for map lookup
//       if (currentContainer) {
//         // Compare container fields
//         const containerNum = newContainer.containernum || newContainer.containerNum || ""
//         const weight =
//           newContainer.weight !== null && newContainer.weight !== undefined && newContainer.weight !== ""
//             ? Number.parseFloat(newContainer.weight)
//             : null
//         const containerType = newContainer.containerType || newContainer.container_type || ""
//         const cargoDescription = newContainer.cargoDescription || newContainer.cargo_description || ""

//         const hasChanges =
//           currentContainer.containernum !== containerNum ||
//           currentContainer.weight !== weight ||
//           currentContainer.container_type !== containerType ||
//           currentContainer.cargo_description !== cargoDescription

//         if (hasChanges) {
//           changes.toUpdate.push({
//             containerkey: Number(key), // Use numeric key for database
//             containernum: containerNum,
//             weight: weight,
//             container_type: containerType,
//             cargo_description: cargoDescription,
//           })
//         }
//       } else {
//         // Container with key doesn't exist in current, treat as new
//         changes.toInsert.push(newContainer)
//       }
//     }
//   }

//   // Find containers to delete
//   for (const [key, currentContainer] of currentMap) {
//     if (!newMap.has(key)) {
//       changes.toDelete.push(currentContainer.containerkey)
//     }
//   }

//   return changes
// }

// export const updateFCInstructionAndContainers = async (instructionId, instructionData, containerData) => {
//   const client = await pool.connect()
//   try {
//     // Start transaction
//     await client.query("BEGIN")

//     console.log(
//       `[${new Date().toISOString()}] [MODEL] updateFCInstructionAndContainers: Starting transaction for instruction ${instructionId}`,
//     )

//     // 1. Fetch current instruction data
//     const getCurrentQuery = `
//       SELECT * FROM public.m1_controller WHERE m1key = $1
//     `
//     const currentResult = await client.query(getCurrentQuery, [instructionId])

//     if (currentResult.rows.length === 0) {
//       throw new Error(`Instruction with ID ${instructionId} not found`)
//     }

//     const currentInstruction = currentResult.rows[0]
//     console.log(`[${new Date().toISOString()}] [MODEL] Current instruction data fetched`)

//     // Helper function to handle undefined values - preserve existing values
//     const preserveExistingValue = (newValue, currentValue) => {
//       if (newValue === undefined || newValue === "undefined") {
//         return currentValue // Keep existing database value
//       }
//       return newValue
//     }

//     // Calculate total cost if not provided
//     const totalCost =
//       instructionData.total_cost !== undefined ? instructionData.total_cost : calculateTotalCost(instructionData)

//     // 2. Prepare instruction update data with proper null handling
//     const updateData = {
//       client: preserveExistingValue(instructionData.client, currentInstruction.client),
//       task: preserveExistingValue(instructionData.task, currentInstruction.task),
//       shipment_type: preserveExistingValue(instructionData.shipment_type, currentInstruction.shipment_type),
//       pickup: preserveExistingValue(instructionData.pickup, currentInstruction.pickup),
//       dropoff: preserveExistingValue(instructionData.dropoff, currentInstruction.dropoff),
//       hazardous: preserveExistingValue(instructionData.hazardous, currentInstruction.hazardous),
//       surchages: preserveExistingValue(instructionData.surchages, currentInstruction.surchages),
//       surcharge: preserveExistingValue(instructionData.surcharge, currentInstruction.surcharge),
//       pickuptime: preserveExistingValue(instructionData.pickuptime, currentInstruction.pickuptime),
//       pickupdate: preserveExistingValue(instructionData.pickupdate, currentInstruction.pickupdate),
//       stackdate: preserveExistingValue(instructionData.stackdate, currentInstruction.stackdate),
//       deadline: preserveExistingValue(instructionData.deadline, currentInstruction.deadline),
//       fileref: preserveExistingValue(instructionData.fileref, currentInstruction.fileref),
//       rateweight: preserveExistingValue(instructionData.rateweight, currentInstruction.rateweight),
//       description: preserveExistingValue(instructionData.description, currentInstruction.description),
//       status: preserveExistingValue(instructionData.status, currentInstruction.status),
//       vat: preserveExistingValue(instructionData.vat, currentInstruction.vat),
//       num_six_meters: preserveExistingValue(instructionData.num_six_meters, currentInstruction.num_six_meters),
//       num_twelve_meters: preserveExistingValue(instructionData.num_twelve_meters, currentInstruction.num_twelve_meters),
//       num_abnormal: preserveExistingValue(instructionData.num_abnormal, currentInstruction.num_abnormal),
//       num_breakbulk: preserveExistingValue(instructionData.num_breakbulk, currentInstruction.num_breakbulk),
//       weight: preserveExistingValue(instructionData.weight, currentInstruction.weight),
//       total_cost: totalCost,
//       booking_ref: preserveExistingValue(instructionData.booking_ref, currentInstruction.booking_ref),
//       vessel_name: preserveExistingValue(instructionData.vessel_name, currentInstruction.vessel_name),
//       rateper_6: preserveExistingValue(instructionData.rateper_6, currentInstruction.rateper_6),
//       rateper_12: preserveExistingValue(instructionData.rateper_12, currentInstruction.rateper_12),
//       rateper_abnormal: preserveExistingValue(instructionData.rateper_abnormal, currentInstruction.rateper_abnormal),
//       rateper_breakbulk: preserveExistingValue(instructionData.rateper_breakbulk, currentInstruction.rateper_breakbulk),
//       unitrate: preserveExistingValue(instructionData.unitrate, currentInstruction.unitrate),
//     }

//     // 3. Check if instruction needs updating
//     let instructionNeedsUpdate = false
//     const fieldsToCheck = [
//       { field: "client", type: "number" },
//       { field: "task", type: "string" },
//       { field: "shipment_type", type: "number" },
//       { field: "pickup", type: "string" },
//       { field: "dropoff", type: "string" },
//       { field: "hazardous", type: "boolean" },
//       { field: "surchages", type: "boolean" },
//       { field: "surcharge", type: "number" },
//       { field: "pickuptime", type: "time" },
//       { field: "pickupdate", type: "date" },
//       { field: "stackdate", type: "date" },
//       { field: "deadline", type: "date" },
//       { field: "fileref", type: "string" },
//       { field: "rateweight", type: "string" },
//       { field: "description", type: "string" },
//       { field: "status", type: "string" },
//       { field: "vat", type: "number" },
//       { field: "num_six_meters", type: "number" },
//       { field: "num_twelve_meters", type: "number" },
//       { field: "num_abnormal", type: "number" },
//       { field: "num_breakbulk", type: "number" },
//       { field: "weight", type: "number" },
//       { field: "total_cost", type: "number" },
//       { field: "booking_ref", type: "string" },
//       { field: "vessel_name", type: "string" },
//       { field: "rateper_6", type: "number" },
//       { field: "rateper_12", type: "number" },
//       { field: "rateper_abnormal", type: "number" },
//       { field: "rateper_breakbulk", type: "number" },
//       { field: "unitrate", type: "number" },
//     ]

//     for (const { field, type } of fieldsToCheck) {
//       if (!compareValues(currentInstruction[field], updateData[field], type)) {
//         console.log(
//           `[${new Date().toISOString()}] [MODEL] Field '${field}' changed: ${currentInstruction[field]} -> ${updateData[field]}`,
//         )
//         instructionNeedsUpdate = true
//         break
//       }
//     }

//     // 4. Update instruction if needed
//     if (instructionNeedsUpdate) {
//       console.log(`[${new Date().toISOString()}] [MODEL] Updating instruction ${instructionId}`)

//       const updateInstructionQuery = `
//         UPDATE public.m1_controller
//         SET 
//           client = $1, task = $2, shipment_type = $3, pickup = $4, dropoff = $5,
//           hazardous = $6, surchages = $7, surcharge = $8, pickuptime = $9, pickupdate = $10,
//           stackdate = $11, deadline = $12, fileref = $13, rateweight = $14, description = $15,
//           status = $16, vat = $17, num_six_meters = $18, num_twelve_meters = $19, num_abnormal = $20,
//           num_breakbulk = $21, weight = $22, total_cost = $23, booking_ref = $24, vessel_name = $25,
//           rateper_6 = $26, rateper_12 = $27, rateper_abnormal = $28, rateper_breakbulk = $29, unitrate = $30
//         WHERE m1key = $31
//         RETURNING *
//       `

//       const updateValues = [
//         updateData.client,
//         updateData.task,
//         updateData.shipment_type,
//         updateData.pickup,
//         updateData.dropoff,
//         updateData.hazardous,
//         updateData.surchages,
//         updateData.surcharge,
//         updateData.pickuptime,
//         updateData.pickupdate,
//         updateData.stackdate,
//         updateData.deadline,
//         updateData.fileref,
//         updateData.rateweight,
//         updateData.description,
//         updateData.status,
//         updateData.vat,
//         updateData.num_six_meters,
//         updateData.num_twelve_meters,
//         updateData.num_abnormal,
//         updateData.num_breakbulk,
//         updateData.weight,
//         updateData.total_cost,
//         updateData.booking_ref,
//         updateData.vessel_name,
//         updateData.rateper_6,
//         updateData.rateper_12,
//         updateData.rateper_abnormal,
//         updateData.rateper_breakbulk,
//         updateData.unitrate,
//         instructionId,
//       ]

//       const updateResult = await client.query(updateInstructionQuery, updateValues)
//       console.log(`[${new Date().toISOString()}] [MODEL] Instruction ${instructionId} updated successfully`)
//     } else {
//       console.log(`[${new Date().toISOString()}] [MODEL] No changes detected for instruction ${instructionId}`)
//     }

//     // 5. Handle containers
//     const getCurrentContainersQuery = `
//       SELECT containerkey, containernum, weight, container_type, cargo_description
//       FROM public.container
//       WHERE m1key = $1
//       ORDER BY containerkey
//     `
//     const currentContainersResult = await client.query(getCurrentContainersQuery, [instructionId])
//     const currentContainers = currentContainersResult.rows

//     console.log(
//       `[${new Date().toISOString()}] [MODEL] Current containers: ${currentContainers.length}, New containers: ${containerData.length}`,
//     )

//     // Compare containers and determine changes
//     const containerChanges = compareContainers(currentContainers, containerData)

//     console.log(
//       `[${new Date().toISOString()}] [MODEL] Container changes: ${containerChanges.toUpdate.length} to update, ${containerChanges.toInsert.length} to insert, ${containerChanges.toDelete.length} to delete`,
//     )

//     // Delete containers
//     for (const containerKey of containerChanges.toDelete) {
//       const deleteQuery = `DELETE FROM public.container WHERE containerkey = $1`
//       await client.query(deleteQuery, [containerKey])
//       console.log(`[${new Date().toISOString()}] [MODEL] Deleted container ${containerKey}`)
//     }

//     // Update containers
//     for (const container of containerChanges.toUpdate) {
//       const updateQuery = `
//         UPDATE public.container 
//         SET containernum = $1, weight = $2, container_type = $3, cargo_description = $4
//         WHERE containerkey = $5
//       `
//       await client.query(updateQuery, [
//         container.containernum,
//         container.weight,
//         container.container_type,
//         container.cargo_description,
//         container.containerkey,
//       ])
//       console.log(`[${new Date().toISOString()}] [MODEL] Updated container ${container.containerkey}`)
//     }

//     // Insert new containers
//     for (const container of containerChanges.toInsert) {
//       const containerNum = container.containernum || container.containerNum || ""
//       const weight =
//         container.weight !== null && container.weight !== undefined && container.weight !== ""
//           ? Number.parseFloat(container.weight)
//           : null
//       const containerType = container.containerType || container.container_type || ""
//       const cargoDescription = container.cargoDescription || container.cargo_description || ""

//       const insertQuery = `
//         INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING containerkey
//       `
//       const insertResult = await client.query(insertQuery, [
//         containerNum,
//         weight,
//         instructionId,
//         containerType,
//         cargoDescription,
//       ])
//       console.log(`[${new Date().toISOString()}] [MODEL] Inserted new container ${insertResult.rows[0].containerkey}`)
//     }

//     // Commit transaction
//     await client.query("COMMIT")
//     console.log(
//       `[${new Date().toISOString()}] [MODEL] Transaction committed successfully for instruction ${instructionId}`,
//     )

//     // Return updated data
//     const finalInstructionQuery = `
//       SELECT * FROM public.m1_controller WHERE m1key = $1
//     `
//     const finalContainersQuery = `
//       SELECT * FROM public.container WHERE m1key = $1 ORDER BY containerkey
//     `

//     const [finalInstructionResult, finalContainersResult] = await Promise.all([
//       client.query(finalInstructionQuery, [instructionId]),
//       client.query(finalContainersQuery, [instructionId]),
//     ])

//     return {
//       instruction: finalInstructionResult.rows[0],
//       containers: finalContainersResult.rows,
//       changes: {
//         instructionUpdated: instructionNeedsUpdate,
//         containersUpdated: containerChanges.toUpdate.length,
//         containersInserted: containerChanges.toInsert.length,
//         containersDeleted: containerChanges.toDelete.length,
//       },
//     }
//   } catch (error) {
//     // Rollback transaction on error
//     await client.query("ROLLBACK")
//     console.error(`[${new Date().toISOString()}] [MODEL] Error in updateFCInstructionAndContainers:`, error)
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export const saveInstructionAndContainers = async (controllerData, containerData) => {
//   const client = await pool.connect()
//   try {
//     await client.query("BEGIN")

//     // Calculate total cost if not provided
//     const totalCost =
//       controllerData.total_cost !== undefined ? controllerData.total_cost : calculateTotalCost(controllerData)

//     // Insert instruction
//     const instructionQuery = `
//       INSERT INTO public.m1_controller (
//         client, task, shipment_type, pickup, dropoff, hazardous, surchages, surcharge,
//         pickuptime, pickupdate, stackdate, deadline, fileref, rateweight, description,
//         status, vat, num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
//         weight, total_cost, booking_ref, vessel_name, rateper_6, rateper_12,
//         rateper_abnormal, rateper_breakbulk, unitrate
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
//         $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
//       ) RETURNING m1key
//     `

//     const instructionValues = [
//       controllerData.client,
//       controllerData.task,
//       controllerData.shipment_type,
//       controllerData.pickup,
//       controllerData.dropoff,
//       controllerData.hazardous || false,
//       controllerData.surchages || false,
//       controllerData.surcharge || 0,
//       controllerData.pickuptime,
//       controllerData.pickupdate,
//       controllerData.stackdate,
//       controllerData.deadline,
//       controllerData.fileref,
//       controllerData.rateweight,
//       controllerData.description,
//       controllerData.status || "New",
//       controllerData.vat || 15,
//       controllerData.num_six_meters || 0,
//       controllerData.num_twelve_meters || 0,
//       controllerData.num_abnormal || 0,
//       controllerData.num_breakbulk || 0,
//       controllerData.weight,
//       totalCost,
//       controllerData.booking_ref,
//       controllerData.vessel_name,
//       controllerData.rateper_6,
//       controllerData.rateper_12,
//       controllerData.rateper_abnormal,
//       controllerData.rateper_breakbulk,
//       controllerData.unitrate,
//     ]

//     const instructionResult = await client.query(instructionQuery, instructionValues)
//     const instructionId = instructionResult.rows[0].m1key

//     // Insert containers
//     for (const container of containerData) {
//       const containerQuery = `
//         INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
//         VALUES ($1, $2, $3, $4, $5)
//       `
//       const containerValues = [
//         container.containerNum || container.containernum || "",
//         container.weight !== null && container.weight !== undefined && container.weight !== ""
//           ? Number.parseFloat(container.weight)
//           : null,
//         instructionId,
//         container.container_type || container.containerType || "",
//         container.cargo_description || container.cargoDescription || "",
//       ]
//       await client.query(containerQuery, containerValues)
//     }

//     await client.query("COMMIT")
//     return { instructionId }
//   } catch (error) {
//     await client.query("ROLLBACK")
//     throw error
//   } finally {
//     client.release()
//   }
// }

import { pool, query } from "../../config/database.js"

// Helper function to calculate total cost based on rate weight type
const calculateTotalCost = (instructionData) => {
  const rateWeight = instructionData.rateweight || instructionData.rateWeight || "Container"
  const surchargeAmount = instructionData.surchages ? Number(instructionData.surcharge || 0) : 0

  let baseCost = 0

  if (rateWeight === "Container") {
    // Container-based calculation
    const numSix = Number(instructionData.num_six_meters || 0)
    const numTwelve = Number(instructionData.num_twelve_meters || 0)
    const numAbnormal = Number(instructionData.num_abnormal || 0)
    const numBreakBulk = Number(instructionData.num_breakbulk || 0)

    const ratePer6 = numSix > 0 ? Number(instructionData.rateper_6 || 0) : 0
    const ratePer12 = numTwelve > 0 ? Number(instructionData.rateper_12 || 0) : 0
    const ratePerAbnormal = numAbnormal > 0 ? Number(instructionData.rateper_abnormal || 0) : 0
    const ratePerBreakBulk = numBreakBulk > 0 ? Number(instructionData.rateper_breakbulk || 0) : 0

    baseCost =
      ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal + ratePerBreakBulk * numBreakBulk
  } else {
    // Weight-based calculation (kg, ton, m³)
    const weight = Number(instructionData.weight || 0)
    const unitRate = Number(instructionData.unitrate || 0)

    baseCost = weight * unitRate
  }

  const totalCost = baseCost + surchargeAmount
  return Number(totalCost.toFixed(2))
}

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
    ORDER BY containerkey
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
      total_cost: controllerData.total_cost || calculateTotalCost(controllerData),

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

      // Sanitize weight value
      let sanitizedWeight = null
      if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim()
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight)
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight
        }
      }

      const containerValues = [
        container.containerNum,
        sanitizedWeight, // Will be null for empty/invalid values
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
  const queryText = `
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
    const result = await client.query(queryText)
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

    // Calculate total cost if not provided
    const totalCost = updatedData.total_cost !== undefined ? updatedData.total_cost : calculateTotalCost(updatedData)

    const queryText = `
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
        unitrate = $29,
        surcharge = $30
      WHERE m1key = $31
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
      totalCost,
      updatedData.weight,
      updatedData.status,
      updatedData.booking_ref,
      updatedData.vessel_name,
      updatedData.rateper_6,
      updatedData.rateper_12,
      updatedData.rateper_abnormal,
      updatedData.rateper_breakbulk,
      updatedData.unitrate,
      updatedData.surcharge,
      instructionId,
    ]

    const result = await client.query(queryText, values)
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

      // Sanitize weight value
      let sanitizedWeight = null
      if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim()
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight)
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight
        }
      }

      const containerType = container.containerType || container.container_type || ""
      const cargoDescription = container.cargoDescription || container.cargo_description || ""

      console.log(
        `Inserting container: containerNum=${containerNum}, weight=${sanitizedWeight}, m1key=${instructionId}, container_type=${containerType}, cargo_description=${cargoDescription}`,
      )

      const insertQuery = `
        INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING containerkey
      `
      const values = [containerNum, sanitizedWeight, instructionId, containerType, cargoDescription]

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

// Helper functions for formatting and comparison
const formatDateForComparison = (dateValue) => {
  if (!dateValue) return null

  try {
    // Handle different date formats
    let date
    if (typeof dateValue === "string") {
      // Handle MM/DD/YYYY format
      if (dateValue.includes("/")) {
        const [month, day, year] = dateValue.split("/")
        date = new Date(year, month - 1, day)
      } else {
        date = new Date(dateValue)
      }
    } else {
      date = new Date(dateValue)
    }

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: ${dateValue}`)
      return null
    }

    return date.toISOString().split("T")[0] // Returns YYYY-MM-DD
  } catch (error) {
    console.error(`Error formatting date ${dateValue}:`, error)
    return null
  }
}

const formatTimeForComparison = (timeValue) => {
  if (!timeValue) return null

  try {
    // Handle different time formats
    const timeStr = String(timeValue).trim()
    const parts = timeStr.split(":")

    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, "0")
      const minutes = parts[1].padStart(2, "0")
      const seconds = parts[2] ? parts[2].padStart(2, "0") : "00"
      return `${hours}:${minutes}:${seconds}`
    }

    console.warn(`Invalid time format: ${timeValue}`)
    return null
  } catch (error) {
    console.error(`Error formatting time ${timeValue}:`, error)
    return null
  }
}

const compareValues = (currentValue, newValue, fieldType = "string") => {
  // Handle null/undefined cases
  if (currentValue === null && newValue === null) return true
  if (currentValue === undefined && newValue === undefined) return true
  if (currentValue === null && (newValue === "" || newValue === undefined)) return true
  if ((currentValue === "" || currentValue === undefined) && newValue === null) return true

  // Handle different field types
  switch (fieldType) {
    case "date":
      const currentDate = formatDateForComparison(currentValue)
      const newDate = formatDateForComparison(newValue)
      return currentDate === newDate

    case "time":
      const currentTime = formatTimeForComparison(currentValue)
      const newTime = formatTimeForComparison(newValue)
      return currentTime === newTime

    case "number":
      const currentNum = currentValue === null ? null : Number(currentValue)
      const newNum = newValue === null || newValue === "" ? null : Number(newValue)
      return currentNum === newNum

    case "boolean":
      return Boolean(currentValue) === Boolean(newValue)

    default:
      // String comparison
      const currentStr = currentValue === null ? null : String(currentValue)
      const newStr = newValue === null || newValue === "" ? null : String(newValue)
      return currentStr === newStr
  }
}

const compareContainers = (currentContainers, newContainers) => {
  // Create maps for easier comparison
  const currentMap = new Map()
  const newMap = new Map()

  // Map current containers by containerkey
  currentContainers.forEach((container) => {
    if (container.containerkey) {
      currentMap.set(container.containerkey, container)
    }
  })

  // Map new containers by containerKey (if exists) or create temporary keys
  newContainers.forEach((container, index) => {
    const key = container.containerKey || `new_${index}`
    newMap.set(key, container)
  })

  const changes = {
    toUpdate: [],
    toInsert: [],
    toDelete: [],
  }

  // Find containers to update or insert
  for (const [key, newContainer] of newMap) {
    const keyStr = String(key) // Convert key to string for comparison
    if (keyStr.startsWith("new_")) {
      // This is a new container
      changes.toInsert.push(newContainer)
    } else {
      const currentContainer = currentMap.get(Number(key)) // Convert back to number for map lookup
      if (currentContainer) {
        // Compare container fields
        const containerNum = newContainer.containernum || newContainer.containerNum || ""
        const weight =
          newContainer.weight !== null && newContainer.weight !== undefined && newContainer.weight !== ""
            ? Number.parseFloat(newContainer.weight)
            : null
        const containerType = newContainer.containerType || newContainer.container_type || ""
        const cargoDescription = newContainer.cargoDescription || newContainer.cargo_description || ""

        const hasChanges =
          currentContainer.containernum !== containerNum ||
          currentContainer.weight !== weight ||
          currentContainer.container_type !== containerType ||
          currentContainer.cargo_description !== cargoDescription

        if (hasChanges) {
          changes.toUpdate.push({
            containerkey: Number(key), // Use numeric key for database
            containernum: containerNum,
            weight: weight,
            container_type: containerType,
            cargo_description: cargoDescription,
          })
        }
      } else {
        // Container with key doesn't exist in current, treat as new
        changes.toInsert.push(newContainer)
      }
    }
  }

  // Find containers to delete
  for (const [key, currentContainer] of currentMap) {
    if (!newMap.has(key)) {
      changes.toDelete.push(currentContainer.containerkey)
    }
  }

  return changes
}

// Helper function to sanitize numeric values - converts empty strings and invalid values to null
const sanitizeNumericValue = (value) => {
  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === "" || value === "undefined") {
    return null
  }

  // Handle string values
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") {
      return null
    }
    const parsed = Number.parseFloat(trimmed)
    return isNaN(parsed) ? null : parsed
  }

  // Handle numeric values
  if (typeof value === "number") {
    return isNaN(value) ? null : value
  }

  // For any other type, try to convert to number
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

// Helper function to preserve existing values but sanitize new ones
const preserveExistingValue = (newValue, currentValue, fieldType = "string") => {
  if (newValue === undefined || newValue === "undefined") {
    return currentValue // Keep existing database value
  }

  // For numeric fields, sanitize the value
  if (fieldType === "number") {
    return sanitizeNumericValue(newValue)
  }

  // For string fields, convert empty strings to null if needed
  if (fieldType === "string" && newValue === "") {
    return null
  }

  return newValue
}

export const updateFCInstructionAndContainers = async (instructionId, instructionData, containerData) => {
  const client = await pool.connect()
  try {
    // Start transaction
    await client.query("BEGIN")

    console.log(
      `[${new Date().toISOString()}] [MODEL] updateFCInstructionAndContainers: Starting transaction for instruction ${instructionId}`,
    )

    // 1. Fetch current instruction data
    const getCurrentQuery = `
      SELECT * FROM public.m1_controller WHERE m1key = $1
    `
    const currentResult = await client.query(getCurrentQuery, [instructionId])

    if (currentResult.rows.length === 0) {
      throw new Error(`Instruction with ID ${instructionId} not found`)
    }

    const currentInstruction = currentResult.rows[0]
    console.log(`[${new Date().toISOString()}] [MODEL] Current instruction data fetched`)

    // Calculate total cost if not provided
    const totalCost =
      instructionData.total_cost !== undefined ? instructionData.total_cost : calculateTotalCost(instructionData)

    // 2. Prepare instruction update data with proper null handling and numeric sanitization
    const updateData = {
      client: preserveExistingValue(instructionData.client, currentInstruction.client, "number"),
      task: preserveExistingValue(instructionData.task, currentInstruction.task, "string"),
      shipment_type: preserveExistingValue(instructionData.shipment_type, currentInstruction.shipment_type, "number"),
      pickup: preserveExistingValue(instructionData.pickup, currentInstruction.pickup, "string"),
      dropoff: preserveExistingValue(instructionData.dropoff, currentInstruction.dropoff, "string"),
      hazardous: preserveExistingValue(instructionData.hazardous, currentInstruction.hazardous, "boolean"),
      surchages: preserveExistingValue(instructionData.surchages, currentInstruction.surchages, "boolean"),
      surcharge: preserveExistingValue(instructionData.surcharge, currentInstruction.surcharge, "number"),
      pickuptime: preserveExistingValue(instructionData.pickuptime, currentInstruction.pickuptime, "string"),
      pickupdate: preserveExistingValue(instructionData.pickupdate, currentInstruction.pickupdate, "string"),
      stackdate: preserveExistingValue(instructionData.stackdate, currentInstruction.stackdate, "string"),
      deadline: preserveExistingValue(instructionData.deadline, currentInstruction.deadline, "string"),
      fileref: preserveExistingValue(instructionData.fileref, currentInstruction.fileref, "string"),
      rateweight: preserveExistingValue(instructionData.rateweight, currentInstruction.rateweight, "string"),
      description: preserveExistingValue(instructionData.description, currentInstruction.description, "string"),
      status: preserveExistingValue(instructionData.status, currentInstruction.status, "string"),
      vat: preserveExistingValue(instructionData.vat, currentInstruction.vat, "number"),
      num_six_meters: preserveExistingValue(
        instructionData.num_six_meters,
        currentInstruction.num_six_meters,
        "number",
      ),
      num_twelve_meters: preserveExistingValue(
        instructionData.num_twelve_meters,
        currentInstruction.num_twelve_meters,
        "number",
      ),
      num_abnormal: preserveExistingValue(instructionData.num_abnormal, currentInstruction.num_abnormal, "number"),
      num_breakbulk: preserveExistingValue(instructionData.num_breakbulk, currentInstruction.num_breakbulk, "number"),
      weight: preserveExistingValue(instructionData.weight, currentInstruction.weight, "number"),
      total_cost: sanitizeNumericValue(totalCost),
      booking_ref: preserveExistingValue(instructionData.booking_ref, currentInstruction.booking_ref, "string"),
      vessel_name: preserveExistingValue(instructionData.vessel_name, currentInstruction.vessel_name, "string"),
      rateper_6: preserveExistingValue(instructionData.rateper_6, currentInstruction.rateper_6, "number"),
      rateper_12: preserveExistingValue(instructionData.rateper_12, currentInstruction.rateper_12, "number"),
      rateper_abnormal: preserveExistingValue(
        instructionData.rateper_abnormal,
        currentInstruction.rateper_abnormal,
        "number",
      ),
      rateper_breakbulk: preserveExistingValue(
        instructionData.rateper_breakbulk,
        currentInstruction.rateper_breakbulk,
        "number",
      ),
      unitrate: preserveExistingValue(instructionData.unitrate, currentInstruction.unitrate, "number"),
    }

    console.log(`[${new Date().toISOString()}] [MODEL] Sanitized update data:`, {
      weight: updateData.weight,
      rateper_6: updateData.rateper_6,
      rateper_12: updateData.rateper_12,
      rateper_abnormal: updateData.rateper_abnormal,
      rateper_breakbulk: updateData.rateper_breakbulk,
      unitrate: updateData.unitrate,
      surcharge: updateData.surcharge,
      total_cost: updateData.total_cost,
    })

    // 3. Check if instruction needs updating
    let instructionNeedsUpdate = false
    const fieldsToCheck = [
      { field: "client", type: "number" },
      { field: "task", type: "string" },
      { field: "shipment_type", type: "number" },
      { field: "pickup", type: "string" },
      { field: "dropoff", type: "string" },
      { field: "hazardous", type: "boolean" },
      { field: "surchages", type: "boolean" },
      { field: "surcharge", type: "number" },
      { field: "pickuptime", type: "time" },
      { field: "pickupdate", type: "date" },
      { field: "stackdate", type: "date" },
      { field: "deadline", type: "date" },
      { field: "fileref", type: "string" },
      { field: "rateweight", type: "string" },
      { field: "description", type: "string" },
      { field: "status", type: "string" },
      { field: "vat", type: "number" },
      { field: "num_six_meters", type: "number" },
      { field: "num_twelve_meters", type: "number" },
      { field: "num_abnormal", type: "number" },
      { field: "num_breakbulk", type: "number" },
      { field: "weight", type: "number" },
      { field: "total_cost", type: "number" },
      { field: "booking_ref", type: "string" },
      { field: "vessel_name", type: "string" },
      { field: "rateper_6", type: "number" },
      { field: "rateper_12", type: "number" },
      { field: "rateper_abnormal", type: "number" },
      { field: "rateper_breakbulk", type: "number" },
      { field: "unitrate", type: "number" },
    ]

    for (const { field, type } of fieldsToCheck) {
      if (!compareValues(currentInstruction[field], updateData[field], type)) {
        console.log(
          `[${new Date().toISOString()}] [MODEL] Field '${field}' changed: ${currentInstruction[field]} -> ${updateData[field]}`,
        )
        instructionNeedsUpdate = true
        break
      }
    }

    // 4. Update instruction if needed
    if (instructionNeedsUpdate) {
      console.log(`[${new Date().toISOString()}] [MODEL] Updating instruction ${instructionId}`)

      const updateInstructionQuery = `
        UPDATE public.m1_controller
        SET 
          client = $1, task = $2, shipment_type = $3, pickup = $4, dropoff = $5,
          hazardous = $6, surchages = $7, surcharge = $8, pickuptime = $9, pickupdate = $10,
          stackdate = $11, deadline = $12, fileref = $13, rateweight = $14, description = $15,
          status = $16, vat = $17, num_six_meters = $18, num_twelve_meters = $19, num_abnormal = $20,
          num_breakbulk = $21, weight = $22, total_cost = $23, booking_ref = $24, vessel_name = $25,
          rateper_6 = $26, rateper_12 = $27, rateper_abnormal = $28, rateper_breakbulk = $29, unitrate = $30
        WHERE m1key = $31
        RETURNING *
      `

      const updateValues = [
        updateData.client,
        updateData.task,
        updateData.shipment_type,
        updateData.pickup,
        updateData.dropoff,
        updateData.hazardous,
        updateData.surchages,
        updateData.surcharge,
        updateData.pickuptime,
        updateData.pickupdate,
        updateData.stackdate,
        updateData.deadline,
        updateData.fileref,
        updateData.rateweight,
        updateData.description,
        updateData.status,
        updateData.vat,
        updateData.num_six_meters,
        updateData.num_twelve_meters,
        updateData.num_abnormal,
        updateData.num_breakbulk,
        updateData.weight,
        updateData.total_cost,
        updateData.booking_ref,
        updateData.vessel_name,
        updateData.rateper_6,
        updateData.rateper_12,
        updateData.rateper_abnormal,
        updateData.rateper_breakbulk,
        updateData.unitrate,
        instructionId,
      ]

      console.log(`[${new Date().toISOString()}] [MODEL] Update values being sent to database:`, {
        weight: updateValues[21], // $22
        rateper_6: updateValues[25], // $26
        rateper_12: updateValues[26], // $27
        rateper_abnormal: updateValues[27], // $28
        rateper_breakbulk: updateValues[28], // $29
        unitrate: updateValues[29], // $30
        surcharge: updateValues[7], // $8
        total_cost: updateValues[22], // $23
      })

      const updateResult = await client.query(updateInstructionQuery, updateValues)
      console.log(`[${new Date().toISOString()}] [MODEL] Instruction ${instructionId} updated successfully`)
    } else {
      console.log(`[${new Date().toISOString()}] [MODEL] No changes detected for instruction ${instructionId}`)
    }

    // 5. Handle containers
    const getCurrentContainersQuery = `
      SELECT containerkey, containernum, weight, container_type, cargo_description
      FROM public.container
      WHERE m1key = $1
      ORDER BY containerkey
    `
    const currentContainersResult = await client.query(getCurrentContainersQuery, [instructionId])
    const currentContainers = currentContainersResult.rows

    console.log(
      `[${new Date().toISOString()}] [MODEL] Current containers: ${currentContainers.length}, New containers: ${containerData.length}`,
    )

    // Compare containers and determine changes
    const containerChanges = compareContainers(currentContainers, containerData)

    console.log(
      `[${new Date().toISOString()}] [MODEL] Container changes: ${containerChanges.toUpdate.length} to update, ${containerChanges.toInsert.length} to insert, ${containerChanges.toDelete.length} to delete`,
    )

    // Delete containers
    for (const containerKey of containerChanges.toDelete) {
      const deleteQuery = `DELETE FROM public.container WHERE containerkey = $1`
      await client.query(deleteQuery, [containerKey])
      console.log(`[${new Date().toISOString()}] [MODEL] Deleted container ${containerKey}`)
    }

    // Update containers
    for (const container of containerChanges.toUpdate) {
      // Sanitize weight value
      let sanitizedWeight = null
      if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim()
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight)
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight
        }
      }

      const updateQuery = `
        UPDATE public.container 
        SET containernum = $1, weight = $2, container_type = $3, cargo_description = $4
        WHERE containerkey = $5
      `
      await client.query(updateQuery, [
        container.containernum,
        sanitizedWeight, // Will be null for empty/invalid values
        container.container_type,
        container.cargo_description,
        container.containerkey,
      ])
      console.log(`[${new Date().toISOString()}] [MODEL] Updated container ${container.containerkey}`)
    }

    // Insert new containers
    for (const container of containerChanges.toInsert) {
      const containerNum = container.containernum || container.containerNum || ""

      // Sanitize weight value
      let sanitizedWeight = null
      if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim()
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight)
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight
        }
      }

      const containerType = container.containerType || container.container_type || ""
      const cargoDescription = container.cargoDescription || container.cargo_description || ""

      const insertQuery = `
        INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING containerkey
      `
      const insertResult = await client.query(insertQuery, [
        containerNum,
        sanitizedWeight, // Will be null for empty/invalid values
        instructionId,
        containerType,
        cargoDescription,
      ])
      console.log(`[${new Date().toISOString()}] [MODEL] Inserted new container ${insertResult.rows[0].containerkey}`)
    }

    // Commit transaction
    await client.query("COMMIT")
    console.log(
      `[${new Date().toISOString()}] [MODEL] Transaction committed successfully for instruction ${instructionId}`,
    )

    // Return updated data
    const finalInstructionQuery = `
      SELECT * FROM public.m1_controller WHERE m1key = $1
    `
    const finalContainersQuery = `
      SELECT * FROM public.container WHERE m1key = $1 ORDER BY containerkey
    `

    const [finalInstructionResult, finalContainersResult] = await Promise.all([
      client.query(finalInstructionQuery, [instructionId]),
      client.query(finalContainersQuery, [instructionId]),
    ])

    return {
      instruction: finalInstructionResult.rows[0],
      containers: finalContainersResult.rows,
      changes: {
        instructionUpdated: instructionNeedsUpdate,
        containersUpdated: containerChanges.toUpdate.length,
        containersInserted: containerChanges.toInsert.length,
        containersDeleted: containerChanges.toDelete.length,
      },
    }
  } catch (error) {
    // Rollback transaction on error
    await client.query("ROLLBACK")
    console.error(`[${new Date().toISOString()}] [MODEL] Error in updateFCInstructionAndContainers:`, error)
    throw error
  } finally {
    client.release()
  }
}

export const saveInstructionAndContainers = async (controllerData, containerData) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Calculate total cost if not provided
    const totalCost =
      controllerData.total_cost !== undefined ? controllerData.total_cost : calculateTotalCost(controllerData)

    // Insert instruction
    const instructionQuery = `
      INSERT INTO public.m1_controller (
        client, task, shipment_type, pickup, dropoff, hazardous, surchages, surcharge,
        pickuptime, pickupdate, stackdate, deadline, fileref, rateweight, description,
        status, vat, num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
        weight, total_cost, booking_ref, vessel_name, rateper_6, rateper_12,
        rateper_abnormal, rateper_breakbulk, unitrate
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING m1key
    `

    const instructionValues = [
      controllerData.client,
      controllerData.task,
      controllerData.shipment_type,
      controllerData.pickup,
      controllerData.dropoff,
      controllerData.hazardous || false,
      controllerData.surchages || false,
      controllerData.surcharge || 0,
      controllerData.pickuptime,
      controllerData.pickupdate,
      controllerData.stackdate,
      controllerData.deadline,
      controllerData.fileref,
      controllerData.rateweight,
      controllerData.description,
      controllerData.status || "New",
      controllerData.vat || 15,
      controllerData.num_six_meters || 0,
      controllerData.num_twelve_meters || 0,
      controllerData.num_abnormal || 0,
      controllerData.num_breakbulk || 0,
      controllerData.weight,
      totalCost,
      controllerData.booking_ref,
      controllerData.vessel_name,
      controllerData.rateper_6,
      controllerData.rateper_12,
      controllerData.rateper_abnormal,
      controllerData.rateper_breakbulk,
      controllerData.unitrate,
    ]

    const instructionResult = await client.query(instructionQuery, instructionValues)
    const instructionId = instructionResult.rows[0].m1key

    // Insert containers
    for (const container of containerData) {
      // Sanitize weight value
      let sanitizedWeight = null
      if (container.weight !== null && container.weight !== undefined && container.weight !== "") {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim()
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight)
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight
        }
      }

      const containerQuery = `
        INSERT INTO public.container (containernum, weight, m1key, container_type, cargo_description)
        VALUES ($1, $2, $3, $4, $5)
      `
      const containerValues = [
        container.containerNum || container.containernum || "",
        sanitizedWeight, // Will be null for empty/invalid values
        instructionId,
        container.container_type || container.containerType || "",
        container.cargo_description || container.cargoDescription || "",
      ]
      await client.query(containerQuery, containerValues)
    }

    await client.query("COMMIT")
    return { instructionId }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

