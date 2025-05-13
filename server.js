import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import expressSession from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client, GetObjectCommand,DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import AWS from "aws-sdk"; // Only needed if you still use AWS SDK v2 for other things
import puppeteer from "puppeteer";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


// PostgreSQL setup using destructuring from pkg
import pkg from "pg";
const { Pool, types } = pkg;


// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey) 

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
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value))
types.setTypeParser(types.builtins.FLOAT8, (value) => parseFloat(value))
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
        surnameee: "User",
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

app.use('/uploads', express.static('uploads'))

app.post("/api/payments/:clientId/upload", verifyToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { clientId } = req.params
    const { amount, fileupload } = req.body

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be a number",
      })
    }

    if (!fileupload) {
      return res.status(400).json({
        success: false,
        message: "Payment date (fileupload) is required",
      })
    }

    const queryText = `
      INSERT INTO payment_m3 (clientid, amount, filename, fileupload)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `
    const queryParams = [clientId, amount, null, fileupload] // filename is null since no file upload

    const result = await query(queryText, queryParams)
    console.log(`Inserted payment for client ${clientId}:`, result.rows[0])

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    console.error(`Error uploading payment for client ${clientId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})


app.get("/api/payments/:clientId/:paymentId", verifyToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      });
    }

    const { clientId, paymentId } = req.params;
    console.log(`Fetching payment ${paymentId} for client ${clientId}`);

    const queryText = `
      SELECT 
        fileupload,
        amount,
        filename
      FROM 
        payment_m3
      WHERE 
        clientid = $1 AND paykey = $2
    `;
    const queryParams = [clientId, paymentId];

    const result = await query(queryText, queryParams);
    console.log(`Query returned ${result.rows.length} payment for client ${clientId}, payment ${paymentId}`);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = result.rows[0];
    payment.fileurl = payment.filename ? `${req.protocol}://${req.get('host')}/uploads/${payment.filename}` : null;

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(`Error fetching payment ${paymentId} for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});

// Updated endpoint for fetching client payments
app.get("/api/payments/:clientId", verifyToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { clientId } = req.params
    const { year, month } = req.query

    console.log(`Fetching payments for client ${clientId} with query:`, req.query)

    let queryText = `
      SELECT 
      paykey,
        fileupload,
        amount,
        filename
      FROM 
        payment_m3
      WHERE 
        clientid = $1
    `
    const queryParams = [clientId]
    let paramIndex = 2

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM fileupload) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM fileupload) = $${paramIndex}`
      queryParams.push(month)
      paramIndex++
    }

    queryText += ` ORDER BY fileupload DESC`

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} payments for client ${clientId}`)

    // Map the results to include the file URL
    const payments = result.rows.map(payment => ({
      ...payment,
      fileurl: payment.filename ? `${req.protocol}://${req.get('host')}/uploads/${payment.filename}` : null
    }))

    res.json({
      success: true,
      data: payments,
    })
  } catch (error) {
    console.error(`Error fetching payments for client ${clientId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

// GET all completed instructions for invoices
app.get("/api/invoices/completed", verifyToken, async (req, res) => {
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
app.get("/api/invoices/:id", verifyToken, async (req, res) => {
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
  console.log("Starting monthly statement generation process...")

  const today = new Date() // 2025-04-11
  const currentMonth = today.getMonth() // 3 (April)
  const currentYear = today.getFullYear() // 2025
  const generationDate = new Date(currentYear, currentMonth, 1, 12, 0, 0)
  const formattedGenDate = generationDate.toISOString().split("T")[0]

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1 // 2 (March)
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear // 2025

  const startDate = new Date(previousYear, previousMonth, 1, 12, 0, 0) // Set to noon
  const endDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0) // Set to noon

  const formattedStartDate = startDate.toISOString().split("T")[0] // '2025-03-01'
  const formattedEndDate = endDate.toISOString().split("T")[0] // '2025-03-31'

  console.log(`Today: ${today.toISOString().split("T")[0]}`)
  console.log(`Current Month: ${currentMonth}, Current Year: ${currentYear}`)
  console.log(`Previous Month: ${previousMonth}, Previous Year: ${previousYear}`)
  console.log(`Generating statements for invoices confirmed between ${formattedStartDate} and ${formattedEndDate}`)

  let dbClient
  try {
    dbClient = await pool.connect()
    await dbClient.query("BEGIN")

    const clientsResult = await query("SELECT m5clientkey FROM m5_client", [])
    const clients = clientsResult.rows

    for (const client of clients) {
      const clientId = client.m5clientkey

      const invoicesQuery = `
        SELECT 
          SUM(m1.total_cost) as total_amount,
          i.groupid as invoice_group_id
        FROM invoice i
        JOIN m1_controller m1 ON i.m1key = m1.m1key
        WHERE i.clientid = $1 AND i.date BETWEEN $2 AND $3
        GROUP BY i.groupid
      `
      const invoicesResult = await dbClient.query(invoicesQuery, [clientId, formattedStartDate, formattedEndDate])
      const invoices = invoicesResult.rows

      if (invoices.length === 0) {
        console.log(
          `Client ${clientId}: No confirmed invoices found between ${formattedStartDate} and ${formattedEndDate}, skipping`,
        )
        continue
      }

      for (const invoice of invoices) {
        const totalAmount = invoice.total_amount
        const invoice_group_id = invoice.invoice_group_id

        const existingStatement = await dbClient.query(
          "SELECT statement_key FROM statements WHERE groupid = $1 AND clientid = $2",
          [invoice_group_id, clientId],
        )

        if (existingStatement.rows.length > 0) {
          console.log(
            `Client ${clientId}: Statement #${existingStatement.rows[0].statement_key} already exists for group ${invoice_group_id}, skipping`,
          )
          continue
        }

        const agingQuery = `
          SELECT aging_key, current, "30days", "60days", "90days"
          FROM aging_analysis
          WHERE clientid = $1
          ORDER BY aging_key DESC
          LIMIT 1
        `
        const agingResult = await dbClient.query(agingQuery, [clientId])
        let newCurrent, new30days, new60days, new90days

        if (agingResult.rows.length > 0) {
          const previousAging = agingResult.rows[0]
          newCurrent = Math.max(Number.parseFloat(totalAmount) || 0, 0)
          new30days = Math.max(Number.parseFloat(previousAging.current) || 0, 0)
          new60days = Math.max(Number.parseFloat(previousAging["30days"]) || 0, 0)
          new90days = Math.max(
            (Number.parseFloat(previousAging["60days"]) || 0) + (Number.parseFloat(previousAging["90days"]) || 0),
            0,
          )
        } else {
          newCurrent = Math.max(Number.parseFloat(totalAmount) || 0, 0)
          new30days = 0
          new60days = 0
          new90days = 0
        }

        const insertAgingQuery = `
          INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING aging_key
        `
        const agingValues = [clientId, newCurrent, new30days, new60days, new90days]
        const agingInsertResult = await dbClient.query(insertAgingQuery, agingValues)
        const newAgingId = agingInsertResult.rows[0].aging_key

        const insertStatementQuery = `
          INSERT INTO statements (groupid, generation_date, clientid, agingid)
          VALUES ($1, $4, $2, $3)
          RETURNING statement_key
        `
        const statementResult = await dbClient.query(insertStatementQuery, [
          invoice_group_id,
          clientId,
          newAgingId,
          formattedGenDate,
        ])
        const newStatementId = statementResult.rows[0].statement_key

        console.log(`Generated statement #${newStatementId} for group ${invoice_group_id}`)
      }

      await dbClient.query("COMMIT")
    }
  } catch (error) {
    console.error("Error in statement generation:", error)
    if (dbClient) {
      await dbClient.query("ROLLBACK")
    }
  } finally {
    if (dbClient) {
      dbClient.release()
    }
    console.log("Monthly statement generation process completed.")
  }
}
// GET statements for a specific client
app.get("/api/statements/:clientId", verifyToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { clientId } = req.params
    const { year, month } = req.query

    console.log(`Fetching statements for client ${clientId} with query:`, req.query)

    let queryText = `
      SELECT 
        statement_key,
        generation_date
      FROM 
        statements
      WHERE 
        clientid = $1
    `
    const queryParams = [clientId]
    let paramIndex = 2

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM generation_date) = $${paramIndex}`
      queryParams.push(year)
      paramIndex++
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM generation_date) = $${paramIndex}`
      queryParams.push(month)
      paramIndex++
    }

    queryText += ` ORDER BY generation_date DESC`

    const result = await query(queryText, queryParams)
    console.log(`Query returned ${result.rows.length} statements for client ${clientId}`)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error(`Error fetching statements for client ${clientId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})

app.get("/api/statement/:statementId", verifyToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        message: "Database connection not established. Please try again later.",
      })
    }

    const { statementId } = req.params
    console.log(`Fetching statement details for statement ${statementId}`)

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
    `
    const result = await query(queryText, [statementId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Statement not found",
      })
    }

    // Group data for frontend
    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      company_name: result.rows[0].companyname,
      client: {
        id: result.rows[0].clientid,
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
      },
      aging: {
        current: Number.parseFloat(result.rows[0].current || 0),
        "30days": Number.parseFloat(result.rows[0]["30days"] || 0),
        "60days": Number.parseFloat(result.rows[0]["60days"] || 0),
        "90days": Number.parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: result.rows
        .filter((row) => row.ikey !== null) // Filter out rows with no invoice
        .map((row) => ({
          ikey: row.ikey,
          date: row.invoice_date,
          amount: Number.parseFloat(row.invoice_amount || 0),
          task: row.invoice_task,
          invoice_num: row.invoice_num,
        })),
    }

    console.log(`Fetched statement ${statementId} with ${statementData.invoices.length} invoices`)
    res.json({
      success: true,
      data: statementData,
    })
  } catch (error) {
    console.error(`Error fetching statement ${statementId}:`, error)
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    })
  }
})
// Schedule the statement generation to run on the 2nd day of each month at 1:00 AM
cron.schedule("0 1 1 * *", async () => {
  console.log("Running scheduled statement generation task")
  await generateMonthlyStatements()
})

