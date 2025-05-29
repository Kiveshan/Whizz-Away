import AWS from "aws-sdk"
import multer from "multer"
import multerS3 from "multer-s3"
import path from "path"
import dotenv from "dotenv"
import pg from "pg"

dotenv.config()

const pool = new pg.Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "Transport5",
  password: process.env.PG_PASSWORD || "123456",
  port: process.env.PG_PORT || 5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || "af-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3()
const bucketName = process.env.S3_BUCKET_NAME || "sherwyn-whizz-away"

const storage = multer.memoryStorage()
const checkBucket = async (bucketName) => {
  try {
    await s3.headBucket({ Bucket: bucketName }).promise()
    console.log(`Bucket ${bucketName} exists`)
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Bucket ${bucketName} doesn't exist, creating...`)
      await s3.createBucket({ Bucket: bucketName }).promise()
      console.log(`Bucket ${bucketName} created`)
    } else {
      console.error(`Error checking bucket: ${error.message}`)
    }
  }
}


checkBucket(bucketName)

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = filetypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image and PDF files are allowed!"))
    }
  },
})

// Function to get client name from database
const getClientName = async (clientId) => {
  try {
    const result = await pool.query(
      "SELECT companyname FROM m5_client WHERE m5clientkey = $1",
      [clientId]
    )
    if (result.rows.length > 0) {
      // Replace spaces with hyphens and remove special characters
      return result.rows[0].companyname.replace(/[^a-zA-Z0-9-_]/g, "-")
    }
    return "unknown-client"
  } catch (error) {
    console.error("Error fetching client name:", error)
    return "unknown-client"
  }
}

// Function to get instruction details from database
const getInstructionDetails = async (instructionId) => {
  try {
    const result = await pool.query(
      "SELECT m1key, client FROM m1_controller WHERE m1key = $1",
      [instructionId]
    )
    if (result.rows.length > 0) {
      return {
        instructionId: result.rows[0].m1key,
        clientId: result.rows[0].client
      }
    }
    return { instructionId, clientId: null }
  } catch (error) {
    console.error("Error fetching instruction details:", error)
    return { instructionId, clientId: null }
  }
}
const getTruckRegNum = async (truckId) => {
  try {
    const result = await pool.query(
      "SELECT truckregnum FROM m5_trucks WHERE m5truckskey = $1",
      [truckId]
    )
    if (result.rows.length > 0) {
      // Replace spaces with hyphens and remove special characters
      return result.rows[0].truckregnum.replace(/[^a-zA-Z0-9-_]/g, "-")
    }
    return "unknown-truck"
  } catch (error) {
    console.error("Error fetching truck registration number:", error)
    return "unknown-truck"
  }
}

// Function to upload file to S3 with proper folder structure
const uploadFileToS3 = async (file, instructionId) => {
  try {
    if (!instructionId) {
      // If no instruction ID, use default path
      const key = `assignment-docs/${Date.now()}-${file.originalname}`
      console.log("No instruction ID provided, using default path:", key)
      
      await s3.upload({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      }).promise()
      
      return key
    }

    // Get instruction details including client ID
    const instructionDetails = await getInstructionDetails(instructionId)
    const clientId = instructionDetails.clientId

    if (!clientId) {
      // If no client ID found, use default path with instruction ID
      const key = `assignment-docs/${instructionId}/${file.originalname}`
      console.log(`No client found for instruction ${instructionId}, using instruction-only path:`, key)
      
      await s3.upload({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      }).promise()
      
      return key
    }

    // Get client name
    const clientName = await getClientName(clientId)
    
    // Create folder structure: assignment-docs/companyname-instructionnumber/
    const key = `assignment-docs/${clientName}-${instructionId}/${file.originalname}`
    console.log(`Uploading to: ${key}`)
    
    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }).promise()
    
    return key
  } catch (error) {
    console.error("Error uploading to S3:", error)
    // Fallback to a safe default path
    const key = `assignment-docs/error-${Date.now()}/${file.originalname}`
    
    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }).promise()
    
    return key
  }
}

const uploadFuelSlipToS3 = async (file, truckId) => {
  try {
    if (!truckId) {
      // If no truck ID, use default path
      const key = `fuel-slips/${file.originalname}`
      console.log("No truck ID provided, using default path:", key)
      
      await s3.upload({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      }).promise()
      
      return key
    }
    const truckRegNum = await getTruckRegNum(truckId)
    
    const key = `fuel-slips/${truckRegNum}/${file.originalname}`
    console.log(`Uploading fuel slip to: ${key}`)
    
    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }).promise()
    
    return key
  } catch (error) {
    console.error("Error uploading fuel expense to S3:", error)
    // Fallback to a safe default path
    const key = `fuel-slips/error/${file.originalname}`
    
    await s3.upload({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }).promise()
    
    return key
  }
}

// Create a multer middleware for fuel expenses
const fuelExpenseUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = filetypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image and PDF files are allowed!"))
    }
  },
})
// Export the multer middleware

export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname })
    },
    key: (req, file, cb) => {
      const folderPath = `fuel-slips/`
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`
      cb(null, folderPath + fileName)
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = filetypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image and PDF files are allowed!"))
    }
  },
})
export const uploadInstructionToS3 = upload
export const uploadFuelExpenseToS3 = fuelExpenseUpload
// Export the S3 upload function
export const uploadToS3Bucket = uploadFileToS3
export const uploadFuelSlipToS3Bucket = uploadFuelSlipToS3
export const getSignedUrl = (key, expiresInSeconds) => {
  return s3.getSignedUrl("getObject", {
    Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
    Key: key,
    Expires: expiresInSeconds,
  })
}

export const s3Client = s3