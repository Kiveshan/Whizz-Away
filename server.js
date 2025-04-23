
// export default app
import express from "express"
import cors from "cors"
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import bodyParser from "body-parser"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import fs from "fs"
import pkg from "pg"
const { Pool, types } = pkg
import puppeteer from "puppeteer"
import cron from 'node-cron';

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

// Test database connection function
const testConnection = async () => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT NOW()")
    return {
      success: true,
      time: result.rows[0].now,
      message: "Database connected successfully",
    }
  } catch (error) {
    console.error("Database connection test failed:", error.message)
    return {
      success: false,
      error: error.message,
      message: "Database connection failed",
    }
  } finally {
    if (client) client.release()
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

// Try to connect to the database once at startup
;(async () => {
  try {
    const result = await testConnection()
    if (result.success) {
      console.log("Database connected successfully at:", result.time)
    } else {
      console.error("Database connection failed:", result.error)
      console.log("To fix this, please check your database configuration and restart the server.")
    }
  } catch (error) {
    console.error("Error during initial database connection test:", error)
  }
})()

// Enhanced CORS configuration
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
    exposedHeaders: ["Authorization"],
  }),
)

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  if (req.method !== "OPTIONS") {
    console.log(
      "Headers:",
      JSON.stringify(
        {
          "content-type": req.headers["content-type"],
          authorization: req.headers.authorization ? "Bearer [REDACTED]" : "none",
        },
        null,
        2,
      ),
    )
  }
  next()
})

app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Session middleware
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

// Add session debugging middleware
app.use((req, res, next) => {
  console.log("Session Middleware Check:")
  console.log("- Session ID:", req.session.id)
  console.log("- Session Cookie:", req.headers.cookie)
  console.log("- Session User:", req.session.user)
  next()
})

app.use(passport.initialize())
app.use(passport.session())

// Simple test endpoint to verify the server is running
app.get("/test-connection", async (req, res) => {
  console.log("Test connection endpoint hit")

  // Test database connection
  const dbTest = await testConnection()

  res.json({
    status: "ok",
    message: "Server is running",
    database: dbTest,
  })
})

// Add test session endpoint
app.get("/test-session", (req, res) => {
  console.log("Test session endpoint hit")
  console.log("Session:", req.session)
  console.log("Session User:", req.session.user)

  if (!req.session.user) {
    return res.json({
      status: "error",
      message: "No user in session",
      sessionExists: !!req.session,
      sessionId: req.session.id,
    })
  }

  res.json({
    status: "success",
    message: "User found in session",
    user: {
      name: req.session.user.name,
      surname: req.session.user.surname,
      roleid: req.session.user.roleid,
    },
  })
})

// Add simple session test routes
app.get("/set-session-test", (req, res) => {
  // Set a simple value in the session
  req.session.testValue = "This is a test value"
  req.session.timestamp = new Date().toISOString()

  // Force save the session
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err)
      return res.status(500).json({ error: "Failed to save session" })
    }

    res.json({
      message: "Test value set in session",
      sessionId: req.session.id,
      testValue: req.session.testValue,
      timestamp: req.session.timestamp,
    })
  })
})

app.get("/check-session-test", (req, res) => {
  res.json({
    sessionId: req.session.id,
    testValue: req.session.testValue,
    timestamp: req.session.timestamp,
  })
})

// Passport Local Strategy for Authentication
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    let client
    try {
      client = await pool.connect()
      let result = await client.query("SELECT * FROM usertable WHERE email = $1", [email])

      if (result.rows.length === 0) {
        result = await client.query("SELECT * FROM m5_employee WHERE email = $1", [email])
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
    } finally {
      if (client) client.release()
    }
  }),
)

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user)
  done(null, {
    userid: user.userid,
    name: user.name,
    surname: user.surname,
    roleid: user.roleid, // Make sure roleid is included here
    table: user.table,
    email: user.email,
  })
})

passport.deserializeUser(async (sessionUser, done) => {
  let client
  try {
    console.log("Deserializing user:", sessionUser)
    const { userid, table } = sessionUser
    let result

    client = await pool.connect()

    if (table === "usertable") {
      result = await client.query("SELECT * FROM usertable WHERE userid = $1", [userid])
    } else if (table === "m5_employee") {
      result = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [userid])
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database")
      return done(null, false)
    }

    console.log("Session user fetched:", result.rows[0])
    done(null, result.rows[0])
  } catch (err) {
    console.error("Error deserializing user:", err)
    done(err)
  } finally {
    if (client) client.release()
  }
})

// Enhanced token verification middleware
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization

  // List of endpoints that can be accessed without authentication
  const publicEndpoints = [
    "/api/clients",
    "/api/shipment-types",
    "/api/check-auth",
    "/test-connection",
    "/check-email",
    "/api/instructions",
    "/api/client-instruction-stats",
  ]

  // Check if this is a public endpoint or matches a pattern like /api/instruction/123
  const isPublicEndpoint =
    publicEndpoints.some((endpoint) => req.url === endpoint || req.url.startsWith(`${endpoint}?`)) ||
    req.url.match(/^\/api\/instruction\/\d+$/) ||
    req.url.match(/^\/api\/containers\/\d+$/)

  if (!authHeader) {
    console.log("No Authorization header for:", req.url)

    // If this is a public endpoint, allow access without token
    if (isPublicEndpoint) {
      console.log("Allowing unauthenticated access to public endpoint:", req.url)
      req.user = null // Set user to null to indicate unauthenticated request
      return next()
    }

    // For development: allow API access without auth during development
    if (
      (req.url === "/api/client-instruction-stats" ||
        req.url.startsWith("/api/instructions") ||
        req.url.match(/^\/api\/instruction\/\d+$/) ||
        req.url.match(/^\/api\/containers\/\d+$/)) &&
      process.env.NODE_ENV !== "production"
    ) {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

    // For development: allow client-instruction-stats without auth during development
    if (req.url === "/api/client-instruction-stats" && process.env.NODE_ENV !== "production") {
      console.log("DEV MODE: Allowing unauthenticated access to:", req.url)
      req.user = {
        name: "Development",
        surname: "User",
        roleid: 1,
        userid: 0,
        email: "dev@example.com",
      }
      return next()
    }

    // Try to get from query string for testing
    if (req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`
    } else {
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
      })
    }
  }

  // If we have an authorization header, verify the token
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1] // Format: "Bearer TOKEN"

    if (!token) {
      console.log("No token provided")
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
      })
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, secretKey)
      console.log("Token verified for user:", decoded.name, decoded.email)

      // Add the user data to the request
      req.user = decoded
      next()
    } catch (err) {
      console.error("Token verification failed:", err)

      // For development: allow access even with invalid token
      if (process.env.NODE_ENV !== "production" && isPublicEndpoint) {
        console.log("DEV MODE: Allowing access with invalid token for public endpoint")
        req.user = null
        return next()
      }

      return res.status(403).json({
        error: "Invalid token",
        message: "Failed to authenticate token",
      })
    }
  }
}

app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err)
      return res.status(500).json({ message: "Internal server error" })
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid email or password" })
    }

    // Check for rejected status first
    if (user.status === "rejected") {
      console.log(`User ${user.email} was rejected (status: ${user.status})`)
      return res.status(403).json({ message: "Your account was rejected. Please contact our admin" })
    }

    // Check for pending status
    if (user.status === "pending") {
      console.log(`User ${user.email} is pending approval (status: ${user.status})`)
      return res.status(403).json({ message: "Your account is pending approval." })
    }

    // Check if user has a roleid (for active users)
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. Please contact an administrator." })
    }

    // Skip status checks for admins (roleid 7)
    if (user.roleid !== 7) {
      // Check status based on which table the user is from
      if (user.table === "usertable" && user.status !== "active") {
        // For other non-active statuses
        console.log(`User ${user.email} is not active (status: ${user.status})`)
        return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
      } else if (user.table === "m5_employee" && user.status !== true) {
        // For m5_employee, status is BOOLEAN, so we check for true
        console.log(`Employee ${user.email} is not active (status: ${user.status})`)
        return res.status(403).json({ message: "Your account is not active. Please contact an administrator." })
      }

      // Check if user's company is deactivated
      try {
        const client = await pool.connect()
        // For both usertable and m5_employee, check if their company admin is active
        if (user.company_reg_num) {
          const companyCheck = await client.query(
            "SELECT * FROM usertable WHERE company_reg_num = $1 AND roleid = 1 AND status = 'active'",
            [user.company_reg_num],
          )

          if (companyCheck.rows.length === 0) {
            console.log(`No active company admin found for company_reg_num: ${user.company_reg_num}`)
            client.release()
            return res
              .status(403)
              .json({ message: "Your company account is not active. Please contact an administrator." })
          }
        }
        client.release()
      } catch (error) {
        console.error("Error checking company status:", error)
        // Continue with login even if company check fails
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        email: user.email,
        roleid: user.roleid,
        table: user.table,
        company_reg_num: user.company_reg_num,
      },
      secretKey,
      { expiresIn: "1h" },
    )

    // Store user session manually
    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
    }
    console.log("User stored in session:", req.session.user)

    const { roleid } = user
    let redirectUrl = "/"

    if (roleid === 1) redirectUrl = "/Dashboard"
    else if (roleid === 2) redirectUrl = "/ControllerDashboard"
    else if (roleid === 3) redirectUrl = "/FDashboard"
    else if (roleid === 4) redirectUrl = "/DirectorDashboard"
    else if (roleid === 7) redirectUrl = "/AdminDashboard"

    // Include roleid in the response
    return res.json({
      message: "Login successful",
      redirectUrl,
      token,
      user: {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        roleid: user.roleid,
        company_reg_num: user.company_reg_num,
      },
    })
  })(req, res, next)
})

// Logout endpoint
app.post("/logout", (req, res) => {
  // Clear the session
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err)
        return res.status(500).json({ message: "Failed to logout" })
      }

      // Clear the session cookie
      res.clearCookie("connect.sid")

      return res.status(200).json({ message: "Logged out successfully" })
    })
  } else {
    return res.status(200).json({ message: "Already logged out" })
  }
})

// User info route for session verification
app.get("/user-info", verifyToken, (req, res) => {
  console.log("User info endpoint hit")
  console.log("Current user session:", req.session)
  console.log("Session user:", req.session.user)
  console.log("Token user:", req.user)

  // Try to get user from token or session
  const user = req.user || req.session.user

  if (!user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    email: user.email,
    userid: user.userid,
  })
})

// Get user role endpoint - alternative approach
app.get("/api/user-role", verifyToken, (req, res) => {
  console.log("Checking user role from token or session")

  // Try to get user from token or session
  const user = req.user || req.session.user

  if (!user) {
    return res.status(401).json({ error: "Please log in first" })
  }

  res.json({ roleid: user.roleid })
})

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    databaseConnected: true,
  })
})

// Enhanced registration endpoint with validation
// Endpoint to check if email already exists
app.get("/check-email", async (req, res) => {
  const { email } = req.query
  let client

  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" })
  }

  try {
    client = await pool.connect()

    // Check in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email])

    if (result.rows.length > 0) {
      return res.json({ exists: true })
    }

    // Check in m5_employee table if it exists
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email])
      if (result.rows.length > 0) {
        return res.json({ exists: true })
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...")
    }

    return res.json({ exists: false })
  } catch (error) {
    console.error("Error checking email:", error)
    return res.status(500).json({ error: "Server error" })
  } finally {
    if (client) client.release()
  }
})

// Registration endpoint
app.post("/register", async (req, res) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cell_num,
    cell_num2,
    vat_reg_num,
    account_num,
    name_of_acc,
    bank,
    branch,
    branch_code,
    address,
    suburb,
    swift_code,
    cluster_box,
  } = req.body

  let client

  try {
    client = await pool.connect()

    // Check if email already exists in usertable (excluding rejected users)
    let result = await client.query("SELECT email FROM usertable WHERE email = $1", [email])

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" })
    }

    // Check if email exists in m5_employee table
    try {
      result = await client.query("SELECT email FROM m5_employee WHERE email = $1", [email])
      if (result.rows.length > 0) {
        return res.status(400).json({ message: "Email already registered" })
      }
    } catch (err) {
      // If table doesn't exist or other error, continue
      console.log("Note: m5_employee table check failed, continuing...")
    }

    // Check if company registration number already exists (excluding rejected users)
    result = await client.query(
      "SELECT company_reg_num FROM usertable WHERE company_reg_num = $1 AND status != 'rejected'",
      [company_reg_num],
    )

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Company registration number already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert new user
    const insertResult = await client.query(
      `INSERT INTO usertable (
        name, 
        surname, 
        email, 
        password, 
        companyname, 
        company_reg_num, 
        dateofreg, 
        status, 
        cell_num, 
        cell_num2, 
        vat_reg_num, 
        account_num, 
        name_of_acc, 
        bank, 
        branch, 
        branch_code, 
        address, 
        suburb, 
        swift_code,
        cluster_box
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        name,
        surname,
        email,
        hashedPassword,
        companyname,
        company_reg_num,
        cell_num,
        cell_num2 || null,
        vat_reg_num || null,
        account_num,
        name_of_acc,
        bank,
        branch,
        branch_code,
        address,
        suburb,
        swift_code || null,
        cluster_box || null,
      ],
    )

    // Return success response without sensitive data
    const user = insertResult.rows[0]
    delete user.password

    return res.status(201).json({
      message: "Registration successful! Your account is pending approval.",
      user,
    })
  } catch (error) {
    console.error("Registration error:", error)

    // Check for specific PostgreSQL error codes
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint.includes("email")) {
        return res.status(400).json({ message: "Email already registered" })
      } else if (error.constraint.includes("company_reg_num")) {
        return res.status(400).json({ message: "Company registration number already exists" })
      }
    }

    return res.status(500).json({ message: "Server error during registration" })
  } finally {
    if (client) client.release()
  }
})

