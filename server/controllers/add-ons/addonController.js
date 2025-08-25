import {
  getAddonsByClient,
  createAddon,
  getAddonById,
  updateAddon,
  deleteAddon,
  getCompanyInfo,
  getClientById,
} from "../../models/add-ons/addonModel.js";

const getClientAddonsHandler = async (req, res) => {
  try {
    console.log(
      "Received request for client add-ons with params:",
      req.params,
      "query:",
      req.query
    );

    const { clientId } = req.params;
    const { year, month } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    const result = await getAddonsByClient(clientId, { year, month });
    console.log(`Query returned ${result.data.length} add-ons`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching client add-ons:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const createAddonHandler = async (req, res) => {
  try {
    console.log("Creating add-on with data:", req.body);
    const { client_id, description, amount, category, date } = req.body;

    if (!client_id || !description || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: client_id, description, amount, category, date",
      });
    }

    const numAmount = Number.parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    const result = await createAddon({
      client_id,
      description: description.trim(),
      amount: numAmount,
      category: category.trim(),
      date,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getAddonByIdHandler = async (req, res) => {
  try {
    console.log(
      "Received request for add-on details with ID:",
      req.params.addonId
    );
    const { addonId } = req.params;

    if (!addonId) {
      return res.status(400).json({
        success: false,
        message: "Add-on ID is required",
      });
    }

    const result = await getAddonById(addonId);
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
    console.error("Error fetching add-on details:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const updateAddonHandler = async (req, res) => {
  try {
    console.log(
      "Updating add-on with ID:",
      req.params.addonId,
      "data:",
      req.body
    );
    const { addonId } = req.params;
    const { description, amount, category, date } = req.body;

    if (!addonId) {
      return res.status(400).json({
        success: false,
        message: "Add-on ID is required",
      });
    }

    if (!description || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: description, amount, category, date",
      });
    }

    const numAmount = Number.parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    const result = await updateAddon(addonId, {
      description: description.trim(),
      amount: numAmount,
      category: category.trim(),
      date,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: "Add-on updated successfully",
    });
  } catch (error) {
    console.error("Error updating add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const deleteAddonHandler = async (req, res) => {
  try {
    console.log("Deleting add-on with ID:", req.params.addonId);
    const { addonId } = req.params;

    if (!addonId) {
      return res.status(400).json({
        success: false,
        message: "Add-on ID is required",
      });
    }

    const result = await deleteAddon(addonId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "Add-on deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getCompanyInfoHandler = async (req, res) => {
  try {
    console.log("Received request for company info");
    const result = await getCompanyInfo();
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching company info:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientByIdHandler = async (req, res) => {
  try {
    console.log(
      "Received request for client info with ID:",
      req.params.clientId
    );
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    const result = await getClientById(clientId);
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
    console.error("Error fetching client info:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  getClientAddonsHandler,
  createAddonHandler,
  getAddonByIdHandler,
  updateAddonHandler,
  deleteAddonHandler,
  getCompanyInfoHandler,
  getClientByIdHandler,
};
