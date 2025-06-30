import {
  getShipmentTypes,
  getContainersByInstructionId,
  saveInstruction,
  getClientInstructionStats,
  getClientRates,
  getInstructions,
  getInstructionById,
  updateInstruction,
  updateContainersByInstructionId,
  getActiveClients,
  getClientStartingPoints,
  getClientDestinations,
  checkClientHasRates
} from "../../models/instructions/instructionModel.js"

export const getShipmentTypesHandler = async (req, res) => {
  try {
    console.log("Fetching shipment types from database...")
    const shipmentTypes = await getShipmentTypes()
    console.log(`Found ${shipmentTypes.length} shipment types`)
    res.json(shipmentTypes)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getContainersHandler = async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    console.log(`[${new Date().toISOString()}] getContainersHandler: Fetching containers for instruction ID:`, {
      instructionId,
      type: typeof instructionId,
      params: req.params,
      query: req.query
    })
    
    const containers = await getContainersByInstructionId(instructionId)
    console.log(`[${new Date().toISOString()}] getContainersHandler: Found containers:`, {
      instructionId,
      containerCount: containers.length,
      containers: containers
    })
    
    if (containers.length === 0) {
      console.log(`[${new Date().toISOString()}] No containers found for instruction ID: ${instructionId}`)
      return res.status(200).json([]) // Return empty array instead of 404
    }
    
    res.json(containers)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getContainersHandler:`, {
      error: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query
    })
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch containers',
      instructionId: req.params.instructionId
    })
  }
}

export const saveInstructionHandler = async (req, res) => {
  try {
    const { controllerData, containerData } = req.body
    console.log("Received instruction data:", {
      controllerData: {
        ...controllerData,
        description: "...", // Truncate for logging
        total_cost: controllerData.total_cost,
        weight: controllerData.weight,
        booking_ref: controllerData.booking_ref,
        vessel_name: controllerData.vessel_name,
        voyage_num: controllerData.voyage_num,
        imo_num: controllerData.imo_num,
        flag_reg: controllerData.flag_reg,
        rateper_6: controllerData.rateper_6,
        rateper_12: controllerData.rateper_12,
        rateper_abnormal: controllerData.rateper_abnormal,
        pickup:controllerData.startingPoints,
        dropoff:controllerData.destinations,
      },
      containerCount: containerData.length,
      containerDataSample:
        containerData.length > 0
          ? {
              ...containerData[0],
              cargo_description: containerData[0].cargo_description || "No cargo description",
            }
          : "No containers",
    })
    const result = await saveInstruction({ controllerData, containerData })
    res.json({ success: true, m1key: result.m1key })
  } catch (error) {
    console.error("Error in save-instruction endpoint:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getClientInstructionStatsHandler = async (req, res) => {
  try {
    console.log("Fetching client instruction statistics from database...")
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )
    const stats = await getClientInstructionStats()
    console.log("Client stats query result count:", stats.length)
    res.json(stats)
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const getInstructionsHandler = async (req, res) => {
  try {
    const { clientId } = req.query
    console.log(`Fetching instructions for client ID: ${clientId || "all"}`)
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )
    const instructions = await getInstructions(clientId)
    console.log(`Found ${instructions.length} instructions`)
    res.json(instructions)
  } catch (error) {
    console.error("Error fetching instructions:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const getInstructionByIdHandler = async (req, res) => {
  try {
    const instructionId = req.params.id
    console.log(`Fetching instruction with ID: ${instructionId}`)
    const instruction = await getInstructionById(instructionId)
    if (!instruction) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    // Console log to check what data we're getting from database
    console.log("Raw instruction data from database:", {
      rateper_6: instruction.rateper_6,
      rateper_12: instruction.rateper_12,
      rateper_abnormal: instruction.rateper_abnormal,
      pickupdate: instruction.pickupdate,
      stackdate: instruction.stackdate,
      deadline: instruction.deadline,
    })

    // Format dates to MM/DD/YYYY and ensure all fields are properly mapped
    const formattedInstruction = {
      ...instruction,
      // Format dates to MM/DD/YYYY
      pickupdate: instruction.pickupdate ? new Date(instruction.pickupdate).toLocaleDateString("en-US") : null,
      stackdate: instruction.stackdate ? new Date(instruction.stackdate).toLocaleDateString("en-US") : null,
      deadline: instruction.deadline ? new Date(instruction.deadline).toLocaleDateString("en-US") : null,
      // Ensure rate fields are explicitly included
      rateper_6: instruction.rateper_6 || 0,
      rateper_12: instruction.rateper_12 || 0,
      rateper_abnormal: instruction.rateper_abnormal || 0,
      // Add the field names the frontend expects for rates
      sixMeterRate: instruction.rateper_6 || 0,
      twelveMeterRate: instruction.rateper_12 || 0,
      abnormalRate: instruction.rateper_abnormal || 0,
      // Add alternative date field names the frontend might expect
      pickupDate: instruction.pickupdate ? new Date(instruction.pickupdate).toLocaleDateString("en-US") : null,
      stackDate: instruction.stackdate ? new Date(instruction.stackdate).toLocaleDateString("en-US") : null,
    }

    console.log("Formatted instruction data being sent to frontend:", {
      rateper_6: formattedInstruction.rateper_6,
      rateper_12: formattedInstruction.rateper_12,
      rateper_abnormal: formattedInstruction.rateper_abnormal,
      pickupdate: formattedInstruction.pickupdate,
      stackdate: formattedInstruction.stackdate,
      deadline: formattedInstruction.deadline,
    })

    console.log(`Found instruction with ID: ${instructionId}`)
    res.json(formattedInstruction)
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  }
}

export const updateInstructionHandler = async (req, res) => {
  try {
    const instructionId = req.params.id
    const updatedData = req.body
    console.log(`Updating instruction with ID: ${instructionId}`)
    console.log("Update data received:", {
      ...updatedData,
      description: updatedData.description ? updatedData.description.substring(0, 20) + "..." : null,
      total_cost: updatedData.total_cost,
      weight: updatedData.weight,
      booking_ref: updatedData.booking_ref,
      vessel_name: updatedData.vessel_name,
      voyage_num: updatedData.voyage_num,
      imo_num: updatedData.imo_num,
      flag_reg: updatedData.flag_reg,
      rateper_6: updatedData.rateper_6,
      rateper_12: updatedData.rateper_12,
      rateper_abnormal: updatedData.rateper_abnormal,
    })
    const result = await updateInstruction(instructionId, updatedData)
    if (!result) {
      return res.status(404).json({ error: "Instruction not found" })
    }
    console.log(`Updated instruction with ID: ${instructionId}`)
    console.log("Updated data:", {
      total_cost: result.total_cost,
      weight: result.weight,
      booking_ref: result.booking_ref,
      vessel_name: result.vessel_name,
      voyage_num: result.voyage_num,
      imo_num: result.imo_num,
      flag_reg: result.flag_reg,
      rateper_6: result.rateper_6,
      rateper_12: result.rateper_12,
      rateper_abnormal: result.rateper_abnormal,
    })
    res.json({ success: true, data: result })
  } catch (error) {
    console.error("Error updating instruction:", error)
    res.status(500).json({ error: error.message })
  }
}

export const updateContainersHandler = async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    const containerData = req.body

    if (!Array.isArray(containerData)) {
      return res.status(400).json({ error: "Container data must be an array" })
    }

    console.log(`Updating containers for instruction ID: ${instructionId}`)
    console.log(
      "Container data received:",
      JSON.stringify(
        containerData.map((container) => ({
          ...container,
          cargo_description: container.cargo_description || container.cargoDescription || "No cargo description",
        })),
        null,
        2,
      ),
    )

    const result = await updateContainersByInstructionId(instructionId, containerData)
    console.log(`Successfully updated ${result.data.length} containers for instruction ID: ${instructionId}`)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getActiveClientsHandler = async (req, res) => {
  try {
    console.log("Fetching active clients from database...")
    const clients = await getActiveClients()
    console.log(`Found ${clients.length} active clients`)
    res.json(clients)
  } catch (error) {
    console.error("Error fetching active clients:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getClientStartingPointsHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    console.log(`Fetching starting points for client ID: ${clientId}`)
    
    // First check if client has any rates with valid starting points
    const hasRates = await checkClientHasRates(clientId)
    if (!hasRates) {
      console.log(`No rates with valid starting points found for client ID: ${clientId}`)
      return res.status(404).json({ 
        error: "No rates with valid starting points found for this client" 
      })
    }
    
    const startingPoints = await getClientStartingPoints(clientId)
    console.log(`Found ${startingPoints.length} starting points for client ID: ${clientId}`)
    
    if (!startingPoints || startingPoints.length === 0) {
      console.log('No valid starting points returned from getClientStartingPoints')
      return res.status(404).json({ 
        error: "No valid starting points found for this client" 
      })
    }
    
    res.json(startingPoints)
  } catch (error) {
    console.error("Error fetching client starting points:", error)
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
    })
  }
}

export const getClientDestinationsHandler = async (req, res) => {
  try {
    const { clientId, startingPoint } = req.params
    console.log(`Fetching destinations for client ID: ${clientId}, starting point: ${startingPoint}`)
    
    const destinations = await getClientDestinations(clientId, startingPoint)
    console.log(`Found ${destinations.length} destinations for client ID: ${clientId} and starting point: ${startingPoint}`)
    res.json(destinations)
  } catch (error) {
    console.error("Error fetching client destinations:", error)
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
    })
  }
}

export const checkClientRatesHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    console.log(`Checking if client ID ${clientId} has rates...`)
    
    const hasRates = await checkClientHasRates(clientId)
    console.log(`Client ID ${clientId} has rates: ${hasRates}`)
    
    res.json({ hasRates })
  } catch (error) {
    console.error("Error checking client rates:", error)
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
    })
  }
}

export const getClientRatesHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    const { start, destination } = req.query
    
    console.log('[getClientRatesHandler] Request received:', {
      params: req.params,
      query: req.query,
      body: req.body
    })
    
    if (!start || !destination) {
      const errorMsg = 'Starting point and destination are required';
      console.error(`[getClientRatesHandler] ${errorMsg}`);
      return res.status(400).json({
        error: errorMsg
      })
    }
    
    console.log(`[getClientRatesHandler] Fetching rates for client ${clientId}, start: ${start}, destination: ${destination}`)
    
    const rates = await getClientRates(clientId, start, destination)
    
    console.log('[getClientRatesHandler] getClientRates returned:', rates)
    
    if (!rates || Object.keys(rates).length === 0) {
      const errorMsg = `No rates found for client ${clientId}, start: ${start}, destination: ${destination}`;
      console.error(`[getClientRatesHandler] ${errorMsg}`);
      return res.status(404).json({
        error: errorMsg
      })
    }
    
    console.log('[getClientRatesHandler] Sending rates to client:', rates)
    res.json(rates)
  } catch (error) {
    console.error('Error in getClientRatesHandler:', error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    })
  }
}

