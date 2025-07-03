import {
  createPayment,
  getPayment,
  getClientPayments,
  getClientInvoices,
} from "../../models/payments/paymentModel.js";

const createPaymentHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { amount, fileupload, invoiceid, reference } = req.body;

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

    if (!reference || !reference.trim()) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    // Create payment record with reference
    const payment = await createPayment(clientId, {
      amount,
      fileupload,
      invoiceid,
      reference: reference.trim(),
    });

    res.json({
      success: true,
      data: payment.data,
    });
  } catch (error) {
    console.error(
      `Error creating payment for client ${req.params.clientId}:`,
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

    res.json({
      success: true,
      data: result.data,
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

    res.json({
      success: true,
      data: result.data,
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
