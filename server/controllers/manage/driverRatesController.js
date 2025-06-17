import {
  getAllDriverRates,
  getDriverRateById,
  createDriverRate,
  updateDriverRate,
  deleteDriverRate,
} from "../../models/manage/driverRatesModel.js";

const getAllDriverRatesHandler = async (req, res) => {
  try {
    console.log("Fetching all driver rates");
    const driverRates = await getAllDriverRates();
    res.json(driverRates);
  } catch (err) {
    console.error("Error fetching driver rates:", err);
    res.status(500).json({ error: "Failed to fetch driver rates" });
  }
};

const getDriverRateByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching driver rate ID ${id}`);
    const result = await getDriverRateById(id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error fetching driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch driver rate" });
  }
};

const createDriverRateHandler = async (req, res) => {
  try {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = req.body;

    // Validate required fields
    if (!startingpoint || !destination) {
      return res
        .status(400)
        .json({ error: "Starting point and destination are required" });
    }
    if (
      driver_six_meter_rate == null ||
      isNaN(parseFloat(driver_six_meter_rate)) ||
      driver_twelve_meter_rate == null ||
      isNaN(parseFloat(driver_twelve_meter_rate)) ||
      subie_six_meter_rate == null ||
      isNaN(parseFloat(subie_six_meter_rate)) ||
      subie_twelve_meter_rate == null ||
      isNaN(parseFloat(subie_twelve_meter_rate))
    ) {
      return res
        .status(400)
        .json({ error: "Rate fields must be valid numbers" });
    }

    console.log("Creating driver rate with data:", req.body);
    const newDriverRate = await createDriverRate({
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    });
    res.status(201).json(newDriverRate);
  } catch (err) {
    console.error("Error creating driver rate:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to create driver rate" });
  }
};

const updateDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = req.body;

    // Validate ID
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Validate provided fields
    if (
      (driver_six_meter_rate !== undefined &&
        isNaN(parseFloat(driver_six_meter_rate))) ||
      (driver_twelve_meter_rate !== undefined &&
        isNaN(parseFloat(driver_twelve_meter_rate))) ||
      (subie_six_meter_rate !== undefined &&
        isNaN(parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== undefined &&
        isNaN(parseFloat(subie_twelve_meter_rate)))
    ) {
      return res
        .status(400)
        .json({ error: "Rate fields must be valid numbers" });
    }

    console.log(`Updating driver rate ID ${id}`);
    const result = await updateDriverRate(id, {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    });
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update driver rate" });
  }
};

const deleteDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting driver rate ID ${id}`);
    const result = await deleteDriverRate(id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json({ message: result.message });
  } catch (err) {
    console.error(`Error deleting driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete driver rate" });
  }
};

export {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
};
