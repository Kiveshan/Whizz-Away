import express from "express"
import cors from "cors"
import pkg from "pg"
const { Pool } = pkg
import bodyParser from "body-parser"
import path from "path"
import { fileURLToPath } from "url"
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey) // Log the secret key (for debugging)

// Create a PostgreSQL connection pool
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
})

// Try to connect to the database once
;(async () => {
  try {
    const result = await pool.query("SELECT NOW()")
    console.log("Database connected successfully at:", result.rows[0].now)
  } catch (error) {
    console.error("Database connection failed:", error.message)
    console.log("To fix this, please install and start PostgreSQL, then restart the server.")
    process.exit(1) // Exit if database connection fails
  }
})()

// Middleware setup
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 3600000, // Session expiration (1 hour)
      sameSite: "lax", // Added to ensure cookies are sent with cross-site requests
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      let result = await pool.query("SELECT * FROM usertable WHERE email = $1", [email])

      if (result.rows.length === 0) {
        result = await pool.query("SELECT * FROM m5_employee WHERE email = $1", [email])
        if (result.rows.length === 0) {
          console.log("No user found in both tables with email:", email)
          return done(null, false, { message: "Invalid email or password" })
        }
      }

      const user = result.rows[0]
      console.log("Fetched user:", user)

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (!passwordMatch) {
        console.log("Password mismatch for user:", email)
        return done(null, false, { message: "Invalid email or password" })
      }

      user.table = result.fields[0].table
      return done(null, user)
    } catch (err) {
      console.error("Error during authentication:", err)
      return done(err)
    }
  }),
)

passport.serializeUser((user, done) => {
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    roleid: user.roleid, // Make sure roleid is included here
    table: user.table,
  })
})

passport.deserializeUser(async (sessionUser, done) => {
  try {
    const { userid, table } = sessionUser
    let result

    if (table === "usertable") {
      result = await pool.query("SELECT * FROM usertable WHERE userid = $1", [userid])
    } else if (table === "m5_employee") {
      result = await pool.query("SELECT * FROM m5_employee WHERE userid = $1", [userid])
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database")
      return done(null, false)
    }

    console.log("Session user fetched:", result.rows[0])
    done(null, result.rows[0])
  } catch (err) {
    done(err)
  }
})

// Login route to authenticate and set the session
app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" })
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check if user has a roleid
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. No role assigned." })
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" })
      }

      // Store user session manually
      req.session.user = {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        roleid: user.roleid,
        table: user.table,
      }
      console.log("User stored in session:", req.session.user)

      const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: "1h" })
      const { roleid } = user
      let redirectUrl = "/"

      if (roleid === 1) redirectUrl = "/Dashboard"
      else if (roleid === 2) redirectUrl = "/ControllerDashboard"
      else if (roleid === 3) redirectUrl = "/FDashboard"
      else if (roleid === 4) redirectUrl = "/DirectorDashboard"

      // Include roleid in the response
      return res.json({
        message: "Login successful",
        redirectUrl,
        token,
        roleid: user.roleid,
      })
    })
  })(req, res, next)
})

// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session)
  console.log("Session user:", req.session.user)
  console.log("Passport user:", req.user)

  // Try to get user from session or passport
  const user = req.session.user || req.user

  if (!user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({
    name: user.name,
    surname: user.surname,
    roleid: user.roleid, // Include roleid in the response
  })
})

// Get user role endpoint - alternative approach
app.get("/api/user-role", (req, res) => {
  console.log("Checking user role from session:", req.session)

  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({ roleid: req.session.user.roleid })
})

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    databaseConnected: true,
  })
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

