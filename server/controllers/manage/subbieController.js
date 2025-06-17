import {
  getAllSubcontractors,
  getSubcontractorById,
  createSubcontractor,
  updateSubcontractor,
  toggleSubcontractorStatus,
} from "../../models/manage/subbieModel.js";

const getAllSubcontractorsHandler = async (req, res) => {
  try {
    console.log("Fetching all subcontractors");
    const subcontractors = await getAllSubcontractors();
    res.json(subcontractors);
  } catch (err) {
    console.error("Error fetching subcontractors:", err);
    res.status(500).json({ error: "Failed to fetch subcontractors" });
  }
};

const getSubcontractorByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching subcontractor ID ${id}`);
    const result = await getSubcontractorById(id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error fetching subcontractor ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch subcontractor" });
  }
};

const createSubcontractorHandler = async (req, res) => {
  try {
    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = req.body;

    console.log("Creating subcontractor with data:", req.body);
    if (!companyname || !location || !contact_person || !cellnum || !email) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields" });
    }

    const result = await createSubcontractor({
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    });
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.status(201).json(result.data);
  } catch (err) {
    console.error("Error creating subcontractor:", err);
    res.status(500).json({ error: "Failed to create subcontractor" });
  }
};

const updateSubcontractorHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = req.body;

    console.log(`Updating subcontractor ID ${id}`);
    const result = await updateSubcontractor(id, {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    });
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error updating subcontractor ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update subcontractor" });
  }
};

const toggleSubcontractorStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`Toggling status for subcontractor ID ${id} to ${status}`);
    const result = await toggleSubcontractorStatus(id, status);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error toggling subcontractor ${req.params.id} status:`, err);
    res.status(500).json({ error: "Failed to toggle subcontractor status" });
  }
};

export {
  getAllSubcontractorsHandler,
  getSubcontractorByIdHandler,
  createSubcontractorHandler,
  updateSubcontractorHandler,
  toggleSubcontractorStatusHandler,
};
