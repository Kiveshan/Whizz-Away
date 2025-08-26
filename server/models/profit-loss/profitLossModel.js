import { pool, query } from "../../config/database.js";

const getProfitLossData = async (month, year) => {
  const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
  //I need to add Add ons
  const profitQuery = `
    SELECT 
      'Invoice' AS source,
      i.date,
      m1.total_cost AS amount
    FROM invoice i
    JOIN m1_controller m1 ON i.m1key = m1.m1key
    WHERE EXTRACT(MONTH FROM i.date) = $1 AND EXTRACT(YEAR FROM i.date) = $2
    UNION ALL
    SELECT 
      'Payment' AS source,
      fileupload AS date,
      amount
    FROM payment_m3
    WHERE EXTRACT(MONTH FROM fileupload) = $1 AND EXTRACT(YEAR FROM fileupload) = $2
  `;
  // I need to add Credit notes
  const lossQuery = `
    SELECT 
      'Expense' AS source,
      slipuploaddate AS date,
      expensecost AS amount
    FROM expenses_m2
    WHERE EXTRACT(MONTH FROM slipuploaddate) = $1 AND EXTRACT(YEAR FROM slipuploaddate) = $2
    UNION ALL
    SELECT 
      'Wage' AS source,
      CURRENT_DATE AS date, -- Placeholder since no date applies
      net_pay AS amount
    FROM wages
    UNION ALL
    SELECT 
      'Purchase Order' AS source,
      date,
      total AS amount
    FROM purchase_orders
    WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
    UNION ALL
    SELECT 
      'Leg' AS source,
      date,
      driverrate AS amount
    FROM legs_m2
    WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2
  `;

  try {
    const profitResult = await query(profitQuery, [monthNum, year]);
    const lossResult = await query(lossQuery, [monthNum, year]);

    const profitDetails = profitResult.rows.map(row => ({
      source: row.source,
      date: row.date.toISOString().split('T')[0],
      amount: parseFloat(row.amount || 0),
    }));
    const lossDetails = lossResult.rows.map(row => ({
      source: row.source,
      date: row.date.toISOString().split('T')[0],
      amount: parseFloat(row.amount || 0),
    }));

    const totalProfit = profitDetails.reduce((sum, row) => sum + row.amount, 0);
    const totalLoss = lossDetails.reduce((sum, row) => sum + row.amount, 0);

    return {
      profitDetails,
      lossDetails,
      totalProfit,
      totalLoss,
      net: totalProfit - totalLoss,
    };
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
};

export { getProfitLossData };