// Admin verification middleware using token
const verifyAdminAccess = (req, res, next) => {
  console.log("Verifying admin access with token...")

  if (!req.user) {
    console.log("No user data in request")
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
    })
  }

  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7

  console.log(`User has roleid ${req.user.roleid}`)
  if (req.user.roleid !== ADMIN_ROLE_ID) {
    console.log(`User has roleid ${req.user.roleid}, which is not admin`)
    return res.status(403).json({
      error: "Unauthorized",
      message: "You do not have permission to access this resource",
    })
  }

  console.log("Admin access verified")
  next()
}

// Admin verification endpoint
app.get("/admin/verify", verifyToken, (req, res) => {
  console.log("Admin verify endpoint hit")

  // IMPORTANT: Using roleid 7 for admin
  const ADMIN_ROLE_ID = 7
  const isAdmin = req.user.roleid === ADMIN_ROLE_ID

  console.log(`User roleid: ${req.user.roleid}, isAdmin: ${isAdmin}`)
  res.json({ isAdmin })
})

// Get pending users - updated to use token verification
app.get("/admin/pending-users", verifyToken, verifyAdminAccess, async (req, res) => {
  let client
  try {
    console.log("Fetching pending users...")
    client = await pool.connect()
    const result = await client.query(
      "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE status = 'pending'",
    )

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ error: "Failed to fetch pending users" })
  } finally {
    if (client) client.release()
  }
})

// Approve user - updated to use token verification
app.post("/admin/approve-user", verifyToken, verifyAdminAccess, async (req, res) => {
  let client
  try {
    const { userid, roleid } = req.body
    console.log(`Approving user ${userid} with roleid ${roleid}`)

    if (!userid || !roleid) {
      return res.status(400).json({ error: "User ID and role ID are required" })
    }

    client = await pool.connect()
    await client.query("UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2", [roleid, userid])

    console.log(`User ${userid} approved successfully`)
    res.json({ message: "User approved successfully" })
  } catch (err) {
    console.error("Error approving user:", err)
    res.status(500).json({ error: "Failed to approve user" })
  } finally {
    if (client) client.release()
  }
})

// Reject user - updated to use token verification
app.post("/admin/reject-user", verifyToken, verifyAdminAccess, async (req, res) => {
  let client
  try {
    const { userid } = req.body
    console.log(`Rejecting user ${userid}`)

    if (!userid) {
      return res.status(400).json({ error: "User ID is required" })
    }

    client = await pool.connect()
    await client.query("UPDATE usertable SET status = 'rejected' WHERE userid = $1", [userid])

    console.log(`User ${userid} rejected successfully`)
    res.json({ message: "User rejected successfully" })
  } catch (err) {
    console.error("Error rejecting user:", err)
    res.status(500).json({ error: "Failed to reject user" })
  } finally {
    if (client) client.release()
  }
})

// For backward compatibility - these endpoints use the /api prefix
// Get users pending approval - updated to use token verification
app.get("/api/admin/pending-users", verifyToken, async (req, res) => {
  let client
  console.log("API endpoint for pending users hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  try {
    // Query for users with pending status
    client = await pool.connect()
    const result = await client.query("SELECT * FROM usertable WHERE status = 'pending' OR status IS NULL")

    console.log(`Found ${result.rows.length} pending users`)
    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching pending users:", err)
    res.status(500).json({ message: "Server error" })
  } finally {
    if (client) client.release()
  }
})

// Update user status (approve/reject) - updated to use token verification
app.post("/api/admin/user-status", verifyToken, async (req, res) => {
  let client
  console.log("API endpoint for user status update hit")
  // Check if user is authenticated and is an admin
  if (req.user.roleid !== 7) {
    console.log("Access denied - user is not admin")
    return res.status(403).json({ message: "Access denied" })
  }

  const { userid, action, roleid } = req.body
  console.log(`Updating user ${userid} with action ${action}`)

  try {
    client = await pool.connect()
    if (action === "approve") {
      // Approve user by setting roleid to 1
      await client.query("UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2", [
        roleid,
        userid,
      ])

      console.log(`User ${userid} approved successfully`)
      res.json({ message: "User approved successfully" })
    } else if (action === "reject") {
      // Reject user by setting a rejected flag or deleting
      await client.query("UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1", [userid])

      console.log(`User ${userid} rejected successfully`)
      res.json({ message: "User rejected successfully" })
    } else {
      console.log(`Invalid action: ${action}`)
      res.status(400).json({ message: "Invalid action" })
    }
  } catch (err) {
    console.error("Error updating user status:", err)
    res.status(500).json({ message: "Server error" })
  } finally {
    if (client) client.release()
  }
})


// === INVOICES ROUTES ===

