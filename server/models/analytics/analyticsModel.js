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
    AND t.status = true
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
    WITH DistinctLegs AS (
      SELECT m1key, COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT m1key, legnumber, COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::text = $2
      GROUP BY l.m1key
    ),
    InvoiceTurnover AS (
      SELECT 
        SUM(m.total_cost) as invoice_turnover,
        to_char(i.date, 'Month') as month_name,
        EXTRACT(YEAR FROM i.date) as year
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE TRIM(to_char(i.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM i.date)::text = $2
      GROUP BY to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    )
    SELECT 
      COALESCE(it.invoice_turnover, 0) + COALESCE(SUM(ldc.subcontractor_turnover), 0) as turnover,
      it.month_name,
      it.year
    FROM InvoiceTurnover it
    LEFT JOIN LegDriverContributions ldc ON 1=1
    GROUP BY it.invoice_turnover, it.month_name, it.year
  `;

  const [clientResult, totalResult] = await Promise.all([
    clientId ? client.query(clientQuery, params) : Promise.resolve({ rows: [] }),
    client.query(totalQuery, [month, year])
  ]);

  console.log("Client query result:", clientResult.rows);
  console.log("Total turnover query result:", totalResult.rows);

  const totalTurnover = parseFloat(totalResult.rows[0]?.turnover || 0);
  console.log(`Total turnover (including subcontractors) for ${month} ${year}: ${totalTurnover}`);

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

const getAllTrucks = async (client) => {
  const query = `
    SELECT m5truckskey, truckregnum
    FROM m5_trucks
    WHERE is_subcontractor = false AND t.status = true
    ORDER BY truckregnum
  `;
  const result = await client.query(query);
  console.log("Trucks query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);
  return result.rows.map((row) => ({
    m5truckskey: row.m5truckskey,
    truckregnum: row.truckregnum,
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
    WITH DistinctLegs AS (
      SELECT m1key, COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT m1key, legnumber, COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND EXTRACT(MONTH FROM m.pickupdate) = $1
        AND EXTRACT(YEAR FROM m.pickupdate) = $2
      GROUP BY l.m1key
    ),
    InvoiceTurnover AS (
      SELECT 
        SUM(m.total_cost) as invoice_turnover,
        TO_CHAR(i.date, 'Month') as month_name,
        EXTRACT(YEAR FROM i.date) as year
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE EXTRACT(MONTH FROM i.date) = $1
      AND EXTRACT(YEAR FROM i.date) = $2
      GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    )
    SELECT 
      COALESCE(it.invoice_turnover, 0) + COALESCE(SUM(ldc.subcontractor_turnover), 0) as total_turnover,
      it.month_name,
      it.year
    FROM InvoiceTurnover it
    LEFT JOIN LegDriverContributions ldc ON 1=1
    GROUP BY it.invoice_turnover, it.month_name, it.year
  `;

  const dieselQuery = `
    SELECT COALESCE(SUM(expensecost), 0) as total_diesel_cost
    FROM expenses_m2
    WHERE EXTRACT(MONTH FROM slipuploaddate) = $1
      AND EXTRACT(YEAR FROM slipuploaddate) = $2
      AND type = 'fuel';
  `;

  const [turnoverResult, dieselResult] = await Promise.all([
    pool.query(turnoverQuery, [numericMonth, year]),
    pool.query(dieselQuery, [numericMonth, year])
  ]);

  const totalTurnover = Number(turnoverResult.rows[0]?.total_turnover || 0);
  const totalDieselCost = Number(dieselResult.rows[0]?.total_diesel_cost || 0);

  console.log(
    `Total turnover (including subcontractors) for ${monthNames[numericMonth]} ${year}: ${totalTurnover}`
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
  const fuelQuery = `
    SELECT 
      COALESCE(SUM(e.expensecost), 0) as total_fuel_cost,
      to_char(e.slipuploaddate, 'Month') as month_name,
      EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    WHERE e.type = 'fuel'
      AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
      AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
  `;

  const purchaseOrderQuery = `
    SELECT 
      COALESCE(SUM(p.total), 0) as total_po_cost,
      to_char(p.date, 'Month') as month_name,
      EXTRACT(YEAR FROM p.date) as year
    FROM purchase_orders p
    WHERE TRIM(to_char(p.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM p.date)::text = $2
    GROUP BY to_char(p.date, 'Month'), EXTRACT(YEAR FROM p.date)
  `;

  const subcontractorQuery = `
    SELECT 
      COALESCE(SUM(l.driverrate), 0) as total_subcontractor_expense,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
    GROUP BY TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `;

  const wagesQuery = `
    SELECT 
      COALESCE(SUM(w.net_pay), 0) as total_wages,
      to_char(w.employee_date, 'Month') as month_name,
      EXTRACT(YEAR FROM w.employee_date) as year
    FROM wages w
    WHERE TRIM(to_char(w.employee_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM w.employee_date)::text = $2
    GROUP BY to_char(w.employee_date, 'Month'), EXTRACT(YEAR FROM w.employee_date)
  `;

  const incomeQuery = `
    SELECT 
      COALESCE(SUM(m.total_cost), 0) as total_income,
      to_char(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(to_char(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
  `;

  const [fuelResult, purchaseOrderResult, subcontractorResult, wagesResult, incomeResult] = await Promise.all([
    client.query(fuelQuery, [month, year]),
    client.query(purchaseOrderQuery, [month, year]),
    client.query(subcontractorQuery, [month, year]),
    client.query(wagesQuery, [month, year]),
    client.query(incomeQuery, [month, year])
  ]);

  console.log("Fuel query result:", fuelResult.rows);
  console.log("Purchase order query result:", purchaseOrderResult.rows);
  console.log("Subcontractor expense query result:", subcontractorResult.rows);
  console.log("Wages query result:", wagesResult.rows);
  console.log("Income query result:", incomeResult.rows);

  const totalFuelCost = parseFloat(fuelResult.rows[0]?.total_fuel_cost || 0);
  const totalPurchaseOrderCost = parseFloat(purchaseOrderResult.rows[0]?.total_po_cost || 0);
  const totalSubcontractorExpense = parseFloat(subcontractorResult.rows[0]?.total_subcontractor_expense || 0);
  const totalWages = parseFloat(wagesResult.rows[0]?.total_wages || 0);
  const totalIncome = parseFloat(incomeResult.rows[0]?.total_income || 0);

  const totalExpenses = totalFuelCost + totalPurchaseOrderCost + totalSubcontractorExpense + totalWages;

  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`);
  console.log(`Total purchase order cost for ${month} ${year}: ${totalPurchaseOrderCost}`);
  console.log(`Total subcontractor expense for ${month} ${year}: ${totalSubcontractorExpense}`);
  console.log(`Total wages for ${month} ${year}: ${totalWages}`);
  console.log(`Total expenses for ${month} ${year}: ${totalExpenses}`);
  console.log(`Total income for ${month} ${year}: ${totalIncome}`);

  const expensesData = [{
    expensedesc: "All Expenses",
    total_cost: totalExpenses,
    month_name: month.trim(),
    year: year.toString(),
  }];

  return {
    expenses: expensesData,
    income: totalIncome,
    month: month.trim(),
    year: year.toString(),
  };
};

const getTurnoverPerTruck = async (client, month, year) => {
  const params = [month, year];
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
    TurnoverPerTruck AS (
      SELECT 
        l.truckregnumber,
        SUM(m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS total_turnover,
        TO_CHAR(m.pickupdate, 'Month') AS month_name,
        EXTRACT(YEAR FROM m.pickupdate)::TEXT AS year
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
      JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
      WHERE t.is_subcontractor = false
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::TEXT = $2
        AND t.status = true
      GROUP BY l.truckregnumber, TO_CHAR(m.pickupdate, 'Month'), EXTRACT(YEAR FROM m.pickupdate)
    )
    SELECT 
      truckregnumber,
      COALESCE(total_turnover, 0) AS total_turnover,
      month_name,
      year
    FROM TurnoverPerTruck
    ORDER BY total_turnover DESC
  `;

  try {
    const result = await client.query(query, params);
    console.log("Turnover per Truck query result:", result.rows);
    console.log(`Query returned ${result.rows.length} rows`);

    if (!result.rows || result.rows.length === 0) {
      console.log(`No rows returned for ${month} ${year}. Check query or data.`);
      return [];
    }

    const totalTurnover = result.rows.reduce(
      (sum, row) => sum + parseFloat(row.total_turnover || 0),
      0
    );
    console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);

    const data = result.rows.map((row) => {
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

    console.log("Processed turnover per truck data:", data);
    return data;
  } catch (err) {
    console.error("Error executing turnover per truck query:", err);
    throw new Error(`Database query failed: ${err.message}`);
  }
};

const getSubcontractorTurnoverPerMonth = async (client, month, year) => {
  const query = `
    WITH DistinctLegs AS (
      SELECT 
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT 
        m1key,
        legnumber,
        COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::text = $2
      GROUP BY l.m1key
    ),
    TotalSubcontractorTurnover AS (
      SELECT 
        COALESCE(SUM(ldc.subcontractor_turnover), 0) AS total_subcontractor_turnover,
        TO_CHAR(m.pickupdate, 'Month') AS month_name,
        EXTRACT(YEAR FROM m.pickupdate)::TEXT AS year
      FROM LegDriverContributions ldc
      JOIN m1_controller m ON ldc.m1key = m.m1key
      WHERE TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::TEXT = $2
      GROUP BY TO_CHAR(m.pickupdate, 'Month'), EXTRACT(YEAR FROM m.pickupdate)
    ),
    TotalTurnover AS (
      SELECT 
        COALESCE(SUM(m.total_cost), 0) + COALESCE((SELECT SUM(ldc.subcontractor_turnover) FROM LegDriverContributions ldc), 0) AS total_turnover,
        TO_CHAR(i.date, 'Month') AS month_name,
        EXTRACT(YEAR FROM i.date)::TEXT AS year
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
        AND EXTRACT(YEAR FROM i.date)::TEXT = $2
      GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    )
    SELECT 
      'Total Turnover' AS name,
      tt.total_turnover AS value,
      'total' AS type,
      100 AS percentage,
      tt.month_name AS month,
      tt.year
    FROM TotalTurnover tt
    UNION ALL
    SELECT 
      'Total Subcontractor Turnover' AS name,
      tst.total_subcontractor_turnover AS value,
      'subcontractor' AS type,
      (tst.total_subcontractor_turnover / tt.total_turnover * 100)::NUMERIC(5,2) AS percentage,
      tst.month_name AS month,
      tst.year
    FROM TotalSubcontractorTurnover tst
    CROSS JOIN TotalTurnover tt
    ORDER BY value DESC;
  `;

  const result = await client.query(query, [month, year]);
  console.log("Subcontractor turnover query result for month", month, year, ":", result.rows);
  console.log(`Query returned ${result.rows ? result.rows.length : 0} rows`);

  if (!result.rows || result.rows.length === 0) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`);
    return [];
  }

  const totalTurnover = parseFloat(result.rows.find(row => row.type === 'total')?.value || 0);
  console.log(`Total turnover (including subcontractors) for ${month} ${year}: ${totalTurnover}`);

  const turnoverData = result.rows.map(row => ({
    name: row.name,
    value: parseFloat(row.value || 0),
    type: row.type,
    percentage: parseFloat(row.percentage || 0),
    month: row.month.trim(),
    year: row.year,
  }));

  console.log("Processed turnover vs total subcontractor data:", turnoverData);
  return turnoverData;
};

const getSubcontractorVsTurnover = async (client, month, year, subcontractorId = null) => {
  const params = [month, year];
  let subcontractorQuery = `
    WITH DistinctLegs AS (
      SELECT 
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT 
        m1key,
        legnumber,
        COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        l.driverid,
        m.total_cost,
        dl.num_legs,
        dcpl.drivers_per_leg,
        (m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS turnover_contribution,
        m.pickupdate
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND m.pickupdate IS NOT NULL
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::TEXT = $2
  `;
  if (subcontractorId) {
    subcontractorQuery += ` AND l.driverid = $3`;
    params.push(subcontractorId);
  }
  subcontractorQuery += `
      ),
      SubcontractorTurnover AS (
        SELECT 
          COALESCE(e.companyname, 'Unknown') AS companyname,
          SUM(ltc.turnover_contribution) AS subcontractor_turnover,
          TO_CHAR(ltc.pickupdate, 'Month') AS month_name,
          EXTRACT(YEAR FROM ltc.pickupdate)::TEXT AS year
        FROM LegDriverContributions ltc
        JOIN m5_employee e ON ltc.driverid = e.userid
        GROUP BY e.companyname, TO_CHAR(ltc.pickupdate, 'Month'), EXTRACT(YEAR FROM ltc.pickupdate)
      )
      SELECT 
        companyname AS name,
        subcontractor_turnover AS value,
        'subcontractor' AS type,
        month_name AS month,
        year
      FROM SubcontractorTurnover
      ORDER BY value DESC;
  `;

  const totalTurnoverQuery = `
    WITH DistinctLegs AS (
      SELECT m1key, COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT m1key, legnumber, COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::text = $2
      GROUP BY l.m1key
    ),
    InvoiceTurnover AS (
      SELECT 
        SUM(m.total_cost) as invoice_turnover,
        TO_CHAR(i.date, 'Month') as month_name,
        EXTRACT(YEAR FROM i.date)::TEXT AS year
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM i.date)::TEXT = $2
      GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    )
    SELECT 
      COALESCE(it.invoice_turnover, 0) + COALESCE(SUM(ldc.subcontractor_turnover), 0) as total_turnover,
      it.month_name,
      it.year
    FROM InvoiceTurnover it
    LEFT JOIN LegDriverContributions ldc ON 1=1
    GROUP BY it.invoice_turnover, it.month_name, it.year
  `;

  const [subcontractorResult, totalTurnoverResult] = await Promise.all([
    subcontractorId ? client.query(subcontractorQuery, params) : Promise.resolve({ rows: [] }),
    client.query(totalTurnoverQuery, [month, year])
  ]);

  console.log("Subcontractor turnover query result:", subcontractorResult.rows);
  console.log("Total turnover query result:", totalTurnoverResult.rows);

  const totalTurnover = parseFloat(totalTurnoverResult.rows[0]?.total_turnover || 0);
  console.log(`Total turnover (including subcontractors) for ${month} ${year}: ${totalTurnover}`);

  const turnoverData = [
    {
      name: "Total Turnover",
      value: totalTurnover,
      type: "total",
      percentage: 100,
      month: month.trim(),
      year: year.toString(),
    }
  ];

  if (subcontractorId && subcontractorResult.rows.length > 0) {
    const row = subcontractorResult.rows[0];
    const subcontractorTurnover = parseFloat(row.value || 0);
    const percentage = totalTurnover > 0 ? ((subcontractorTurnover / totalTurnover) * 100).toFixed(2) : 0;
    turnoverData.push({
      name: row.name,
      value: subcontractorTurnover,
      type: "subcontractor",
      percentage: parseFloat(percentage),
      month: row.month.trim(),
      year: row.year,
    });
  }

  console.log("Processed subcontractor vs turnover data:", turnoverData);
  return turnoverData;
};

const getWagesVsExpenses = async (client, month, year) => {
  const wagesQuery = `
    SELECT 
      SUM(w.net_pay) as total_wages,
      to_char(w.employee_date, 'Month') as month_name,
      EXTRACT(YEAR FROM w.employee_date) as year
    FROM wages w
    WHERE TRIM(to_char(w.employee_date, 'Month')) = $1
    AND EXTRACT(YEAR FROM w.employee_date)::text = $2
    GROUP BY to_char(w.employee_date, 'Month'), EXTRACT(YEAR FROM w.employee_date)
  `;

  const fuelQuery = `
    SELECT 
      SUM(e.expensecost) as total_fuel_cost,
      to_char(e.slipuploaddate, 'Month') as month_name,
      EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    WHERE e.type = 'fuel'
      AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
      AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
  `;

  const purchaseOrderQuery = `
    SELECT 
      SUM(p.total) as total_po_cost,
      to_char(p.date, 'Month') as month_name,
      EXTRACT(YEAR FROM p.date) as year
    FROM purchase_orders p
    WHERE TRIM(to_char(p.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM p.date)::text = $2
    GROUP BY to_char(p.date, 'Month'), EXTRACT(YEAR FROM p.date)
  `;

  const subcontractorQuery = `
    SELECT 
      SUM(l.driverrate) as total_subcontractor_expense,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
    GROUP BY TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `;

  const [wagesResult, fuelResult, purchaseOrderResult, subcontractorResult] = await Promise.all([
    client.query(wagesQuery, [month, year]),
    client.query(fuelQuery, [month, year]),
    client.query(purchaseOrderQuery, [month, year]),
    client.query(subcontractorQuery, [month, year])
  ]);

  console.log("Wages query result:", wagesResult.rows);
  console.log("Fuel query result:", fuelResult.rows);
  console.log("Purchase order query result:", purchaseOrderResult.rows);
  console.log("Subcontractor expense query result:", subcontractorResult.rows);

  const totalWages = parseFloat(wagesResult.rows[0]?.total_wages || 0);
  const totalFuelCost = parseFloat(fuelResult.rows[0]?.total_fuel_cost || 0);
  const totalPurchaseOrderCost = parseFloat(purchaseOrderResult.rows[0]?.total_po_cost || 0);
  const totalSubcontractorExpense = parseFloat(subcontractorResult.rows[0]?.total_subcontractor_expense || 0);

  const totalExpenses = totalFuelCost + totalPurchaseOrderCost + totalSubcontractorExpense;
  const total = totalWages + totalExpenses;

  console.log(`Total wages for ${month} ${year}: ${totalWages}`);
  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`);
  console.log(`Total purchase order cost for ${month} ${year}: ${totalPurchaseOrderCost}`);
  console.log(`Total subcontractor expense for ${month} ${year}: ${totalSubcontractorExpense}`);
  console.log(`Total expenses for ${month} ${year}: ${totalExpenses}`);

  const wagesVsExpensesData = [
    {
      name: "Wages",
      value: totalWages,
      type: "wages",
      percentage: total > 0 ? ((totalWages / total) * 100).toFixed(2) : 0,
      month: month.trim(),
      year: year.toString(),
    },
    {
      name: "Expenses",
      value: totalExpenses,
      type: "expenses",
      percentage: total > 0 ? ((totalExpenses / total) * 100).toFixed(2) : 0,
      month: month.trim(),
      year: year.toString(),
    }
  ];

  console.log("Processed wages vs expenses data:", wagesVsExpensesData);
  return wagesVsExpensesData;
};

const getTurnoverVsSubbieExpense = async (client, month, year, subcontractorId = null) => {
  const params = [month, year];
  let subcontractorQuery = `
    SELECT 
      e.companyname,
      COALESCE(SUM(l.driverrate), 0) as subcontractor_expense,
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
    WITH DistinctLegs AS (
      SELECT m1key, COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT m1key, legnumber, COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.pickupdate)::text = $2
      GROUP BY l.m1key
    ),
    InvoiceTurnover AS (
      SELECT 
        SUM(m.total_cost) as invoice_turnover,
        TO_CHAR(i.date, 'Month') as month_name,
        EXTRACT(YEAR FROM i.date)::text as year
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM i.date)::text = $2
      GROUP BY TO_CHAR(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
    )
    SELECT 
      COALESCE(it.invoice_turnover, 0) + COALESCE(SUM(ldc.subcontractor_turnover), 0) as total_turnover,
      it.month_name,
      it.year
    FROM InvoiceTurnover it
    LEFT JOIN LegDriverContributions ldc ON 1=1
    GROUP BY it.invoice_turnover, it.month_name, it.year
  `;

  const [subcontractorResult, totalTurnoverResult] = await Promise.all([
    subcontractorId ? client.query(subcontractorQuery, params) : Promise.resolve({ rows: [] }),
    client.query(totalTurnoverQuery, [month, year])
  ]);

  console.log("Subcontractor expense query result:", subcontractorResult.rows);
  console.log("Total turnover query result:", totalTurnoverResult.rows);

  const totalTurnover = parseFloat(totalTurnoverResult.rows[0]?.total_turnover || 0);
  console.log(`Total turnover (including subcontractors) for ${month} ${year}: ${totalTurnover}`);

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

  // Add subcontractor expense entry if subcontractorId is provided
  if (subcontractorId && subcontractorResult.rows.length > 0) {
    const row = subcontractorResult.rows[0];
    const subcontractorExpense = parseFloat(row.subcontractor_expense || 0);
    const percentage = totalTurnover > 0 ? ((subcontractorExpense / totalTurnover) * 100).toFixed(2) : 0;
    turnoverData.push({
      name: row.companyname,
      value: subcontractorExpense,
      type: "subcontractor",
      percentage: parseFloat(percentage),
      month: row.month_name.trim(),
      year: row.year.toString(),
    });
  }

  console.log("Processed turnover vs subbie expense data:", turnoverData);
  return turnoverData;
};

const getTurnoverVsFuelPerTruck = async (client, month, year, truckId = null) => {
  const params = [month, year];
  let query;

  if (!truckId) {
    // Aggregate totals when no truckId is provided
    query = `
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
      TurnoverPerTruck AS (
        SELECT 
          SUM(m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS total_turnover,
          TO_CHAR(m.pickupdate, 'Month') AS month_name,
          EXTRACT(YEAR FROM m.pickupdate)::TEXT AS year
        FROM legs_m2 l
        JOIN m1_controller m ON l.m1key = m.m1key
        JOIN DistinctLegs dl ON l.m1key = dl.m1key
        JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
        JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
        WHERE t.is_subcontractor = false
          AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
          AND EXTRACT(YEAR FROM m.pickupdate)::TEXT = $2
          AND t.status = true
        GROUP BY TO_CHAR(m.pickupdate, 'Month'), EXTRACT(YEAR FROM m.pickupdate)
      ),
      FuelPerTruck AS (
        SELECT 
          COALESCE(SUM(e.expensecost), 0) AS total_fuel_cost,
          to_char(e.slipuploaddate, 'Month') AS month_name,
          EXTRACT(YEAR FROM e.slipuploaddate)::TEXT AS year
        FROM expenses_m2 e
        JOIN m5_trucks t ON e.truckid = t.m5truckskey
        WHERE e.type = 'fuel'
          AND t.is_subcontractor = false
          AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
          AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
          AND t.status = true
        GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
      )
      SELECT 
        'Total' AS truckregnumber,
        COALESCE(tp.total_turnover, 0) AS total_turnover,
        COALESCE(fp.total_fuel_cost, 0) AS total_fuel_cost,
        COALESCE(tp.month_name, fp.month_name) AS month_name,
        COALESCE(tp.year, fp.year) AS year
      FROM TurnoverPerTruck tp
      FULL OUTER JOIN FuelPerTruck fp ON tp.month_name = fp.month_name AND tp.year = fp.year
    `;
  } else {
    // Existing query for specific truckId
    query = `
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
      TurnoverPerTruck AS (
        SELECT 
          l.truckregnumber,
          SUM(m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS total_turnover,
          TO_CHAR(m.pickupdate, 'Month') AS month_name,
          EXTRACT(YEAR FROM m.pickupdate)::TEXT AS year
        FROM legs_m2 l
        JOIN m1_controller m ON l.m1key = m.m1key
        JOIN DistinctLegs dl ON l.m1key = dl.m1key
        JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
        JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
        WHERE t.is_subcontractor = false
          AND TRIM(TO_CHAR(m.pickupdate, 'Month')) = $1
          AND EXTRACT(YEAR FROM m.pickupdate)::TEXT = $2
          AND t.m5truckskey = $3
          AND t.status = true
        GROUP BY l.truckregnumber, TO_CHAR(m.pickupdate, 'Month'), EXTRACT(YEAR FROM m.pickupdate)
      ),
      FuelPerTruck AS (
        SELECT 
          t.truckregnum,
          COALESCE(SUM(e.expensecost), 0) AS total_fuel_cost,
          to_char(e.slipuploaddate, 'Month') AS month_name,
          EXTRACT(YEAR FROM e.slipuploaddate)::TEXT AS year
        FROM expenses_m2 e
        JOIN m5_trucks t ON e.truckid = t.m5truckskey
        WHERE e.type = 'fuel'
          AND t.is_subcontractor = false
          AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
          AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
          AND t.m5truckskey = $3
          AND t.status = true
        GROUP BY t.truckregnum, to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
      )
      SELECT 
        COALESCE(tp.truckregnumber, fp.truckregnum) AS truckregnumber,
        COALESCE(tp.total_turnover, 0) AS total_turnover,
        COALESCE(fp.total_fuel_cost, 0) AS total_fuel_cost,
        COALESCE(tp.month_name, fp.month_name) AS month_name,
        COALESCE(tp.year, fp.year) AS year
      FROM TurnoverPerTruck tp
      FULL OUTER JOIN FuelPerTruck fp ON tp.truckregnumber = fp.truckregnum
      ORDER BY COALESCE(tp.total_turnover, 0) DESC, COALESCE(fp.total_fuel_cost, 0) DESC
    `;
    params.push(truckId);
  }

  const result = await client.query(query, params);
  console.log("Turnover vs Fuel per Truck query result:", result.rows);
  console.log(`Query returned ${result.rows.length} rows`);

  if (!result.rows || result.rows.length === 0) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`);
    return [];
  }

  const totalTurnover = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.total_turnover || 0),
    0
  );
  const totalFuelCost = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.total_fuel_cost || 0),
    0
  );
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`);
  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`);

  const data = result.rows.map((row) => {
    const turnover = parseFloat(row.total_turnover || 0);
    const fuelCost = parseFloat(row.total_fuel_cost || 0);
    const turnoverPercentage = totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0;
    const fuelCostPercentage = totalFuelCost > 0 ? ((fuelCost / totalFuelCost) * 100).toFixed(2) : 0;
    return {
      truckregnumber: row.truckregnumber,
      total_turnover: turnover,
      total_fuel_cost: fuelCost,
      month_name: row.month_name.trim(),
      year: row.year,
      turnoverPercentage: parseFloat(turnoverPercentage),
      fuelCostPercentage: parseFloat(fuelCostPercentage),
    };
  });

  console.log("Processed turnover vs fuel per truck data:", data);
  return data;
};

export {
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAllTrucks,
  getAgingAnalysis,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
  getWagesVsExpenses,
  getTurnoverVsSubbieExpense,
  getTurnoverVsFuelPerTruck,
};