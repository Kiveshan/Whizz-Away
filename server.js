// const express = require("express")
// const { pg } = require("pg")
const path = require("path")
const fs = require("fs")
const multer = require("multer")
require("dotenv").config()
// const cors = require("cors")

// const port = process.env.PORT || 5000

// const client = new Client({
//   user: process.env.PG_USER || "postgres",
//   host: process.env.PG_HOST || "localhost",
//   database: process.env.PG_DATABASE || "Transport3",
//   password: process.env.PG_PASSWORD || "123456",
//   port: process.env.PG_PORT || 5432,
// })

// app.use(cors())
// app.use(express.json())

// pool
//   .connect()
//   .then(() => {
//     console.log("Connected to PostgreSQL database")
//   })
//   .catch((err) => {
//     console.error("Error connecting to PostgreSQL database:", err)
//   })

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
app.get("/trucks/fuel-expenses", async (req, res) => {
  console.log("Route /trucks/fuel-expenses was accessed")

  try {
    // Revert to the original query that only returns trucks with fuel expenses
    const result = await pool.query(`
        SELECT DISTINCT m.truckid, t.truckregnum 
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

    // Return just the trucks array, no fallback
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

// Update the expenses POST endpoint to properly handle driver information
app.post("/expenses", upload.single("slip"), async (req, res) => {
  console.log("Route POST /expenses was accessed")
  console.log("Request body:", req.body)

  try {
    // Extract data from request
    const { documentFrom, expenseCost } = req.body
    let { driverId, truckId } = req.body

    // Get current date for upload date
    const uploadDate = new Date().toISOString().split("T")[0] // Format: YYYY-MM-DD

    // Get filename if file was uploaded
    const slipName = req.file ? req.file.filename : null

    // Convert expense cost to a number
    const cost = Number.parseFloat(expenseCost.trim())

    if (isNaN(cost)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense cost format",
      })
    }

    if (truckId) {
      truckId = Number.parseInt(truckId)
      if (isNaN(truckId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid truck ID format",
        })
      }
    }

    if (driverId) {
      driverId = Number.parseInt(driverId)
      if (isNaN(driverId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid driver ID format",
        })
      }
    }

    let documentSource = documentFrom

    if (documentFrom === "Driver" && driverId) {
      try {
        const driverResult = await pool.query(
          "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
          [driverId],
        )

        if (driverResult.rows.length > 0) {
          documentSource = driverResult.rows[0].fullname
        }
      } catch (driverErr) {
        console.error("Error fetching driver name:", driverErr)
      }
    }

    console.log("Processed data:", {
      type: "fuel",
      documentFrom: documentSource,
      cost,
      slipName,
      uploadDate,
      truckId,
      driverId,
    })

    // Insert data into database
    const query = `
      INSERT INTO public.expenses_m2 
      (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ekey
    `

    const values = [
      "fuel", // Always "fuel" as per requirements
      documentSource, // Use the driver's name if available
      cost,
      "", // Empty description as per requirements
      slipName,
      uploadDate,
      truckId || null,
      driverId || null,
    ]

    const result = await pool.query(query, values)

    console.log("Expense created successfully with ID:", result.rows[0].ekey)

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: {
        ekey: result.rows[0].ekey,
        slipName: slipName,
      },
    })
  } catch (error) {
    console.error("Error creating expense:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    })
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
              c.companyname, 
              c.representative, 
              c.email,
              COUNT(CASE WHEN m.status = 'New' THEN 1 ELSE NULL END) AS new_count,
              COUNT(CASE WHEN m.status = 'In progress' THEN 1 ELSE NULL END) AS in_progress_count
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

// Start server
// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`)
// })

import express from "express";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import expressSession from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 5000;

// Generate a secure, random secret key
const secretKey = crypto.randomBytes(64).toString('hex');
console.log("Generated secret key:", secretKey); // Log the secret key (for debugging)

// Middleware setup
app.use(cors({ credentials: true, origin: "http://localhost:3000" })); // Allow CORS for your frontend
app.use(express.json());
app.use(expressSession({
  secret: secretKey,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
    httpOnly: true, 
    maxAge: 3600000 // Session expiration (1 hour)
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Database client setup (connecting only when needed)
const pool = new pg.Client({
  user: process.env.RDS_USERNAME || "postgres",
  host: process.env.RDS_HOSTNAME || "localhost",
  database: process.env.RDS_DB_NAME || "Transport3",
  password: process.env.RDS_PASSWORD || "123456",
  port: process.env.RDS_PORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false
});

// Function to connect to the database
async function connectDb() {
  try {
    await pool.connect();
    console.log("✅ Database Connected Successfully");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Terminate the process if the connection fails
  }
}

// Passport Local Strategy for Authentication
passport.use(new LocalStrategy(
  { usernameField: "email" }, 
  async (email, password, done) => {
    try {
      let result = await pool.query("SELECT * FROM usertable WHERE email = $1", [email]);
      
      if (result.rows.length === 0) {
        result = await pool.query("SELECT * FROM m5_employee WHERE email = $1", [email]);
        if (result.rows.length === 0) {
          console.log("No user found in both tables with email:", email);
          return done(null, false, { message: "Invalid email or password" });
        }
      }

      const user = result.rows[0];
      console.log("Fetched user:", user);

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log("Password mismatch for user:", email);
        return done(null, false, { message: "Invalid email or password" });
      }

      user.table = result.fields[0].table;
      return done(null, user);
    } catch (err) {
      console.error("Error during authentication:", err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, { userid: user.userid, name: user.name, surname: user.surname, table: user.table });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    const { userid, table } = sessionUser;
    let result;

    if (table === "usertable") {
      result = await pool.query("SELECT * FROM usertable WHERE userid = $1", [userid]);
    } else if (table === "m5_employee") {
      result = await pool.query("SELECT * FROM m5_employee WHERE userid = $1", [userid]);
    }

    if (!result || result.rows.length === 0) {
      console.log("User session not found in database");
      return done(null, false);
    }
    
    console.log("Session user fetched:", result.rows[0]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Login route to authenticate and set the session
app.post("/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Check if user has a roleid
    if (!user.roleid) {
      return res.status(403).json({ message: "Access denied. No role assigned." });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }

      req.session.user = user; // Store user session manually
      console.log("User stored in session:", req.session.user);

      const token = jwt.sign({ userid: user.userid, roleid: user.roleid }, secretKey, { expiresIn: '1h' });
      const { roleid } = user;
      let redirectUrl = "/";

      if (roleid === 1) redirectUrl = "/Dashboard";
      else if (roleid === 2) redirectUrl = "/ControllerDashboard";
      else if (roleid === 3) redirectUrl = "/FDashboard";
      else if (roleid === 4) redirectUrl = "/DirectorDashboard";

      return res.json({ message: "Login successful", redirectUrl, token });
    });
  })(req, res, next);
});


// User info route for session verification
app.get("/user-info", (req, res) => {
  console.log("Current user session:", req.session.user);
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in first" });
  }
  res.json({ name: req.session.user.name, surname: req.session.user.surname });
});

// Start the server
app.listen(port, async () => {
  await connectDb();
  console.log(`🚀 Server running on port ${PORT}`);
});
