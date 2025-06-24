import {
  getAllDriverRates,
  getDriverRateById,
  createDriverRate,
  updateDriverRate,
  deleteDriverRate,
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
    } = req.body

    // Validate required fields
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "Starting point and destination are required" })
    }

    // Validate required driver rates
    if (
      driver_six_meter_rate == null ||
      driver_six_meter_rate === "" ||
      isNaN(Number.parseFloat(driver_six_meter_rate)) ||
      driver_twelve_meter_rate == null ||
      driver_twelve_meter_rate === "" ||
      isNaN(Number.parseFloat(driver_twelve_meter_rate))
    ) {
      return res.status(400).json({ error: "Driver 6m and 12m rates are required and must be valid numbers" })
    }

    // Validate optional subie rates (if provided, must be valid numbers)
    if (
      (subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        subie_six_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        subie_twelve_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "Subie rates must be valid numbers if provided" })
    }

    console.log("Creating driver rate with data:", req.body)
    const newDriverRate = await createDriverRate({
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
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
    } = req.body

    // Validate ID
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    // Validate driver rates if provided (they are required if being updated)
    if (
      (driver_six_meter_rate !== undefined &&
        (driver_six_meter_rate === "" || isNaN(Number.parseFloat(driver_six_meter_rate)))) ||
      (driver_twelve_meter_rate !== undefined &&
        (driver_twelve_meter_rate === "" || isNaN(Number.parseFloat(driver_twelve_meter_rate))))
    ) {
      return res.status(400).json({ error: "Driver rates must be valid numbers" })
    }

    // Validate optional subie rates (if provided, must be valid numbers or null/empty)
    if (
      (subie_six_meter_rate !== undefined &&
        subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== undefined &&
        subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "Subie rates must be valid numbers if provided" })
    }

    console.log(`Updating driver rate ID ${id}`)
    const result = await updateDriverRate(id, {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
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

export {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
}
