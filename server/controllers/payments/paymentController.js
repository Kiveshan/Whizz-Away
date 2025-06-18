import {
  createPayment,
  getPayment,
  getClientPayments,
  getClientInvoices,
} from "../../models/payments/paymentModel.js";
import { s3, getSignedUrl } from "../../utils/s3-config.js";
import path from "path";

const createPaymentHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { amount, paymentDate, invoiceId } = req.body;
    const file = req.file;

    // Validation
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be a number",
      });
    }

    if (!paymentDate) {
      return res.status(400).json({
        success: false,
        message: "Payment date is required",
      });
    }

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Proof of payment file is required",
      });
    }

    // Get client and invoice information first
    const clientInfo = await getClientAndInvoiceInfo(clientId, invoiceId);
    if (!clientInfo.success) {
      return res.status(400).json({
        success: false,
        message: clientInfo.message,
      });
    }

    const { clientName, invoiceNum } = clientInfo.data;

    // Sanitize filename and create S3 key
    const originalFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    const fileExtension = path.extname(originalFileName);
    const baseFileName = path.basename(originalFileName, fileExtension);
    const finalFileName = `${baseFileName}_${timestamp}${fileExtension}`;

    // S3 key structure: payments/clientName/invoiceNum/filename
    const s3Key = `payments/${clientName}/${invoiceNum}/${finalFileName}`;

    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        clientId: clientId.toString(),
        invoiceId: invoiceId.toString(),
        uploadDate: new Date().toISOString(),
      },
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`File uploaded successfully to: ${uploadResult.Location}`);

    // Create payment record in database
    const paymentData = {
      amount: Number.parseFloat(amount),
      fileupload: paymentDate,
      invoiceid: Number.parseInt(invoiceId),
      filename: s3Key, // Store the S3 key
    };

    const result = await createPayment(clientId, paymentData);

    if (result.success) {
      // Generate signed URL for immediate access
      const signedUrl = getSignedUrl(s3Key, 3600); // 1 hour expiry

      res.json({
        success: true,
        message: "Payment proof uploaded successfully",
        data: {
          ...result.data,
          fileUrl: signedUrl,
          s3Key: s3Key,
        },
      });
    } else {
      // If database insert fails, clean up the uploaded file
      await s3
        .deleteObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
        })
        .promise();

      throw new Error(result.message || "Failed to create payment record");
    }
  } catch (error) {
    console.error(
      `Error uploading payment for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message:
        error.message || "An error occurred while uploading the payment proof",
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Helper function to get client and invoice information
const getClientAndInvoiceInfo = async (clientId, invoiceId) => {
  try {
    const { pool } = await import("../../config/database.js");
    const client = await pool.connect();

    try {
      // Get client name
      const clientQuery = `SELECT client FROM m5_client WHERE m5clientkey = $1`;
      const clientResult = await client.query(clientQuery, [clientId]);

      if (clientResult.rows.length === 0) {
        return { success: false, message: "Client not found" };
      }

      // Get invoice number
      const invoiceQuery = `SELECT invoice_num FROM invoice WHERE ikey = $1 AND clientid = $2`;
      const invoiceResult = await client.query(invoiceQuery, [
        invoiceId,
        clientId,
      ]);

      if (invoiceResult.rows.length === 0) {
        return { success: false, message: "Invoice not found for this client" };
      }

      return {
        success: true,
        data: {
          clientName: clientResult.rows[0].client.replace(/[^a-zA-Z0-9]/g, "_"), // Sanitize for folder name
          invoiceNum: invoiceResult.rows[0].invoice_num.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          ), // Sanitize for folder name
        },
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error getting client and invoice info:", error);
    return { success: false, message: "Database error occurred" };
  }
};

const getPaymentHandler = async (req, res) => {
  try {
    const { clientId, paymentId } = req.params;
    console.log(`Fetching payment ${paymentId} for client ${clientId}`);

    const result = await getPayment(clientId, paymentId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    const payment = result.data;
    // Generate signed URL if file exists
    if (payment.filename) {
      payment.fileUrl = getSignedUrl(payment.filename, 3600);
      console.log(`Generated signed URL for file: ${payment.filename}`);
      console.log(`Signed URL: ${payment.fileUrl}`);
    } else {
      payment.fileUrl = null;
      console.log("No filename found for payment");
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(
      `Error fetching payment ${req.params.paymentId} for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientPaymentsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(
      `Fetching payments for client ${clientId} with query:`,
      req.query
    );

    const result = await getClientPayments(clientId, { year, month });
    console.log(
      `Query returned ${result.data.length} payments for client ${clientId}`
    );

    // Generate signed URLs for all payments
    const payments = result.data.map((payment) => ({
      ...payment,
      fileUrl: payment.filename ? getSignedUrl(payment.filename, 3600) : null,
    }));

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error(
      `Error fetching payments for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientInvoicesHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`Fetching invoices for client ${clientId}`);

    const result = await getClientInvoices(clientId);
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching invoices for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
  getClientInvoicesHandler,
};
