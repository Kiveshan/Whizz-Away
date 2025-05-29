import express from "express"
import { uploadFuelExpenseToS3, uploadFuelSlipToS3Bucket, getSignedUrl } from "../utils/s3-config.js"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const router = express.Router()

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

// Add a new endpoint to get expenses for a specific truck
router.get("/truck/:truckId", async (req, res) => {
  try {
    const truckId = req.params.truckId

    console.log(`Getting expenses for truck ID: ${truckId}`)

    const query = `
      SELECT * FROM public.expenses_m2 
      WHERE truckid = $1
      ORDER BY slipuploaddate DESC
    `

    const result = await pool.query(query, [truckId])

    console.log(`Found ${result.rows.length} expenses for truck ID: ${truckId}`)

    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching expenses for truck:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    })
  }
})

router.post("/", (req, res) => {
  console.log("S3 expense upload route accessed")

  uploadFuelExpenseToS3.single("slip")(req, res, async (err) => {
    if (err) {
      console.error("Error in multer upload:", err)
      console.error("Error stack:", err.stack)
      console.error("Error code:", err.code)
      console.error("Error name:", err.name)

      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message,
        code: err.code || "unknown",
        name: err.name || "unknown",
      })
    }

    console.log("Request body:", req.body)
    console.log("File:", req.file)

    try {
      const { documentFrom, expenseCost, orderno } = req.body
      let { driverId, truckId } = req.body
      const uploadDate = new Date().toISOString().split("T")[0]

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      // Validate orderno
      if (!orderno) {
        return res.status(400).json({
          success: false,
          message: "Order number is required",
        })
      }
      const parsedOrderNo = Number.parseInt(orderno)
      if (isNaN(parsedOrderNo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order number format",
        })
      }

      // Upload file to S3 with proper folder structure
      const s3Key = await uploadFuelSlipToS3Bucket(req.file, truckId)
      
      const slipName = req.file.originalname
      console.log("S3 Upload successful:", {
        slipName,
        s3Key
      })

      // Convert expense cost to a number
      const cost = Number.parseFloat(expenseCost.trim())

      if (isNaN(cost)) {
        return res.status(400).json({
          success: false,
          message: "Invalid expense cost format",
        })
      }

      // Convert IDs to integers
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
      let userId = null

      if (documentFrom === "Driver" && driverId) {
        try {
          const driverResult = await pool.query(
            "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
            [driverId],
          )

          if (driverResult.rows.length > 0) {
            documentSource = driverResult.rows[0].fullname
            userId = driverId
          }
        } catch (driverErr) {
          console.error("Error fetching driver name:", driverErr)
        }
      } else if (documentFrom === "Manager") {
        try {
          console.log("Manager selected, querying usertable for manager")

          const managerResult = await pool.query("SELECT * FROM usertable WHERE roleid = 1 AND userid = 1")

          console.log("Manager query result:", managerResult.rows)

          if (managerResult.rows.length > 0) {
            documentSource = `${managerResult.rows[0].name} ${managerResult.rows[0].surname}`
            userId = managerResult.rows[0].userid
            console.log("Manager found:", documentSource, "userId:", userId)
          } else {
            console.error("No manager found in usertable with roleid = 1")
            documentSource = "Manager"
            userId = null
          }
        } catch (managerErr) {
          console.error("Error fetching manager name:", managerErr)
          documentSource = "Manager"
          userId = null
        }
      } else if (documentFrom === "Controller") {
        try {
          const controllerResult = await pool.query(
            "SELECT userid, CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE roleid = 2 LIMIT 1",
          )

          if (controllerResult.rows.length > 0) {
            documentSource = controllerResult.rows[0].fullname
            userId = controllerResult.rows[0].userid
          }
        } catch (controllerErr) {
          console.error("Error fetching controller name:", controllerErr)
        }
      }

      try {
        const query = `
          INSERT INTO public.expenses_m2 
          (type, documentfrom, expensecost, description, slipname, s3key, slipuploaddate, truckid, driverid, orderno)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ekey
        `

        const values = [
          "fuel",
          documentSource,
          cost,
          "",
          slipName,
          s3Key,
          uploadDate,
          truckId || null,
          userId || null,
          parsedOrderNo,
        ]

        const result = await pool.query(query, values)
        console.log("Expense created successfully with ID:", result.rows[0].ekey)

        res.status(201).json({
          success: true,
          message: "Expense created successfully",
          data: {
            ekey: result.rows[0].ekey,
            slipName: slipName,
            s3Key: s3Key
          },
        })
      } catch (error) {
        if (error.message.includes('column "s3key" of relation "expenses_m2" does not exist')) {
          console.error("s3key column does not exist. Trying without s3key.")

          try {
            const fallbackQuery = `
              INSERT INTO public.expenses_m2 
              (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid, orderno)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING ekey
            `

            const fallbackValues = [
              "fuel",
              documentSource,
              cost,
              "",
              slipName,
              uploadDate,
              truckId || null,
              userId || null,
              parsedOrderNo,
            ]

            const fallbackResult = await pool.query(fallbackQuery, fallbackValues)
            console.log("Expense created successfully with ID (without s3key):", fallbackResult.rows[0].ekey)

            res.status(201).json({
              success: true,
              message: "Expense created successfully",
              data: {
                ekey: fallbackResult.rows[0].ekey,
                slipName: slipName,
                warning: "S3 key not stored in database. Consider adding s3key column to expenses_m2 table for better URL management.",
              },
            })
          } catch (innerError) {
            if (innerError.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
              console.error("slipurl column does not exist. Inserting without slipurl and s3key.")

              const basicQuery = `
                INSERT INTO public.expenses_m2 
                (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid, orderno)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING ekey
              `

              const basicValues = [
                "fuel",
                documentSource,
                cost,
                "",
                slipName,
                uploadDate,
                truckId || null,
                userId || null,
                parsedOrderNo,
              ]

              const basicResult = await pool.query(basicQuery, basicValues)
              console.log("Expense created successfully with ID (basic):", basicResult.rows[0].ekey)

              res.status(201).json({
                success: true,
                message: "Expense created successfully (without S3 URL storage)",
                data: {
                  ekey: basicResult.rows[0].ekey,
                  slipName: slipName,
                  warning: "S3 URL and key not stored in database. Please add s3key columns to expenses_m2 table.",
                },
              })
            } else {
              throw innerError
            }
          }
        } else if (error.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
          console.error("slipurl column does not exist. Inserting without slipurl.")

          const fallbackQuery = `
            INSERT INTO public.expenses_m2 
            (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid, orderno)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING ekey
          `

          const fallbackValues = [
            "fuel",
            documentSource,
            cost,
            "",
            slipName,
            uploadDate,
            truckId || null,
            userId || null,
            parsedOrderNo,
          ]

          const fallbackResult = await pool.query(fallbackQuery, fallbackValues)

          res.status(201).json({
            success: true,
            message: "Expense created successfully (without S3 URL storage)",
            data: {
              ekey: fallbackResult.rows[0].ekey,
              slipName: slipName,
              warning: "S3 URL not stored in database. Please add slipurl column to expenses_m2 table.",
            },
          })
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create expense",
        error: error.message,
      })
    }
  })
})

