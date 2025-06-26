import { getAllSubContractors } from "../../models/subcontractors/subContractorModel.js";
const getAllSubContractorsHandler = async (req, res) => {
  try {
    console.log("Fetching clients from database...");
    const clients = await getAllSubContractors();
    console.log(`Found ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: error.message });
  }
};

export { getAllSubContractorsHandler };
