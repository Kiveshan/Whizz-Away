// Load environment variables from .env file
require("dotenv").config()

const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const path = require("path")
const { Pool } = require("pg")

const app = express()
const PORT = process.env.PORT || 5001 // Using port 5001

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

// Mock data for client instruction statistics
const mockClientStats = [
  {
    m5clientkey: 1,
    companyname: "ABC Shipping",
    representative: "John Doe",
    email: "john@abcshipping.com",
    new_count: 2,
    in_progress_count: 1,
    completed_count: 3,
    latest_date: "2023-09-01",
  },
  {
    m5clientkey: 2,
    companyname: "XYZ Logistics",
    representative: "Jane Smith",
    email: "jane@xyzlogistics.com",
    new_count: 0,
    in_progress_count: 3,
    completed_count: 2,
    latest_date: "2023-08-15",
  },
  {
    m5clientkey: 3,
    companyname: "Global Transport",
    representative: "Bob Johnson",
    email: "bob@globaltransport.com",
    new_count: 1,
    in_progress_count: 0,
    completed_count: 5,
    latest_date: "2023-07-20",
  },
]

// Mock data for instructions
const mockInstructions = [
  {
    m1key: 1,
    fileno: "77002",
    type: "Import",
    status: "New",
    pickupdate: "2023-09-01",
    client: 1,
    companyname: "ABC Shipping",
  },
  {
    m1key: 2,
    fileno: "10014",
    type: "Export",
    status: "New",
    pickupdate: "2023-09-01",
    client: 2,
    companyname: "XYZ Logistics",
  },
  {
    m1key: 3,
    fileno: "93301",
    type: "Import",
    status: "In-Progress",
    pickupdate: "2023-09-01",
    client: 1,
    companyname: "ABC Shipping",
  },
  {
    m1key: 4,
    fileno: "45678",
    type: "Export",
    status: "Completed",
    pickupdate: "2023-08-15",
    client: 3,
    companyname: "Global Transport",
  },
  {
    m1key: 5,
    fileno: "12345",
    type: "Import",
    status: "New",
    pickupdate: "2023-07-20",
    client: 2,
    companyname: "XYZ Logistics",
  },
]

