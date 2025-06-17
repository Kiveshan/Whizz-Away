import {
  getCompletedInvoices,
  getInvoiceDetails,
} from "../../models/invoices/invoiceModel.js";

const getCompletedInvoicesHandler = async (req, res) => {
  try {
    console.log(
      "Received request for completed invoices with query:",
      req.query
    );

    const { year, month, type, clientId } = req.query;
    const result = await getCompletedInvoices({ year, month, type, clientId });
    console.log(`Query returned ${result.data.length} rows`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching completed instructions:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getInvoiceDetailsHandler = async (req, res) => {
  try {
    console.log("Received request for invoice details with ID:", req.params.id);
    const { id } = req.params;

    const result = await getInvoiceDetails(id);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    let containers = result.data.containers;
    if (containers.length === 0 && result.data.num_containers > 0) {
      console.log(
        `Creating ${result.data.num_containers} dummy containers for invoice ID ${id}`
      );
      containers = Array.from(
        { length: result.data.num_containers },
        (_, i) => ({
          container_number: `CONT${String(i + 1).padStart(6, "0")}`,
          weight: `${Math.floor(Math.random() * 5000) + 10000} kg`,
        })
      );
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        containers,
      },
    });
  } catch (error) {
    console.error("Error fetching instruction for invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export { getCompletedInvoicesHandler, getInvoiceDetailsHandler };