// GET all instructions for a specific client
app.get("/api/client-instructions/:clientId", verifyToken, async (req, res) => {
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
    const formattedResults = result.rows.map((row) => ({
      ...row,
      pickupdate: row.pickupdate ? new Date(row.pickupdate).toISOString().split("T")[0] : null,
      invoice_date: row.invoice_date ? new Date(row.invoice_date).toISOString().split("T")[0] : null,
      has_invoice: !!row.ikey,
      has_statement: !!row.statement_id,
      total_cost: Number.parseFloat(row.total_cost || 0).toFixed(2),
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
app.get("/api/employee/:id", async (req, res) => {
  // Extract the ID from the URL parameter, removing any colons if present
  console.log('Raw ID from params:', req.params.id);
  const id = req.params.id.split(':')[0];
  console.log('Cleaned ID:', id);
  
  let client;

  console.log(`Route /api/employee/${id} was accessed`);

  try {
    client = await pool.connect();
    
    // First check if the employee exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM public.m5_employee
      WHERE userid = $1
    `;
    
    const checkResult = await client.query(checkQuery, [id]);
    const employeeExists = checkResult.rows[0].count > 0;
    
    if (!employeeExists) {
      console.log(`No employee found with ID ${id}`);
      return res.status(404).json({ 
        error: "Employee not found",
        message: `No employee found with ID ${id}`
      });
    }
    
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
      LEFT JOIN 
        public.roles r ON e.roleid = r.roleid
      WHERE 
        e.userid = $1
    `;
    
    const result = await client.query(query, [id]);
    
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
app.get("/api/employee-deductions/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  
  console.log(`Route /api/employee-deductions/${employeeId} was accessed with month=${month}, year=${year}`);
  
  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required query parameters" });
  }
  
  let client;
  try {
    client = await pool.connect();
    
    // Convert month name to month number (1-based)
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = monthNames.indexOf(month) + 1;
    
    if (monthIndex === 0) {
      return res.status(400).json({ error: "Invalid month name" });
    }
    
    // Query to get deductions data for the employee for the specified month and year
    const query = `
      SELECT 
        deduction_income_tax, 
        deduction_other_deductions, 
        deduction_uif,
        deduction_bonus, 
        deduction_savings, 
        deduction_loan, 
        deduction_damage,
        total_deductions
      FROM 
        wages
      WHERE 
        employeeid = $1 
        AND EXTRACT(MONTH FROM employee_date) = $2
        AND EXTRACT(YEAR FROM employee_date) = $3
      ORDER BY 
        employee_date DESC
      LIMIT 1
    `;
    
    const result = await client.query(query, [employeeId, monthIndex, year]);
    
    if (result.rows.length === 0) {
      // If no data found, return default values instead of 404
      return res.json({
        deduction_income_tax: 0,
        deduction_other_deductions: 0,
        deduction_uif: 0,
        deduction_bonus: 0,
        deduction_savings: 0,
        deduction_loan: 0,
        deduction_damage: 0,
        total_deductions: 0
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching deductions data for employee ID ${employeeId}:`, error);
    // Return default values on error instead of error status
    return res.json({
      deduction_income_tax: 1500,
      deduction_other_deductions: 300,
      deduction_uif: 200,
      deduction_bonus: 0,
      deduction_savings: 0,
      deduction_loan: 0,
      deduction_damage: 0,
      total_deductions: 2000
    });
  } finally {
    if (client) client.release();
  }
});
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
    console.error("Error reactivating company:", err)
    res.status(500).json({ error: "Failed to reactivate company" })
  } finally {
    if (client) client.release()
  }
})

// Reactivate a company and all its users
app.post("/api/company/reactivate", verifyToken, async (req, res) => {
  const { company_reg_num } = req.body;

  if (!company_reg_num) {
    return res.status(400).json({ error: "Company registration number is required" });
  }

  if (req.user.roleid !== 7) {
    return res.status(403).json({ message: "You don't have permission to reactivate companies" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING *",
      [company_reg_num]
    );

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Company not found" });
    }

    await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query(
      "UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query("COMMIT");

    res.json({
      message: "Company and all associated users have been reactivated",
      company: companyAdminResult.rows[0].companyname,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reactivating company:", err);
    res.status(500).json({ error: "Failed to reactivate company" });
  } finally {
    client.release(); // Always release the client
  }
});

// ------------------------------------------Module 0 Ends here---------------------------------- //

/ ------------------------------------------Module 5 Starts here---------------------------------- //  

// ---- Employee Management Routes ---- //

// Get all employees
app.get("/api/employees", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        e.*,
        r.rolename,
        edh.deduction_income_tax,
        edh.deduction_other_deductions,
        edh.deduction_uif,
        edh.deduction_bonus,
        edh.deduction_savings,
        edh.deduction_loan,
        edh.deduction_damage,
        edh.effective_date
      FROM m5_employee e
      JOIN roles r
        ON e.roleid = r.roleid
      LEFT JOIN employee_deduction_history edh
        ON e.userid = edh.employeeid
      WHERE e.roleid != 6
      ORDER BY e.userid
    `;

    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  } finally {
    client.release();
  }
});

// ----- AWS S3 and Multer-S3 Setup for Employee Uploads ----- //

// Create an S3 client using AWS SDK v3
const s3Client2 = new S3Client({
  region: process.env.AWS_REGION, 
  credentials: {
    accessKeyId: process.env.Employee_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Employee_AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to upload files to S3 using multer-s3-v3.
const upload1 = multer({
  storage: multerS3({
    s3: s3Client2, // Use the AWS SDK v3 client
    bucket: process.env.Employee_AWS_BUCKET_NAME, // e.g., 'sherwyn-whizz-away'
    // Do not include ACL if your bucket enforces no ACLs.
    key: (req, file, cb) => {
      // Extract employee number and name from the request body.
      // Ensure these fields are sent as part of your form data.
      const employeeNum = req.body.employeenum || "unknown";
      const employeeName = req.body.name || "unknown";
    
      // Optionally sanitize the employee name (remove spaces, etc.)
      const sanitizedEmployeeName = employeeName.trim().replace(/\s+/g, "_");
    
      // Create the folder name using employeenum and the sanitized name.
      const folderName = `${employeeNum}_${sanitizedEmployeeName}`;
    
      // Generate a unique file name for the uploaded file.
      const uniqueFileName = `${Date.now()}_${file.originalname}`;
    
      // Build the complete key (folder path + file name).
      const key = `Employees/${folderName}/${uniqueFileName}`;
    
      console.log("Uploading to S3 key:", key);
      cb(null, key);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDFs are allowed"), false);
  },
});

//updated 8 May

app.get("/api/employees/check-email-existence", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;  // Get email from query params
    // Query to check if email already exists
    const result = await pool.query("SELECT 1 FROM m5_employee WHERE email = $1", [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error("Error checking email existence:", err);
    res.status(500).json({ error: "Failed to check email existence" });
  }
});
// Create a new employee
app.post(
  "/api/employees",
  verifyToken,
  upload1.array("documents", 3),
  async (req, res) => {
    const client = await pool.connect();
    try {
      console.log("req.files:", req.files);
      console.log("req.body:", req.body);

      const {
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        password,
        base_salary,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage
        // loan_amount
      } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const company_reg_num = req.user.company_reg_num;
      // const company_reg_num = req.session.user.company_reg_num; // Updated to use session variable
      if (!company_reg_num) {
        return res.status(400).json({ error: "Missing company registration number." });
      }

      const urls = (req.files || []).map((f) => f.location);
      while (urls.length < 3) urls.push(null);

      await client.query("BEGIN");

      const hashedPassword = await bcrypt.hash(password, 10);
      const deductionDate = new Date();

      const insertEmployeeQuery = `
        INSERT INTO m5_employee (
          name, surname, telephonenum, cellnum, employeenum,
          roleid, email, password, base_salary, company_reg_num, status,
          document_url1, document_url2, document_url3
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true,
          $11, $12, $13
        ) RETURNING *
      `;

      const insertValues = [
        name, surname, telephonenum, cellnum, employeenum,
        roleid, email, hashedPassword, base_salary, company_reg_num,
        urls[0], urls[1], urls[2]
      ];

      const result = await client.query(insertEmployeeQuery, insertValues);
      const newEmployee = result.rows[0];

      const insertHistoryQuery = `
        INSERT INTO employee_deduction_history (
          employeeid, effective_date, income_tax_rate,
          deduction_income_tax, deduction_other_deductions,
          deduction_uif, deduction_bonus, deduction_savings,
          deduction_loan, deduction_damage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const historyValues = [
        newEmployee.userid, deductionDate, 0,
        parseFloat(deduction_income_tax || 0),
        parseFloat(deduction_other_deductions || 0),
        parseFloat(deduction_uif || 0),
        parseFloat(deduction_bonus || 0),
        parseFloat(deduction_savings || 0),
        parseFloat(deduction_loan || 0),
        parseFloat(deduction_damage || 0),
      ];

      await client.query(insertHistoryQuery, historyValues);

      await client.query("COMMIT");
      return res.status(201).json(newEmployee);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in /api/employees POST:", err);
      return res.status(500).json({ error: "Failed to create employee" });
    } finally {
      client.release();
    }
  }
);

//11 May
// Update an employee
// This endpoint allows updating an employee's details, including their documents.
app.put(
  "/api/employees/:id",
  verifyToken,
  upload1.array("documents", 3),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const id = req.params.id;
      const {
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        password,
        base_salary,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage
      } = req.body;
      
      // Convert newly uploaded files into an array of URLs.
      const newFileUrls = (req.files || []).map((f) => f.location);
      
      // Fetch the employee's existing document URLs from the database.
      const existingResult = await client.query(
        "SELECT document_url1, document_url2, document_url3 FROM m5_employee WHERE userid = $1",
        [id]
      );
      if (existingResult.rows.length === 0) {
        throw new Error("Employee not found");
      }
      
      // Grab the existing document URLs.
      let { document_url1, document_url2, document_url3 } = existingResult.rows[0];
      let currentDocs = [document_url1, document_url2, document_url3];

      // Logic to merge new file uploads with existing document slots:
      // First, fill available (null) slots using the new file URLs.
      let newIndex = 0;
      for (let i = 0; i < currentDocs.length && newIndex < newFileUrls.length; i++) {
        if (!currentDocs[i]) {
          currentDocs[i] = newFileUrls[newIndex];
          newIndex++;
        }
      }
      
      // If all three slots are already filled yet new file uploads were provided,
      // then overwrite documents starting from the first slot with the additional files.
      if (newIndex < newFileUrls.length) {
        for (let i = 0; i < currentDocs.length && newIndex < newFileUrls.length; i++) {
          // Overwrite from the beginning; adjust this behavior as needed
          currentDocs[i] = newFileUrls[newIndex];
          newIndex++;
        }
      }
      
      // Update document URLs after merging.
      [document_url1, document_url2, document_url3] = currentDocs;
      
      await client.query("BEGIN");

      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      } else {
        const { rows } = await client.query(
          "SELECT password FROM m5_employee WHERE userid = $1",
          [id]
        );
        if (rows.length === 0) throw new Error("Employee not found");
        hashedPassword = rows[0].password;
      }

      const updateEmpQuery = `
        UPDATE m5_employee SET
          name = $1, surname = $2, telephonenum = $3, cellnum = $4, employeenum = $5,
          roleid = $6, email = $7, password = $8, base_salary = $9,
          document_url1 = $10, document_url2 = $11, document_url3 = $12
        WHERE userid = $13
        RETURNING *
      `;
      const updateValues = [
        name, surname, telephonenum, cellnum, employeenum,
        roleid, email, hashedPassword, base_salary,
        document_url1, document_url2, document_url3, id
      ];

      const result = await client.query(updateEmpQuery, updateValues);
      const updatedEmployee = result.rows[0];

      // Prepare new deduction history values.
      const newValues = {
        income_tax: parseFloat(deduction_income_tax || 0),
        other: parseFloat(deduction_other_deductions || 0),
        uif: parseFloat(deduction_uif || 0),
        bonus: parseFloat(deduction_bonus || 0),
        savings: parseFloat(deduction_savings || 0),
        loan: parseFloat(deduction_loan || 0),
        damage: parseFloat(deduction_damage || 0),
      };

      // Get latest deduction history, then insert new history if values have changed.
      const { rows: lastRows } = await client.query(
        `SELECT * FROM employee_deduction_history
         WHERE employeeid = $1
         ORDER BY effective_date DESC
         LIMIT 1`,
        [id]
      );
      const last = lastRows[0];
      const isDuplicate =
        last &&
        newValues.income_tax === parseFloat(last.deduction_income_tax) &&
        newValues.other === parseFloat(last.deduction_other_deductions) &&
        newValues.uif === parseFloat(last.deduction_uif) &&
        newValues.bonus === parseFloat(last.deduction_bonus) &&
        newValues.savings === parseFloat(last.deduction_savings) &&
        newValues.loan === parseFloat(last.deduction_loan) &&
        newValues.damage === parseFloat(last.deduction_damage);

      if (!isDuplicate) {
        const insertHistoryQuery = `
          INSERT INTO employee_deduction_history (
            employeeid, effective_date, income_tax_rate,
            deduction_income_tax, deduction_other_deductions,
            deduction_uif, deduction_bonus, deduction_savings,
            deduction_loan, deduction_damage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        const deductionDate = new Date();
        const historyValues = [
          updatedEmployee.userid,
          deductionDate,
          0,
          newValues.income_tax,
          newValues.other,
          newValues.uif,
          newValues.bonus,
          newValues.savings,
          newValues.loan,
          newValues.damage
        ];
        await client.query(insertHistoryQuery, historyValues);
      }

      await client.query("COMMIT");
      res.json(updatedEmployee);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error updating employee:", err);
      res.status(500).json({ error: err.message || "Failed to update employee" });
    } finally {
      client.release();
    }
  }
);

// Toggle employee status (enable/disable)
app.put("/api/employees/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if employee exists
    const checkResult = await pool.query("SELECT * FROM m5_employee WHERE userid = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update the status - using pool.query directly for simple queries
    const updateResult = await pool.query(
      "UPDATE m5_employee SET status = $1 WHERE userid = $2 RETURNING *", 
      [status, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(`Error toggling employee ${req.params.id} status:`, err);
    res.status(500).json({ error: "Failed to toggle employee status" });
  }
});

// -----------------------------
// 1. Get a Specific Employee's Details
// -----------------------------
// This endpoint retrieves an employee's details, including their deduction history and signed URLs for documents.
app.get('/api/employees/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Fetch employee record from m5_employee
    const result = await client.query(
      'SELECT * FROM m5_employee WHERE userid = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    let employee = result.rows[0];

    // Extract document URLs from the employee record
    const { document_url1, document_url2, document_url3 } = employee;

    // Helper: Extract and decode the S3 key from the full URL.
    const extractKeyFromUrl = (url) => {
      if (!url) return null;
      try {
        // Create a URL object to access the pathname and decode any encoded characters.
        return decodeURIComponent(new URL(url).pathname.substring(1));
      } catch (error) {
        // If there's an error, assume the URL is already a key.
        return url;
      }
    };

    // Generate signed URLs for each document if present.
    const signedUrls = await Promise.all(
      [document_url1, document_url2, document_url3].map(async (url) => {
        if (!url) return null;
        const key = extractKeyFromUrl(url);
        const command = new GetObjectCommand({
          Bucket: process.env.Employee_AWS_BUCKET_NAME,
          Key: key,
        });
        return await getSignedUrl(s3Client2, command, { expiresIn: 3600 });
      })
    );

    // Replace the stored document URLs with their signed URL versions.
    employee.document_url1 = signedUrls[0];
    employee.document_url2 = signedUrls[1];
    employee.document_url3 = signedUrls[2];

    // Fetch the deduction history for this employee from employee_deduction_history.
    const historyResult = await client.query(
      'SELECT * FROM employee_deduction_history WHERE employeeid = $1 ORDER BY effective_date DESC, history_id DESC',
      [id]
    );
    
    // Add the fetched history as a new property on the employee object.
    employee.deductionHistory = historyResult.rows;

    // Return the combined employee data.
    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee details:", err);
    res.status(500).json({ error: "Failed to fetch employee details" });
  } finally {
    client.release();
  }
});

// -----------------------------
// 2. DELETE a Specific Employee Document
// -----------------------------
app.post('/api/employees/delete-doc', verifyToken, async (req, res) => {
  const { employeeId, url } = req.body;
  if (!employeeId || !url) {
    return res.status(400).json({ message: 'Missing employee ID or document URL' });
  }
  
  const client = await pool.connect();
  try {
    // Extract S3 key from the provided URL.
    // If the URL is a complete URL, we decode its pathname;
    // if it's already just a key, we use it as-is.
    let s3Key;
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1));
    } catch (error) {
      s3Key = url;
    }
    console.log('S3 Key extracted from URL:', s3Key);

    // Delete the document from S3 using s3Client2.
    await s3Client2.send(new DeleteObjectCommand({
      Bucket: process.env.Employee_AWS_BUCKET_NAME,
      Key: s3Key,
    }));

    // Fetch the stored document URLs from the database.
    const { rows } = await client.query(
      'SELECT document_url1, document_url2, document_url3 FROM m5_employee WHERE userid = $1',
      [employeeId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let updateField = null;
    // Loop through the document URL fields to find a match.
    for (const field of ['document_url1', 'document_url2', 'document_url3']) {
      const storedValue = rows[0][field];
      if (storedValue) {
        let storedKey;
        try {
          storedKey = decodeURIComponent(new URL(storedValue).pathname.substring(1));
        } catch (error) {
          storedKey = storedValue;
        }
        console.log(`Comparing stored key for ${field}: ${storedKey} with extracted key: ${s3Key}`);
        if (storedKey === s3Key) {
          updateField = field;
          break;
        }
      }
    }

    if (updateField) {
      // Update the employee record to remove the document reference.
      await client.query(`UPDATE m5_employee SET ${updateField} = NULL WHERE userid = $1`, [employeeId]);
      console.log(`Updated field ${updateField} to NULL in the database.`);
    } else {
      console.log('No matching document URL found in the database.');
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Failed to delete employee document:', error);
    res.status(500).json({ message: 'Server error during document deletion' });
  } finally {
    client.release();
  }
});



// ---- Client Management Routes ---- //

// Get all clients
// This endpoint retrieves all clients from the m5_client table.
// It uses the verifyToken middleware to ensure the user is authenticated.    
app.get("/api/m5Clients/check-email-existence", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;  // Get email from query params
    // Query to check if email already exists
    const result = await pool.query("SELECT 1 FROM m5_client WHERE email = $1", [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error("Error checking email existence:", err);
    res.status(500).json({ error: "Failed to check email existence" });
  }
});

// Get all clients
// This endpoint retrieves all clients from the m5_client table.
app.get("/api/m5Clients", verifyToken, async (req, res) => {
  try {
    // Simple query using pool.query directly
    const query = "SELECT * FROM m5_client ORDER BY m5clientkey";
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// Get client by ID
// This endpoint retrieves a specific client by their ID from the m5_client table.
app.get("/api/m5Clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Simple query using pool.query directly
    const query = "SELECT * FROM m5_client WHERE m5clientkey = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching client ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// Create new client
// This endpoint creates a new client in the m5_client table.
app.post("/api/m5Clients", verifyToken, async (req, res) => {
  try {
    // Renamed the variable to avoid conflict with the database client
    const {
      client: clientName,  // Renamed to clientName
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO m5_client (
        client, representative, companyaddress, suburb, postalcode, 
        email, client_reg_num, cellnum, vatregno, city, streetaddress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        clientName,  // Use the renamed variable
        representative,
        companyaddress,
        suburb,
        postalcode,
        email,
        client_reg_num,
        cellnum,
        vatregno,
        city,
        streetaddress,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update client
app.put("/api/m5Clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
    } = req.body;

    const query = `
      UPDATE m5_client
      SET client = $1, representative = $2, companyaddress = $3, suburb = $4,
          postalcode = $5, email = $6, client_reg_num = $7, cellnum = $8,
          vatregno = $9, city = $10, streetaddress = $11
      WHERE m5clientkey = $12
      RETURNING *`;
      
    const values = [
      clientName, representative, companyaddress, suburb, postalcode, email,
      client_reg_num, cellnum, vatregno, city, streetaddress, id,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating client ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete client
app.delete("/api/m5Clients/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const checkResult = await pool.query("SELECT * FROM m5_client WHERE m5clientkey = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Delete the client
    await pool.query("DELETE FROM m5_client WHERE m5clientkey = $1", [id]);

    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error(`Error deleting client ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete client" });
  }
}); 

// ---- Truck Management Routes ---- //

// Get all trucks
// This endpoint retrieves all trucks from the m5_trucks table.
app.get("/api/trucks", verifyToken, async (req, res) => {
  try {
    // Simple query using pool.query directly
    const query = "SELECT * FROM m5_trucks ORDER BY m5truckskey";
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching trucks:", err);
    res.status(500).json({ error: "Failed to fetch trucks" });
  }
});

// S3 client setup
// Create an S3 client using AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.Trucks_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Trucks_AWS_SECRET_ACCESS_KEY,
  },
});

// Multer S3 setup
// Configure multer to upload files to S3 using multer-s3-v3.
const upload2 = multer({
  storage: multerS3({
    s3: s3Client, // using the v3 client from @aws-sdk/client-s3
    bucket: process.env.Trucks_AWS_BUCKET_NAME, // your bucket name
    key: (req, file, cb) => {
      // In the form data, ensure 'truckregnum' is provided.
      const truckregnum = req.body.truckregnum || 'default';
      const uniqueName = `${Date.now()}_${file.originalname}`;
      // Files are stored under a folder named after truckregnum.
      cb(null, `Trucks/${truckregnum}/${uniqueName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    // Allow only PDF files.
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only PDF documents are allowed!'), false);
    }
  },
});

// Generate a signed URL
// This function generates a signed URL for accessing S3 objects.
// It uses the AWS SDK v3's getSignedUrl function.
const generateSignedUrl = async (key) => {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: process.env.Trucks_AWS_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Valid for 1 hour
};

// Route to fetch truck details
// This endpoint retrieves a specific truck by its ID from the m5_trucks table.
// It also generates signed URLs for the truck's documents.
app.get('/api/trucks/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Fetch the truck record by m5truckskey (or id)
    const result = await client.query(
      `SELECT * FROM m5_trucks WHERE m5truckskey = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const truck = result.rows[0];
    const { document_url1, document_url2, document_url3 } = truck;

    // Dynamically generate signed URLs for each document using the stored S3 keys
    truck.document_url1 = await generateSignedUrl(document_url1);
    truck.document_url2 = await generateSignedUrl(document_url2);
    truck.document_url3 = await generateSignedUrl(document_url3);

    res.json(truck);
  } catch (err) {
    console.error("Error fetching truck details:", err);
    res.status(500).json({ error: "Failed to fetch truck details" });
  } finally {
    client.release();
  }
});

// Upload new truck
// This endpoint allows uploading a new truck and its associated documents.
// It uses the multer-s3 middleware to handle file uploads directly to S3.
app.post('/api/trucks', verifyToken, upload2.array('documents', 3), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
    } = req.body;

    // Map the uploaded files to their S3 keys (not the full URL)
    const fileKeys = req.files && req.files.length
      ? req.files.map(file => file.key) // Use file.key instead of file.location
      : [];

    // Map keys to their corresponding database columns.
    const document_url1 = fileKeys[0] || null;
    const document_url2 = fileKeys[1] || null;
    const document_url3 = fileKeys[2] || null;

    // Insert truck and document details in the database
    const result = await client.query(
      `INSERT INTO m5_trucks (
         truckregnum,
         trailersize,
         truckpurchasedate,
         year,
         model,
         purchase_price,
         current_evaluation,
         vin_num,
         is_subcontractor,
         document_url1,
         document_url2,
         document_url3
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
        document_url1,
        document_url2,
        document_url3,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating truck:", err);
    res.status(500).json({ error: "Failed to create truck" });
  } finally {
    client.release();
  }
});

// Update truck
app.put("/api/trucks/:id", verifyToken, upload2.array('documents', 3), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor
    } = req.body;

    const newFiles = req.files || [];
    console.log("📝 Uploaded Files:", newFiles);

    // Fetch existing documents from DB
    const existingResult = await client.query(
      `SELECT document_url1, document_url2, document_url3 FROM m5_trucks WHERE m5truckskey = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Truck not found" });
    }

    let { document_url1, document_url2, document_url3 } = existingResult.rows[0];
    const existingDocs = [document_url1, document_url2, document_url3];
    const newDocKeys = newFiles.map(file => file.key);

    console.log("📂 Existing S3 keys in DB:", existingDocs);
    console.log("📥 New S3 keys to be inserted:", newDocKeys);

    // Overwrite logic only if all 3 are already filled
    if (existingDocs.filter(Boolean).length >= 3) {
      for (const key of existingDocs) {
        if (key) {
          console.log(`🗑️ Deleting from S3: ${key}`);
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.Trucks_AWS_BUCKET_NAME,
            Key: key
          }));
        }
      }

      document_url1 = newDocKeys[0] || null;
      document_url2 = newDocKeys[1] || null;
      document_url3 = newDocKeys[2] || null;
    } else {
      // Fill available slots without overwriting
      let docIndex = 0;
      const slots = [document_url1, document_url2, document_url3];
      for (let i = 0; i < slots.length && docIndex < newDocKeys.length; i++) {
        if (!slots[i]) {
          slots[i] = newDocKeys[docIndex];
          docIndex++;
        }
      }

      // Update final values
      [document_url1, document_url2, document_url3] = slots;
    }

    const updateResult = await client.query(`
      UPDATE m5_trucks SET
        truckregnum = $1,
        trailersize = $2,
        truckpurchasedate = $3,
        year = $4,
        model = $5,
        purchase_price = $6,
        current_evaluation = $7,
        vin_num = $8,
        is_subcontractor = $9,
        document_url1 = $10,
        document_url2 = $11,
        document_url3 = $12
      WHERE m5truckskey = $13
      RETURNING *
    `, [
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
      document_url1,
      document_url2,
      document_url3,
      id
    ]);

    console.log("✅ Truck updated with proper document slotting");
    res.json(updateResult.rows[0]);

  } catch (err) {
    console.error("❌ Error updating truck:", err);
    res.status(500).json({ error: "Failed to update truck" });
  } finally {
    client.release();
  }
});

// Route to delete a document from S3 and update DB
app.post('/api/trucks/delete-doc', verifyToken, async (req, res) => {
  const { truckId, url } = req.body;
  const client = await pool.connect();

  if (!truckId || !url) {
    return res.status(400).json({ message: 'Missing truck ID or document URL' });
  }

  try {
    // Extract S3 key from the provided URL and decode it
    let s3Key;
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1));
    } catch (error) {
      // If url is not a valid URL, assume it's already an S3 key
      s3Key = url;
    }
    console.log('S3 Key extracted from URL:', s3Key);

    // Delete the document from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.Trucks_AWS_BUCKET_NAME,
      Key: s3Key,
    }));

    // Fetch the document URLs (or keys) from the database
    const { rows } = await client.query(
      'SELECT document_url1, document_url2, document_url3 FROM m5_trucks WHERE m5truckskey = $1',
      [truckId]
    );
    console.log('Fetched rows:', rows);

    let updateField = null;
    for (const field of ['document_url1', 'document_url2', 'document_url3']) {
      const storedValue = rows[0][field];
      if (storedValue) {
        // Attempt to extract key if storedValue is a full URL; else use it as is.
        let storedKey;
        try {
          storedKey = decodeURIComponent(new URL(storedValue).pathname.substring(1));
        } catch (error) {
          storedKey = storedValue;
        }
        console.log(`Comparing stored key for ${field}:`, storedKey, 'with extracted key:', s3Key);

        if (storedKey === s3Key) {
          updateField = field;
          break;
        }
      }
    }

    if (updateField) {
      // Update the database to nullify the corresponding document field
      await client.query(`UPDATE m5_trucks SET ${updateField} = NULL WHERE m5truckskey = $1`, [truckId]);
      console.log(`Updated field ${updateField} to NULL in the database.`);
    } else {
      console.log('No matching document URL found in the database.');
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Failed to delete document:', error);
    res.status(500).json({ message: 'Server error during document deletion' });
  } finally {
    client.release();
  }
});

// Delete truck
// This endpoint deletes a truck from the m5_trucks table.
// It first checks if the truck exists before attempting to delete it.
app.delete("/api/trucks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if truck exists
    const checkResult = await pool.query("SELECT * FROM m5_trucks WHERE m5truckskey = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Truck not found" });
    }

    // Delete the truck
    await pool.query("DELETE FROM m5_trucks WHERE m5truckskey = $1", [id]);

    res.json({ message: "Truck deleted successfully" });
  } catch (err) {
    console.error(`Error deleting truck ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete truck" });
  }
});

// ---- Driver Rate Management Routes ---- //

// Get all driver rates
// This endpoint retrieves all driver rates from the m5_driver_rate table.
// It uses the verifyToken middleware to ensure the user is authenticated.
app.get("/api/driver-rates", verifyToken, async (req, res) => {
  try {
    // Simple query using pool.query directly
    const query = `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      ORDER BY dr.m5ratekey
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching driver rates:", err);
    res.status(500).json({ error: "Failed to fetch driver rates" });
  }
});

// Get driver rate by ID
// This endpoint retrieves a specific driver rate by its ID from the m5_driver_rate table.
// It uses the verifyToken middleware to ensure the user is authenticated.
app.get("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Simple query using pool.query directly
    const query = `
      SELECT dr.*, e.name, e.surname 
      FROM m5_driver_rate dr
      LEFT JOIN m5_employee e ON dr.driverid = e.userid
      WHERE dr.m5ratekey = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch driver rate" });
  }
});

// Add new driver rate
// This endpoint creates a new driver rate in the m5_driver_rate table.
app.post("/api/driver-rates", verifyToken, async (req, res) => {
  try {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate
    } = req.body;

    const result = await pool.query(
      `INSERT INTO m5_driver_rate (
        startingpoint, destination,
        driver_six_meter_rate, driver_twelve_meter_rate,
        subie_six_meter_rate, subie_twelve_meter_rate
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [startingpoint, destination, driver_six_meter_rate, driver_twelve_meter_rate, subie_six_meter_rate, subie_twelve_meter_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating driver rate:", err);
    res.status(500).json({ error: "Failed to create driver rate" });
  }
});

// Update driver rate
// This endpoint updates an existing driver rate in the m5_driver_rate table.
app.put("/api/driver-rates/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Check if driver rate exists
    const checkResult = await client.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" });
    }

    // Fields that can be updated
    const updateableFields = [
      "startingpoint",
      "destination",
      "driver_six_meter_rate",
      "driver_twelve_meter_rate",
      "subie_six_meter_rate",
      "subie_twelve_meter_rate"
    ];

    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`);
        queryParams.push(req.body[field]);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id for WHERE clause
    queryParams.push(id);

    const updateQuery = `
      UPDATE m5_driver_rate 
      SET ${updateFields.join(", ")} 
      WHERE m5ratekey = $${paramCounter} 
      RETURNING *
    `;

    const result = await client.query(updateQuery, queryParams);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update driver rate" });
  } finally {
    client.release();
  }
});

// Delete driver rate
// This endpoint deletes a driver rate from the m5_driver_rate table.
app.delete("/api/driver-rates/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if driver rate exists
    const checkResult = await pool.query("SELECT * FROM m5_driver_rate WHERE m5ratekey = $1", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Driver rate not found" });
    }

    // Delete the driver rate
    await pool.query("DELETE FROM m5_driver_rate WHERE m5ratekey = $1", [id]);

    res.json({ message: "Driver rate deleted successfully" });
  } catch (err) {
    console.error(`Error deleting driver rate ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete driver rate" });
  }
});

// ---- Subcontractor Management Routes ---- //

// Get all subcontractors
app.get("/api/subcontractors", verifyToken, async (req, res) => {
  try {
    // Simple query using pool.query directly
    const query = "SELECT * FROM m5_employee WHERE roleid = 6 ORDER BY userid"; // Assuming roleid 6 is for subcontractors
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching subcontractors:", err);
    res.status(500).json({ error: "Failed to fetch subcontractors" });
  }
});

// Get subcontractor by ID
app.get("/api/subcontractors/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Simple query using pool.query directly
    const query = "SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching subcontractor ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch subcontractor" });
  }
});

// Create new subcontractor
app.post("/api/subcontractors", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    console.log("➡️ Incoming request body:", req.body);

    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername
    } = req.body;

    // Server-side validation
    if (!companyname || !location || !contact_person || !cellnum || !email) {
      return res.status(400).json({ error: 'Please fill in all the required fields.' });
    }

    console.log("🔍 Raw subdrivername value:", subdrivername);

    // Convert to array if necessary
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername.split(",").map(name => name.trim()).filter(Boolean) // Filter out empty values
      : [];

    if (subdriverArray.length === 0) {
      return res.status(400).json({ error: 'At least one driver name is required.' });
    }

    console.log("✅ Final subdriverArray for insertion:", subdriverArray);

    const insertQuery = `
      INSERT INTO m5_employee (
        cellnum, email, companyname, location, truckregnum,
        contact_person, subei_reg_num, no_of_trucks, 
        roleid, status, subdrivername
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      6,            // roleid for subcontractor
      true,         // status
      subdriverArray
    ];

    console.log("📦 Insert values:", values);

    const result = await client.query(insertQuery, values);

    console.log("✅ Insert result:", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Insert error:", error.message);
    res.status(500).json({ error: "Failed to insert subcontractor" });
  } finally {
    client.release();
  }
});

// Update subcontractor
app.put("/api/subcontractors/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      cellnum, email, companyname, location, truckregnum,
      contact_person, subei_reg_num, no_of_trucks, subdrivername
    } = req.body;

    console.log("🔍 Raw subdrivername value in PUT:", subdrivername);

    // Convert subdrivername to array format - same as in POST endpoint
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername.split(",").map(name => name.trim()).filter(Boolean)
      : [];

    console.log("✅ Final subdriverArray for update:", subdriverArray);

    const updateQuery = `
      UPDATE m5_employee SET
        cellnum = $1,
        email = $2,
        companyname = $3,
        location = $4,
        truckregnum = $5,
        contact_person = $6,
        subei_reg_num = $7,
        no_of_trucks = $8,
        subdrivername = $9
      WHERE userid = $10
      RETURNING *;
    `;
    const values = [
      cellnum, email, companyname, location, truckregnum,
      contact_person, subei_reg_num, no_of_trucks, subdriverArray, id
    ];

    console.log("📦 Update values:", values);

    const result = await client.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Update error:", error.message);
    res.status(500).json({ error: "Failed to update subcontractor: " + error.message });
  } finally {
    client.release();
  }
});

// Toggle subcontractor status (enable/disable)
app.put("/api/subcontractors/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if subcontractor exists
    const checkResult = await pool.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Subcontractor not found" });
    }

    // Update the status
    const updateResult = await pool.query(
      "UPDATE m5_employee SET status = $1 WHERE userid = $2 AND roleid = 6 RETURNING *",
      [status, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(`Error toggling subcontractor ${req.params.id} status:`, err);
    res.status(500).json({ error: "Failed to toggle subcontractor status" });
  }
});

// ------------------------------------------Module 5 Ends here---------------------------------- //



// Import additional modules needed for server2.js functionality
// import multer from "multer"
import { uploadInstructionToS3} from "./utils/s3-config.js"
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

// API endpoint to get containers for a specific instruction
// Get all clients
// Add this new endpoint to server.js to get completed legs filtered by month and year
app.get("/api/all-driver-legs/:driverId/by-month", async (req, res) => {
  const { driverId } = req.params
  const { month, year } = req.query

  console.log(`Route /api/all-driver-legs/${driverId}/by-month was accessed with month=${month}, year=${year}`)

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required query parameters" })
  }

  let client
  try {
    console.log("Attempting to connect to database...")
    client = await pool.connect()
    console.log("Successfully connected to database")

    // Convert month name to month number (0-based)
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const monthIndex = monthNames.indexOf(month)

    if (monthIndex === -1) {
      return res.status(400).json({ error: "Invalid month name" })
    }

    // Calculate start and end dates for the month
    const startDate = new Date(Number.parseInt(year), monthIndex, 1)
    const endDate = new Date(Number.parseInt(year), monthIndex + 1, 0)

    // Format dates for SQL query
    const formattedStartDate = startDate.toISOString().split("T")[0]
    const formattedEndDate = endDate.toISOString().split("T")[0]

    console.log(`Filtering legs between ${formattedStartDate} and ${formattedEndDate}`)

    // Query to get legs for the driver within the specified month and year
    // WITHOUT filtering by instruction status
    const query = `
      SELECT
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.legstatus,
        l.m1key,
        m.status as instruction_status
      FROM
        public.legs_m2 l
      JOIN
        public.m1_controller m ON l.m1key = m.m1key
      WHERE
        l.driverid = $1
        AND l.date >= $2
        AND l.date <= $3
      ORDER BY
        l.date ASC, l.legnumber
    `

    const params = [driverId, formattedStartDate, formattedEndDate]

    console.log("Executing query:")
    console.log(query)
    console.log("Query parameters:", params)

    const result = await client.query(query, params)

    console.log(`Found ${result.rows.length} legs for driver ID ${driverId} in ${month} ${year}`)

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching driver legs by month:", error)
    res.status(500).json({ error: "Failed to fetch driver legs by month" })
  } finally {
    if (client) {
      console.log("Releasing database client")
      client.release()
    }
  }
})
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
app.get("/api/completed-instructions", async (req, res) => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT m1key
      FROM public.m1_controller
      WHERE status = 'Completed'
    `

    const result = await client.query(query)

    // Extract m1key values into an array
    const completedInstructions = result.rows.map((row) => row.m1key)

    res.json(completedInstructions)
  } catch (error) {
    console.error("Error fetching completed instructions:", error)
    res.status(500).json({ error: "Failed to fetch completed instructions" })
  } finally {
    if (client) {
      client.release()
    }
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

app.get("/api/containers/:instructionId", verifyToken, async (req, res) => {
  let client
  try {
    const instructionId = req.params.instructionId
    console.log(`Fetching containers for instruction ID: ${instructionId}`)

    client = await pool.connect()

    // Query to get containers for the instruction
    const query = `
  SELECT containerkey, containernum, weight, m1key, container_type
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

        // Get container type from either property name
        const containerType = container.containerType || container.container_type || ""

        // Log each container being inserted
        console.log(
          `Inserting container: containerNum=${containerNum}, weight=${weight}, m1key=${instructionId}, container_type=${containerType}`,
        )

        const insertQuery = `
         INSERT INTO public.container (containernum, weight, m1key, container_type)
         VALUES ($1, $2, $3, $4)
         RETURNING containerkey
       `
        const values = [containerNum, weight, instructionId, containerType]

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
        // In the containerQuery for saving containers with a new instruction:
        const containerQuery = `
          INSERT INTO public.container (
            containernum, weight, m1key, container_type
          ) VALUES (
            $1, $2, $3, $4
          )
        `

        const containerValues = [container.containerNum, container.weight, m1key, container.container_type]

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

// app.get("/rate", async (req, res) => {
//   const { startingPoint, destination } = req.query
//   console.log(`Route /rate was accessed with startingPoint=${startingPoint} and destination=${destination}`)

//   if (!startingPoint || !destination) {
//     return res.status(400).json({ error: "Starting point and destination are required" })
//   }

//   try {
//     const result = await pool.query("SELECT rate FROM m5_driver_rate WHERE startingpoint = $1 AND destination = $2", [
//       startingPoint,
//       destination,
//     ])

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Rate not found for the given starting point and destination" })
//     }

//     console.log("Rate found:", result.rows[0])

//     res.status(200).json({ rate: result.rows[0].rate })
//   } catch (err) {
//     console.error("Error fetching rate:", err)
//     res.status(500).send("Server Error")
//   }
// })

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
app.get("/employees/driverssub", async (req, res) => {
  console.log("Route /employees/drivers was accessed")

  try {
    const result = await pool.query(
      "SELECT userid, name, surname, roleid FROM m5_employee WHERE roleid IN (5, 6) ORDER BY name, surname",
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
// New endpoint that includes subcontractor rates
app.get("/api/driver-rates-with-subbie", async (req, res) => {
  const { startingpoint, destination, containerType } = req.query
  console.log(`Route /api/driver-rates-with-subbie was accessed with params:`, req.query)

  if (!startingpoint || !destination) {
    return res.status(400).json({ error: "Starting point and destination are required" })
  }

  try {
    const result = await pool.query(
      `SELECT 
        m5ratekey, 
        startingpoint, 
        destination, 
        driver_six_meter_rate, 
        driver_twelve_meter_rate,
        subie_six_meter_rate,
        subie_twelve_meter_rate
      FROM 
        m5_driver_rate 
      WHERE 
        startingpoint = $1 AND destination = $2`,
      [startingpoint, destination],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Rate not found for the given route",
        message: `No rate found for route from ${startingpoint} to ${destination}`,
      })
    }

    const rateData = result.rows[0]
    rateData.driver_rate = rateData.driver_six_meter_rate
    res.status(200).json(rateData)
  } catch (err) {
    console.error(`Error fetching driver rates:`, err)
    res.status(500).json({ error: err.message })
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
      SELECT e.*, t.truckregnum, CONCAT(emp.name, ' ', surname) as driver_name
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

// app.get("/containers/numbers", async (req, res) => {
//   console.log("Route /containers/numbers was accessed")

//   try {
//     const result = await pool.query("SELECT containernum FROM container ORDER BY containernum")

//     console.log("Container numbers found:", result.rows)

//     if (result.rows.length === 0) {
//       console.log("No container numbers found in the container table")
//     } else {
//       console.log(`Found ${result.rows.length} container numbers`)
//     }

//     res.status(200).json(result.rows.map((row) => row.containernum))
//   } catch (err) {
//     console.error("Error fetching container numbers:", err)
//     res.status(500).send("Server Error")
//   }
// })
app.get("/api/container-details/:containerNum", async (req, res) => {
  const { containerNum } = req.params;
  console.log(`Route /api/container-details/${containerNum} was accessed`);

  try {
    const result = await pool.query(
      "SELECT containerkey, containernum, weight, container_type FROM container WHERE containernum = $1",
      [containerNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Container not found" });
    }

    console.log(`Found container details for ${containerNum}:`, result.rows[0]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching container details for ${containerNum}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get driver rates based on route and container type
app.get("/api/driver-rates", async (req, res) => {
  const { startingpoint, destination, containerType } = req.query;
  console.log(`Route /api/driver-rates was accessed with params:`, req.query);

  if (!startingpoint || !destination) {
    return res.status(400).json({ error: "Starting point and destination are required" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        m5ratekey, 
        startingpoint, 
        destination, 
        driver_rate,
        driver_six_meter_rate, 
        driver_twelve_meter_rate
      FROM 
        m5_driver_rate 
      WHERE 
        startingpoint = $1 AND destination = $2`,
      [startingpoint, destination]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Rate not found for the given route",
        message: `No rate found for route from ${startingpoint} to ${destination}`
      });
    }

    const rateData = result.rows[0];
    
    // Determine which rate to use based on container type
    let applicableRate = rateData.driver_rate; // Default rate
    
    if (containerType === '6m') {
      applicableRate = rateData.driver_six_meter_rate;
    } else if (containerType === '12m') {
      applicableRate = rateData.driver_twelve_meter_rate;
    }

    console.log(`Found rate for ${startingpoint} to ${destination} with container type ${containerType}:`, applicableRate);
    
    res.status(200).json({
      ...rateData,
      applicable_rate: applicableRate
    });
  } catch (err) {
    console.error(`Error fetching driver rates:`, err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/containers/numbers", async (req, res) => {
  console.log("Route /containers/numbers was accessed");

  try {
    const result = await pool.query(
      "SELECT containernum, container_type FROM container ORDER BY containernum"
    );

    console.log("Container numbers found:", result.rows);

    if (result.rows.length === 0) {
      console.log("No container numbers found in the container table");
    } else {
      console.log(`Found ${result.rows.length} container numbers`);
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching container numbers:", err);
    res.status(500).send("Server Error");
  }
});
app.get("/api/container-types", async (req, res) => {
  console.log("Route /api/container-types was accessed");

  try {
    const result = await pool.query(
      "SELECT DISTINCT container_type FROM container WHERE container_type IS NOT NULL ORDER BY container_type"
    );

    console.log(`Found ${result.rows.length} container types`);
    res.status(200).json(result.rows.map(row => row.container_type));
  } catch (err) {
    console.error("Error fetching container types:", err);
    res.status(500).json({ error: err.message });
  }
});

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
        for (const [index, driver] of drivers.entries()) {
           console.log(`Processing driver ${index}:`, JSON.stringify(driver, null, 2))

          // Skip empty driver entries
          if (!driver.driverid && !driver.truckregnumber && !driver.containernumber && !driver.date) {
            console.log("Skipping empty driver entry")
            continue
          }

          // Ensure proper type conversion for all fields
          const driverId = driver.driverid ? Number.parseInt(driver.driverid) : null
          const truckRegNumber = driver.truckregnumber || null

          let containerNumber = null
          if (driver.containernumber) {
            containerNumber = driver.containernumber.toString()
            console.log(`Using container number as string: ${containerNumber}`)
          }

          const date = driver.date ? new Date(driver.date) : null
          
          // Use the driver's specific rate based on container type
          // This is the key fix - use the driver's specific rate instead of the leg rate
          const driverSpecificRate = driver.driverRate || driverrate
          console.log(`Using driver-specific rate for driver ${index}: ${driverSpecificRate} for container type: ${driver.container_type}`)

          // If this is an existing leg and we're processing the first driver
          // update the existing record instead of creating a new one
          if (!isNewLeg && legId && index === 0) {
            await pool.query(
              `UPDATE legs_m2 
               SET driverid = $1, truckregnumber = $2, containernumber = $3, date = $4, driverrate = $5
               WHERE legkey = $6`,
              [driverId, truckRegNumber, containerNumber, date, driverSpecificRate, legId],
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
                driverSpecificRate, // Use driver-specific rate here
                m1key,
                driverId,
                truckRegNumber,
                containerNumber,
                date,
              ],
            )

            // If this is the first driver for a new leg, save the legkey
            if (isNewLeg && index === 0) {
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

app.get("/legs/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /legs/${instructionId} was accessed`)

  try {
    // Fetch all legs for the instruction, joining with m5_employee to get driver details
    // and joining with container to get container_type
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
        e.surname AS driver_surname,
        c.container_type
      FROM 
        legs_m2 l
      LEFT JOIN 
        m5_employee e ON l.driverid = e.userid
      LEFT JOIN
        container c ON l.containernumber = c.containernum AND l.m1key = c.m1key
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
            container_type: row.container_type,
            driverrate: row.driverrate,
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
        container_type: row.container_type,
        driverrate: row.driverrate,
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
        container_type: row.container_type || "", // Include container_type from container table
        driverRate: row.driverrate ? row.driverrate.toString() : "", // Include driverrate
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

    const { legnumber, m1key } = legInfo.rows[0]
    console.log(`Deleting leg ${legId} (leg number ${legnumber}) from instruction ${m1key}`)

    // Delete the leg from the database
    const result = await pool.query(`DELETE FROM legs_m2 WHERE legkey = $1 RETURNING legkey`, [legId])

    if (result.rowCount === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: `Leg with ID ${legId} not found or could not be deleted`,
      })
    }

    // Commit transaction
    await pool.query("COMMIT")

    console.log(`Successfully deleted leg with ID ${legId}`)
    res.status(200).json({
      success: true,
      message: `Leg with ID ${legId} successfully deleted`,
      deletedLegId: legId,
    })
  } catch (err) {
    // Rollback transaction on error
    await pool.query("ROLLBACK")
    console.error(`Error deleting leg with ID ${legId}:`, err)
    res.status(500).json({
      success: false,
      message: `Failed to delete leg: ${err.message}`,
      error: err.message,
    })
  }
})

// Fetch containers for a specific instruction
app.get("/containers/instruction/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route /containers/instruction/${instructionId} was accessed`)

  try {
    const result = await pool.query(`SELECT * FROM container WHERE m1key = $1`, [instructionId])

    console.log(`Found ${result.rows.length} containers for instruction ID ${instructionId}`)
    res.status(200).json(result.rows)
  } catch (err) {
    console.error(`Error fetching containers for instruction ID ${instructionId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// Complete instruction
app.put("/instructions/:instructionId/complete", async (req, res) => {
  const { instructionId } = req.params
  const { status } = req.body
  console.log(`Route PUT /instructions/${instructionId}/complete was accessed`)

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
app.get("/legs/driver/:driverId/with-instruction", async (req, res) => {
  const { driverId } = req.params
  console.log(`Route /legs/driver/${driverId}/with-instruction was accessed`)

  try {
    // Query to get all legs for a specific driver, including m1key
    const query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.legstatus,
        l.m1key
      FROM 
        public.legs_m2 l
      WHERE 
        l.driverid = $1
      ORDER BY 
        l.date DESC, l.legnumber
    `

    const result = await pool.query(query, [driverId])
    console.log(`Found ${result.rows.length} legs for driver ID ${driverId} with instruction IDs`)
    
    res.status(200).json(result.rows)
  } catch (err) {
    console.error(`Error fetching legs with instruction IDs for driver ID ${driverId}:`, err)
    res.status(500).json({ error: err.message })
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
app.get("/api/completed-driver-legs/:driverId", async (req, res) => {
  const { driverId } = req.params
  const { instructionId } = req.query

  console.log(`Route /api/completed-driver-legs/${driverId} was accessed with instructionId=${instructionId}`)

  let client
  try {
    console.log("Attempting to connect to database...")
    client = await pool.connect()
    console.log("Successfully connected to database")

    let query
    let params

    if (instructionId) {
      // If instructionId is provided, get legs for that specific instruction
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND l.m1key = $2::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber
      `
      params = [driverId, instructionId]
    } else {
      // If no instructionId, get all legs for the driver with completed status
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber
      `
      params = [driverId]
    }

    console.log("Executing query:")
    console.log(query)
    console.log("Query parameters:", params)

    const result = await client.query(query, params)

    console.log(`Found ${result.rows.length} completed legs for driver ID ${driverId}`)

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching completed driver legs:", error)
    res.status(500).json({ error: "Failed to fetch completed driver legs" })
  } finally {
    if (client) {
      console.log("Releasing database client")
      client.release()
    }
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
app.get("/api/debug/check-invoice-table", async (req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Check if the invoice table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice'
      );
    `)
    
    const tableExists = tableCheck.rows[0].exists
    
    if (!tableExists) {
      return res.status(404).json({
        success: false,
        message: "Invoice table does not exist"
      })
    }
    
    // Check the structure of the invoice table
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'invoice';
    `)
    
    res.json({
      success: true,
      tableExists,
      columns: columnCheck.rows
    })
  } catch (error) {
    console.error("Error checking invoice table:", error)
    res.status(500).json({
      success: false,
      message: "Error checking invoice table",
      error: error.message
    })
  } finally {
    if (client) client.release()
  }
})
// Add this endpoint to your server.js file
app.post("/generate-invoice/:instructionId", async (req, res) => {
  const { instructionId } = req.params
  console.log(`Route POST /generate-invoice/${instructionId} was accessed`)

  try {
    // Log before generating invoice
    console.log(`Attempting to generate invoice for instruction ID: ${instructionId}`)
    
    const result = await generateInvoice(instructionId)
    
    // Log the result
    console.log(`Invoice generation result:`, result)
    
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
async function fixInvoiceSequence() {
  let client;
  
  try {
    console.log("Checking and fixing invoice sequence...");
    client = await pool.connect();
    
    // First, check the current sequence value
    const currentSeqResult = await client.query(
      "SELECT nextval(pg_get_serial_sequence('public.invoice', 'ikey'));"
    );
    console.log(`Current sequence value: ${currentSeqResult.rows[0].nextval}`);
    
    // Get the maximum ikey value from the invoice table
    const maxKeyResult = await client.query(
      "SELECT MAX(ikey) FROM public.invoice;"
    );
    const maxKey = maxKeyResult.rows[0].max || 0;
    console.log(`Maximum ikey in table: ${maxKey}`);
    
    // Reset the sequence to be one more than the maximum value
    const resetResult = await client.query(
      "SELECT SETVAL('public.invoice_ikey_seq', (SELECT COALESCE(MAX(ikey), 0) FROM public.invoice)+1);"
    );
    console.log(`Sequence reset to: ${resetResult.rows[0].setval}`);
    
    return {
      success: true,
      message: "Invoice sequence has been successfully reset.",
      oldValue: currentSeqResult.rows[0].nextval,
      newValue: resetResult.rows[0].setval
    };
    
  } catch (error) {
    console.error("Error fixing invoice sequence:", error);
    return {
      success: false,
      message: "Failed to fix invoice sequence",
      error: error.message
    };
  } finally {
    if (client) client.release();
  }
}
app.get("/api/debug/wages/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  
  console.log(`Debug route for wages data accessed for employee ${employeeId}`);
  
  let client;
  try {
    client = await pool.connect();
    
    // Query to get all wages data for the employee
    const query = `
      SELECT *
      FROM wages
      WHERE employeeid = $1
      ORDER BY employee_date DESC
    `;
    
    const result = await client.query(query, [employeeId]);
    
    res.json({
      count: result.rows.length,
      data: result.rows,
      columnTypes: result.fields
        ? result.fields.map((f) => ({
            name: f.name,
            dataTypeID: f.dataTypeID,
            format: f.format,
          }))
        : [],
    });
  } catch (error) {
    console.error(`Error in debug endpoint:`, error);
    res.status(500).json({ error: "Failed to fetch wages data for debugging" });
  } finally {
    if (client) client.release();
  }
});

app.get("/api/employee-deductions/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  
  console.log(`Route /api/employee-deductions/${employeeId} was accessed with month=${month}, year=${year}`);
  
  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required query parameters" });
  }
  
  let client;
  try {
    client = await pool.connect();
    console.log(`Connected to database for employee deductions query`);
    
    // Convert month name to month number (1-based)
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = monthNames.indexOf(month) + 1;
    
    if (monthIndex === 0) {
      return res.status(400).json({ error: "Invalid month name" });
    }
    
    console.log(`Looking for deductions for month index: ${monthIndex}, year: ${year}`);
    
    // First check if any data exists for this employee
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM wages
      WHERE employeeid = $1
    `;
    
    const checkResult = await client.query(checkQuery, [employeeId]);
    const recordCount = parseInt(checkResult.rows[0].count);
    
    console.log(`Found ${recordCount} total wage records for employee ID ${employeeId}`);
    
    if (recordCount === 0) {
      console.log(`No wage records found for employee ID ${employeeId}, returning mock data`);
      // Return mock data since no records exist
      return res.json({
        deduction_income_tax: 1500,
        deduction_other_deductions: 300,
        deduction_uif: 200,
        deduction_bonus: 0,
        deduction_savings: 0,
        deduction_loan: 0,
        deduction_damage: 0
      });
    }
    
    // Query to get deductions data for the employee for the specified month and year
    const query = `
      SELECT 
        deduction_income_tax, 
        deduction_other_deductions, 
        deduction_uif,
        deduction_bonus, 
        deduction_savings, 
        deduction_loan, 
        deduction_damage
      FROM 
        wages
      WHERE 
        employeeid = $1 
        AND EXTRACT(MONTH FROM employee_date) = $2
        AND EXTRACT(YEAR FROM employee_date) = $3
      ORDER BY 
        employee_date DESC
      LIMIT 1
    `;
    
    console.log(`Executing query with params: [${employeeId}, ${monthIndex}, ${year}]`);
    const result = await client.query(query, [employeeId, monthIndex, year]);
    
    console.log(`Query returned ${result.rows.length} rows`);
    
    if (result.rows.length === 0) {
      console.log(`No deductions found for employee ${employeeId} in ${month} ${year}, returning mock data`);
      // Return mock data since no specific records exist for this month/year
      return res.json({
        deduction_income_tax: 1500,
        deduction_other_deductions: 300,
        deduction_uif: 200,
        deduction_bonus: 0,
        deduction_savings: 0,
        deduction_loan: 0,
        deduction_damage: 0
      });
    }
    
    console.log(`Returning deduction data:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching deductions data for employee ID ${employeeId}:`, error);
    // Return mock data on error
    return res.json({
      deduction_income_tax: 1500,
      deduction_other_deductions: 300,
      deduction_uif: 200,
      deduction_bonus: 0,
      deduction_savings: 0,
      deduction_loan: 0,
      deduction_damage: 0
    });
  } finally {
    if (client) {
      console.log(`Releasing database client for employee deductions query`);
      client.release();
    }
  }
});
// Check if build directory exists before trying to serve static files
// const buildPath = path.join(__dirname, "build")
// if (fs.existsSync(buildPath)) {
//   console.log("Build directory found, serving static files from:", buildPath)
//   // Serve static files from the React app
//   app.use(express.static(buildPath))

//   // The "catchall" handler: for any request that doesn't
//   // match one above, send back React's index.html file.
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(buildPath, "index.html"))
//   })
// } else {
//   console.log("Build directory not found at:", buildPath)
//   console.log("Only API endpoints will be available")

//   // Add a fallback route for non-API routes
//   app.get("*", (req, res) => {
//     // Check if this is an API request
//     if (req.url.startsWith("/api/")) {
//       return res.status(404).json({ error: "API endpoint not found" })
//     }

//     // For non-API requests, return a simple HTML page
//     res.send(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>Logistics API Server</title>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
//             h1 { color: #333; }
//             .container { max-width: 800px; margin: 0 auto; }
//             .note { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; }
//             code { background-color: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <h1>Logistics API Server</h1>
//             <div class="note">
//               <p>The server is running in API-only mode. The React build directory was not found.</p>
//               <p>API endpoints are available at <code>/api/...</code></p>
//             </div>
//             <p>Available endpoints:</p>
//             <ul>
//               <li><code>/api/clients</code> - Get all clients</li>
//               <li><code>/api/shipment-types</code> - Get all shipment types</li>
//               <li><code>/api/instructions</code> - Get all instructions</li>
//               <li><code>/api/client-instruction-stats</code> - Get client instruction statistics</li>
//               <li><code>/test-connection</code> - Test database connection</li>
//             </ul>
//           </div>
//         </body>
//       </html>
//     `)
//   })
// }
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


// Get wage details for a driver (without requiring an instruction ID)
app.get("/wage-details/driver/:driverId", async (req, res) => {
  const driverId = req.params.driverId
  console.log(`Route /wage-details/driver/${driverId} was accessed`)

  try {
    // First check if the driver exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM public.m5_employee
      WHERE userid = $1
    `
    
    const checkResult = await pool.query(checkQuery, [driverId])
    const driverExists = checkResult.rows[0].count > 0
    
    if (!driverExists) {
      console.log(`No driver found with ID ${driverId}`)
      return res.status(404).json({ 
        error: "Driver not found",
        message: `No driver found with ID ${driverId}`
      })
    }
    
    // Get the base salary from the employee table
    const employeeQuery = `
      SELECT base_salary
      FROM public.m5_employee
      WHERE userid = $1
    `

    const employeeResult = await pool.query(employeeQuery, [driverId])
    const baseSalary = employeeResult.rows[0]?.base_salary || 0

    // Get the sum of driver rates for all legs for this driver
    const legsQuery = `
      SELECT 
        SUM(driverrate) as leg_payments,
        MAX(date) as date
      FROM 
        public.legs_m2
      WHERE 
        driverid = $1
    `

    const legsResult = await pool.query(legsQuery, [driverId])
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
  console.log("Employee route hit with ID:", req.params.id)
  const id = req.params.id.split(":")[0] // This will handle IDs like "1:1" by taking just the "1"
  let client

  console.log(`Route /api/employee/${id} was accessed`)

  try {
    client = await pool.connect()

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
    `

    const result = await client.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" })
    }

    console.log(`Found employee data for ID ${id}:`, result.rows[0])
    res.json(result.rows[0])
  } catch (error) {
    console.error(`Error fetching employee data for ID ${id}:`, error)
    res.status(500).json({
      error: "An error occurred while fetching employee data",
      message: error.message,
    })
  } finally {
    if (client) client.release()
  }
})

app.listen(PORT, async () => {
  try {
    // Test database connection on startup
    const dbTest = await testConnection()
    types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value))
    types.setTypeParser(types.builtins.FLOAT8, (value) => Number.parseFloat(value))
    const seqFixResult = await fixInvoiceSequence();
    if (seqFixResult.success) {
      console.log(`✅ Invoice sequence fixed: ${seqFixResult.oldValue} → ${seqFixResult.newValue}`);
    } else {
      console.error(`❌ Failed to fix invoice sequence: ${seqFixResult.error}`);
    }
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
