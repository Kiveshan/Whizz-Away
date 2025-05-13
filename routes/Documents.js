import express from "express"
import { uploadInstructionToS3,uploadToS3Bucket, getSignedUrl, s3Client } from "../utils/s3-config.js"
import dotenv from "dotenv"
import pg from "pg"
import multer from "multer"
import  path  from "path"
dotenv.config()

const router = express.Router()

const pool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port:  5432,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
})

router.get("/:instructionId", async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    console.log(`Fetching documents for instruction ID: ${instructionId}`)

    // Get documents from the database
    const result = await pool.query(
      "SELECT document_id, name, type, leg_number, s3key, upload_date FROM documents WHERE m1key = $1",
      [instructionId]
    )

    // For each document, generate a fresh signed URL
    const documentsWithUrls = result.rows.map((doc) => {
      // Generate a fresh pre-signed URL
      const url = getSignedUrl(doc.s3key, 86400) // 24 hour expiry

      return {
        id: doc.document_id.toString(),
        name: doc.name,
        type: doc.type,
        legNumber: doc.leg_number, // Map leg_number to legNumber for frontend
        date: new Date(doc.upload_date).toLocaleDateString("en-GB"),
        url: url,
      }
    })

    res.status(200).json(documentsWithUrls)
  } catch (error) {
    console.error("Error fetching documents:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error.message,
    })
  }
})

// Helper function to get client name
const getClientName = async (clientId) => {
  try {
    const result = await pool.query(
      "SELECT client as companyname FROM m5_client WHERE m5clientkey = $1",
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

// Middleware to prepare upload path
const prepareUploadPath = async (req, res, next) => {
  try {
    const { instructionId } = req.body;
    
    if (!instructionId) {
      req.uploadPath = `assignment-docs/`;
      return next();
    }
    
    // Get instruction details
    const instructionResult = await pool.query(
      "SELECT m1key, client FROM m1_controller WHERE m1key = $1",
      [instructionId]
    );
    
    if (instructionResult.rows.length === 0 || !instructionResult.rows[0].client) {
      req.uploadPath = `assignment-docs/${instructionId}/`;
      return next();
    }
    
    const clientId = instructionResult.rows[0].client;
    
    // Get client name
    const clientName = await getClientName(clientId);
    
    // Set the upload path in the request object
    req.uploadPath = `assignment-docs/${clientName}-${instructionId}/`;
    console.log(`Prepared upload path: ${req.uploadPath}`);
    
    next();
  } catch (error) {
    console.error("Error preparing upload path:", error);
    req.uploadPath = `assignment-docs/error-${Date.now()}/`;
    next();
  }
};

// Use memory storage for temporary file handling
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"));
    }
  },
});

// POST endpoint to upload a document
router.post("/upload", uploadInstructionToS3.single("file"), async (req, res) => {
    console.log("Document upload route accessed")
    console.log("Request body:", req.body)
  
    try {
      const { name, type, instructionId, legNumber } = req.body
      const uploadDate = new Date()
  
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }
  
      // Upload file to S3 with proper folder structure using the function from s3-config.js
      const s3Key = await uploadToS3Bucket(req.file, instructionId)
      
      console.log(`File uploaded to S3 with key: ${s3Key}`)
      
      // Get S3 file information
      const documentName = name || req.file.originalname
  
      // Generate a pre-signed URL that expires in 7 days (604800 seconds)
      const fileUrl = getSignedUrl(s3Key, 604800)
  
      console.log("S3 Upload successful:", {
        documentName,
        s3Key,
        fileUrl,
      })
  
      // Get the client ID from the instruction
      const instructionResult = await pool.query(
        "SELECT client FROM m1_controller WHERE m1key = $1",
        [instructionId]
      )
      
      const clientId = instructionResult.rows.length > 0 ? instructionResult.rows[0].client : null
  
      // Insert document into the database with the URL
      const result = await pool.query(
        `INSERT INTO documents (name, type, leg_number, s3key, upload_date, m1key, client) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING document_id`,
        [
          documentName,
          type || "Instruction Document",
          legNumber || null, // Store legNumber as leg_number
          s3Key,
          uploadDate,
          instructionId,
          clientId
       
        ]
      )
  
      const documentId = result.rows[0].document_id
  
      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        id: documentId.toString(),
        name: documentName,
        type: type || "Instruction Document",
        legNumber: legNumber || null, // Return legNumber to match frontend expectations
        url: fileUrl,
        date: uploadDate.toLocaleDateString("en-GB"),
      })
    } catch (error) {
      console.error("Error uploading document:", error)
      res.status(500).json({
        success: false,
        message: "Failed to upload document",
        error: error.message,
      })
    }
  })

// Add a new endpoint to get documents by client
router.get("/client/:clientId", async (req, res) => {
  try {
    const clientId = req.params.clientId
    console.log(`Fetching documents for client ID: ${clientId}`)

    // Get documents from the database
    const result = await pool.query(
      `SELECT d.document_id, d.name, d.type, d.leg_number, d.s3key, d.upload_date, d.m1key, 
              m.fileref as instruction_reference, d.url
       FROM documents d
       JOIN m1_controller m ON d.m1key = m.m1key
       WHERE d.client = $1
       ORDER BY d.upload_date DESC`,
      [clientId]
    )

    // For each document, generate a fresh signed URL if the stored URL is expired or missing
    const documentsWithUrls = result.rows.map((doc) => {
      // Always generate a fresh pre-signed URL
      const url = getSignedUrl(doc.s3key, 86400) // 24 hour expiry
    
      return {
        id: doc.document_id.toString(),
        name: doc.name,
        type: doc.type,
        legNumber: doc.leg_number,
        date: new Date(doc.upload_date).toLocaleDateString("en-GB"),
        url: url,
        instructionId: doc.m1key,
        instructionReference: doc.instruction_reference
      }
    })

    res.status(200).json(documentsWithUrls)
  } catch (error) {
    console.error("Error fetching documents for client:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch client documents",
      error: error.message,
    })
  }
})
router.delete("/:documentId", async (req, res) => {
  try {
    const documentId = req.params.documentId
    console.log(`Deleting document with ID: ${documentId}`)
    const keyResult = await pool.query("SELECT s3key FROM documents WHERE document_id = $1", [documentId])

    if (keyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      })
    }

    const s3Key = keyResult.rows[0].s3key
    await s3Client
      .deleteObject({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: s3Key,
      })
      .promise()

    console.log(`Deleted file from S3: ${s3Key}`)


    await pool.query("DELETE FROM documents WHERE document_id = $1", [documentId])

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting document:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    })
  }
})

// Test the router
console.log("Document routes loaded successfully")

export default router