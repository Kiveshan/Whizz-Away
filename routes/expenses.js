// import express from "express"
// import { uploadToS3, getSignedUrl } from "../utils/s3-config.js"
// import pg from "pg"
// import dotenv from "dotenv"

// dotenv.config()

// const router = express.Router()

// // Create a PostgreSQL connection pool
// const pool = new pg.Pool({
//   user: process.env.PG_USER || "postgres",
//   host: process.env.PG_HOST || "localhost",
//   database: process.env.PG_DATABASE || "Transport5",
//   password: process.env.PG_PASSWORD || "123456",
//   port: process.env.PG_PORT || 5432,
//   ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
// })

// // Add a new endpoint to get expenses for a specific truck
// router.get("/truck/:truckId", async (req, res) => {
//   try {
//     const truckId = req.params.truckId

//     // Log the request
//     console.log(`Getting expenses for truck ID: ${truckId}`)

//     // Query to get all expenses for the truck
//     const query = `
//       SELECT * FROM public.expenses_m2 
//       WHERE truckid = $1
//       ORDER BY slipuploaddate DESC
//     `

//     const result = await pool.query(query, [truckId])

//     // Log the result count
//     console.log(`Found ${result.rows.length} expenses for truck ID: ${truckId}`)

//     res.json(result.rows)
//   } catch (error) {
//     console.error("Error fetching expenses for truck:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch expenses",
//       error: error.message,
//     })
//   }
// })

// // POST endpoint to create a new expense with S3 upload
// router.post("/", (req, res) => {
//   console.log("S3 expense upload route accessed")

//   // Use the uploadToS3 middleware
//   uploadToS3.single("slip")(req, res, async (err) => {
//     if (err) {
//       console.error("Error in multer S3 upload:", err)
//       console.error("Error stack:", err.stack)
//       console.error("Error code:", err.code)
//       console.error("Error name:", err.name)

//       return res.status(400).json({
//         success: false,
//         message: "File upload error",
//         error: err.message,
//         code: err.code || "unknown",
//         name: err.name || "unknown",
//       })
//     }

//     console.log("Request body:", req.body)
//     console.log("File:", req.file)

//     try {
//       const { documentFrom, expenseCost } = req.body
//       let { driverId, truckId } = req.body
//       const uploadDate = new Date().toISOString().split("T")[0] // Format: YYYY-MM-DD

//       // Validate file upload
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "No file uploaded",
//         })
//       }

//       // Get S3 file information
//       const slipName = req.file.originalname

//       // Store the S3 key instead of the full URL
//       const s3Key = req.file.key

//       // Generate a pre-signed URL that expires in 7 days (604800 seconds)
//       const slipUrl = getSignedUrl(s3Key, 604800)

//       console.log("S3 Upload successful:", {
//         slipName,
//         s3Key,
//         slipUrl,
//       })

//       // Convert expense cost to a number
//       const cost = Number.parseFloat(expenseCost.trim())

//       if (isNaN(cost)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid expense cost format",
//         })
//       }

//       // Convert IDs to integers
//       if (truckId) {
//         truckId = Number.parseInt(truckId)
//         if (isNaN(truckId)) {
//           return res.status(400).json({
//             success: false,
//             message: "Invalid truck ID format",
//           })
//         }
//       }

//       if (driverId) {
//         driverId = Number.parseInt(driverId)
//         if (isNaN(driverId)) {
//           return res.status(400).json({
//             success: false,
//             message: "Invalid driver ID format",
//           })
//         }
//       }

//       // Get driver name if documentFrom is "Driver"
//       let documentSource = documentFrom

//       if (documentFrom === "Driver" && driverId) {
//         try {
//           const driverResult = await pool.query(
//             "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
//             [driverId],
//           )

//           if (driverResult.rows.length > 0) {
//             documentSource = driverResult.rows[0].fullname
//           }
//         } catch (driverErr) {
//           console.error("Error fetching driver name:", driverErr)
//         }
//       }

//       // Check if the slipurl column exists
//       try {
//         // First, try to insert with slipurl and s3key
//         const query = `
//           INSERT INTO public.expenses_m2 
//           (type, documentfrom, expensecost, description, slipname, slipurl, s3key, slipuploaddate, truckid, driverid)
//           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//           RETURNING ekey
//         `

//         const values = [
//           "fuel", // Always "fuel" as per requirements
//           documentSource,
//           cost,
//           "",
//           slipName,
//           slipUrl, // Store the pre-signed URL
//           s3Key, // Store the S3 key for future URL generation
//           uploadDate,
//           truckId || null,
//           driverId || null,
//         ]

