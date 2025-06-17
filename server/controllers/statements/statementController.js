import {
  getClientStatements,
  getStatementDetails,
} from "../../models/statements/statementModel.js";

const getClientStatementsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(
      `Fetching statements for client ${clientId} with query:`,
      req.query
    );

    const result = await getClientStatements(clientId, { year, month });
    console.log(
      `Query returned ${result.data.length} statements for client ${clientId}`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching statements for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getStatementDetailsHandler = async (req, res) => {
  try {
    const { statementId } = req.params;
    console.log(`Fetching statement details for statement ${statementId}`);

    const result = await getStatementDetails(statementId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    const generationDate = new Date(result.data.generation_date);
    const statementMonth =
      generationDate.getMonth() === 0 ? 11 : generationDate.getMonth() - 1;
    const statementYear =
      generationDate.getMonth() === 0
        ? generationDate.getFullYear() - 1
        : generationDate.getFullYear();
    const statementStartDate = new Date(
      statementYear,
      statementMonth,
      1,
      12,
      0,
      0
    );
    const statementEndDate = new Date(
      statementYear,
      statementMonth + 1,
      0,
      12,
      0,
      0
    );
    const formattedStatementStartDate = statementStartDate
      .toISOString()
      .split("T")[0];
    const formattedStatementEndDate = statementEndDate
      .toISOString()
      .split("T")[0];

    console.log(
      `Statement period (invoices): ${formattedStatementStartDate} to ${formattedStatementEndDate}`
    );

    const paymentMonth = statementMonth === 0 ? 11 : statementMonth - 1;
    const paymentYear =
      statementMonth === 0 ? statementYear - 1 : statementYear;
    const paymentStartDate = new Date(paymentYear, paymentMonth, 1, 12, 0, 0);
    const paymentEndDate = new Date(paymentYear, paymentMonth + 1, 0, 12, 0, 0);
    const formattedPaymentStartDate = paymentStartDate
      .toISOString()
      .split("T")[0];
    const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

    console.log(
      `Payment period: ${formattedPaymentStartDate} to ${formattedPaymentEndDate}`
    );

    console.log(
      `Fetched statement ${statementId} with opening balance R${result.data.opening_balance}, ${result.data.invoices.length} invoices, and ${result.data.payments.length} payments`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching statement ${statementId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export { getClientStatementsHandler, getStatementDetailsHandler };
