import { pool } from "../../config/database.js";

// Define monthNames for numeric-to-name conversion
const monthNames = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const getFuelExpenses = async (client, month, year) => {
  const query = `
    SELECT t.truckregnum, 
           SUM(e.expensecost) as total_cost, 
           to_char(e.slipuploaddate, 'Month') as month_name,
           EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    JOIN m5_trucks t ON e.truckid = t.m5truckskey
    WHERE e.type = 'fuel'
    AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
    AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    AND t.is_subcontractor = false
    GROUP BY t.truckregnum, to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
    ORDER BY total_cost DESC
  `;
  const result = await client.query(query, [month, year]);
  console.log("Raw query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);

  const totalFuelExpense = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.total_cost),
    0
  );
  console.log(
    `Total fuel expense for ${month} ${year} (non-subcontractors): ${totalFuelExpense}`
  );

  const truckData = result.rows.map((row) => ({
    truckregnum: row.truckregnum,
    total_cost: parseFloat(row.total_cost),
    month_name: row.month_name,
    year: row.year,
  }));

  return truckData.map((row) => {
    const cost = parseFloat(row.total_cost);
    const percentage =
      totalFuelExpense > 0 ? ((cost / totalFuelExpense) * 100).toFixed(2) : 0;
    return {
      ...row,
      percentage: parseFloat(percentage),
    };
  });
};

const getTurnoverPerMonth = async (client, month, year) => {
  const query = `
    SELECT 
      c.client, 
      SUM(m.total_cost) as turnover,
      to_char(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    JOIN m5_client c ON i.clientid = c.m5clientkey
    WHERE TRIM(to_char(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY c.client, to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    ORDER BY turnover DESC
  `;
  const result = await client.query(query, [month, year]);
  console.log("Raw query result:", result.rows);
  console.log(`Query returned ${result.rows ? result.rows.length : 0} rows`);

  if (!result.rows) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`);
    return [];
  }

  const totalTurnover = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.turnover || 0),
    0
  );
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);

  return result.rows.map((row) => {
    const turnover = parseFloat(row.turnover || 0);
    const percentage =
      totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0;
    return {
      client: row.client,
      turnover: turnover,
      month_name: row.month_name.trim(),
      year: row.year.toString(),
      percentage: parseFloat(percentage),
    };
  });
};

const getAgingAnalysis = async (client, month, year) => {
  const query = `
    SELECT c.client, 
           SUM(a.current) as current_amount,
           SUM(a."30days") as thirty_days,
           SUM(a."60days") as sixty_days,
           SUM(a."90days") as ninety_days,
           to_char(s.generation_date, 'Month') as month_name,
           EXTRACT(YEAR FROM s.generation_date) as year
    FROM aging_analysis a
    JOIN statements s ON a.aging_key = s.agingid
    JOIN m5_client c ON a.clientid = c.m5clientkey
    WHERE TRIM(to_char(s.generation_date, 'Month')) = $1
    AND EXTRACT(YEAR FROM s.generation_date)::text = $2
    GROUP BY c.client, to_char(s.generation_date, 'Month'), EXTRACT(YEAR FROM s.generation_date)
  `;
  const result = await client.query(query, [month, year]);
  console.log("Raw query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);

  return result.rows.map((row) => ({
    client: row.client,
    current: parseFloat(row.current_amount) || 0,
    thirtyDays: parseFloat(row.thirty_days) || 0,
    sixtyDays: parseFloat(row.sixty_days) || 0,
    ninetyDays: parseFloat(row.ninety_days) || 0,
    month: row.month_name.trim(),
    year: row.year.toString(),
  }));
};

const getTurnoverVsDieselCost = async (numericMonth, year) => {
  const turnoverQuery = `
    SELECT COALESCE(SUM(m.total_cost), 0) as total_turnover,
           TO_CHAR(i.date, 'Month') as month_name,
           EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE EXTRACT(MONTH FROM i.date) = $1
    AND EXTRACT(YEAR FROM i.date) = $2
    GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date);
  `;
  const turnoverResult = await pool.query(turnoverQuery, [numericMonth, year]);
  const totalTurnover = Number(turnoverResult.rows[0]?.total_turnover || 0);

  const dieselQuery = `
    SELECT COALESCE(SUM(expensecost), 0) as total_diesel_cost
    FROM expenses_m2
    WHERE EXTRACT(MONTH FROM slipuploaddate) = $1
      AND EXTRACT(YEAR FROM slipuploaddate) = $2
      AND type = 'fuel';
  `;
  const dieselResult = await pool.query(dieselQuery, [numericMonth, year]);
  const totalDieselCost = Number(dieselResult.rows[0]?.total_diesel_cost || 0);

  console.log(
    `Total turnover for ${monthNames[numericMonth]} ${year}: ${totalTurnover}`
  );
  console.log(
    `Total diesel cost for ${monthNames[numericMonth]} ${year}: ${totalDieselCost}`
  );

  const total = totalTurnover + totalDieselCost;
  let turnoverPercentage = 0;
  let dieselCostPercentage = 0;

  if (total > 0) {
    turnoverPercentage = Number(((totalTurnover / total) * 100).toFixed(2));
    dieselCostPercentage = Number(((totalDieselCost / total) * 100).toFixed(2));
  }

  if (isNaN(turnoverPercentage)) turnoverPercentage = 0;
  if (isNaN(dieselCostPercentage)) dieselCostPercentage = 0;

  return [
    {
      month: monthNames[numericMonth],
      year,
      totalTurnover,
      dieselCost: totalDieselCost,
      turnoverPercentage,
      dieselCostPercentage,
    },
  ];
};

const getAllExpenses = async (client, month, year) => {
  const expensesQuery = `
    SELECT e.truckid,
           e.type as expensedesc,
           e.expensecost as total_cost,
           to_char(e.slipuploaddate, 'Month') as month_name,
           EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    WHERE TRIM(to_char(e.slipuploaddate, 'Month')) = $1
    AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
  `;

  const incomeQuery = `
    SELECT 
      SUM(m.total_cost) as total_income,
      to_char(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(to_char(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
  `;

  const expensesResult = await client.query(expensesQuery, [month, year]);
  console.log("Expenses query result:", expensesResult.rows);

  const incomeResult = await client.query(incomeQuery, [month, year]);
  console.log("Income query result:", incomeResult.rows);

  if (!expensesResult.rows || !incomeResult.rows) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`);
    return { expenses: [], income: 0, month, year };
  }

  const expensesData = expensesResult.rows.map((row) => ({
    truckid: row.truckid,
    expensedesc: row.expensedesc,
    total_cost: parseFloat(row.total_cost),
    month_name: row.month_name.trim(),
    year: row.year.toString(),
  }));

  const totalIncome = parseFloat(incomeResult.rows[0]?.total_income) || 0;

  console.log("Processed expenses data:", expensesData);
  console.log(`Total income for ${month} ${year}: ${totalIncome}`);

  return {
    expenses: expensesData,
    income: totalIncome,
    month,
    year,
  };
};

