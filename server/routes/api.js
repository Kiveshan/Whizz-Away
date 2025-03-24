const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const path = require("path")
const pool = require("../utils/db")

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" })
})

// Get all clients
app.get("/api/clients", async (req, res) => {
  try {
    console.log("Fetching clients from database...")
    const query = `
      SELECT m5clientkey, companyname, representative, cellnum, email
      FROM public.m5_client
      ORDER BY companyname
    `
    const result = await pool.query(query)
    console.log(`Found ${result.rows.length} clients`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching clients:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get all shipment types
app.get("/api/shipment-types", async (req, res) => {
  try {
    console.log("Fetching shipment types from database...")
    const query = `
      SELECT shipkey, shipmenttype
      FROM public.shipment
      ORDER BY shipkey
    `
    const result = await pool.query(query)
    console.log(`Found ${result.rows.length} shipment types`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ error: error.message })
  }
})

// Save controller data and container data
app.post("/api/save-instruction", async (req, res) => {
  const client = await pool.connect()

  try {
    // Start transaction
    await client.query("BEGIN")

    const { controllerData, containerData } = req.body
    console.log("Saving instruction with data:", {
      controllerData: { ...controllerData, description: "..." }, // Truncate for logging
      containerCount: containerData.length,
    })

    // Insert data into m1_controller table
    const controllerQuery = `
      INSERT INTO public.m1_controller (
        client, task, shipment_type, pickup, dropoff, 
        hazardous, surchages, pickuptime, pickupdate, 
        stackdate, deadline, fileref, rateweight, 
        rate, num_containers, trailersize, description, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING m1key
    `

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
      controllerData.numContainers,
      controllerData.trailerSize,
      controllerData.description,
      "In progress",
    ]

    const controllerResult = await client.query(controllerQuery, controllerValues)
    const m1key = controllerResult.rows[0].m1key
    console.log(`Created controller record with m1key: ${m1key}`)

    // Insert container data
    for (const container of containerData) {
      const containerQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key
        ) VALUES (
          $1, $2, $3
        )
      `

      const containerValues = [container.containerNum, container.weight, m1key]

      await client.query(containerQuery, containerValues)
    }
    console.log(`Added ${containerData.length} container records`)

    // Commit transaction
    await client.query("COMMIT")

    res.json({ success: true, m1key })
  } catch (error) {
    // Rollback transaction on error
    await client.query("ROLLBACK")
    console.error("Error saving instruction:", error)
    res.status(500).json({ error: error.message })
  } finally {
    client.release()
  }
})

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../../build")))

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../build", "index.html"))
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API endpoints available at http://localhost:${PORT}/api/`)
})

// Export the app for testing purposes
module.exports = app

