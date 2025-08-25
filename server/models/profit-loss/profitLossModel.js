import { pool, query } from "../../config/database.js";

const getProfitLossData = async (month, year) => {
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1; // Convert month name to 1-based number

    const profitQuery = `
    SELECT 
      i.date,
      m1.total_cost AS amount
    FROM invoice i
    JOIN m1_controller m1 ON i.m1key = m1.m1key
    WHERE EXTRACT(MONTH FROM i.date) = $1 AND EXTRACT(YEAR FROM i.date) = $2
    UNION ALL
    SELECT 
      fileupload AS date,
      amount
    FROM payment_m3
    WHERE EXTRACT(MONTH FROM fileupload) = $1 AND EXTRACT(YEAR FROM fileupload) = $2
  `;

    const lossQuery = `
    SELECT 
      slipuploaddate AS date,
      expensecost AS amount
    FROM expenses_m2
    WHERE EXTRACT(MONTH FROM slipuploaddate) = $1 AND EXTRACT(YEAR FROM slipuploaddate) = $2
    UNION ALL
    SELECT 
      CURRENT_DATE AS date, -- Since no date applies, use current date as placeholder
      net_pay AS amount
    FROM wages
    UNION ALL
    SELECT 
      date,
      total AS amount
    FROM purchase_orders
    WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
    UNION ALL
    SELECT 
      date,
      driverrate AS amount
    FROM legs_m2
    WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
  `;

    try {
        const profitResult = await query(profitQuery, [monthNum, year]);
        const lossResult = await query(lossQuery, [monthNum, year]);

        const totalProfit = profitResult.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
        const totalLoss = lossResult.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

        return {
            profit: totalProfit,
            loss: totalLoss,
            net: totalProfit - totalLoss,
        };
    } catch (error) {
        throw new Error(`Database error: ${error.message}`);
    }
};

export { getProfitLossData };