// GET all completed instructions for invoices
app.get("/api/invoices/completed" ,verifyToken , async (req, res) => {
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

    // Updated query to join with invoice table and get invoice data
    let queryText = `
   SELECT 
    m1.m1key, 
    m1.task as instruction_no, 
    s.shipmenttype as shipment_type, 
    m1.fileref as file_no, 
    m1.status,
    i.ikey,
    i.date as date
  FROM 
    public.m1_controller m1
  LEFT JOIN 
    public.shipment s ON m1.shipment_type = s.shipkey
  LEFT JOIN
    public.invoice i ON m1.m1key = i.m1key

`

    const queryParams = []
    let paramIndex = 1

    // Add client filter if provided
    if (clientId) {
      queryText += ` WHERE m1.client = $${paramIndex}`
      queryParams.push(clientId)
      paramIndex++
    }

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }

    // Handle date filtering - now with separate conditions for year and month
    if (year && month) {
      // Both year and month provided
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex + 1}`
      queryParams.push(year, month)
      paramIndex += 2
    } else if (year) {
      // Only year provided
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    } else if (month) {
      // Only month provided
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(month)
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
app.get("/api/invoices/:id" ,verifyToken ,  async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    console.log("Received request for invoice details with ID:", req.params.id)

    const { id } = req.params
    console.log(id)

    // Updated query to include invoice data
    const queryText = `
            SELECT 
        m1.m1key,
        m1.task as instruction_no,
        s.shipmenttype as shipment_type,
        m1.fileref as file_no,
        c.client as client_name,
        c.m5clientkey,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        c.suburb as client_suburb,
        m1.pickup,
        m1.dropoff,
        m1.pickupdate,
        m1.description,
        m1.total_cost,  
        m1.rate,
        m1.vat,
        m1.rateweight,
        m1.booking_ref,
        m1.vessel_name,
	      i.invoice_num,
	      i.doc_num,
        i.date,
		    ut.cluster_box,
		    ut.vat_reg_num,
		    ut.address,
		    ut.suburb,
        ut.branch_code,
        ut.bank,
        ut.name_of_acc,
        ut.companyname,
        ut.swift_code,
        ut.account_num,
        COALESCE(ut.cell_num, ut.cell_num2) AS phonenumber,
        COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
      FROM 
        invoice i
		  INNER JOIN
	public.m1_controller m1 ON i.m1key = m1.m1key
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN 
        public.m5_client c ON i.clientid = c.m5clientkey
      INNER JOIN
		  usertable ut ON ut.roleid = 1 AND ut.status = 'active'
      WHERE 
        i.ikey = $1
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
        containernum as container_number, 
        weight
      FROM 
        public.container c
		 INNER JOIN
		 invoice i ON i.m1key = c.m1key
		 WHERE
        i.ikey = $1
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
    res.setHeader("Content-Disposition", `attachment; filename="${filename || "invoice.pdf"}"}`)

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


// Add this function to your server.js file

/**
 * Generates statements for invoice groups that don't have statements yet
 */

// Function to generate statements for all clients
async function generateMonthlyStatements() {
  console.log('Starting monthly statement generation process...');
  
  const today = new Date(); // 2025-04-11
  const currentMonth = today.getMonth(); // 3 (April)
  const currentYear = today.getFullYear(); // 2025
  const generationDate = new Date(currentYear,currentMonth,1,12,0,0)
  const formattedGenDate = generationDate.toISOString().split('T')[0]
  
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1; // 2 (March)
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear; // 2025
  
  const startDate = new Date(previousYear, previousMonth, 1, 12, 0, 0); // Set to noon
  const endDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0); // Set to noon
  
  const formattedStartDate = startDate.toISOString().split('T')[0]; // '2025-03-01'
  const formattedEndDate = endDate.toISOString().split('T')[0]; // '2025-03-31'
  
  console.log(`Today: ${today.toISOString().split('T')[0]}`);
  console.log(`Current Month: ${currentMonth}, Current Year: ${currentYear}`);
  console.log(`Previous Month: ${previousMonth}, Previous Year: ${previousYear}`);
  console.log(`Generating statements for invoices confirmed between ${formattedStartDate} and ${formattedEndDate}`);

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query('BEGIN');

    const clientsResult = await query('SELECT m5clientkey FROM m5_client', []);
    const clients = clientsResult.rows;

    for (const client of clients) {
      const clientId = client.m5clientkey;

      const invoicesQuery = `
        SELECT 
          SUM(m1.total_cost) as total_amount,
          i.groupid as invoice_group_id
        FROM invoice i
        JOIN m1_controller m1 ON i.m1key = m1.m1key
        WHERE i.clientid = $1 AND i.date BETWEEN $2 AND $3
        GROUP BY i.groupid
      `;
      const invoicesResult = await dbClient.query(invoicesQuery, [clientId, formattedStartDate, formattedEndDate]);
      const invoices = invoicesResult.rows;

      if (invoices.length === 0) {
        console.log(`Client ${clientId}: No confirmed invoices found between ${formattedStartDate} and ${formattedEndDate}, skipping`);
        continue;
      }

      for (const invoice of invoices) {
        const totalAmount = invoice.total_amount;
        const invoice_group_id = invoice.invoice_group_id;

        const existingStatement = await dbClient.query(
          'SELECT statement_key FROM statements WHERE groupid = $1 AND clientid = $2',
          [invoice_group_id, clientId]
        );

        if (existingStatement.rows.length > 0) {
          console.log(`Client ${clientId}: Statement #${existingStatement.rows[0].statement_key} already exists for group ${invoice_group_id}, skipping`);
          continue;
        }

        const agingQuery = `
          SELECT aging_key, current, "30days", "60days", "90days"
          FROM aging_analysis
          WHERE clientid = $1
          ORDER BY aging_key DESC
          LIMIT 1
        `;
        const agingResult = await dbClient.query(agingQuery, [clientId]);
        let newCurrent, new30days, new60days, new90days;

        if (agingResult.rows.length > 0) {
          const previousAging = agingResult.rows[0];
          newCurrent = Math.max(parseFloat(totalAmount) || 0, 0);
          new30days = Math.max(parseFloat(previousAging.current) || 0, 0);
          new60days = Math.max(parseFloat(previousAging["30days"]) || 0, 0);
          new90days = Math.max(
            (parseFloat(previousAging["60days"]) || 0) + (parseFloat(previousAging["90days"]) || 0),
            0
          );
        } else {
          newCurrent = Math.max(parseFloat(totalAmount) || 0, 0);
          new30days = 0;
          new60days = 0;
          new90days = 0;
        }

        const insertAgingQuery = `
          INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING aging_key
        `;
        const agingValues = [clientId, newCurrent, new30days, new60days, new90days];
        const agingInsertResult = await dbClient.query(insertAgingQuery, agingValues);
        const newAgingId = agingInsertResult.rows[0].aging_key;

        const insertStatementQuery = `
          INSERT INTO statements (groupid, generation_date, clientid, agingid)
          VALUES ($1, $4, $2, $3)
          RETURNING statement_key
        `;
        const statementResult = await dbClient.query(insertStatementQuery, [invoice_group_id, clientId, newAgingId,formattedGenDate]);
        const newStatementId = statementResult.rows[0].statement_key;

        console.log(`Generated statement #${newStatementId} for group ${invoice_group_id}`);
      }

      await dbClient.query('COMMIT');
    }
  } catch (error) {
    console.error('Error in statement generation:', error);
    if (dbClient) {
      await dbClient.query('ROLLBACK');
    }
  } finally {
    if (dbClient) {
      dbClient.release();
    }
    console.log('Monthly statement generation process completed.');
  }
}
// GET statements for a specific client
app.get("/api/statements/:clientId", verifyToken ,async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      });
    }

    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(`Fetching statements for client ${clientId} with query:`, req.query);

    let queryText = `
      SELECT 
        statement_key,
        generation_date
      FROM 
        statements
      WHERE 
        clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM generation_date) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM generation_date) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY generation_date DESC`;

    const result = await query(queryText, queryParams);
    console.log(`Query returned ${result.rows.length} statements for client ${clientId}`);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(`Error fetching statements for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});


app.get("/api/statement/:statementId", verifyToken ,async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      });
    }

    const { statementId } = req.params;
    console.log(`Fetching statement details for statement ${statementId}`);

    const queryText = `
      SELECT 
        s.statement_key,
        s.groupid,
        s.generation_date,
        s.clientid,
        c.client AS client_name,
        c.representative AS client_representative,
        c.email AS client_email,
        c.cellnum AS client_phone,
        c.companyaddress AS client_address,
        a.current,
        a."30days",
        a."60days",
        a."90days",
        i.ikey,
        i.date AS invoice_date,
        m1.total_cost AS invoice_amount,
        m1.task AS invoice_task,
        i.invoice_num,
        ut.companyname
      FROM 
        statements s
      JOIN 
        m5_client c ON s.clientid = c.m5clientkey
      JOIN 
        aging_analysis a ON s.agingid = a.aging_key
      LEFT JOIN 
        invoice i ON i.groupid = s.groupid
      LEFT JOIN 
        m1_controller m1 ON i.m1key = m1.m1key
      INNER JOIN
        usertable ut ON ut.roleid = 1 AND ut.status = 'active'
      WHERE 
        s.statement_key = $1
    `;
    const result = await query(queryText, [statementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Statement not found",
      });
    }

    // Group data for frontend
    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      company_name: result.rows[0].companyname,
      client: {
        id : result.rows[0].clientid,
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
      },
      aging: {
        current: parseFloat(result.rows[0].current || 0),
        "30days": parseFloat(result.rows[0]["30days"] || 0),
        "60days": parseFloat(result.rows[0]["60days"] || 0),
        "90days": parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: result.rows
        .filter(row => row.ikey !== null) // Filter out rows with no invoice
        .map(row => ({
          ikey: row.ikey,
          date: row.invoice_date,
          amount: parseFloat(row.invoice_amount || 0),
          task: row.invoice_task,
          invoice_num: row.invoice_num,
        })),

    };

    console.log(`Fetched statement ${statementId} with ${statementData.invoices.length} invoices`);
    res.json({
      success: true,
      data: statementData,
    });
  } catch (error) {
    console.error(`Error fetching statement ${statementId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});
// Schedule the statement generation to run on the 2nd day of each month at 1:00 AM
cron.schedule('0 1 1 * *', async () => {
  console.log('Running scheduled statement generation task');
  await generateMonthlyStatements();
});







