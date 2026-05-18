import { getAllClients } from "../../models/clients/clientModel.js";

const getAllClientsHandler = async (req, res) => {
  try {
    console.log("Fetching clients from database...");
    const clients = await getAllClients(req.user.company_reg_num);
    console.log(`Found ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: error.message });
  }
};

export { getAllClientsHandler };
