import {
  getCompletedInvoices,
  getInvoiceDetails,
  checkInvoiceExists,
  createInvoice,
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

// Handler to check if an m1key exists in the invoice table
const checkInvoiceExistsHandler = async (req, res) => {
  try {
    const { m1key } = req.params;
    console.log(`Checking if invoice exists for m1key: ${m1key}`);
    
    if (!m1key) {
      return res.status(400).json({
        success: false,
        message: "m1key parameter is required",
      });
    }

    const result = await checkInvoiceExists(m1key);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      exists: result.exists,
    });
  } catch (error) {
    console.error("Error checking if invoice exists:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Handler to create a new invoice for an instruction
const createInvoiceHandler = async (req, res) => {
  try {
    const { m1key, clientId } = req.body;
    console.log(`Creating invoice for m1key: ${m1key}, clientId: ${clientId}`);
    
    if (!m1key || !clientId) {
      return res.status(400).json({
        success: false,
        message: "m1key and clientId are required",
      });
    }

    const result = await createInvoice({ m1key, clientId });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export { 
  getCompletedInvoicesHandler, 
  getInvoiceDetailsHandler,
  checkInvoiceExistsHandler,
  createInvoiceHandler 
};