// GET all instructions for a specific client
app.get("/api/client-instructions/:clientId", verifyToken ,async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { clientId } = req.params
    const { year, month, type } = req.query

    console.log(`Fetching instructions for client ${clientId} with filters:`, req.query)

    // Build the query with proper joins to get instruction data with invoice information
    let queryText = `
      SELECT 
        m1.m1key, 
        m1.task as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1.fileref as file_no, 
        m1.status,
        m1.pickupdate,
        m1.total_cost,
        i.ikey,
        i.invoice_num,
        i.date as invoice_date,
        i.groupid as invoice_group_id,
        (SELECT statement_key FROM statements WHERE groupid = i.groupid LIMIT 1) as statement_id
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN
        public.invoice i ON m1.m1key = i.m1key
      WHERE 
        m1.client = $1
        AND m1.status = 'Completed'
    `

    const queryParams = [clientId]
    let paramIndex = 2

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }

    // Handle date filtering - with separate conditions for year and month
    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    }
    
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM m1.pickupdate) = $${paramIndex}`
      queryParams.push(month)
      paramIndex++
    }

    // Order by pickup date descending (newest first)
    queryText += ` ORDER BY m1.pickupdate DESC`

    console.log("Executing query:", queryText, "with params:", queryParams)

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} instructions for client ${clientId}`)

    // Process the results to format dates and add additional information
    const formattedResults = result.rows.map(row => ({
      ...row,
      pickupdate: row.pickupdate ? new Date(row.pickupdate).toISOString().split('T')[0] : null,
      invoice_date: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
      has_invoice: !!row.ikey,
      has_statement: !!row.statement_id,
      total_cost: parseFloat(row.total_cost || 0).toFixed(2)
    }))

    res.json({
      success: true,
      data: formattedResults,
    })
  } catch (error) {
    console.error(`Error fetching instructions for client ${req.params.clientId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// ---------------Company -------------------- //

app.get("/api/admin/company-list", verifyToken, async (req, res) => {
  let client
  try {
    // Only admins (roleid 7) can view all companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to view all companies" })
    }

    // Get all company admins (roleid 1)
    client = await pool.connect()
    const result = await client.query(`
      SELECT 
        u.userid, 
        u.name, 
        u.surname, 
        u.email, 
        u.companyname, 
        u.company_reg_num, 
        u.status, 
        u.dateofreg,
        (SELECT COUNT(*) FROM usertable WHERE company_reg_num = u.company_reg_num) + 
        (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
      FROM 
        usertable u
      WHERE 
        u.roleid = 1
      ORDER BY 
        u.companyname ASC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error("Error fetching companies:", err)
    res.status(500).json({ error: "Failed to fetch companies" })
  } finally {
    if (client) client.release()
  }
})

// Get company information for a specific company_reg_num
app.get("/api/company/:company_reg_num", verifyToken, async (req, res) => {
  let client
  try {
    const { company_reg_num } = req.params

    // Check if the requesting user has permission to view this company
    // Only admins (roleid 7) or company admins (roleid 1) of the same company can view
    if (req.user.roleid !== 7 && !(req.user.roleid === 1 && req.user.company_reg_num === company_reg_num)) {
      return res.status(403).json({ message: "You don't have permission to view this company" })
    }

    // Get company admin info
    client = await pool.connect()
    const companyAdminResult = await client.query(
      "SELECT userid, name, surname, email, companyname, company_reg_num, status, dateofreg FROM usertable WHERE company_reg_num = $1 AND roleid = 1",
      [company_reg_num],
    )

    if (companyAdminResult.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" })
    }

    const companyAdmin = companyAdminResult.rows[0]

    // Get all users from this company
    const usersResult = await client.query(
      "SELECT userid, name, surname, email, roleid, status FROM usertable WHERE company_reg_num = $1 AND roleid != 1",
      [company_reg_num],
    )

    // Get all employees from this company
    const employeesResult = await client.query(
      "SELECT userid, name, surname, email, roleid, status FROM m5_employee WHERE company_reg_num = $1",
      [company_reg_num],
    )

    res.json({
      company: {
        name: companyAdmin.companyname,
        reg_num: companyAdmin.company_reg_num,
        status: companyAdmin.status,
        registration_date: companyAdmin.dateofreg,
      },
      admin: {
        userid: companyAdmin.userid,
        name: companyAdmin.name,
        surname: companyAdmin.surname,
        email: companyAdmin.email,
      },
      users: usersResult.rows,
      employees: employeesResult.rows,
    })
  } catch (err) {
    console.error("Error fetching company information:", err)
    res.status(500).json({ error: "Failed to fetch company information" })
  } finally {
    if (client) client.release()
  }
})

// Deactivate a company and all its users
app.post("/api/company/deactivate", verifyToken, async (req, res) => {
  let client
  try {
    const { company_reg_num } = req.body

    if (!company_reg_num) {
      return res.status(400).json({ error: "Company registration number is required" })
    }

    // Only admins (roleid 7) can deactivate companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to deactivate companies" })
    }

    // Start a transaction
    client = await pool.connect()
    await client.query("BEGIN")

    try {
      // Deactivate the company admin
      const companyAdminResult = await client.query(
        "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
        [company_reg_num],
      )

      if (companyAdminResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ message: "Company not found" })
      }

      // Deactivate all users from this company
      await client.query("UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1", [company_reg_num])

      // Deactivate all employees from this company
      await client.query("UPDATE m5_employee SET status = FALSE WHERE company_reg_num = $1", [company_reg_num])

      // Commit the transaction
      await client.query("COMMIT")

      res.json({
        message: "Company and all associated users have been deactivated",
        company: companyAdminResult.rows[0].companyname,
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  } catch (err) {
    console.error("Error deactivating company:", err)
    res.status(500).json({ error: "Failed to deactivate company" })
  } finally {
    if (client) client.release()
  }
})

// Reactivate a company and all its users
app.post("/api/company/reactivate", verifyToken, async (req, res) => {
  let client
  try {
    const { company_reg_num } = req.body

    if (!company_reg_num) {
      return res.status(400).json({ error: "Company registration number is required" })
    }

    // Only admins (roleid 7) can reactivate companies
    if (req.user.roleid !== 7) {
      return res.status(403).json({ message: "You don't have permission to reactivate companies" })
    }

    // Start a transaction
    client = await pool.connect()
    await client.query("BEGIN")

    try {
      // Reactivate the company admin
      const companyAdminResult = await client.query(
        "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
        [company_reg_num],
      )

      if (companyAdminResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ message: "Company not found" })
      }

      // Reactivate all users from this company
      await client.query("UPDATE usertable SET status = 'active' WHERE company_reg_num = $1", [company_reg_num])

      // Reactivate all employees from this company
      await client.query("UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1", [company_reg_num])

      // Commit the transaction
      await client.query("COMMIT")

      res.json({
        message: "Company and all associated users have been reactivated",
        company: companyAdminResult.rows[0].companyname,
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  } catch (err) {
    console.error("Error reactivating company:", err)
    res.status(500).json({ error: "Failed to reactivate company" })
  } finally {
    if (client) client.release()
  }
})

// ------------------------------------------Module 0 Ends here---------------------------------- //

// ------------------- API ENDPOINTS FROM SERVER2.JS ------------------- //

// Import additional modules needed for server2.js functionality
import multer from "multer"
import { uploadInstructionToS3, getSignedUrl } from "./utils/s3-config.js"
import expensesRoutes from "./routes/expenses.js"
import documentsRoutes from "./routes/Documents.js"

// Set up multer for file uploads
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use("/uploads", express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + "-" + uniqueSuffix + ext)
  },
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

