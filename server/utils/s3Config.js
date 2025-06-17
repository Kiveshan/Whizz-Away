import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

// Initialize S3 client for employee documents
const s3ClientEmployees = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.Employee_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Employee_AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize S3 client for truck documents
const s3ClientTrucks = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.Trucks_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.Trucks_AWS_SECRET_ACCESS_KEY,
  },
});

// Configure Multer-S3 for employee document uploads
const uploadEmployeeDocs = multer({
  storage: multerS3({
    s3: s3ClientEmployees,
    bucket: process.env.Employee_AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      const employeeNum = req.body.employeenum || "unknown";
      const employeeName = req.body.name || "unknown";
      const sanitizedEmployeeName = employeeName.trim().replace(/\s+/g, "_");
      const folderName = `${employeeNum}_${sanitizedEmployeeName}`;
      const uniqueFileName = `${Date.now()}_${file.originalname}`;
      const key = `Employees/${folderName}/${uniqueFileName}`;
      console.log("Uploading to S3 key:", key);
      cb(null, key);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDFs are allowed"), false);
  },
});

// Configure Multer-S3 for truck document uploads
const uploadTruckDocs = multer({
  storage: multerS3({
    s3: s3ClientTrucks,
    bucket: process.env.Trucks_AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      const truckregnum = req.body.truckregnum || "default";
      const uniqueName = `${Date.now()}_${file.originalname}`;
      const key = `Trucks/${truckregnum}/${uniqueName}`;
      console.log("Uploading to S3 key:", key);
      cb(null, key);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDFs are allowed"), false);
  },
});

export {
  s3ClientEmployees,
  s3ClientTrucks,
  uploadEmployeeDocs,
  uploadTruckDocs,
};
