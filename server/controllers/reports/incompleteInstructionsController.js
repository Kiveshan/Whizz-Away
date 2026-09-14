import { getIncompleteInstructions } from "../../models/reports/incompleteInstructionsModel.js"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const getIncompleteInstructionsHandler = async (req, res) => {
  const { from, to } = req.query
  if (!ISO_DATE.test(from || "") || !ISO_DATE.test(to || "")) {
    return res.status(400).json({ error: "from and to must be dates in YYYY-MM-DD format" })
  }
  if (from > to) {
    return res.status(400).json({ error: "from date must be on or before to date" })
  }

  try {
    const rows = await getIncompleteInstructions(from, to)
    res.json({ from, to, rows })
  } catch (err) {
    console.error("Error fetching incomplete instructions report:", err)
    res.status(500).json({ error: "Failed to fetch incomplete instructions" })
  }
}
