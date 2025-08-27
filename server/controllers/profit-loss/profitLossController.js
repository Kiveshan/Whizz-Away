import { getProfitLossData } from '../../models/profit-loss/profitLossModel.js';

const generateProfitLossReport = async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const { profitDetails, lossDetails, totalProfit, totalLoss, net } = await getProfitLossData(month, year);

        const responseData = {
            month,
            year,
            profitDetails,
            lossDetails,
            totalProfit,
            totalLoss,
            net,
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export { generateProfitLossReport };