//         const result = await pool.query(query, values)
//         console.log("Expense created successfully with ID:", result.rows[0].ekey)

//         res.status(201).json({
//           success: true,
//           message: "Expense created successfully",
//           data: {
//             ekey: result.rows[0].ekey,
//             slipName: slipName,
//             slipUrl: slipUrl,
//           },
//         })
//       } catch (error) {
//         // If the error is about the s3key column not existing
//         if (error.message.includes('column "s3key" of relation "expenses_m2" does not exist')) {
//           console.error("s3key column does not exist. Trying without s3key.")

//           try {
//             // Try inserting with just slipurl
//             const fallbackQuery = `
//               INSERT INTO public.expenses_m2 
//               (type, documentfrom, expensecost, description, slipname, slipurl, slipuploaddate, truckid, driverid)
//               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//               RETURNING ekey
//             `

//             const fallbackValues = [
//               "fuel",
//               documentSource,
//               cost,
//               "",
//               slipName,
//               slipUrl, // Store the pre-signed URL
//               uploadDate,
//               truckId || null,
//               driverId || null,
//             ]

//             const fallbackResult = await pool.query(fallbackQuery, fallbackValues)
//             console.log("Expense created successfully with ID (without s3key):", fallbackResult.rows[0].ekey)

//             res.status(201).json({
//               success: true,
//               message: "Expense created successfully",
//               data: {
//                 ekey: fallbackResult.rows[0].ekey,
//                 slipName: slipName,
//                 slipUrl: slipUrl,
//                 warning:
//                   "S3 key not stored in database. Consider adding s3key column to expenses_m2 table for better URL management.",
//               },
//             })
//           } catch (innerError) {
//             // If the error is about the slipurl column not existing
//             if (innerError.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
//               console.error("slipurl column does not exist. Inserting without slipurl and s3key.")

//               // Insert without slipurl and s3key
//               const basicQuery = `
//                 INSERT INTO public.expenses_m2 
//                 (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid)
//                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//                 RETURNING ekey
//               `

//               const basicValues = [
//                 "fuel",
//                 documentSource,
//                 cost,
//                 "",
//                 slipName,
//                 uploadDate,
//                 truckId || null,
//                 driverId || null,
//               ]

//               const basicResult = await pool.query(basicQuery, basicValues)
//               console.log("Expense created successfully with ID (basic):", basicResult.rows[0].ekey)

//               res.status(201).json({
//                 success: true,
//                 message: "Expense created successfully (without S3 URL storage)",
//                 data: {
//                   ekey: basicResult.rows[0].ekey,
//                   slipName: slipName,
//                   slipUrl: slipUrl,
//                   warning:
//                     "S3 URL and key not stored in database. Please add slipurl and s3key columns to expenses_m2 table.",
//                 },
//               })
//             } else {
//               // For other errors, rethrow
//               throw innerError
//             }
//           }
//         } else if (error.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
//           console.error("slipurl column does not exist. Inserting without slipurl.")

//           // Insert without slipurl
//           const fallbackQuery = `
//             INSERT INTO public.expenses_m2 
//             (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid)
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//             RETURNING ekey
//           `

//           const fallbackValues = [
//             "fuel",
//             documentSource,
//             cost,
//             "",
//             slipName,
//             uploadDate,
//             truckId || null,
//             driverId || null,
//           ]

//           const fallbackResult = await pool.query(fallbackQuery, fallbackValues)
//           console.log("Expense created successfully with ID (without slipurl):", fallbackResult.rows[0].ekey)

//           res.status(201).json({
//             success: true,
//             message: "Expense created successfully (without S3 URL storage)",
//             data: {
//               ekey: fallbackResult.rows[0].ekey,
//               slipName: slipName,
//               slipUrl: slipUrl,
//               warning: "S3 URL not stored in database. Please add slipurl column to expenses_m2 table.",
//             },
//           })
//         } else {
//           // For other errors, rethrow
//           throw error
//         }
//       }
//     } catch (error) {
//       console.error("Error creating expense:", error)
//       res.status(500).json({
//         success: false,
//         message: "Failed to create expense",
//         error: error.message,
//       })
//     }
//   })
// })

// // GET endpoint to retrieve expense document
// router.get("/document/:id", async (req, res) => {
//   try {
//     const expenseId = req.params.id

//     // First, check if the columns exist in the table
//     const checkColumnsQuery = `
//       SELECT column_name 
//       FROM information_schema.columns 
//       WHERE table_name = 'expenses_m2' 
//       AND table_schema = 'public'
//     `

