import { getOutputVat, getInputVat } from "../../models/vat-recon/vat-reconModel.js"

export const getVatReconHandler = async (req, res) => {
    try {
        const { month, year } = req.query

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" })
        }

        console.log(`Generating VAT recon report for ${month} ${year}`)

        // Fetch output VAT (from m1_controller - client invoices)
        const outputVat = await getOutputVat(month, year, req.user.company_reg_num)
        console.log(`Fetched ${outputVat.length} output VAT records`)

        // Fetch input VAT (from purchase_orders - expenses)
        const inputVat = await getInputVat(month, year, req.user.company_reg_num)
        console.log(`Fetched ${inputVat.length} input VAT records`)

        // Calculate totals
        const totalOutputVat = outputVat.reduce((sum, item) => {
            return sum + (item.totalCost * item.vatRate) / 100
        }, 0)

        const totalInputVat = inputVat.reduce((sum, item) => {
            return sum + item.vat
        }, 0)

        const vatOwed = totalOutputVat - totalInputVat

        res.json({
            success: true,
            month,
            year,
            outputVat,
            inputVat,
            summary: {
                totalOutputVat: parseFloat(totalOutputVat.toFixed(2)),
                totalInputVat: parseFloat(totalInputVat.toFixed(2)),
                vatOwed: parseFloat(vatOwed.toFixed(2)),
            },
        })
    } catch (error) {
        console.error("Error generating VAT recon report:", error)
        res.status(500).json({ error: "Failed to generate VAT recon report" })
    }
}
