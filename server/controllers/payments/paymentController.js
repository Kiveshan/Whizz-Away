import {
  createPayment,
  updatePaymentFilename,
  getPayment,
  getClientPayments,
  getClientInvoices,
} from "../../models/payments/paymentModel.js";
import { s3, getSignedUrl, bucketName } from "../../utils/s3-config.js";

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

    // First, create payment record to get client and invoice details
    const tempPayment = await createPayment(clientId, {
      amount,
      fileupload,
      invoiceid,
      filename: "temp", // Temporary filename
    });

    const { clientname, invoice_num, paykey } = tempPayment.data;

    // Clean filename for S3
    const originalFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    const finalFileName = `${timestamp}_${originalFileName}`;

    // Construct final S3 key: payments/clientName/invoiceNum/filename
    const finalKey = `payments/${clientname.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}/${invoice_num}/${finalFileName}`;

    // Upload file directly to final S3 location
    await s3
      .upload({
        Bucket: bucketName,
        Key: finalKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    // Update payment record with final S3 key
    await updatePaymentFilename(paykey, finalKey);

    // Generate signed URL for response
    const fileUrl = getSignedUrl(finalKey, 3600);

    res.json({
      success: true,
      data: {
        ...tempPayment.data,
        filename: finalKey,
        fileurl: fileUrl,
      },
    });
  } catch (error) {
    console.error(
      `Error uploading payment for client ${req.params.clientId}:`,
      error
    );
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