// Mock data for containers
const mockContainers = [
  {
    containerkey: 1,
    containernum: 12345,
    weight: 1500.5,
    m1key: 1,
  },
  {
    containerkey: 2,
    containernum: 67890,
    weight: 2000.75,
    m1key: 1,
  },
  {
    containerkey: 3,
    containernum: 54321,
    weight: 1800.25,
    m1key: 2,
  },
  {
    containerkey: 4,
    containernum: 98765,
    weight: 2200.0,
    m1key: 3,
  },
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




//FC -----ViewClientInstruction TABLE TO DISPLAY COUNTS
// API endpoint to get client instruction statistics
app.get("/api/client-instruction-stats", async (req, res) => {
  try {
    if (isDatabaseConnected) {
      console.log("Fetching client instruction statistics from database...")

      // Debug query to check actual status values in the database
      const statusCheckQuery = `
        SELECT DISTINCT status FROM public.m1_controller
      `
      const statusResult = await pool.query(statusCheckQuery)
      console.log(
        "Available status values in database:",
        statusResult.rows.map((row) => row.status),
      )

      // Updated query to include all clients and count all status types
      const query = `
        SELECT 
          c.m5clientkey,
          c.companyname,
          c.representative,
          c.email,
          MAX(m.pickupdate) as latest_date,
          SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
          SUM(CASE WHEN m.status = 'In progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
        FROM 
          public.m5_client c
        LEFT JOIN 
          public.m1_controller m ON c.m5clientkey = m.client
        GROUP BY 
          c.m5clientkey, c.companyname, c.representative, c.email
        ORDER BY 
          c.companyname
      `

      const result = await pool.query(query)
      console.log("Client stats query result:", result.rows)
      res.json(result.rows)
    } else {
      console.log("Using mock client instruction statistics data")
      // Update mock data to include completed_count
      const updatedMockClientStats = mockClientStats.map((client) => ({
        ...client,
        completed_count: client.completed_count || 0,
      }))
      console.log("Updated mock client stats:", updatedMockClientStats)
      res.json(updatedMockClientStats)
    }
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    console.log("Falling back to mock client instruction statistics data")
    // Update mock data to include completed_count
    const updatedMockClientStats = mockClientStats.map((client) => ({
      ...client,
      completed_count: client.completed_count || 0,
    }))
    res.json(updatedMockClientStats)
  }
})

// API endpoint to check if there are any new instructions
app.get("/api/has-new-instructions", async (req, res) => {
  try {
    if (isDatabaseConnected) {
      console.log("Checking for new instructions...")
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM public.m1_controller WHERE status = 'New'
        ) as has_new
      `

      const result = await pool.query(query)
      console.log(`Has new instructions: ${result.rows[0].has_new}`)
      res.json({ hasNew: result.rows[0].has_new })
    } else {
      console.log("Using mock data for new instructions check")
      res.json({ hasNew: true }) // Assume there are new instructions in mock data
    }
  } catch (error) {
    console.error("Error checking for new instructions:", error)
    console.log("Falling back to mock data")
    res.json({ hasNew: false })
  }
})





//FC for viewing all (instuctions)
// API endpoint to get instructions for a specific client
app.get("/api/instructions", async (req, res) => {
  try {
    const { clientId } = req.query

    if (isDatabaseConnected) {
      console.log(`Fetching instructions for client ID: ${clientId || "all"}`)
      // Updated query to join with shipment table to get the shipment type text
      let query = `
        SELECT 
          m.m1key,
          m.fileref as fileno,
          m.shipment_type,
          s.shipmenttype as type_text,
          m.status,
          m.pickupdate,
          m.client,
          c.companyname
        FROM 
          public.m1_controller m
        JOIN 
          public.m5_client c ON m.client = c.m5clientkey
        LEFT JOIN
          public.shipment s ON m.shipment_type = s.shipkey
      `

      const queryParams = []

      if (clientId) {
        query += ` WHERE m.client = $1`
        queryParams.push(clientId)
      }

      query += ` ORDER BY m.pickupdate DESC`

      const result = await pool.query(query, queryParams)
      console.log(`Found ${result.rows.length} instructions`)
      res.json(result.rows)
    } else {
      console.log("Using mock instruction data")
      // Update mock data to include type_text
      const updatedMockInstructions = mockInstructions.map((instr) => {
        let type_text = instr.type
        if (instr.type === "Import" || instr.type === "Export") {
          type_text = instr.type
        } else if (instr.shipment_type === 1) {
          type_text = "Import"
        } else if (instr.shipment_type === 2) {
          type_text = "Export"
        }
        return {
          ...instr,
          type_text,
        }
      })

      // Filter mock instructions by clientId if provided
      const filteredInstructions = clientId
        ? updatedMockInstructions.filter((instr) => instr.client === Number.parseInt(clientId))
        : updatedMockInstructions
      res.json(filteredInstructions)
    }
  } catch (error) {
    console.error("Error fetching instructions:", error)
    console.log("Falling back to mock instruction data")
    // Update mock data to include type_text
    const updatedMockInstructions = mockInstructions.map((instr) => {
      let type_text = instr.type
      if (instr.type === "Import" || instr.type === "Export") {
        type_text = instr.type
      } else if (instr.shipment_type === 1) {
        type_text = "Import"
      } else if (instr.shipment_type === 2) {
        type_text = "Export"
      }
      return {
        ...instr,
        type_text,
      }
    })

    // Filter mock instructions by clientId if provided
    const filteredInstructions = req.query.clientId
      ? updatedMockInstructions.filter((instr) => instr.client === Number.parseInt(req.query.clientId))
      : updatedMockInstructions
    res.json(filteredInstructions)
  }
})



//for viewing each instruction on the instructions page FC
// API endpoint to get a single instruction by ID
app.get("/api/instruction/:id", async (req, res) => {
  try {
    const instructionId = req.params.id

    if (isDatabaseConnected) {
      console.log(`Fetching instruction with ID: ${instructionId}`)

      // Query to get instruction details with client and shipment type information
      const query = `
        SELECT 
          m.*,
          c.companyname,
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
      `

      const result = await pool.query(query, [instructionId])

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Instruction not found" })
      }

      console.log(`Found instruction with ID: ${instructionId}`)
      res.json(result.rows[0])
    } else {
      console.log("Using mock data for instruction")
      // Find the instruction in mock data
      const mockInstruction = mockInstructions.find((instr) => instr.m1key.toString() === instructionId)

      if (!mockInstruction) {
        return res.status(404).json({ error: "Instruction not found" })
      }

      // Get client details
      const client = mockClients.find((client) => client.m5clientkey === mockInstruction.client)

      // Create a combined mock object with all needed fields
      const fullMockInstruction = {
        ...mockInstruction,
        companyname: client?.companyname || "Unknown Company",
        representative: client?.representative || "Unknown Representative",
        cellnum: client?.cellnum || "Unknown Contact",
        email: client?.email || "unknown@example.com",
        shipmenttype: mockInstruction.type || "Unknown Type",
        hazardous: false,
        surchages: false,
        pickuptime: "09:00:00",
        stackdate: mockInstruction.pickupdate,
        deadline: mockInstruction.pickupdate,
        rateweight: "kg",
        rate: 1000,
        description: "Mock description for instruction",
        vat: 15,
        num_six_meters: 1,
        num_twelve_meters: 0,
        num_abnormal: 0,
      }

      res.json(fullMockInstruction)
    }
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  }
})



//FC EDITING INSTRUCTIONS
// API endpoint to update an instruction
app.put("/api/instruction/:id", async (req, res) => {
  try {
    const instructionId = req.params.id
    const updatedData = req.body

    if (isDatabaseConnected) {
      console.log(`Updating instruction with ID: ${instructionId}`)

      const client = await pool.connect()
      try {
        // Start transaction
        await client.query("BEGIN")

        // Update the instruction
        const query = `
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
            rate = $14,
            description = $15,
            vat = $16,
            num_six_meters = $17,
            num_twelve_meters = $18,
            num_abnormal = $19
          WHERE m1key = $20
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
          updatedData.rate,
          updatedData.description,
          updatedData.vat || 15,
          updatedData.num_six_meters || 0,
          updatedData.num_twelve_meters || 0,
          updatedData.num_abnormal || 0,
          instructionId,
        ]

        const result = await client.query(query, values)

        if (result.rows.length === 0) {
          await client.query("ROLLBACK")
          return res.status(404).json({ error: "Instruction not found" })
        }

        // Commit transaction
        await client.query("COMMIT")

        console.log(`Updated instruction with ID: ${instructionId}`)
        res.json({ success: true, data: result.rows[0] })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } else {
      console.log("Using mock data for instruction update")
      // Find the instruction in mock data
      const index = mockInstructions.findIndex((instr) => instr.m1key.toString() === instructionId)

      if (index === -1) {
        return res.status(404).json({ error: "Instruction not found" })
      }

      // Update the mock instruction
      mockInstructions[index] = {
        ...mockInstructions[index],
        ...updatedData,
        m1key: Number.parseInt(instructionId), // Ensure ID remains the same
      }

      res.json({
        success: true,
        data: mockInstructions[index],
        mockData: true,
        message: "This is mock data. Your update was received but not saved to a database.",
      })
    }
  } catch (error) {
    console.error("Error updating instruction:", error)
    res.status(500).json({ error: error.message })
  }
})



