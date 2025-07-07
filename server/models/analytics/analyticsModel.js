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

const getTurnoverPerMonth = async (client, month, year, clientId = null) => {
  const params = [month, year];
  let clientQuery = `
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
  `;
  if (clientId) {
    clientQuery += ` AND i.clientid = $3`;
    params.push(clientId);
  }
  clientQuery += `
    GROUP BY c.client, to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    ORDER BY turnover DESC
  `;
  
  const totalQuery = `
    SELECT 
      SUM(m.total_cost) as turnover,
      to_char(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(to_char(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
  `;
  
  const [clientResult, totalResult] = await Promise.all([
    clientId ? client.query(clientQuery, params) : Promise.resolve({ rows: [] }),
    client.query(totalQuery, [month, year])
  ]);
  
  console.log("Client query result:", clientResult.rows);
  console.log("Total turnover query result:", totalResult.rows);

  const totalTurnover = parseFloat(totalResult.rows[0]?.turnover || 0);
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);

  let turnoverData = [{
    client: "Total Turnover",
    turnover: totalTurnover,
    month_name: month.trim(),
    year: year.toString(),
    percentage: 100,
  }];

  if (clientId && clientResult.rows.length > 0) {
    const clientData = clientResult.rows.map((row) => {
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
    turnoverData = [...clientData, turnoverData[0]]; // Client data first, then total
  }

  console.log("Processed turnover data:", turnoverData);
  return turnoverData;
};

const getAllClients = async (client) => {
  const query = `
    SELECT m5clientkey, client
    FROM m5_client
    WHERE status = true
    ORDER BY client
  `;
  const result = await client.query(query);
  console.log("Clients query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);
  return result.rows.map((row) => ({
    m5clientkey: row.m5clientkey,
    client: row.client,
  }));
};

const getAllSubcontractors = async (client) => {
  const query = `
    SELECT userid, companyname
    FROM m5_employee
    WHERE roleid = 6
    ORDER BY companyname
  `;
  const result = await client.query(query);
  console.log("Subcontractors query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);
  return result.rows.map((row) => ({
    userid: row.userid,
    companyname: row.companyname,
  }));
};

const getAgingAnalysis = async (client, month, year, clientId = null) => {
  const params = [month, year];
  let query = `
    SELECT 
      ${clientId ? 'c.client' : "'Total Aging' as client"}, 
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
  `;
  if (clientId) {
    query += ` AND a.clientid = $3`;
    params.push(clientId);
  }
  query += `
    GROUP BY ${clientId ? 'c.client,' : ''} to_char(s.generation_date, 'Month'), EXTRACT(YEAR FROM s.generation_date)
  `;
  const result = await client.query(query, params);
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
    TruckCountsPerLeg AS (
      SELECT 
        m1key,
        legnumber,
        COUNT(DISTINCT truckregnumber) AS trucks_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegTruckContributions AS (
      SELECT 
        l.m1key,
        l.legnumber,
        l.truckregnumber,
        m.total_cost,
        dl.num_legs,
        tcpl.trucks_per_leg,
        (m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS turnover_contribution,
        m.pickupdate
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
      JOIN m5_trucks t ON l.truckregnumber = t.truckregnum AND t.is_subcontractor = false
      WHERE m.pickupdate IS NOT NULL
    )
    SELECT 
      ltc.truckregnumber,
      TO_CHAR(ltc.pickupdate, 'Month') AS month_name,
      EXTRACT(YEAR FROM ltc.pickupdate)::TEXT AS year,
      SUM(ltc.turnover_contribution) AS total_turnover
    FROM LegTruckContributions ltc
    WHERE TRIM(TO_CHAR(ltc.pickupdate, 'Month')) = $1
      AND EXTRACT(YEAR FROM ltc.pickupdate)::TEXT = $2
    GROUP BY ltc.truckregnumber, TO_CHAR(ltc.pickupdate, 'Month'), EXTRACT(YEAR FROM ltc.pickupdate)
    ORDER BY total_turnover DESC;
  `;
  const result = await client.query(query, [month, year]);
  console.log("Raw query result for month", month, year, ":", result.rows);
  console.log(`Query returned ${result.rows ? result.rows.length : 0} rows`);

  if (!result.rows || result.rows.length === 0) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`);
    return [];
  }

  const totalTurnover = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.total_turnover || 0),
    0
  );
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);

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

const getSubcontractorTurnoverPerMonth = async (client, month, year) => {
  const query = `
    SELECT 
      e.companyname,
      SUM(l.driverrate) as turnover,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
    GROUP BY e.companyname, TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
    ORDER BY turnover DESC
  `;
  const result = await client.query(query, [month, year]);
  console.log("Subcontractor turnover query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);

  if (!result.rows || result.rows.length === 0) {
    console.log(`No subcontractor turnover data returned for ${month} ${year}.`);
    return [];
  }

  const totalTurnover = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.turnover || 0),
    0
  );
  console.log(`Total subcontractor turnover for ${month} ${year}: ${totalTurnover}`);

  return result.rows.map((row) => {
    const turnover = parseFloat(row.turnover || 0);
    const percentage = totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0;
    return {
      companyname: row.companyname,
      turnover: turnover,
      month: row.month_name.trim(),
      year: row.year.toString(),
      percentage: parseFloat(percentage),
    };
  });
};

const getSubcontractorVsTurnover = async (client, month, year, subcontractorId = null) => {
  const params = [month, year];
  let subcontractorQuery = `
    SELECT 
      e.companyname,
      SUM(l.driverrate) as subcontractor_turnover,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
  `;
  if (subcontractorId) {
    subcontractorQuery += ` AND e.userid = $3`;
    params.push(subcontractorId);
  }
  subcontractorQuery += `
    GROUP BY e.companyname, TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `;

  const totalTurnoverQuery = `
    SELECT 
      SUM(m.total_cost) as total_turnover,
      TO_CHAR(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
  `;

  const [subcontractorResult, totalTurnoverResult] = await Promise.all([
    subcontractorId ? client.query(subcontractorQuery, params) : Promise.resolve({ rows: [] }),
    client.query(totalTurnoverQuery, [month, year])
  ]);

  console.log("Subcontractor turnover query result:", subcontractorResult.rows);
  console.log("Total turnover query result:", totalTurnoverResult.rows);

  const totalTurnover = parseFloat(totalTurnoverResult.rows[0]?.total_turnover || 0);
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);

  const turnoverData = [];

  // Add total turnover entry
  turnoverData.push({
    name: "Total Turnover",
    value: totalTurnover,
    type: "total",
    percentage: 100,
    month: month.trim(),
    year: year.toString(),
  });

  // Add subcontractor turnover entry if subcontractorId is provided
  if (subcontractorId && subcontractorResult.rows.length > 0) {
    const row = subcontractorResult.rows[0];
    const subcontractorTurnover = parseFloat(row.subcontractor_turnover || 0);
    const percentage = totalTurnover > 0 ? ((subcontractorTurnover / totalTurnover) * 100).toFixed(2) : 0;
    turnoverData.push({
      name: row.companyname,
      value: subcontractorTurnover,
      type: "subcontractor",
      percentage: parseFloat(percentage),
      month: row.month_name.trim(),
      year: row.year.toString(),
    });
  }

  console.log("Processed subcontractor vs turnover data:", turnoverData);
  return turnoverData;
};

export {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getWagesPerMonth,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
};