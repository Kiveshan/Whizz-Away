const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")
const bcrypt = require("bcrypt")
const expressSession = require("express-session")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey)

// Middleware setup
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000", "http://127.0.0.1:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 3600000,
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

// Database client setup with multiple connection options
const dbConfigs = [
  {
    name: "Primary Config",
    config: {
      user: process.env.RDS_USERNAME || "postgres",
      host: process.env.RDS_HOSTNAME || "localhost",
      database: process.env.RDS_DB_NAME || "Whizz-Away",
      password: process.env.RDS_PASSWORD || "123456",
      port: process.env.RDS_PORT || 5433,
      ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    },
  },
  {
    name: "Fallback Config (Port 5432)",
    config: {
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "Whizz-Away",
      password: process.env.PGPASSWORD || "123456",
      port: 5432,
      ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    },
  },
]

let pool = null

// Function to connect to the database with fallback options
async function connectDb() {
  for (const dbConfig of dbConfigs) {
    try {
      console.log(`Trying database connection with ${dbConfig.name}...`)
      pool = new Pool(dbConfig.config)

      // Test the connection
      const client = await pool.connect()
      const result = await client.query("SELECT NOW()")
      client.release()

      console.log(`✅ Database Connected Successfully using ${dbConfig.name}`)
      console.log(`Database server time:`, result.rows[0].now)

      // If we get here, connection was successful
      return
    } catch (err) {
      console.error(`Failed to connect with ${dbConfig.name}:`, err.message)
      // Continue to the next configuration
    }
  }

  // If we get here, all connection attempts failed
  console.error("❌ All database connection attempts failed")
  console.error("Please check your database configuration and ensure PostgreSQL is running")

  // Don't exit the process, allow the server to start anyway
  // This way API endpoints that don't require DB can still work
  console.log("Starting server without database connection...")
}

// Helper function to execute database queries
async function query(text, params) {
  if (!pool) {
    throw new Error("Database connection not established")
  }

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

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      if (!pool) {
        return done(new Error("Database connection not established"), false)
      }

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
  done(null, { userid: user.userid, name: user.name, surname: user.surname, table: user.table })
})

passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (!pool) {
      return done(new Error("Database connection not established"), false)
    }

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

// ===== API ROUTES =====

// Health check route
app.get("/api/health", (req, res) => {
  const dbStatus = pool ? "connected" : "disconnected"
  res.json({
    status: "OK",
    message: "Whizz-Away API is running",
    database: dbStatus,
  })
})

// Login route to authenticate and set the session
app.post("/login", async (req, res, next) => {
  if (!pool) {
    return res.status(503).json({
      message: "Database connection not established. Please try again later.",
    })
  }

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

      req.session.user = user // Store user session manually
      console.log("User stored in session:", req.session.user)

      const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: "1h" })
      const { roleid } = user
      let redirectUrl = "/"

      if (roleid === 1) redirectUrl = "/Dashboard"
      else if (roleid === 2) redirectUrl = "/ControllerDashboard"
      else if (roleid === 3) redirectUrl = "/FDashboard"
      else if (roleid === 4) redirectUrl = "/DirectorDashboard"

      return res.json({ message: "Login successful", redirectUrl, token })
    })
  })(req, res, next)
})

// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user)
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" })
  }
  res.json({ name: req.session.user.name, surname: req.session.user.surname })
})

// === INVOICES ROUTES ===

// GET all completed instructions for invoices
app.get("/api/invoices/completed", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

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
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

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

// Start the server
async function startServer() {
  await connectDb()
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`API available at http://localhost:${PORT}/api/health`)
  })
}

startServer().catch((err) => {
  console.error("Failed to start server:", err)
})

module.exports = app