//     const columnsResult = await pool.query(checkColumnsQuery)
//     const columnNames = columnsResult.rows.map((row) => row.column_name.toLowerCase())

//     // Build the query dynamically based on available columns
//     const selectColumns = ["slipname"]

//     if (columnNames.includes("slipurl")) {
//       selectColumns.push("slipurl")
//     }

//     if (columnNames.includes("s3key")) {
//       selectColumns.push("s3key")
//     }

//     const query = `
//       SELECT ${selectColumns.join(", ")} FROM expenses_m2 WHERE ekey = $1
//     `

//     const result = await pool.query(query, [expenseId])

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Document not found",
//       })
//     }

//     const { slipname } = result.rows[0]
//     const slipurl = result.rows[0].slipurl
//     const s3key = result.rows[0].s3key

//     // If we have an s3key, generate a fresh pre-signed URL
//     let url = slipurl
//     if (s3key) {
//       url = getSignedUrl(s3key, 3600) // 1 hour expiry for viewing
//     }

//     // Determine file type for proper handling in the frontend
//     let fileType = "image"
//     if (slipname) {
//       const extension = slipname.split(".").pop().toLowerCase()
//       if (["pdf"].includes(extension)) {
//         fileType = "pdf"
//       }
//     }

//     // Return the document URL and type
//     res.json({
//       success: true,
//       url: url,
//       name: slipname,
//       fileType: fileType,
//     })
//   } catch (error) {
//     console.error("Error fetching document:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch document",
//       error: error.message,
//     })
//   }
// })

// export default router
import express from "express"
import { uploadFuelExpenseToS3, uploadFuelSlipToS3Bucket, getSignedUrl } from "../utils/s3-config.js"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const router = express.Router()

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "Transport5",
  password:  "123456",
  port:  5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

