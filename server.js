// Load environment variables from .env file
require("dotenv").config()

const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const path = require("path")
const { Pool } = require("pg")

const app = express()
const PORT = process.env.PORT || 4000

// Flag to track if database is connected
let isDatabaseConnected = false

// Create a PostgreSQL connection pool with more connection options
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number.parseInt(process.env.POSTGRES_PORT),
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  // Add idle timeout
  idleTimeoutMillis: 30000,
  // Max clients in pool
  max: 20,
})

// Log connection status
console.log("Database connection configured with:", {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  // Not logging password for security reasons
})

// Add error handler for the pool
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message)
  // Don't exit the process, just log the error
})

// Try to connect to the database once
;(async () => {
  try {
    const result = await pool.query("SELECT NOW()")
    console.log("Database connected successfully at:", result.rows[0].now)
    isDatabaseConnected = true
  } catch (error) {
    console.error("Database connection failed. Using mock data instead:", error.message)
    console.log("To fix this, please install and start PostgreSQL, then restart the server.")
  }
})()

// Mock data for clients
const mockClients = [
  {
    m5clientkey: 1,
    companyname: "ABC Shipping",
    representative: "John Doe",
    cellnum: "123-456-7890",
    email: "john@abcshipping.com",
  },
  {
    m5clientkey: 2,
    companyname: "XYZ Logistics",
    representative: "Jane Smith",
    cellnum: "987-654-3210",
    email: "jane@xyzlogistics.com",
  },
  {
    m5clientkey: 3,
    companyname: "Global Transport",
    representative: "Bob Johnson",
    cellnum: "555-123-4567",
    email: "bob@globaltransport.com",
  },
  {
    m5clientkey: 4,
    companyname: "Fast Freight",
    representative: "Alice Brown",
    cellnum: "444-555-6666",
    email: "alice@fastfreight.com",
  },
  {
    m5clientkey: 5,
    companyname: "Speedy Delivery",
    representative: "Charlie Wilson",
    cellnum: "777-888-9999",
    email: "charlie@speedy.com",
  },
]

// Mock data for shipment types
const mockShipmentTypes = [
  { shipkey: 1, shipmenttype: "Standard" },
  { shipkey: 2, shipmenttype: "Express" },
  { shipkey: 3, shipmenttype: "Overnight" },
  { shipkey: 4, shipmenttype: "Two-Day" },
  { shipkey: 5, shipmenttype: "International" },
]

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    databaseConnected: isDatabaseConnected,
    usingMockData: !isDatabaseConnected,
  })
})

// Get all clients
app.get("/api/clients", async (req, res) => {
  try {
    if (isDatabaseConnected) {
      console.log("Fetching clients from database...")
      const query = `
        SELECT m5clientkey, companyname, representative, cellnum, email
        FROM public.m5_client
        ORDER BY companyname
      `
      const result = await pool.query(query)
      console.log(`Found ${result.rows.length} clients`)
      res.json(result.rows)
    } else {
      console.log("Using mock client data")
      res.json(mockClients)
    }
  } catch (error) {
    console.error("Error fetching clients:", error)
    console.log("Falling back to mock client data")
    res.json(mockClients)
  }
})

// Get all shipment types
app.get("/api/shipment-types", async (req, res) => {
  try {
    if (isDatabaseConnected) {
      console.log("Fetching shipment types from database...")
      const query = `
        SELECT shipkey, shipmenttype
        FROM public.shipment
        ORDER BY shipkey
      `
      const result = await pool.query(query)
      console.log(`Found ${result.rows.length} shipment types`)
      res.json(result.rows)
    } else {
      console.log("Using mock shipment type data")
      res.json(mockShipmentTypes)
    }
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    console.log("Falling back to mock shipment type data")
    res.json(mockShipmentTypes)
  }
})

// Save controller data and container data
app.post("/api/save-instruction", async (req, res) => {
  try {
    const { controllerData, containerData } = req.body
    console.log("Received instruction data:", {
      controllerData: { ...controllerData, description: "..." }, // Truncate for logging
      containerCount: containerData.length,
    })

    if (isDatabaseConnected) {
      const client = await pool.connect()
      try {
        // Start transaction
        await client.query("BEGIN")

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
          controllerData.trailerSize, // Using the original value (6m, 12m, abnormal)
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
    } else {
      // Mock successful response with a fake m1key
      const mockM1key = Math.floor(Math.random() * 1000) + 1
      console.log("Using mock data - generated m1key:", mockM1key)
      res.json({
        success: true,
        m1key: mockM1key,
        mockData: true,
        message:
          "This is mock data as the database is not connected. Your form submission was received but not saved to a database.",
      })
    }
  } catch (error) {
    console.error("Error in save-instruction endpoint:", error)
    res.status(500).json({ error: error.message })
  }
})

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "build")))

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"))
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API endpoints available at http://localhost:${PORT}/api/`)
  if (!isDatabaseConnected) {
    console.log("WARNING: Using mock data as database connection failed")
  }
})

// Export the app for testing purposes
module.exports = app