// Get all clients
app.get("/api/clients", async (req, res) => {
  let client
  try {
    console.log("Fetching clients from database...")

    client = await pool.connect()

    const query = `
      SELECT m5clientkey, client AS companyname, representative, cellnum, email
      FROM public.m5_client
      ORDER BY companyname
    `
    const result = await client.query(query)
    console.log(`Found ${result.rows.length} clients`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching clients:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Get all shipment types
app.get("/api/shipment-types", async (req, res) => {
  let client
  try {
    console.log("Fetching shipment types from database...")

    client = await pool.connect()

    const query = `
      SELECT shipkey, shipmenttype
      FROM public.shipment
      ORDER BY shipkey
    `
    const result = await client.query(query)
    console.log(`Found ${result.rows.length} shipment types`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get client instruction statistics
app.get("/api/client-instruction-stats", verifyToken, async (req, res) => {
  let client
  try {
    console.log("Fetching client instruction statistics from database...")
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )

    client = await pool.connect()

    // Debug query to check actual status values in the database
    const statusCheckQuery = `
      SELECT DISTINCT status FROM public.m1_controller
    `
    const statusResult = await client.query(statusCheckQuery)
    console.log(
      "Available status values in database:",
      statusResult.rows.map((row) => row.status),
    )

    // Updated query to include all clients and count all status types
    const query = `
      SELECT 
        c.m5clientkey,
        c.client AS companyname,
        c.representative,
        c.email,
        MAX(m.pickupdate) as latest_date,
        SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
      FROM 
        public.m5_client c
      LEFT JOIN 
        public.m1_controller m ON c.m5clientkey = m.client
      GROUP BY 
        c.m5clientkey, c.client, c.representative, c.email
      ORDER BY 
        c.client
    `

    const result = await client.query(query)
    console.log("Client stats query result count:", result.rows.length)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to check if there are any new instructions
app.get("/api/has-new-instructions", verifyToken, async (req, res) => {
  let client
  try {
    console.log("Checking for new instructions...")

    client = await pool.connect()

    const query = `
      SELECT EXISTS(
        SELECT 1 FROM public.m1_controller WHERE status = 'New'
      ) as has_new
    `

    const result = await client.query(query)
    console.log(`Has new instructions: ${result.rows[0].has_new}`)
    res.json({ hasNew: result.rows[0].has_new })
  } catch (error) {
    console.error("Error checking for new instructions:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get instructions for a specific client
app.get("/api/instructions", verifyToken, async (req, res) => {
  let client
  try {
    const { clientId } = req.query
    console.log(`Fetching instructions for client ID: ${clientId || "all"}`)
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )

    client = await pool.connect()

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
        c.client AS companyname
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

    const result = await client.query(query, queryParams)
    console.log(`Found ${result.rows.length} instructions`)
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching instructions:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get a single instruction by ID
app.get("/api/instruction/:id", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.id

    console.log(`Fetching instruction with ID: ${instructionId}`)

    client = await pool.connect()

    // Query to get instruction details with client and shipment type information
    const query = `
      SELECT 
        m.*,
        c.client AS companyname,
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

    const result = await client.query(query, [instructionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    console.log(`Found instruction with ID: ${instructionId}`)
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to update an instruction
app.put("/api/instruction/:id", verifyToken, async (req, res) => {
  let client
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

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
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
    }
  } catch (error) {
    console.error("Error updating instruction:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to get containers for a specific instruction
app.get("/api/containers/:instructionId", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.instructionId
    console.log(`Fetching containers for instruction ID: ${instructionId}`)

    client = await pool.connect()

    // Query to get containers for the instruction
    const query = `
      SELECT containerkey, containernum, weight, m1key
      FROM public.container
      WHERE m1key = $1
    `

    const result = await client.query(query, [instructionId])
    console.log(`Found ${result.rows.length} containers for instruction ID: ${instructionId}`)

    // If no containers found, return empty array instead of 404
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching containers:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API endpoint to update/add containers for a specific instruction
app.post("/api/containers/:instructionId", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.instructionId
    const containerData = req.body

    if (!Array.isArray(containerData)) {
      return res.status(400).json({ error: "Container data must be an array" })
    }

    console.log(`Updating containers for instruction ID: ${instructionId}`)
    console.log("Container data received:", JSON.stringify(containerData, null, 2))

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
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
      const verifyResult = await client.query(verifyQuery, [instructionId])
      console.log(
        `Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`,
      )

      res.json({ success: true, data: insertResults })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("SQL error during container update:", error)
      throw error
    }
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// Save controller data and container data
app.post("/api/save-instruction", verifyToken, async (req, res) => {
  let client
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

    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
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
    }
  } catch (error) {
    console.error("Error in save-instruction endpoint:", error)
    res.status(500).json({ error: error.message })
  } finally {
    if (client) client.release()
  }
})

// API test endpoint
app.get("/api-test/run-all", async (req, res) => {
  let client
  try {
    console.log("Running all API tests...")

    // Test database connection
    const dbTest = await testConnection()

    // Test endpoints
    const tests = [
      { name: "Database Connection", success: dbTest.success, message: dbTest.message },
      { name: "API Test Endpoint", success: true, message: "API test endpoint is working" },
    ]

    // Test clients endpoint
    try {
      client = await pool.connect()
      const clientsResult = await client.query("SELECT COUNT(*) FROM public.m5_client")
      tests.push({
        name: "Clients Endpoint",
        success: true,
        message: `Found ${clientsResult.rows[0].count} clients in database`,
      })
    } catch (error) {
      tests.push({
        name: "Clients Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Test shipment types endpoint
    try {
      const shipmentResult = await client.query("SELECT COUNT(*) FROM public.shipment")
      tests.push({
        name: "Shipment Types Endpoint",
        success: true,
        message: `Found ${shipmentResult.rows[0].count} shipment types in database`,
      })
    } catch (error) {
      tests.push({
        name: "Shipment Types Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Test instructions endpoint
    try {
      const instructionsResult = await client.query("SELECT COUNT(*) FROM public.m1_controller")
      tests.push({
        name: "Instructions Endpoint",
        success: true,
        message: `Found ${instructionsResult.rows[0].count} instructions in database`,
      })
    } catch (error) {
      tests.push({
        name: "Instructions Endpoint",
        success: false,
        message: `Error: ${error.message}`,
      })
    }

    // Calculate overall success
    const allSuccess = tests.every((test) => test.success)

    res.json({
      success: allSuccess,
      message: allSuccess ? "All tests passed successfully" : "Some tests failed",
      tests: tests,
    })
  } catch (error) {
    console.error("Error running API tests:", error)
    res.status(500).json({
      success: false,
      message: "Error running API tests",
      error: error.message,
    })
  } finally {
    if (client) client.release()
  }
})

// Add a debug endpoint to check token validity
app.get("/api/check-auth", verifyToken, (req, res) => {
  console.log("Auth check endpoint hit")
  res.json({
    authenticated: true,
    user: {
      userid: req.user ? req.user.userid : null,
      name: req.user ? req.user.name : "Guest",
      surname: req.user ? req.user.surname : "User",
      email: req.user ? req.user.email : null,
      roleid: req.user ? req.user.roleid : null,
    },
  })
})

// Driver routes
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

app.put("/instructions/:instructionId/status", async (req, res) => {
  const { instructionId } = req.params
  const { status } = req.body
  console.log(`Route PUT /instructions/${instructionId}/status was accessed, setting status to ${status}`)

  try {
    await pool.query(`UPDATE m1_controller SET status = $1 WHERE m1key = $2`, [status, instructionId])

    console.log(`Instruction ${instructionId} status updated to ${status}`)
    res.status(200).json({
      success: true,
      message: `Instruction status updated to ${status} successfully`,
    })
  } catch (err) {
    console.error(`Error updating instruction ${instructionId} status:`, err)
    res.status(500).json({
      success: false,
      message: "Failed to update instruction status",
      error: err.message,
    })
  }
})

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

// Update the employees/drivers endpoint to only fetch drivers with roleid = 5
app.get("/employees/drivers", async (req, res) => {
  console.log("Route /employees/drivers was accessed")

  try {
    const result = await pool.query(
      "SELECT userid, name, surname FROM m5_employee WHERE roleid = 5 ORDER BY name, surname",
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
app.get("/employees/controllers", async (req, res) => {
  console.log("Route /employees/controllers was accessed")

  try {
    const result = await pool.query(
      "SELECT userid, name, surname FROM m5_employee WHERE roleid = 2 ORDER BY name, surname",
    )

    console.log("Controllers found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No controllers found in the m5_employee table")
    } else {
      console.log(`Found ${result.rows.length} controllers`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching controllers:", err)
    res.status(500).json({ error: "Server Error" })
  }
})

app.get("/employees/managers", async (req, res) => {
  console.log("Route /employees/managers was accessed")

  try {
    const result = await pool.query(
      "SELECT userid, name, surname FROM usertable WHERE roleid = 1 ORDER BY name, surname",
    )

    console.log("Managers found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No managers found in the usertable")
    } else {
      console.log(`Found ${result.rows.length} managers`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching managers:", err)
    res.status(500).json({ error: "Server Error" })
  }
})
app.get("/instructions/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /instructions/${instructionId} was accessed`)

  try {
    const result = await pool.query(`SELECT m1key, status FROM m1_controller WHERE m1key = $1`, [instructionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    const instruction = result.rows[0]
    const isCompleted = instruction.status === "Completed"

    res.status(200).json({
      id: instruction.m1key,
      status: instruction.status,
      is_completed: isCompleted,
    })
  } catch (err) {
    console.error(`Error fetching instruction ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Add this endpoint to get the shipment type for an instruction
app.get("/instructions/:instructionId/shipment-type", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /instructions/${instructionId}/shipment-type was accessed`)

  try {
    const result = await pool.query(`SELECT shipment_type FROM m1_controller WHERE m1key = $1`, [instructionId])

    if (result.rows.length === 0) {
      console.log(`No instruction found with ID ${instructionId}`)
      return res.status(404).json({ error: "Instruction not found" })
    }

    const shipmentType = result.rows[0].shipment_type
    console.log(`Raw shipment type from database for instruction ID ${instructionId}:`, shipmentType)
    console.log(`Type of shipment_type: ${typeof shipmentType}`)

    res.status(200).json({ shipment_type: shipmentType })
  } catch (err) {
    console.error(`Error fetching shipment type for instruction ID ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

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
  console.log("Route /trucks/regnums was accessed")

  try {
    const result = await pool.query("SELECT truckregnum FROM m5_trucks ORDER BY truckregnum")

    console.log("Truck registration numbers found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No truck registration numbers found in the m5_trucks table")
    } else {
      console.log(`Found ${result.rows.length} truck registration numbers`)
    }

    res.status(200).json(result.rows.map((row) => row.truckregnum))
  } catch (err) {
    console.error("Error fetching truck registration numbers:", err)
    res.status(500).send("Server Error")
  }
})

// Update the trucks/fuel-expenses endpoint to include is_subcontractor field
app.get("/trucks/fuel-expenses", async (req, res) => {
  console.log("Route /trucks/fuel-expenses was accessed")

  try {
    // Modified query to include is_subcontractor field
    const result = await pool.query(`
        SELECT DISTINCT m.truckid, t.truckregnum, t.is_subcontractor 
        FROM expenses_m2 m
        JOIN m5_trucks t ON m.truckid = t.m5truckskey
        WHERE m.truckid IS NOT NULL
        ORDER BY t.truckregnum
      `)

    console.log("Trucks with fuel expenses found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No trucks with fuel expenses found")
    } else {
      console.log(`Found ${result.rows.length} trucks with fuel expenses`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching trucks with fuel expenses:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get("/expenses/truck/:truckId", async (req, res) => {
  const truckId = req.params.truckId
  console.log(`Route /expenses/truck/${truckId} was accessed`)

  try {
    // Query to get all expenses for a specific truck
    const result = await pool.query(
      `
SELECT 
  e.*, 
  t.truckregnum,
  COALESCE(
    CASE 
      WHEN e.documentfrom = 'Controller' THEN 
        (SELECT CONCAT(name, ' ', surname) FROM m5_employee WHERE roleid = 2 LIMIT 1)
      WHEN e.documentfrom = 'Manager' THEN 
        (SELECT CONCAT(name, ' ', surname) FROM usertable WHERE roleid = 1 LIMIT 1)
      WHEN e.driverid IS NOT NULL THEN CONCAT(emp.name, ' ', emp.surname)
      ELSE NULL
    END,
    e.documentfrom
  ) AS documentfrom_display
FROM expenses_m2 e
JOIN m5_trucks t ON e.truckid = t.m5truckskey
LEFT JOIN m5_employee emp ON e.driverid = emp.userid
WHERE e.truckid = $1
  AND (e.type ILIKE 'fuel' OR e.type ILIKE 'diesel' OR e.type ILIKE 'petrol')
ORDER BY e.slipuploaddate DESC;
      `,
      [truckId],
    )

    console.log(`Found ${result.rows.length} expenses for truck ID ${truckId}`)
    const processedResults = result.rows.map((row) => ({
      ...row,
      documentfrom: row.documentfrom_display,
    }))

    res.status(200).json(processedResults)
  } catch (err) {
    console.error(`Error fetching expenses for truck ID ${truckId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// GET endpoint to retrieve all expenses
app.get("/expenses", async (req, res) => {
  console.log("Route GET /expenses was accessed")

  try {
    const result = await pool.query(`
      SELECT e.*, t.truckregnum, CONCAT(emp.name, ' ', emp.surname) as driver_name
      FROM expenses_m2 e
      LEFT JOIN m5_trucks t ON e.truckid = t.m5truckskey
      LEFT JOIN m5_employee emp ON e.driverid = emp.userid
      ORDER BY e.slipuploaddate DESC
    `)

    console.log(`Found ${result.rows.length} expenses`)

    res.status(200).json(result.rows)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    })
  }
})

// Add endpoint to get all trucks for the expense form
app.get("/trucks", async (req, res) => {
  console.log("Route /trucks was accessed")

  try {
    const result = await pool.query(
      "SELECT m5truckskey as truckid, truckregnum as registration FROM m5_trucks ORDER BY truckregnum",
    )

    console.log("Trucks found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No trucks found in the m5_trucks table")
    } else {
      console.log(`Found ${result.rows.length} trucks`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error("Error fetching trucks:", err)
    res.status(500).json({ error: err.message })
  }
})

app.get("/client-instructions", async (req, res) => {
  console.log("Route /client-instructions was accessed")

  try {
    const result = await pool.query(`
          SELECT 
              c.m5clientkey, 
              c.client AS companyname, 
              c.representative, 
              c.email,
              COUNT(CASE WHEN m.status = 'New' THEN 1 ELSE NULL END) AS new_count,
              COUNT(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE NULL END) AS in_progress_count
          FROM 
              m5_client c
          LEFT JOIN 
              m1_controller m ON c.m5clientkey = m.client
          GROUP BY 
              c.m5clientkey, c.client, c.representative, c.email
          ORDER BY 
              c.client;
      `)

    console.log("Query result:", result.rows) // Log the result rows
    res.status(200).json(result.rows)
  } catch (error) {
    console.error("Error fetching client instructions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch client instructions",
      error: error.message,
    })
  }
})

app.get("/client-instructions-details/:clientId", async (req, res) => {
  const { clientId } = req.params
  try {
    const result = await pool.query(
      `
      SELECT 
        m1.m1key, 
        s.shipkey AS shippy, 
        m1.status, 
        m1.fileref
      FROM 
        public.m1_controller m1
      JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      WHERE 
        m1.client = $1
      `,
      [clientId],
    )
    console.log(result.rows)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

app.get("/containers/numbers", async (req, res) => {
  console.log("Route /containers/numbers was accessed")

  try {
    const result = await pool.query("SELECT containernum FROM container ORDER BY containernum")

    console.log("Container numbers found:", result.rows)

    if (result.rows.length === 0) {
      console.log("No container numbers found in the container table")
    } else {
      console.log(`Found ${result.rows.length} container numbers`)
    }

    res.status(200).json(result.rows.map((row) => row.containernum))
  } catch (err) {
    console.error("Error fetching container numbers:", err)
    res.status(500).send("Server Error")
  }
})

// Update the legs/save endpoint to handle multiple drivers in legs_m2
app.post("/legs/save", async (req, res) => {
  console.log("Route POST /legs/save was accessed")
  console.log("Request body:", JSON.stringify(req.body, null, 2))

  const { legkey, legnumber, startingpoint, destination, driverrate, m1key, drivers } = req.body
  const isNewLeg = !legkey || legkey === null

  // Validate required fields
  if (!m1key) {
    return res.status(400).json({
      success: false,
      message: "Missing required field: m1key",
    })
  }

  if (!legnumber) {
    return res.status(400).json({
      success: false,
      message: "Missing required field: legnumber",
    })
  }

  if (!startingpoint || !destination) {
    return res.status(400).json({
      success: false,
      message: "Starting point and destination are required",
    })
  }

  try {
    // Begin transaction
    await pool.query("BEGIN")

    // First, delete any existing legs with the same m1key and legnumber
    // This is to handle updates and ensure we don't have duplicates
    if (!isNewLeg) {
      await pool.query(`DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2 AND legkey != $3`, [
        m1key,
        legnumber,
        legkey,
      ])

      // Update the existing leg
      await pool.query(
        `UPDATE legs_m2 
         SET startingpoint = $1, destination = $2, driverrate = $3
         WHERE legkey = $4`,
        [startingpoint, destination, driverrate, legkey],
      )

      console.log(`Updated existing leg with legkey=${legkey}`)
    } else {
      // For new legs, delete any with the same m1key and legnumber
      await pool.query(`DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2`, [m1key, legnumber])
    }

    let legId = legkey

    // If this is a new leg or we need to create driver entries
    if (isNewLeg || (drivers && drivers.length > 0)) {
      // For a new leg with no drivers, create one entry
      if (isNewLeg && (!drivers || drivers.length === 0)) {
        const insertResult = await pool.query(
          `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING legkey`,
          [legnumber, startingpoint, destination, driverrate, m1key],
        )
        legId = insertResult.rows[0].legkey
        console.log(`Created new leg with legkey=${legId}`)
      }

      // For each driver, create a new entry in legs_m2
      if (drivers && drivers.length > 0) {
        for (const driver of drivers) {
          console.log(`Processing driver:`, JSON.stringify(driver, null, 2))

          // Skip empty driver entries
          if (!driver.driverid && !driver.truckregnumber && !driver.containernumber && !driver.date) {
            console.log("Skipping empty driver entry")
            continue
          }

          // Ensure proper type conversion for all fields
          const driverId = driver.driverid ? Number.parseInt(driver.driverid) : null
          const truckRegNumber = driver.truckregnumber || null

          let containerNumber = null;
          if (driver.containernumber) {
            containerNumber = driver.containernumber.toString();
            console.log(`Using container number as string: ${containerNumber}`);
          }

          const date = driver.date ? new Date(driver.date) : null

          // If this is an existing leg and we're processing the first driver
          // update the existing record instead of creating a new one
          if (!isNewLeg && legId && drivers.indexOf(driver) === 0) {
            await pool.query(
              `UPDATE legs_m2 
               SET driverid = $1, truckregnumber = $2, containernumber = $3, date = $4
               WHERE legkey = $5`,
              [driverId, truckRegNumber, containerNumber, date, legId],
            )
            console.log(`Updated first driver for existing leg with legkey=${legId}`)
          } else {
            // For additional drivers or new legs, insert new records
            const insertResult = await pool.query(
              `INSERT INTO legs_m2 
               (legnumber, startingpoint, destination, driverrate, m1key, driverid, truckregnumber, containernumber, date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING legkey`,
              [
                legnumber,
                startingpoint,
                destination,
                driverrate,
                m1key,
                driverId,
                truckRegNumber,
                containerNumber,
                date,
              ],
            )

            // If this is the first driver for a new leg, save the legkey
            if (isNewLeg && drivers.indexOf(driver) === 0) {
              legId = insertResult.rows[0].legkey
              console.log(`Created new leg with first driver, legkey=${legId}`)
            } else {
              console.log(`Added additional driver to leg, new legkey=${insertResult.rows[0].legkey}`)
            }
          }
        }
      }
    }

    // Commit transaction
    await pool.query("COMMIT")

    // Return the leg ID so the frontend can update its state
    res.status(200).json({
      success: true,
      message: isNewLeg ? "New leg created in database" : "Leg updated successfully",
      legId,
      isUpdate: !isNewLeg,
    })
  } catch (err) {
    // Rollback transaction on error
    await pool.query("ROLLBACK")
    console.error("Error saving leg:", err)
    res.status(500).json({
      success: false,
      message: "Failed to save leg: " + err.message,
      error: err.message,
    })
  }
})

// Update the legs endpoint to fetch from legs_m2 and join with m5_employee
// Update the legs endpoint to properly handle container numbers as strings
app.get("/legs/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /legs/${instructionId} was accessed`)

  try {
    // Fetch all legs for the instruction, joining with m5_employee to get driver details
    const result = await pool.query(
      `
      SELECT 
        l.legkey, 
        l.legnumber, 
        l.startingpoint, 
        l.destination, 
        l.driverrate,
        l.driverid,
        l.truckregnumber,
        l.containernumber,
        l.date,
        e.name AS driver_name,
        e.surname AS driver_surname
      FROM 
        legs_m2 l
      LEFT JOIN 
        m5_employee e ON l.driverid = e.userid
      WHERE 
        l.m1key = $1
      ORDER BY 
        l.legnumber, l.legkey
      `,
      [instructionId],
    )

    // Log raw data for debugging
    console.log(`Raw data from database (${result.rows.length} rows):`)
    result.rows.forEach((row, index) => {
      console.log(
        `Row ${index}:`,
        JSON.stringify(
          {
            legkey: row.legkey,
            legnumber: row.legnumber,
            driverid: row.driverid,
            truckregnumber: row.truckregnumber,
            containernumber: row.containernumber,
            date: row.date,
            driver_name: row.driver_name,
            driver_surname: row.driver_surname,
          },
          null,
          2,
        ),
      )
    })

    // Group the results by legnumber to handle multiple drivers per leg
    const legMap = new Map()

    for (const row of result.rows) {
      const legnumber = row.legnumber

      if (!legMap.has(legnumber)) {
        // Create a new leg entry
        legMap.set(legnumber, {
          legkey: row.legkey,
          legnumber: row.legnumber,
          startingpoint: row.startingpoint,
          destination: row.destination,
          driverrate: row.driverrate,
          drivers: [],
        })
      }

      // Add driver information if available
      const leg = legMap.get(legnumber)

      // Log the raw data for debugging
      console.log(`Processing driver data for leg ${legnumber}:`, {
        driverid: row.driverid,
        truckregnumber: row.truckregnumber,
        containernumber: row.containernumber,
        date: row.date,
      })

      // Always add driver information if this row has a legkey
      // This ensures we capture all driver entries even if some fields are null
      leg.drivers.push({
        id: row.legkey, // Use legkey as the driver entry ID
        driverid: row.driverid ? row.driverid.toString() : "",
        truckregnumber: row.truckregnumber || "",
        // Convert containernumber to string if it exists, otherwise empty string
        containernumber: row.containernumber !== null ? row.containernumber.toString() : "",
        date: row.date ? row.date : null,
        driver_name: row.driver_name || "",
        driver_surname: row.driver_surname || "",
        full_name:
          row.driver_name && row.driver_surname
            ? `${row.driver_name} ${row.driver_surname}`
            : row.driverid
              ? `Driver ID: ${row.driverid}`
              : "Unknown Driver",
      })
    }

    // Convert the Map to an array
    const legs = Array.from(legMap.values())

    // For each leg, filter out any driver entries that have no data at all
    legs.forEach((leg) => {
      leg.drivers = leg.drivers.filter(
        (driver) => driver.driverid || driver.truckregnumber || driver.containernumber || driver.date,
      )
    })

    console.log(`Found ${legs.length} unique legs for instruction ID ${instructionId}`)
    console.log(`Sending legs data to client:`, JSON.stringify(legs, null, 2))

    res.status(200).json(legs)
  } catch (err) {
    console.error(`Error fetching legs for instruction ID ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

app.delete("/legs/:legId", async (req, res) => {
  const { legId } = req.params
  console.log(`Route DELETE /legs/${legId} was accessed`)

  try {
    // Begin transaction
    await pool.query("BEGIN")

    // First, get the leg information to log what we're deleting
    const legInfo = await pool.query(`SELECT legkey, legnumber, m1key FROM legs_m2 WHERE legkey = $1`, [legId])

    if (legInfo.rows.length === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: `Leg with ID ${legId} not found`,
      })
    }

    const { legnumber, m1key } = legInfo.rows[0];
    console.log(`Deleting leg ${legId} (leg number ${legnumber}) from instruction ${m1key}`);
    
    // Delete the leg from the database
    const result = await pool.query(`DELETE FROM legs_m2 WHERE legkey = $1 RETURNING legkey`, [legId]);
    
    if (result.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: `Leg with ID ${legId} not found or could not be deleted`,
      });
    }
    
    // Commit transaction
    await pool.query("COMMIT");
    
    console.log(`Successfully deleted leg with ID ${legId}`);
    res.status(200).json({
      success: true,
      message: `Leg with ID ${legId} successfully deleted`,
      deletedLegId: legId,
    });
    } catch (err) {
      // Rollback transaction on error
      await pool.query("ROLLBACK");
      console.error(`Error deleting leg with ID ${legId}:`, err);
      res.status(500).json({
        success: false,
        message: `Failed to delete leg: ${err.message}`,
        error: err.message,
      });
    }
    });
    
    // Fetch containers for a specific instruction
    app.get("/containers/instruction/:instructionId", async (req, res) => {
    const { instructionId } = req.params;
    console.log(`Route /containers/instruction/${instructionId} was accessed`);
    
    try {
      const result = await pool.query(`SELECT * FROM container WHERE m1key = $1`, [instructionId]);
    
      console.log(`Found ${result.rows.length} containers for instruction ID ${instructionId}`);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(`Error fetching containers for instruction ID ${instructionId}:`, err);
      res.status(500).json({ error: err.message });
    }
    });
    
    // Complete instruction
    app.put("/instructions/:instructionId/complete", async (req, res) => {
    const { instructionId } = req.params;
    const { status } = req.body;
    console.log(`Route PUT /instructions/${instructionId}/complete was accessed`);
    
    try {
    await pool.query(`UPDATE m1_controller SET status = $1 WHERE m1key = $2`, [status, instructionId])

    console.log(`Instruction ${instructionId} marked as ${status}`)
    res.status(200).json({
      success: true,
      message: `Instruction marked as ${status} successfully`,
    })
  } catch (err) {
    console.error(`Error completing instruction ${instructionId}:`, err)
    res.status(500).json({
      success: false,
      message: "Failed to complete instruction",
      error: err.message,
    })
  }
})

app.get("/instructions/:instructionId/details", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /instructions/${instructionId}/details was accessed`)

  try {
    const result = await pool.query(
      `SELECT m1key, client, pickup, dropoff, status FROM m1_controller WHERE m1key = $1`,
      [instructionId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    console.log(`Instruction details for ID ${instructionId}:`, result.rows[0])
    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching instruction details for ID ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Add an endpoint to get driver details by ID
app.get("/driver/:driverId", async (req, res) => {
  const { driverId } = req.params
  console.log(`Route /driver/${driverId} was accessed`)

  try {
    const result = await pool.query(`SELECT userid, name, surname FROM m5_employee WHERE userid = $1`, [driverId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Driver not found" })
    }

    res.status(200).json(result.rows[0])
  } catch (err) {
    console.error(`Error fetching driver with ID ${driverId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Get instructions for a specific driver with leg count
app.get("/instructions/driver/:id", async (req, res) => {
  const driverId = req.params.id

  try {
    // Query to get instructions with leg count for a specific driver
    const query = `
      SELECT 
        m1.m1key, 
        m1.pickupdate,
        COUNT(l.legkey) as leg_count
      FROM 
        public.m1_controller m1
      JOIN 
        public.legs_m2 l ON m1.m1key = l.m1key
      WHERE 
        l.driverid = $1
      GROUP BY 
        m1.m1key, m1.pickupdate
      ORDER BY 
        m1.pickupdate DESC
    `

    const result = await pool.query(query, [driverId])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching driver instructions:", error)
    res.status(500).json({ error: "An error occurred while fetching driver instructions" })
  }
})

// Add this route to view leg details for a specific instruction
app.get("/legs/instruction/:id/driver/:driverId", async (req, res) => {
  const instructionId = req.params.id
  const driverId = req.params.driverId

  try {
    const query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.legstatus
      FROM 
        public.legs_m2 l
      WHERE 
        l.m1key = $1 AND l.driverid = $2
      ORDER BY 
        l.legnumber
    `

    const result = await pool.query(query, [instructionId, driverId])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching leg details:", error)
    res.status(500).json({ error: "An error occurred while fetching leg details" })
  }
})

// Get wage details for a driver and instruction
app.get("/api/driver-legs/:driverId", async (req, res) => {
  const { driverId } = req.params;
  const { instructionId } = req.query;
  let client;

  console.log(`Route /api/driver-legs/${driverId} was accessed with instructionId=${instructionId}`);

  if (!driverId) {
    return res.status(400).json({ error: "Driver ID is required" });
  }

  try {
    console.log("Attempting to connect to database...");
    client = await pool.connect();
    console.log("Successfully connected to database");

    // Build the query with explicit type casting
    let query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.legstatus
      FROM 
        public.legs_m2 l
      WHERE 
        l.driverid = $1::integer
    `;

    const queryParams = [driverId];

    // If instructionId is provided, add it to the query
    if (instructionId) {
      query += ` AND l.m1key = $2::integer`;
      queryParams.push(instructionId);
    }

    query += ` ORDER BY l.date DESC, l.legnumber`;

    console.log("Executing query:", query);
    console.log("Query parameters:", queryParams);

    const result = await client.query(query, queryParams);
    console.log(`Found ${result.rows.length} legs for driver ID ${driverId}`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in /api/driver-legs/:driverId endpoint:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      error: "An error occurred while fetching leg details",
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  } finally {
    if (client) {
      console.log("Releasing database client");
      client.release();
    }
  }
});
// Add middleware to pass the pool to the imported routes
app.use("/expenses", (req, res, next) => {
  req.app.locals.pool = pool;
  next();
}, expensesRoutes);

app.use("/documents", (req, res, next) => {
  req.app.locals.pool = pool;
  next();
}, documentsRoutes);

// Add this to your documents route handler
app.get("/documents/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /documents/${instructionId} was accessed`)

  try {
    // Log the query we're about to execute
    console.log(`Executing query to fetch documents for instruction ID: ${instructionId}`)

    const result = await pool.query("SELECT * FROM documents WHERE m1key = $1", [instructionId])

    // Log the result
    console.log(`Found ${result.rows.length} documents for instruction ID ${instructionId}`)
    res.status(200).json(result.rows)
  } catch (err) {
    console.error(`Error fetching documents for instruction ID ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

async function generateInvoice(instructionId) {
  try {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    // Get month name in uppercase
    const monthNames = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ]
    const monthName = monthNames[currentMonth - 1] // Adjust for 0-based index
    
    // Get the client ID and m1key from the instruction
    const instructionResult = await pool.query(
      "SELECT client, m1key FROM m1_controller WHERE m1key = $1", 
      [instructionId]
    )
    
    if (instructionResult.rows.length === 0) {
      throw new Error(`Instruction with ID ${instructionId} not found`)
    }
    
    const { client: clientId, m1key } = instructionResult.rows[0]
    
    // Get the next invoice number sequence
    const sequenceResult = await pool.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_num FROM 'INV-\\d+-0*(\\d+)') AS INTEGER)), 0) + 1 AS next_invoice_num FROM invoice WHERE invoice_num LIKE $1",
      [`INV-${currentYear}-%`]
    )
    const nextInvoiceNum = sequenceResult.rows[0].next_invoice_num
    
    // Get the next document number sequence
    const docSequenceResult = await pool.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(doc_num FROM 'DOC-0*(\\d+)') AS INTEGER)), 0) + 1 AS next_doc_num FROM invoice"
    )
    const nextDocNum = docSequenceResult.rows[0].next_doc_num
    
    // Format the invoice number, doc number and group ID
    const invoiceNum = `INV-${currentYear}-${nextInvoiceNum}` // No leading zeros
    const docNum = `DOC-${nextDocNum}` // No leading zeros
    const groupId = `${clientId}-${monthName}${currentYear}` // Format as 1-APRIL2025
    
    // Insert the new invoice
    const insertResult = await pool.query(
      "INSERT INTO invoice (clientid, m1key, invoice_num, doc_num, groupid, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ikey",
      [clientId, m1key, invoiceNum, docNum, groupId, currentDate]
    )
    
    return {
      success: true,
      invoiceId: insertResult.rows[0].ikey,
      invoiceNum,
      docNum,
      groupId,
      date: currentDate
    }
  } catch (error) {
    console.error("Error generating invoice:", error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Add this endpoint to your server.js file
app.post("/generate-invoice/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route POST /generate-invoice/${instructionId} was accessed`)

  try {
    const result = await generateInvoice(instructionId)
    
    if (result.success) {
      res.status(201).json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    console.error("Error in invoice generation route:", error)
    res.status(500).json({ 
      success: false, 
      error: "Server error while generating invoice" 
    })
  }
})

// Check if build directory exists before trying to serve static files
const buildPath = path.join(__dirname, "build")
if (fs.existsSync(buildPath)) {
  console.log("Build directory found, serving static files from:", buildPath)
  // Serve static files from the React app
  app.use(express.static(buildPath))

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"))
  })
} else {
  console.log("Build directory not found at:", buildPath)
  console.log("Only API endpoints will be available")

  // Add a fallback route for non-API routes
  app.get("*", (req, res) => {
    // Check if this is an API request
    if (req.url.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" })
    }

    // For non-API requests, return a simple HTML page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Logistics API Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .note { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; }
            code { background-color: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Logistics API Server</h1>
            <div class="note">
              <p>The server is running in API-only mode. The React build directory was not found.</p>
              <p>API endpoints are available at <code>/api/...</code></p>
            </div>
            <p>Available endpoints:</p>
            <ul>
              <li><code>/api/clients</code> - Get all clients</li>
              <li><code>/api/shipment-types</code> - Get all shipment types</li>
              <li><code>/api/instructions</code> - Get all instructions</li>
              <li><code>/api/client-instruction-stats</code> - Get client instruction statistics</li>
              <li><code>/test-connection</code> - Test database connection</li>
            </ul>
          </div>
        </body>
      </html>
    `)
  })
}
app.get("/instructions/driver/:id", async (req, res) => {
  const driverId = req.params.id

  try {
    // Query to get instructions with leg count for a specific driver
    const query = `
      SELECT 
        m1.m1key, 
        m1.pickupdate,
        COUNT(l.legkey) as leg_count
      FROM 
        public.m1_controller m1
      JOIN 
        public.legs_m2 l ON m1.m1key = l.m1key
      WHERE 
        l.driverid = $1
      GROUP BY 
        m1.m1key, m1.pickupdate
      ORDER BY 
        m1.pickupdate DESC
    `

    const result = await pool.query(query, [driverId])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching driver instructions:", error)
    res.status(500).json({ error: "An error occurred while fetching driver instructions" })
  }
})

// Add this route to view leg details for a specific instruction
app.get("/legs/instruction/:id/driver/:driverId", async (req, res) => {
  const instructionId = req.params.id
  const driverId = req.params.driverId

  try {
    const query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.legstatus
      FROM 
        public.legs_m2 l
      WHERE 
        l.m1key = $1 AND l.driverid = $2
      ORDER BY 
        l.legnumber
    `

    const result = await pool.query(query, [instructionId, driverId])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching leg details:", error)
    res.status(500).json({ error: "An error occurred while fetching leg details" })
  }
})

// Get wage details for a driver and instruction
app.get("/wage-details/driver/:driverId/instruction/:instructionId", async (req, res) => {
  const driverId = req.params.driverId
  const instructionId = req.params.instructionId

  try {
    // First get the base salary from the employee table
    const employeeQuery = `
      SELECT base_salary
      FROM public.m5_employee
      WHERE userid = $1
    `

    const employeeResult = await pool.query(employeeQuery, [driverId])
    const baseSalary = employeeResult.rows[0]?.base_salary || 0

    // Get the sum of driver rates for all legs in this instruction
    const legsQuery = `
      SELECT 
        SUM(driverrate) as leg_payments,
        MAX(date) as date
      FROM 
        public.legs_m2
      WHERE 
        driverid = $1 AND m1key = $2
    `

    const legsResult = await pool.query(legsQuery, [driverId, instructionId])
    const legPayments = legsResult.rows[0]?.leg_payments || 0
    const date = legsResult.rows[0]?.date

    // For this example, we'll set bonuses and deductions to 0
    // In a real application, you would calculate these based on your business logic
    const bonuses = 0
    const deductions = 0

    // Calculate total
    const total = baseSalary + legPayments + bonuses - deductions

    res.json({
      base_salary: baseSalary,
      leg_payments: legPayments,
      bonuses: bonuses,
      deductions: deductions,
      total: total,
      date: date,
    })
  } catch (error) {
    console.error("Error fetching wage details:", error)
    res.status(500).json({ error: "An error occurred while fetching wage details" })
  }
})
app.get("/api/driver-instructions/:driverId", async (req, res) => {
  const driverId = req.params.driverId;
  console.log(`Route /api/driver-instructions/${driverId} was accessed`);

  let client;
  try {
    client = await pool.connect();
    
    // This query gets all instructions a driver was involved in, with leg counts
    const query = `
      SELECT 
        m1.m1key, 
        m1.deadline,
        m1.pickupdate,
        COUNT(l.legkey) as leg_count
      FROM 
        public.m1_controller m1
      JOIN 
        public.legs_m2 l ON m1.m1key = l.m1key
      WHERE 
        l.driverid = $1
      GROUP BY 
        m1.m1key, m1.deadline, m1.pickupdate
      ORDER BY 
        COALESCE(m1.deadline, m1.pickupdate) DESC
    `;

    const result = await client.query(query, [driverId]);
    console.log(`Found ${result.rows.length} instructions for driver ID ${driverId}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching driver instructions for driver ID ${driverId}:`, error);
    res.status(500).json({ 
      error: "An error occurred while fetching driver instructions",
      details: error.message
    });
  } finally {
    if (client) client.release();
  }
});
app.get("/api/driver-instructions/:driverId", async (req, res) => {
  const driverId = req.params.driverId
  console.log(`Route /api/driver-instructions/${driverId} was accessed`)

  let client
  try {
    client = await pool.connect()

    // This query gets all instructions a driver was involved in, with leg counts
    const query = `
      SELECT 
        m1.m1key, 
        m1.deadline,
        m1.pickupdate,
        COUNT(l.legkey) as leg_count
      FROM 
        public.m1_controller m1
      JOIN 
        public.legs_m2 l ON m1.m1key = l.m1key
      WHERE 
        l.driverid = $1
      GROUP BY 
        m1.m1key, m1.deadline, m1.pickupdate
      ORDER BY 
        COALESCE(m1.deadline, m1.pickupdate) DESC
    `

    const result = await client.query(query, [driverId])
    console.log(`Found ${result.rows.length} instructions for driver ID ${driverId}`)

    res.json(result.rows)
  } catch (error) {
    console.error(`Error fetching driver instructions for driver ID ${driverId}:`, error)
    res.status(500).json({
      error: "An error occurred while fetching driver instructions",
      details: error.message,
    })
  } finally {
    if (client) client.release()
  }
})
app.get("/api/employee/:id", async (req, res) => {
  // Extract the ID from the URL parameter, removing any colons if present
  console.log('Employee route hit with ID:', req.params.id);
  const id = req.params.id.split(':')[0]; // This will handle IDs like "1:1" by taking just the "1"
  let client;

  console.log(`Route /api/employee/${id} was accessed`);

  try {
    client = await pool.connect();
    
    // Query to get employee details including role name
    const query = `
      SELECT 
        e.userid, 
        e.name, 
        e.surname, 
        e.cellnum, 
        e.base_salary,
        r.rolename
      FROM 
        public.m5_employee e
      JOIN 
        public.roles r ON e.roleid = r.roleid
      WHERE 
        e.userid = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    console.log(`Found employee data for ID ${id}:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching employee data for ID ${id}:`, error);
    res.status(500).json({
      error: "An error occurred while fetching employee data",
      message: error.message
    });
  } finally {
    if (client) client.release();
  }
});






app.listen(PORT, async () => {
  try {
    // Test database connection on startup
    const dbTest = await testConnection()
    types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));
    types.setTypeParser(types.builtins.FLOAT8, (value) => parseFloat(value));
    await generateMonthlyStatements()
    if (dbTest.success) {
      console.log(`✅ Database Connected Successfully at ${dbTest.time}`)
    } else {
      console.error(`❌ Database Connection Failed: ${dbTest.error}`)
    }
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`API endpoints available at http://localhost:${PORT}/api/`)
  } catch (err) {
    console.error("Server startup error:", err)
  }
})

// Export the app for testing purposes
export default app