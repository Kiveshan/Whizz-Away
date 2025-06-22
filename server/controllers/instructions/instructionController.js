import {
  getShipmentTypes,
  getContainersByInstructionId,
  saveInstruction,
  getClientInstructionStats,
  getInstructions,
  getInstructionById,
  updateInstruction,
  updateContainersByInstructionId,
  getStartingPoints,
  getDestinations,
  getActiveClients,
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
    console.log(`Fetching containers for instruction ID: ${instructionId}`)
    const containers = await getContainersByInstructionId(instructionId)
    console.log(`Found ${containers.length} containers for instruction ID: ${instructionId}`)
    res.json(containers)
  } catch (error) {
    console.error("Error fetching containers:", error)
    res.status(500).json({ error: error.message })
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
    console.log(`Found instruction with ID: ${instructionId}`)
    res.json(instruction)
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

export const getStartingPointsHandler = async (req, res) => {
  try {
    console.log("Fetching starting points from database...")
    const startingPoints = await getStartingPoints()
    console.log(`Found ${startingPoints.length} starting points`)
    res.json(startingPoints)
  } catch (error) {
    console.error("Error fetching starting points:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getDestinationsHandler = async (req, res) => {
  try {
    console.log("Fetching destinations from database...")
    const destinations = await getDestinations()
    console.log(`Found ${destinations.length} destinations`)
    res.json(destinations)
  } catch (error) {
    console.error("Error fetching destinations:", error)
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
