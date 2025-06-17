import {
  createPayment,
  getPayment,
  getClientPayments,
} from "../../models/payments/paymentModel.js";

const createPaymentHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { amount, fileupload } = req.body;

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

    console.log(`Inserting payment for client ${clientId}`);
    const result = await createPayment(clientId, { amount, fileupload });
    console.log(`Inserted payment for client ${clientId}:`, result.data);

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
      ? `${req.protocol}://${req.get("host")}/uploads/${payment.filename}`
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
      fileurl: payment.filename
        ? `${req.protocol}://${req.get("host")}/uploads/${payment.filename}`
        : null,
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

export { createPaymentHandler, getPaymentHandler, getClientPaymentsHandler };
