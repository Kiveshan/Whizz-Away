import { pool } from "../../config/database.js";

const getTrucksWithFuelExpenses = async () => {
  const queryText = `
    SELECT DISTINCT m.truckid, t.truckregnum, t.is_subcontractor 
    FROM expenses_m2 m
    JOIN m5_trucks t ON m.truckid = t.m5truckskey
    WHERE m.truckid IS NOT NULL
    ORDER BY t.truckregnum
  `;
  const result = await pool.query(queryText);
  return result.rows;
};

const getExpensesByTruckId = async (truckId) => {
  const queryText = `
    SELECT 
      e.*, 
      t.truckregnum,
      COALESCE(
        CASE 
          WHEN e.documentfrom = 'Controller' THEN 
            (SELECT CONCAT(name, ' ', surname) FROM m5_employee WHERE roleid = 2 LIMIT 1)
          WHEN e.documentfrom = 'Manager' THEN 
            (SELECT CONCAT(name, ' ', surname) FROM usertable WHERE userid = e.driverid)
          WHEN e.documentfrom = 'Driver' AND e.driverid IS NOT NULL THEN 
            CONCAT(emp.name, ' ', emp.surname)
          ELSE NULL
        END,
        e.documentfrom
      ) AS documentfrom_display
    FROM expenses_m2 e
    JOIN m5_trucks t ON e.truckid = t.m5truckskey
    LEFT JOIN m5_employee emp ON e.driverid = emp.userid AND e.documentfrom = 'Driver'
    WHERE e.truckid = $1
      AND (e.type ILIKE 'fuel' OR e.type ILIKE 'diesel' OR e.type ILIKE 'petrol')
    ORDER BY e.slipuploaddate DESC
  `;
  const result = await pool.query(queryText, [truckId]);
  return result.rows;
};

const getAllExpenses = async () => {
  const queryText = `
    SELECT e.*, t.truckregnum, CONCAT(emp.name, ' ', surname) as driver_name
    FROM expenses_m2 e
    LEFT JOIN m5_trucks t ON e.truckid = t.m5truckskey
    LEFT JOIN m5_employee emp ON e.driverid = emp.userid
    ORDER BY e.slipuploaddate DESC
  `;
  const result = await pool.query(queryText);
  return result.rows;
};

export { getTrucksWithFuelExpenses, getExpensesByTruckId, getAllExpenses };