// API endpoint to get client instruction statistics
app.get("/api/client-instruction-stats", async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to check if there are any new instructions
app.get("/api/has-new-instructions", async (req, res) => {
  try {
    console.log("Checking for new instructions...")
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM public.m1_controller WHERE status = 'New'
      ) as has_new
    `

    const result = await pool.query(query)
    console.log(`Has new instructions: ${result.rows[0].has_new}`)
    res.json({ hasNew: result.rows[0].has_new })
  } catch (error) {
    console.error("Error checking for new instructions:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to get instructions for a specific client
app.get("/api/instructions", async (req, res) => {
  try {
    const { clientId } = req.query

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
  } catch (error) {
    console.error("Error fetching instructions:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to get a single instruction by ID
app.get("/api/instruction/:id", async (req, res) => {
  try {
    const instructionId = req.params.id

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
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to update an instruction
app.put("/api/instruction/:id", async (req, res) => {
  try {
    const instructionId = req.params.id
    const updatedData = req.body

    console.log(`Updating instruction with ID: ${instructionId}`)
    console.log("Update data received:", {
      ...updatedData,
      description: updatedData.description ? updatedData.description.substring(0, 20) + "..." : null,
      total_cost: updatedData.total_cost, // Log total_cost explicitly
      weight: updatedData.weight, // Log weight explicitly
      booking_ref: updatedData.booking_ref, // Log new shipping fields
      vessel_name: updatedData.vessel_name,
      voyage_num: updatedData.voyage_num,
      imo_num: updatedData.imo_num,
      flag_reg: updatedData.flag_reg,
    })

    const client = await pool.connect()
    try {
      // Start transaction
      await client.query("BEGIN")

      // IMPORTANT: Explicitly check if the shipping fields exist in the request
      // If they don't exist, set them to empty strings
      const bookingRef = updatedData.booking_ref !== undefined ? updatedData.booking_ref : ""
      const vesselName = updatedData.vessel_name !== undefined ? updatedData.vessel_name : ""
      const voyageNum = updatedData.voyage_num !== undefined ? updatedData.voyage_num : ""
      const imoNum = updatedData.imo_num !== undefined ? updatedData.imo_num : ""
      const flagReg = updatedData.flag_reg !== undefined ? updatedData.flag_reg : ""

      // Log the shipping fields to verify they're being set correctly
      console.log("Shipping fields:", {
        bookingRef,
        vesselName,
        voyageNum,
        imoNum,
        flagReg,
      })

      // Update the instruction - FIXED QUERY with proper field names and handling
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
          num_abnormal = $19,
          total_cost = $20,
          weight = $21,
          status = $22,
          booking_ref = $23,
          vessel_name = $24,
          voyage_num = $25,
          imo_num = $26,
          flag_reg = $27
        WHERE m1key = $28
        RETURNING *
      `

      // Create values array with all fields
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
        updatedData.total_cost, // Add total_cost field
        updatedData.weight, // Add weight field
        updatedData.status || "In progress",
        bookingRef, // Use the explicitly checked variables
        vesselName,
        voyageNum,
        imoNum,
        flagReg,
        instructionId,
      ]

      // Log the values for debugging
      console.log("SQL values for update:", values)

      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ error: "Instruction not found" })
      }

      // Commit transaction
      await client.query("COMMIT")

      console.log(`Updated instruction with ID: ${instructionId}`)
      console.log("Updated data:", {
        total_cost: result.rows[0].total_cost,
        weight: result.rows[0].weight,
        booking_ref: result.rows[0].booking_ref,
        vessel_name: result.rows[0].vessel_name,
        voyage_num: result.rows[0].voyage_num,
        imo_num: result.rows[0].imo_num,
        flag_reg: result.rows[0].flag_reg,
      })

      res.json({ success: true, data: result.rows[0] })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("SQL error during update:", error)
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error updating instruction:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to get containers for a specific instruction
app.get("/api/containers/:instructionId", async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    console.log(`Fetching containers for instruction ID: ${instructionId}`)

    // Query to get containers for the instruction
    const query = `
      SELECT containerkey, containernum, weight, m1key
      FROM public.container
      WHERE m1key = $1
    `

    const result = await pool.query(query, [instructionId])
    console.log(`Found ${result.rows.length} containers for instruction ID: ${instructionId}`)

    // If no containers found, return empty array instead of 404
    res.json(result.rows)
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

    console.log(`Updating containers for instruction ID: ${instructionId}`)
    console.log("Container data received:", JSON.stringify(containerData, null, 2))

    const client = await pool.connect()
    try {
      // Start transaction
      await client.query("BEGIN")

      // First, delete all existing containers for this instruction
      const deleteQuery = `
        DELETE FROM public.container
        WHERE m1key = $1
      `
      const deleteResult = await client.query(deleteQuery, [instructionId])
      console.log(`Deleted ${deleteResult.rowCount} existing containers for instruction ID: ${instructionId}`)

      // Then, insert the new containers
      const insertResults = []
      for (const container of containerData) {
        // IMPORTANT FIX: Check for both possible property names (containernum and containerNum)
        // This handles differences between client and server naming conventions
        const containerNum = container.containernum || container.containerNum || ""

        // Parse weight as float if it exists
        const weight =
          container.weight !== null && container.weight !== undefined ? Number.parseFloat(container.weight) : null

        // Log each container being inserted
        console.log(`Inserting container: containerNum=${containerNum}, weight=${weight}, m1key=${instructionId}`)

        const insertQuery = `
          INSERT INTO public.container (containernum, weight, m1key)
          VALUES ($1, $2, $3)
          RETURNING *
        `
        const values = [containerNum, weight, instructionId]

        try {
          const result = await client.query(insertQuery, values)
          console.log(`Inserted container with ID: ${result.rows[0].containerkey}`)
          insertResults.push(result.rows[0])
        } catch (insertError) {
          console.error(`Error inserting container: ${insertError.message}`)
          throw insertError
        }
      }

      // Commit transaction
      await client.query("COMMIT")
      console.log(`Successfully inserted ${insertResults.length} containers for instruction ID: ${instructionId}`)

      // Verify the containers were inserted
      const verifyQuery = `
        SELECT COUNT(*) FROM public.container WHERE m1key = $1
      `
      const verifyResult = await pool.query(verifyQuery, [instructionId])
      console.log(
        `Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`,
      )

      res.json({ success: true, data: insertResults })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("SQL error during container update:", error)
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  }
})

// Save controller data and container data
app.post("/api/save-instruction", async (req, res) => {
  try {
    const { controllerData, containerData } = req.body
    console.log("Received instruction data:", {
      controllerData: {
        ...controllerData,
        description: "...", // Truncate for logging
        total_cost: controllerData.total_cost, // Log total_cost explicitly
        weight: controllerData.weight, // Log weight explicitly
        booking_ref: controllerData.booking_ref, // Log shipping fields
        vessel_name: controllerData.vessel_name,
        voyage_num: controllerData.voyage_num,
        imo_num: controllerData.imo_num,
        flag_reg: controllerData.flag_reg,
      },
      containerCount: containerData.length,
    })

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
          num_six_meters, num_twelve_meters, num_abnormal,
          weight, total_cost, booking_ref, vessel_name, 
          voyage_num, imo_num, flag_reg
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
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
        "New", // Changed from "In progress" to "New"
        controllerData.vat || 15,
        controllerData.num_six_meters || 0,
        controllerData.num_twelve_meters || 0,
        controllerData.num_abnormal || 0,
        controllerData.weight, // Add weight field
        controllerData.total_cost, // Add total_cost field
        controllerData.booking_ref || "", // Add shipping fields
        controllerData.vessel_name || "",
        controllerData.voyage_num || "",
        controllerData.imo_num || "",
        controllerData.flag_reg || "",
      ]

      console.log("Controller values for SQL:", controllerValues)

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
})

// Export the app for testing purposes
export default app

