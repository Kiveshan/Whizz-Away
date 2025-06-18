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
    const { amount, fileupload, invoiceid } = req.body;
    const file = req.file;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be a number",
      });
    }

    if (!fileupload) {
      return res.status(400).json({
        success: false,
        message: "Payment date (fileupload) is required",
      });
    }

    if (!invoiceid) {
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

    // Construct S3 key: payments/clientName/invoiceNum/filename
    const originalFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const tempKey = `temp/${Date.now()}_${originalFileName}`;

    // Upload file to temporary S3 location
    await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
        Key: tempKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    // Create payment to get clientname and invoice_num
    const paymentData = await createPayment(clientId, {
      amount,
      fileupload,
      invoiceid,
      filename: tempKey,
    });
    const { clientname, invoice_num } = paymentData.data;

    // Move file to final S3 location
    const finalKey = `payments/${clientname}/${invoice_num}/${originalFileName}`;
    await s3
      .copyObject({
        Bucket: process.env.S3_BUCKET_NAME,
        CopySource: `${process.env.S3_BUCKET_NAME}/${tempKey}`,
        Key: finalKey,
      })
      .promise();
    await s3
      .deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: tempKey,
      })
      .promise();

    // Update payment with final S3 key
    const result = await createPayment(clientId, {
      amount,
      fileupload,
      invoiceid,
      filename: finalKey,
    });

    result.data.fileurl = getSignedUrl(finalKey, 3600);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error uploading payment for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
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
    payment.fileurl = payment.filename
      ? getSignedUrl(payment.filename, 3600)
      : null;

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

    const payments = result.data.map((payment) => ({
      ...payment,
      fileurl: payment.filename ? getSignedUrl(payment.filename, 3600) : null,
    }));

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error(`Error fetching payments for client ${clientId}:`, error);
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
    console.error(`Error fetching invoices for client ${clientId}:`, error);
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
