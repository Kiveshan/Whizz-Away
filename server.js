const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")
const path = require("path")
const puppeteer = require("puppeteer")

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 5000

// Configure CORS to allow requests from your React app
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000", "http://127.0.0.1:5000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

// Apply CORS middleware with options
app.use(cors(corsOptions))

// Other middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "Whizz-Away",
  password: process.env.PGPASSWORD || "123456",
  port: Number.parseInt(process.env.PGPORT || "5432"),
})

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.stack)
  } else {
    console.log("Database connected successfully. Server time:", res.rows[0].now)
  }
})

// Helper function to execute database queries
async function query(text, params) {
  try {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Error executing query", { text, error })
    throw error
  }
}

// ===== API ROUTES =====

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Whizz-Away API is running" })
})

// === INVOICES ROUTES ===

// GET all completed instructions for invoices
app.get("/api/invoices/completed", async (req, res) => {
  try {
    console.log("Received request for completed invoices with query:", req.query)

    // Filter by year and month if provided
    const { year, month, type } = req.query

    let queryText = `
      SELECT 
        m1.m1key, 
        m1.task as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1.fileref as file_no, 
        m1.pickupdate as date,
        m1.status
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      WHERE 
        m1.status = 'Completed'
    `

    const queryParams = []

    // Add filters if provided
    if (year && month) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $1 
                    AND EXTRACT(MONTH FROM m1.pickupdate) = $2`
      queryParams.push(year, month)

      if (type && type !== "All") {
        queryText += ` AND s.shipmenttype = $3`
        queryParams.push(type)
      }
    } else if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $1`
      queryParams.push(type)
    }

    queryText += ` ORDER BY m1.pickupdate DESC`

    console.log("Executing query:", queryText, "with params:", queryParams)

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} rows`)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching completed instructions:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// GET specific instruction details for invoice
app.get("/api/invoices/:id", async (req, res) => {
  try {
    console.log("Received request for invoice details with ID:", req.params.id)

    const { id } = req.params

    const queryText = `
      SELECT 
        m1.m1key,
        m1.task as instruction_no,
        s.shipmenttype as shipment_type,
        m1.fileref as file_no,
        c.companyname as client_name,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        m1.pickup,
        m1.dropoff,
        m1.pickupdate,
        m1.description,
        m1.rate,
        m1.rateweight,
        m1.num_containers
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN 
        public.m5_client c ON m1.client = c.m5clientkey
      WHERE 
        m1.m1key = $1
    `

    const result = await query(queryText, [id])

    console.log(`Query returned ${result.rows.length} rows for invoice ID ${id}`)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Instruction not found",
      })
    }

    // Get container details if available
    const containerQuery = `
      SELECT 
        containernum, 
        weight
      FROM 
        public.container
      WHERE 
        m1key = $1
    `

    const containerResult = await query(containerQuery, [id])

    console.log(`Container query returned ${containerResult.rows.length} rows for invoice ID ${id}`)

    // If no containers in database, create dummy data based on num_containers
    let containers = containerResult.rows
    if (containers.length === 0 && result.rows[0].num_containers > 0) {
      console.log(`Creating ${result.rows[0].num_containers} dummy containers for invoice ID ${id}`)
      containers = Array.from({ length: result.rows[0].num_containers }, (_, i) => ({
        container_number: `CONT${String(i + 1).padStart(6, "0")}`,
        weight: `${Math.floor(Math.random() * 5000) + 10000} kg`,
      }))
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        containers,
      },
    })
  } catch (error) {
    console.error("Error fetching instruction for invoice:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// Add a catch-all route for debugging
app.use((req, res, next) => {
  console.log(`Unhandled request: ${req.method} ${req.url}`)
  next()
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api/health`)
  console.log(`CORS enabled for origins: ${corsOptions.origin.join(", ")}`)
})

module.exports = app

