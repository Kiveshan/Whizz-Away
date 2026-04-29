import {
  getAllDriverRates,
  getDriverRateById,
  createDriverRate,
  updateDriverRate,
  deleteDriverRate,
  getDriverRateUsage,
  refreshDriverRateLegsForInstructions,
} from "../../models/manage/driverRatesModel.js"

const getAllDriverRatesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching driver rates - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}`)

    const result = await getAllDriverRates({
      offset,
      limit: limitNum,
      search,
    })

    res.json({
      items: result.driverRates,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching driver rates:", err)
    res.status(500).json({ error: "Failed to fetch driver rates" })
  }
}

// Trigger a refresh of legs_m2.driverrate for all In Progress instructions
// that are currently using this driver rate. This is intended to be called
// from the Manage UI "Continue" button after a rate edit is confirmed.
const refreshDriverRateLegsHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (!/^[0-9]+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    let instructions = []

    if (Array.isArray(req.body?.instructions) && req.body.instructions.length > 0) {
      instructions = [...new Set(req.body.instructions)]
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0)
    } else {
      const usageResult = await getDriverRateUsage(id)
      if (!usageResult.success) {
        return res.status(404).json({ message: usageResult.message })
      }

      instructions = Array.isArray(usageResult.data?.instructions) ? usageResult.data.instructions : []
    }

    // Refresh legs for all affected instructions using the specific driver rate id.
    // This avoids relying on assignmentModel and is deterministic.
    const refreshResult = await refreshDriverRateLegsForInstructions(Number(id), instructions)

    return res.status(200).json({
      success: true,
      instructions,
      updated: refreshResult?.updated ?? 0,
      message: "Driver rates successfully refreshed for affected instructions",
    })
  } catch (err) {
    console.error(
      `Error refreshing legs for driver rate ${req.params.id}:`,
      err,
    )
    return res.status(500).json({
      error: "Failed to refresh driver rate usage on legs",
    })
  }
}

const getDriverRateByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Fetching driver rate ID ${id}`)
    const result = await getDriverRateById(id)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch driver rate" })
  }
}

const createDriverRateHandler = async (req, res) => {
  try {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    } = req.body

    // Validate required fields (only starting point and destination)
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "Starting point and destination are required" })
    }

    // Validate all rates (only if provided - all are now optional)
    if (
      (driver_six_meter_rate !== null &&
        driver_six_meter_rate !== "" &&
        driver_six_meter_rate !== undefined &&
        isNaN(Number.parseFloat(driver_six_meter_rate))) ||
      (driver_twelve_meter_rate !== null &&
        driver_twelve_meter_rate !== "" &&
        driver_twelve_meter_rate !== undefined &&
        isNaN(Number.parseFloat(driver_twelve_meter_rate))) ||
      (subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        subie_six_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        subie_twelve_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "All rates must be valid numbers if provided" })
    }

    if (effective_from && effective_to && effective_to < effective_from) {
      return res.status(400).json({ error: "effective_to must be on or after effective_from" })
    }

    console.log("Creating driver rate with data:", req.body)
    const newDriverRate = await createDriverRate({
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    })
    res.status(201).json(newDriverRate)
  } catch (err) {
    console.error("Error creating driver rate:", err)
    res.status(500).json({ error: err.message || "Failed to create driver rate" })
  }
}

const updateDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    } = req.body

    // Validate ID
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    // Validate all rates (only if provided - all are now optional)
    if (
      (driver_six_meter_rate !== undefined &&
        driver_six_meter_rate !== null &&
        driver_six_meter_rate !== "" &&
        isNaN(Number.parseFloat(driver_six_meter_rate))) ||
      (driver_twelve_meter_rate !== undefined &&
        driver_twelve_meter_rate !== null &&
        driver_twelve_meter_rate !== "" &&
        isNaN(Number.parseFloat(driver_twelve_meter_rate))) ||
      (subie_six_meter_rate !== undefined &&
        subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== undefined &&
        subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "All rates must be valid numbers if provided" })
    }

    if (effective_from && effective_to && effective_to < effective_from) {
      return res.status(400).json({ error: "effective_to must be on or after effective_from" })
    }

    console.log(`Updating driver rate ID ${id}`)
    const result = await updateDriverRate(id, {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    })
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update driver rate" })
  }
}

const deleteDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Deleting driver rate ID ${id}`)
    const result = await deleteDriverRate(id)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete driver rate" })
  }
}

const getDriverRateUsageHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    console.log(`Checking usage for driver rate ID ${id}`)
    const result = await getDriverRateUsage(id)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error checking usage for driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to check driver rate usage" })
  }
}

export {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
  getDriverRateUsageHandler,
  refreshDriverRateLegsHandler,
}