// Add a new endpoint to get expenses for a specific truck
router.get("/truck/:truckId", async (req, res) => {
  try {
    const truckId = req.params.truckId

    // Log the request
    console.log(`Getting expenses for truck ID: ${truckId}`)

    // Query to get all expenses for the truck
    const query = `
      SELECT * FROM public.expenses_m2 
      WHERE truckid = $1
      ORDER BY slipuploaddate DESC
    `

    const result = await pool.query(query, [truckId])

    // Log the result count
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

// POST endpoint to create a new expense with S3 upload
router.post("/", (req, res) => {
  console.log("S3 expense upload route accessed")

  // Use the uploadFuelExpenseToS3 middleware
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
      const { documentFrom, expenseCost } = req.body
      let { driverId, truckId } = req.body
      const uploadDate = new Date().toISOString().split("T")[0] // Format: YYYY-MM-DD

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      // Upload file to S3 with proper folder structure
      const s3Key = await uploadFuelSlipToS3Bucket(req.file, truckId)
      
      // Get S3 file information
      const slipName = req.file.originalname

      // Generate a pre-signed URL that expires in 7 days (604800 seconds)
      const slipUrl = getSignedUrl(s3Key, 604800)

      console.log("S3 Upload successful:", {
        slipName,
        s3Key,
        slipUrl,
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

      // Get driver name if documentFrom is "Driver"
      let documentSource = documentFrom
      let userId = null;  // Default to null, will be set in specific cases
      
      if (documentFrom === "Driver" && driverId) {
        try {
          const driverResult = await pool.query(
            "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
            [driverId],
          )
      
          if (driverResult.rows.length > 0) {
            documentSource = driverResult.rows[0].fullname
            userId = driverId  // Correct assignment here
          }
        } catch (driverErr) {
          console.error("Error fetching driver name:", driverErr)
        }
      } else if (documentFrom === "Manager") {
        try {
          const managerResult = await pool.query(
            "SELECT userid, CONCAT(name, ' ', surname) as fullname FROM usertable WHERE roleid = 1 AND userid = 1"
          )
      
          if (managerResult.rows.length > 0) {
            documentSource = managerResult.rows[0].fullname
            userId = managerResult.rows[0].userid  // This will be from usertable
          }
        } catch (managerErr) {
          console.error("Error fetching manager name:", managerErr)
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
      
      // Check if the slipurl column exists
      try {
        // First, try to insert with slipurl and s3key
        const query = `
          INSERT INTO public.expenses_m2 
          (type, documentfrom, expensecost, description, slipname, slipurl, s3key, slipuploaddate, truckid, driverid)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ekey
        `

        const values = [
          "fuel", // Always "fuel" as per requirements
          documentSource,
          cost,
          "",
          slipName,
          slipUrl, // Store the pre-signed URL
          s3Key, // Store the S3 key for future URL generation
          uploadDate,
          truckId || null,
          userId || null,
        ]

        const result = await pool.query(query, values)
        console.log("Expense created successfully with ID:", result.rows[0].ekey)

        res.status(201).json({
          success: true,
          message: "Expense created successfully",
          data: {
            ekey: result.rows[0].ekey,
            slipName: slipName,
            slipUrl: slipUrl,
          },
        })
      } catch (error) {
        // If the error is about the s3key column not existing
        if (error.message.includes('column "s3key" of relation "expenses_m2" does not exist')) {
          console.error("s3key column does not exist. Trying without s3key.")

          try {
            // Try inserting with just slipurl
            const fallbackQuery = `
              INSERT INTO public.expenses_m2 
              (type, documentfrom, expensecost, description, slipname, slipurl, slipuploaddate, truckid, driverid)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING ekey
            `

            const fallbackValues = [
              "fuel",
              documentSource,
              cost,
              "",
              slipName,
              slipUrl, // Store the pre-signed URL
              uploadDate,
              truckId || null,
              driverId || null,
            ]

            const fallbackResult = await pool.query(fallbackQuery, fallbackValues)
            console.log("Expense created successfully with ID (without s3key):", fallbackResult.rows[0].ekey)

            res.status(201).json({
              success: true,
              message: "Expense created successfully",
              data: {
                ekey: fallbackResult.rows[0].ekey,
                slipName: slipName,
                slipUrl: slipUrl,
                warning:
                  "S3 key not stored in database. Consider adding s3key column to expenses_m2 table for better URL management.",
              },
            })
          } catch (innerError) {
            // If the error is about the slipurl column not existing
            if (innerError.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
              console.error("slipurl column does not exist. Inserting without slipurl and s3key.")

              // Insert without slipurl and s3key
              const basicQuery = `
                INSERT INTO public.expenses_m2 
                (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
                driverId || null,
              ]

              const basicResult = await pool.query(basicQuery, basicValues)
              console.log("Expense created successfully with ID (basic):", basicResult.rows[0].ekey)

              res.status(201).json({
                success: true,
                message: "Expense created successfully (without S3 URL storage)",
                data: {
                  ekey: basicResult.rows[0].ekey,
                  slipName: slipName,
                  slipUrl: slipUrl,
                  warning:
                    "S3 URL and key not stored in database. Please add slipurl and s3key columns to expenses_m2 table.",
                },
              })
            } else {
              // For other errors, rethrow
              throw innerError
            }
          }
        } else if (error.message.includes('column "slipurl" of relation "expenses_m2" does not exist')) {
          console.error("slipurl column does not exist. Inserting without slipurl.")

          // Insert without slipurl
          const fallbackQuery = `
            INSERT INTO public.expenses_m2 
            (type, documentfrom, expensecost, description, slipname, slipuploaddate, truckid, driverid)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
            driverId || null,
          ]

          const fallbackResult = await pool.query(fallbackQuery, fallbackValues)
          console.log("Expense created successfully with ID (without slipurl):", fallbackResult.rows[0].ekey)

          res.status(201).json({
            success: true,
            message: "Expense created successfully (without S3 URL storage)",
            data: {
              ekey: fallbackResult.rows[0].ekey,
              slipName: slipName,
              slipUrl: slipUrl,
              warning: "S3 URL not stored in database. Please add slipurl column to expenses_m2 table.",
            },
          })
        } else {
          // For other errors, rethrow
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

// GET endpoint to retrieve expense document
router.get("/document/:id", async (req, res) => {
  try {
    const expenseId = req.params.id

    // First, check if the columns exist in the table
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expenses_m2' 
      AND table_schema = 'public'
    `

    const columnsResult = await pool.query(checkColumnsQuery)
    const columnNames = columnsResult.rows.map((row) => row.column_name.toLowerCase())

    // Build the query dynamically based on available columns
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

    // If we have an s3key, generate a fresh pre-signed URL
    let url = slipurl
    if (s3key) {
      url = getSignedUrl(s3key, 3600) // 1 hour expiry for viewing
    }

    // Determine file type for proper handling in the frontend
    let fileType = "image"
    if (slipname) {
      const extension = slipname.split(".").pop().toLowerCase()
      if (["pdf"].includes(extension)) {
        fileType = "pdf"
      }
    }

    // Return the document URL and type
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