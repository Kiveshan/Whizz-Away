import express from "express"
import cors from "cors"
import pkg from "pg"
const { Pool } = pkg
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import path from "path"
import { fileURLToPath } from "url"
import puppeteer from "puppeteer"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Database client setup - single configuration for Whizz-Away database
const dbConfig = {
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "Whizz-Away",
  password: process.env.PGPASSWORD || "123456",
  port: process.env.PGPORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
}

let pool = null

// Function to connect to the database
async function connectDb() {
  try {
    console.log("Connecting to database with configuration:", {
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port,
      user: dbConfig.user,
    })

    pool = new Pool(dbConfig)

    // Test the connection
    const client = await pool.connect()
    const result = await client.query("SELECT NOW()")
    client.release()

    console.log(`✅ Database Connected Successfully to ${dbConfig.database}`)
    console.log(`Database server time:`, result.rows[0].now)

    return
  } catch (err) {
    console.error(`Failed to connect to database:`, err.message)
    console.error("Please check your database configuration and ensure PostgreSQL is running")

    // Don't exit the process, allow the server to start anyway
    // This way API endpoints that don't require DB can still work
    console.log("Starting server without database connection...")
  }
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
    databaseName: dbConfig.database,
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

    // Filter by year, month, type, and clientId if provided
    const { year, month, type, clientId } = req.query

    // Updated query to match the database schema from the SQL file
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
    let paramIndex = 1

    // Add filters if provided
    if (clientId) {
      queryText += ` AND m1.client = $${paramIndex}`
      queryParams.push(clientId)
      paramIndex++
    }

    if (year && month) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex + 1}`
      queryParams.push(year, month)
      paramIndex += 2

      if (type && type !== "All") {
        queryText += ` AND s.shipmenttype = $${paramIndex}`
        queryParams.push(type)
        paramIndex++
      }
    } else if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
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

    // Updated query to include total_amount instead of rate
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
        m1.total_cost,  
        m1.rate,
        m1.rateweight,
        COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
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
    // Updated query to match the database schema from the SQL file
    const containerQuery = `
      SELECT 
        containernum as container_number, 
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

// GET clients with invoice counts
app.get("/api/clients", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    console.log("Received request for clients with invoice counts")

    // Updated query to match the database schema from the SQL file
    const queryText = `
      SELECT 
        c.m5clientkey,
        c.companyname,
        c.representative,
        c.email,
        COUNT(m1.m1key) FILTER (WHERE m1.status = 'Completed') AS invoice_count
      FROM 
        public.m5_client c
      LEFT JOIN 
        public.m1_controller m1 ON c.m5clientkey = m1.client
      GROUP BY 
        c.m5clientkey, c.companyname, c.representative, c.email
      ORDER BY 
        c.companyname
    `

    const result = await query(queryText, [])
    console.log(`Query returned ${result.rows.length} clients`)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching clients:", error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// Generate PDF with Puppeteer
app.post("/api/generate-pdf", async (req, res) => {
  try {
    console.log("Received request to generate PDF")

    const { invoiceHtml, filename } = req.body

    if (!invoiceHtml) {
      return res.status(400).json({
        success: false,
        message: "Invoice HTML content is required",
      })
    }

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    // Create a new page
    const page = await browser.newPage()

    // Set the content of the page to the invoice HTML
    await page.setContent(invoiceHtml, {
      waitUntil: "networkidle0",
    })

    // Add custom styles for better PDF rendering
    await page.addStyleTag({
      content: `
        @page {
          margin: 15mm;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
        }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
      `,
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width: 100%; font-size: 10px; text-align: right; padding-right: 15mm; color: #444;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      footerHeight: 30,
    })

    // Close the browser
    await browser.close()

    // Set response headers
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename || "invoice.pdf"}"`)

    // Send the PDF buffer
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error generating PDF:", error)
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

export default app

