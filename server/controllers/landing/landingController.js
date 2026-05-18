import { getInstructionStatusCounts } from "../../models/landing/landingModel.js";

export const getLandingStats = async (req, res) => {
  if (!req.user?.company_reg_num) {
    return res.json({ total: 0, new: 0, in_progress: 0, completed: 0 });
  }
  try {
    const stats = await getInstructionStatusCounts(req.user.company_reg_num);
    return res.json(stats);
  } catch (error) {
    console.error("Error fetching landing stats:", error);
    return res.status(500).json({ message: "Failed to fetch landing stats" });
  }
};
