const express = require("express")
const { Pool } = require("pg")
require("dotenv").config()
const cors = require("cors")

const app = express()
const port = process.env.PORT || 5000

const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "Transport",
  password: process.env.PG_PASSWORD || "123456",
  port: process.env.PG_PORT || 5432,
})

app.use(cors())
app.use(express.json())

pool
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL database")
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database:", err)
  })

// Get all driver rates
app.get("/drivers", async (req, res) => {
  console.log("Route /drivers was accessed")

  try {
    const result = await pool.query("SELECT * FROM m5_driver_rate")

    console.log("Query result:", result)
    console.log("Rows:", result.rows)

    if (result.rows.length === 0) {
      console.log("No data found in the m5_driver_rate table")
    } else {
      console.log("Data fetched from DB:")
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching data from database:", err)
    res.status(500).send("Server Error")
  }
})

// Get all unique starting points
app.get("/starting-points", async (req, res) => {
  console.log("Route /starting-points was accessed")

  try {
    const result = await pool.query("SELECT DISTINCT startingpoint FROM m5_driver_rate ORDER BY startingpoint")

    console.log("Unique starting points:", result.rows)

    res.status(200).json(result.rows.map((row) => row.startingpoint))
  } catch (err) {
    console.error("Error fetching starting points:", err)
    res.status(500).send("Server Error")
  }
})

// Get all unique destinations
app.get("/destinations", async (req, res) => {
  console.log("Route /destinations was accessed")

  try {
    const result = await pool.query("SELECT DISTINCT destination FROM m5_driver_rate ORDER BY destination")

    console.log("Unique destinations:", result.rows)

    res.status(200).json(result.rows.map((row) => row.destination))
  } catch (err) {
    console.error("Error fetching destinations:", err)
    res.status(500).send("Server Error")
  }
})

// Get rate for specific starting point and destination
app.get("/rate", async (req, res) => {
  const { startingPoint, destination } = req.query
  console.log(`Route /rate was accessed with startingPoint=${startingPoint} and destination=${destination}`)

  if (!startingPoint || !destination) {
    return res.status(400).json({ error: "Starting point and destination are required" })
  }

  try {
    const result = await pool.query("SELECT rate FROM m5_driver_rate WHERE startingpoint = $1 AND destination = $2", [
      startingPoint,
      destination,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rate not found for the given starting point and destination" })
    }

    console.log("Rate found:", result.rows[0])

    res.status(200).json({ rate: result.rows[0].rate })
  } catch (err) {
    console.error("Error fetching rate:", err)
    res.status(500).send("Server Error")
  }
})

// Get employees with role=5 (drivers)
app.get("/employees/drivers", async (req, res) => {
  console.log("Route /employees/drivers was accessed")

  try {
    const result = await pool.query(
      "SELECT m5employeekey, name, surname FROM m5_employee WHERE role = 5 ORDER BY name, surname",
    )

    console.log("Drivers found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No drivers found in the m5_employee table")
    } else {
      console.log(`Found ${result.rows.length} drivers`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching drivers:", err)
    res.status(500).send("Server Error")
  }
})

// Get instructions from m1_controller table
app.get("/instructions", async (req, res) => {
  console.log("Route /instructions was accessed")

  try {
    const result = await pool.query(
      "SELECT m1key, shipment_type, status, fileref FROM m1_controller ORDER BY m1key DESC",
    )

    console.log("Instructions found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No instructions found in the m1_controller table")
    } else {
      console.log(`Found ${result.rows.length} instructions`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching instructions:", err)
    res.status(500).send("Server Error")
  }
})

app.get("/trucks/regnums", async (req, res) => {
    console.log("Route /trucks/regnums was accessed");
  
    try {
      const result = await pool.query("SELECT truckregnum FROM m5_trucks ORDER BY truckregnum");
  
      console.log("Truck registration numbers found:", result.rows);
  
      if (result.rows.length === 0) {
        console.log("No truck registration numbers found in the m5_trucks table");
      } else {
        console.log(`Found ${result.rows.length} truck registration numbers`);
      }
  
      res.status(200).json(result.rows.map((row) => row.truckregnum));
    } catch (err) {
      console.error("Error fetching truck registration numbers:", err);
      res.status(500).send("Server Error");
    }
  });

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