const getTurnoverPerTruck = async (client, month, year) => {
  const query = `
    WITH DistinctLegs AS (
      SELECT 
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    TrucksPerLeg AS (
      SELECT 
        m1key,
        legnumber,
        COUNT(DISTINCT truckregnumber) AS trucks_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    DetailedLegs AS (
      SELECT 
        l.m1key,
        l.legnumber,
        l.truckregnumber,
        m.total_cost,
        dl.num_legs,
        tpl.trucks_per_leg,
        l.date
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN TrucksPerLeg tpl ON l.m1key = tpl.m1key AND l.legnumber = tpl.legnumber
      JOIN m5_trucks t ON l.truckregnumber = t.truckregnum AND t.is_subcontractor = false
      WHERE l.date IS NOT NULL
    )
    SELECT 
      truckregnumber,
      TO_CHAR(date, 'Month') AS month_name,
      EXTRACT(YEAR FROM date)::TEXT AS year,
      SUM(total_cost / num_legs / trucks_per_leg) AS total_turnover
    FROM DetailedLegs
    WHERE TRIM(TO_CHAR(date, 'Month')) = $1
      AND EXTRACT(YEAR FROM date)::TEXT = $2
    GROUP BY truckregnumber, TO_CHAR(date, 'Month'), EXTRACT(YEAR FROM date)
    ORDER BY total_turnover DESC;
  `;

  const result = await client.query(query, [month, year]);
  console.log("Raw query result:", result.rows);

  if (!result.rows || result.rows.length === 0) return [];

  const totalTurnover = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.total_turnover || 0),
    0
  );

  return result.rows.map((row) => {
    const turnover = parseFloat(row.total_turnover || 0);
    const percentage = totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0;
    return {
      truckregnumber: row.truckregnumber,
      total_turnover: turnover,
      month_name: row.month_name.trim(),
      year: row.year,
      percentage: parseFloat(percentage),
    };
  });
};

const getWagesPerMonth = async (client, month, year) => {
  const query = `
    SELECT 
      SUM(w.net_pay) as total_wages,
      to_char(w.employee_date, 'Month') as month_name,
      EXTRACT(YEAR FROM w.employee_date) as year
    FROM wages w
    WHERE TRIM(to_char(w.employee_date, 'Month')) = $1
    AND EXTRACT(YEAR FROM w.employee_date)::text = $2
    GROUP BY to_char(w.employee_date, 'Month'), EXTRACT(YEAR FROM w.employee_date)
  `;
  const result = await client.query(query, [month, year]);
  console.log("Raw query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);

  if (!result.rows || result.rows.length === 0) {
    console.log(`No wages data returned for ${month} ${year}.`);
    return [];
  }

  return result.rows.map((row) => ({
    month: row.month_name.trim(),
    year: row.year.toString(),
    wages: parseFloat(row.total_wages) || 0,
  }));
};

export {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getWagesPerMonth,
};
