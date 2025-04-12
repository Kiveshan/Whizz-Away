import express from "express"
import pg from "pg"
import path from "path"
import fs from "fs"
import multer from "multer"
import dotenv from "dotenv"
import cors from "cors"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import bcrypt from "bcrypt"
import expressSession from "express-session"
import passport from "passport"
import LocalStrategy from "passport-local"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { uploadInstructionToS3, getSignedUrl } from "./utils/s3-config.js"
import expensesRoutes from "./routes/expenses.js"
import documentsRoutes from "./routes/Documents.js"

dotenv.config()

const app = express()
const PORT = 5000
const secretKey = crypto.randomBytes(64).toString("hex")
console.log("Generated secret key:", secretKey)
const pool = new pg.Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "Transport5",
  password: process.env.PG_PASSWORD || "123456",
  port: process.env.PG_PORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
) // Allow CORS for your frontend
app.use(express.json())
app.use(
  expressSession({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 3600000, // Session expiration (1 hour)
    },
  }),
)
app.use(passport.initialize())
app.use(passport.session())
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
  done(null, { userid: user.userid, name: user.name, surname: user.surname, table: user.table })
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
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user)
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" })
  }
  res.json({ name: req.session.user.name, surname: req.session.user.surname })
})
pool
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL database")
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database:", err)
  })

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
        SELECT e.*, t.truckregnum
        FROM expenses_m2 e
        JOIN m5_trucks t ON e.truckid = t.m5truckskey
        WHERE e.truckid = $1
              AND (e.type ILIKE 'fuel' OR e.type ILIKE 'diesel' OR e.type ILIKE 'petrol')
        ORDER BY e.slipuploaddate DESC
      `,
      [truckId],
    )

    console.log(`Found ${result.rows.length} expenses for truck ID ${truckId}`)

    if (result.rows.length === 0) {
      console.log(`No expenses found for truck ID ${truckId}`)
    }

    res.status(200).json(result.rows)
  } catch (err) {
    console.error(`Error fetching expenses for truck ID ${truckId}:`, err)
    res.status(500).json({ error: err.message })
  }
})

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
              c.companyname, 
              c.representative, 
              c.email,
              COUNT(CASE WHEN m.status = 'New' THEN 1 ELSE NULL END) AS new_count,
              COUNT(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE NULL END) AS in_progress_count
          FROM 
              m5_client c
          LEFT JOIN 
              m1_controller m ON c.m5clientkey = m.client
          GROUP BY 
              c.m5clientkey, c.companyname, c.representative, c.email
          ORDER BY 
              c.companyname;
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

          // Handle container number as integer
          let containerNumber = null
          if (driver.containernumber) {
            // Try to convert to number if it's a numeric string
            const parsedContainer = Number.parseInt(driver.containernumber)
            containerNumber = !isNaN(parsedContainer) ? parsedContainer : null
            console.log(`Converted container number from ${driver.containernumber} to ${containerNumber}`)
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

// Add this with other app.use statements
app.use("/expenses", expensesRoutes)
app.use("/documents", documentsRoutes)

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