router.get("/document/:id", async (req, res) => {
  try {
    const expenseId = req.params.id

    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expenses_m2' 
      AND table_schema = 'public'
    `

    const columnsResult = await pool.query(checkColumnsQuery)
    const columnNames = columnsResult.rows.map((row) => row.column_name.toLowerCase())

    const selectColumns = ["slipname"]

    if (columnNames.includes("slipurl")) {
      selectColumns.push("slipurl")
    }

    if (columnNames.includes("s3key")) {
      selectColumns.push("s3key")
    }

    const query = `
      SELECT ${selectColumns.join(", ")} FROM expenses_m2 WHERE ekey = $1
    `

    const result = await pool.query(query, [expenseId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      })
    }

    const { slipname } = result.rows[0]
    const slipurl = result.rows[0].slipurl
    const s3key = result.rows[0].s3key

    let url = null
    if (s3key) {
      url = getSignedUrl(s3key, 3600)
    } else {
      return res.status(404).json({
        success: false,
        message: "Document not found or S3 key missing",
      })
    }

    let fileType = "image"
    if (slipname) {
      const extension = slipname.split(".").pop().toLowerCase()
      if (["pdf"].includes(extension)) {
        fileType = "pdf"
      }
    }

    res.json({
      success: true,
      url: url,
      name: slipname,
      fileType: fileType,
    })
  } catch (error) {
    console.error("Error fetching document:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch document",
      error: error.message,
    })
  }
})

export default router