//FC EDITING THE CONTAINERS
// API endpoint to get containers for a specific instruction
app.get("/api/containers/:instructionId", async (req, res) => {
  try {
    const instructionId = req.params.instructionId

    if (isDatabaseConnected) {
      console.log(`Fetching containers for instruction ID: ${instructionId}`)

      const query = `
        SELECT containerkey, containernum, weight, m1key
        FROM public.container
        WHERE m1key = $1
        ORDER BY containerkey
      `

      const result = await pool.query(query, [instructionId])
      console.log(`Found ${result.rows.length} containers for instruction ID: ${instructionId}`)

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No containers found for this instruction" })
      }

      res.json(result.rows)
    } else {
      console.log("Using mock data for containers")
      // Filter mock containers by instructionId
      const filteredContainers = mockContainers.filter((container) => container.m1key.toString() === instructionId)

      if (filteredContainers.length === 0) {
        return res.status(404).json({ error: "No containers found for this instruction" })
      }

      res.json(filteredContainers)
    }
  } catch (error) {
    console.error("Error fetching containers:", error)
    res.status(500).json({ error: error.message })
  }
})


// API endpoint to update/add containers for a specific instruction
app.post("/api/containers/:instructionId", async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    const containerData = req.body

    if (!Array.isArray(containerData)) {
      return res.status(400).json({ error: "Container data must be an array" })
    }

    if (isDatabaseConnected) {
      console.log(`Updating containers for instruction ID: ${instructionId}`)

      const client = await pool.connect()
      try {
        // Start transaction
        await client.query("BEGIN")

        // First, delete all existing containers for this instruction
        const deleteQuery = `
          DELETE FROM public.container
          WHERE m1key = $1
        `
        await client.query(deleteQuery, [instructionId])

        // Then, insert the new containers
        const insertResults = []
        for (const container of containerData) {
          const insertQuery = `
            INSERT INTO public.container (containernum, weight, m1key)
            VALUES ($1, $2, $3)
            RETURNING *
          `
          const values = [container.containernum, container.weight, instructionId]

          const result = await client.query(insertQuery, values)
          insertResults.push(result.rows[0])
        }

        // Commit transaction
        await client.query("COMMIT")

        console.log(`Updated ${insertResults.length} containers for instruction ID: ${instructionId}`)
        res.json({ success: true, data: insertResults })
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      } finally {
        client.release()
      }
    } else {
      console.log("Using mock data for container update")

      // Remove existing mock containers for this instruction
      const remainingContainers = mockContainers.filter((container) => container.m1key.toString() !== instructionId)

      // Add new mock containers
      const newContainers = containerData.map((container, index) => ({
        containerkey: mockContainers.length + index + 1,
        containernum: container.containernum,
        weight: container.weight,
        m1key: Number.parseInt(instructionId),
      }))

      // Update mock containers
      mockContainers.length = 0
      mockContainers.push(...remainingContainers, ...newContainers)

      res.json({
        success: true,
        data: newContainers,
        mockData: true,
        message: "This is mock data. Your update was received but not saved to a database.",
      })
    }
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  }
})



//SAVING  THE TWO FORMS
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

        // Insert data into m1_controller table with updated fields
        const controllerQuery = `
          INSERT INTO public.m1_controller (
            client, task, shipment_type, pickup, dropoff, 
            hazardous, surchages, pickuptime, pickupdate, 
            stackdate, deadline, fileref, rateweight, 
            rate, description, status, vat,
            num_six_meters, num_twelve_meters, num_abnormal
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
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
          controllerData.description,
          "New", // status for instruction "New"
          controllerData.vat || 15,
          controllerData.num_six_meters || 0,
          controllerData.num_twelve_meters || 0,
          controllerData.num_abnormal || 0,
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

