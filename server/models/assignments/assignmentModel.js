import { pool } from "../../config/database.js";

export const getDrivers = async () => {
  const query = "SELECT * FROM m5_driver_rate";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getStartingPoints = async () => {
  const query =
    "SELECT DISTINCT startingpoint FROM m5_driver_rate ORDER BY startingpoint";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.startingpoint);
  } catch (error) {
    throw error;
  }
};

export const getDestinations = async () => {
  const query =
    "SELECT DISTINCT destination FROM m5_driver_rate ORDER BY destination";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.destination);
  } catch (error) {
    throw error;
  }
};

export const updateInstructionStatus = async (instructionId, status) => {
  const query = `UPDATE m1_controller SET status = $1 WHERE m1key = $2`;
  try {
    await pool.query(query, [status, instructionId]);
  } catch (error) {
    throw error;
  }
};

export const getDriversSub = async () => {
  const query =
    "SELECT userid, name, surname, roleid FROM m5_employee WHERE roleid IN (5, 6) AND status = true ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getDriverRatesWithSubbie = async (startingpoint, destination) => {
  const query = `
    SELECT 
      m5ratekey, 
      startingpoint, 
      destination, 
      driver_six_meter_rate, 
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate
    FROM 
      m5_driver_rate 
    WHERE 
      startingpoint = $1 AND destination = $2`;
  try {
    const result = await pool.query(query, [startingpoint, destination]);
    if (result.rows.length > 0) {
      const rateData = result.rows[0];
      rateData.driver_rate = rateData.driver_six_meter_rate;
      return rateData;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getControllers = async () => {
  const query =
    "SELECT userid, name, surname FROM m5_employee WHERE roleid = 2 ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getManagers = async () => {
  const query =
    "SELECT userid, name, surname FROM usertable WHERE roleid = 1 ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getInstructionById = async (instructionId) => {
  const query = `SELECT m1key, status FROM m1_controller WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getShipmentTypeByInstructionId = async (instructionId) => {
  const query = `SELECT shipment_type FROM m1_controller WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0].shipment_type : null;
  } catch (error) {
    throw error;
  }
};

export const getInstructions = async () => {
  const query =
    "SELECT m1key, shipment_type, status, fileref FROM m1_controller ORDER BY m1key DESC";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getTruckRegNums = async () => {
  const query = "SELECT truckregnum FROM m5_trucks WHERE status = true ORDER BY truckregnum";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.truckregnum);
  } catch (error) {
    throw error;
  }
};

export const getTrucks = async () => {
  const query =
    "SELECT m5truckskey as truckid, truckregnum as registration FROM m5_trucks WHERE status = true ORDER BY truckregnum";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getClientInstructions = async () => {
  const query = `
    SELECT 
      c.m5clientkey, 
      c.client AS companyname, 
      c.representative, 
      c.email,
      COUNT(CASE WHEN m.status = 'New' THEN 1 ELSE NULL END) AS new_count,
      COUNT(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE NULL END) AS in_progress_count
    FROM 
      m5_client c
    LEFT JOIN 
      m1_controller m ON c.m5clientkey = m.client
    GROUP BY 
      c.m5clientkey, c.client, c.representative, c.email
    ORDER BY 
      c.client`;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getClientInstructionsDetails = async (clientId) => {
  const query = `
    SELECT 
      m1.m1key, 
      s.shipkey AS shippy, 
      m1.status, 
      m1.fileref
    FROM 
      public.m1_controller m1
    JOIN 
      public.shipment s ON m1.shipment_type = s.shipkey
    WHERE 
      m1.client = $1`;
  try {
    const result = await pool.query(query, [clientId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getContainerDetails = async (containerNum) => {
  const query =
    "SELECT containerkey, containernum, weight, container_type FROM container WHERE containernum = $1";
  try {
    const result = await pool.query(query, [containerNum]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverRates = async (
  startingpoint,
  destination,
  containerType
) => {
  const query = `
    SELECT 
      m5ratekey, 
      startingpoint, 
      destination, 
      driver_rate,
      driver_six_meter_rate, 
      driver_twelve_meter_rate
    FROM 
      m5_driver_rate 
    WHERE 
      startingpoint = $1 AND destination = $2`;
  try {
    const result = await pool.query(query, [startingpoint, destination]);
    if (result.rows.length > 0) {
      const rateData = result.rows[0];
      let applicableRate = rateData.driver_rate;
      if (containerType === "6m") {
        applicableRate = rateData.driver_six_meter_rate;
      } else if (containerType === "12m") {
        applicableRate = rateData.driver_twelve_meter_rate;
      }
      return { ...rateData, applicable_rate: applicableRate };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getContainerNumbers = async () => {
  const query =
    "SELECT containernum, container_type FROM container ORDER BY containernum";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getContainerTypes = async () => {
  const query =
    "SELECT DISTINCT container_type FROM container WHERE container_type IS NOT NULL ORDER BY container_type";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.container_type);
  } catch (error) {
    throw error;
  }
};
export const saveLeg = async ({
  legkey,
  legnumber,
  startingpoint,
  destination,
  driverrate,
  m1key,
  drivers,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const isNewLeg = !legkey || legkey === null;

    if (!isNewLeg) {
      await client.query(
        `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2 AND legkey != $3`,
        [m1key, legnumber, legkey]
      );
      await client.query(
        `UPDATE legs_m2 SET startingpoint = $1, destination = $2, driverrate = $3 WHERE legkey = $4`,
        [startingpoint, destination, driverrate, legkey]
      );
    } else {
      await client.query(
        `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2`,
        [m1key, legnumber]
      );
    }

    let legId = legkey;
    if (isNewLeg || (drivers && drivers.length > 0)) {
      if (isNewLeg && (!drivers || drivers.length === 0)) {
        const insertResult = await client.query(
          `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key) VALUES ($1, $2, $3, $4, $5) RETURNING legkey`,
          [legnumber, startingpoint, destination, driverrate, m1key]
        );
        legId = insertResult.rows[0].legkey;
      }

      if (drivers && drivers.length > 0) {
        for (const [index, driver] of drivers.entries()) {
          if (
            !driver.driverid &&
            !driver.truckregnumber &&
            !driver.containernumber &&
            !driver.vgm &&
            !driver.date
          )
            continue;

          const driverId = driver.driverid
            ? Number.parseInt(driver.driverid)
            : null;
          const truckRegNumber = driver.truckregnumber || null;
          
          // UPDATED: Handle both container number and weight (vgm)
          let containerNumber = null;
          let vgmValue = null;
          
          if (driver.containernumber) {
            containerNumber = driver.containernumber.toString();
          }
          
          if (driver.vgm !== null && driver.vgm !== undefined) {
            vgmValue = parseFloat(driver.vgm);
          }

          const date = driver.date ? new Date(driver.date) : null;
          const driverSpecificRate = driver.driverRate || driverrate;

          if (!isNewLeg && legId && index === 0) {
            await client.query(
              `UPDATE legs_m2 SET 
                driverid = $1, 
                truckregnumber = $2, 
                containernumber = $3, 
                vgm = $4,
                date = $5, 
                driverrate = $6 
              WHERE legkey = $7`,
              [
                driverId,
                truckRegNumber,
                containerNumber,
                vgmValue,
                date,
                driverSpecificRate,
                legId,
              ]
            );
          } else {
            const insertResult = await client.query(
              `INSERT INTO legs_m2 (
                legnumber, 
                startingpoint, 
                destination, 
                driverrate, 
                m1key, 
                driverid, 
                truckregnumber, 
                containernumber, 
                vgm,
                date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING legkey`,
              [
                legnumber,
                startingpoint,
                destination,
                driverSpecificRate,
                m1key,
                driverId,
                truckRegNumber,
                containerNumber,
                vgmValue,
                date,
              ]
            );
            if (isNewLeg && index === 0) legId = insertResult.rows[0].legkey;
          }
        }
      }
    }

    await client.query("COMMIT");
    return { legId, isUpdate: !isNewLeg };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
// export const saveLeg = async ({
//   legkey,
//   legnumber,
//   startingpoint,
//   destination,
//   driverrate,
//   m1key,
//   drivers,
// }) => {
//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const isNewLeg = !legkey || legkey === null;

//     if (!isNewLeg) {
//       await client.query(
//         `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2 AND legkey != $3`,
//         [m1key, legnumber, legkey]
//       );
//       await client.query(
//         `UPDATE legs_m2 SET startingpoint = $1, destination = $2, driverrate = $3 WHERE legkey = $4`,
//         [startingpoint, destination, driverrate, legkey]
//       );
//     } else {
//       await client.query(
//         `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2`,
//         [m1key, legnumber]
//       );
//     }

//     let legId = legkey;
//     if (isNewLeg || (drivers && drivers.length > 0)) {
//       if (isNewLeg && (!drivers || drivers.length === 0)) {
//         const insertResult = await client.query(
//           `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key) VALUES ($1, $2, $3, $4, $5) RETURNING legkey`,
//           [legnumber, startingpoint, destination, driverrate, m1key]
//         );
//         legId = insertResult.rows[0].legkey;
//       }
//       if (drivers && drivers.length > 0) {
//         for (const [index, driver] of drivers.entries()) {
//           if (
//             !driver.driverid &&
//             !driver.truckregnumber &&
//             !driver.containernumber &&
//             !driver.date
//           )
//             continue;
//           const driverId = driver.driverid
//             ? Number.parseInt(driver.driverid)
//             : null;
//           const truckRegNumber = driver.truckregnumber || null;
//           let containerNumber = driver.containernumber
//             ? driver.containernumber.toString()
//             : null;
//           const date = driver.date ? new Date(driver.date) : null;
//           const driverSpecificRate = driver.driverRate || driverrate;
//           if (!isNewLeg && legId && index === 0) {
//             await client.query(
//               `UPDATE legs_m2 SET driverid = $1, truckregnumber = $2, containernumber = $3, date = $4, driverrate = $5 WHERE legkey = $6`,
//               [
//                 driverId,
//                 truckRegNumber,
//                 containerNumber,
//                 date,
//                 driverSpecificRate,
//                 legId,
//               ]
//             );
//           } else {
//             const insertResult = await client.query(
//               `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key, driverid, truckregnumber, containernumber, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING legkey`,
//               [
//                 legnumber,
//                 startingpoint,
//                 destination,
//                 driverSpecificRate,
//                 m1key,
//                 driverId,
//                 truckRegNumber,
//                 containerNumber,
//                 date,
//               ]
//             );
//             if (isNewLeg && index === 0) legId = insertResult.rows[0].legkey;
//           }
//         }
//       }
//     }
//     await client.query("COMMIT");
//     return { legId, isUpdate: !isNewLeg };
//   } catch (error) {
//     await client.query("ROLLBACK");
//     throw error;
//   } finally {
//     client.release();
//   }
// };

export const getLegsByInstructionId = async (instructionId) => {
  const query = `
    SELECT 
      l.legkey,
      l.legnumber,
      l.startingpoint,
      l.destination,
      l.driverrate,
      l.driverid,
      l.truckregnumber,
      l.containernumber,
      l.vgm,
      l.date,
      e.name AS driver_name,
      e.surname AS driver_surname,
      c.container_type
    FROM 
      legs_m2 l
    LEFT JOIN 
      m5_employee e ON l.driverid = e.userid
    LEFT JOIN
      container c ON l.containernumber = c.containernum AND l.m1key = c.m1key
    WHERE 
      l.m1key = $1
    ORDER BY 
      l.legnumber, l.legkey`;

  try {
    const result = await pool.query(query, [instructionId]);
    const legMap = new Map();

    for (const row of result.rows) {
      const legnumber = row.legnumber;
      if (!legMap.has(legnumber)) {
        legMap.set(legnumber, {
          legkey: row.legkey,
          legnumber: row.legnumber,
          startingpoint: row.startingpoint,
          destination: row.destination,
          driverrate: row.driverrate,
          drivers: [],
        });
      }

      const leg = legMap.get(legnumber);
      leg.drivers.push({
        id: row.legkey,
        driverid: row.driverid ? row.driverid.toString() : "",
        truckregnumber: row.truckregnumber || "",
        // UPDATED: Use vgm for weight-based, containernumber for container-based
        containernumber: row.vgm 
          ? row.vgm.toString() 
          : (row.containernumber ? row.containernumber.toString() : ""),
        container_type: row.container_type || "",
        driverRate: row.driverrate ? row.driverrate.toString() : "",
        date: row.date || null,
        driver_name: row.driver_name || "",
        driver_surname: row.driver_surname || "",
        full_name:
          row.driver_name && row.driver_surname
            ? `${row.driver_name} ${row.driver_surname}`
            : row.driverid
            ? `Driver ID: ${row.driverid}`
            : "Unknown Driver",
      });
    }

    const legs = Array.from(legMap.values());
    legs.forEach(
      (leg) =>
        (leg.drivers = leg.drivers.filter(
          (driver) =>
            driver.driverid ||
            driver.truckregnumber ||
            driver.containernumber ||
            driver.date
        ))
    );

    return legs;
  } catch (error) {
    throw error;
  }
};
export const deleteLeg = async (legId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const legInfo = await client.query(
      `SELECT legkey, legnumber, m1key FROM legs_m2 WHERE legkey = $1`,
      [legId]
    );
    if (legInfo.rows.length === 0)
      throw new Error(`Leg with ID ${legId} not found`);
    const { legnumber, m1key } = legInfo.rows[0];
    console.log(
      `Deleting leg ${legId} (leg number ${legnumber}) from instruction ${m1key}`
    );
    const result = await client.query(
      `DELETE FROM legs_m2 WHERE legkey = $1 RETURNING legkey`,
      [legId]
    );
    if (result.rowCount === 0)
      throw new Error(`Leg with ID ${legId} not found or could not be deleted`);
    await client.query("COMMIT");
    return { deletedLegId: legId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const updateLegNumber = async (legId, legnumber) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE legs_m2 SET legnumber = $1 WHERE legkey = $2 RETURNING legkey`,
      [legnumber, legId]
    );
    if (result.rows.length === 0) {
      throw new Error(`Leg with ID ${legId} not found`);
    }
    await client.query("COMMIT");
    return { updatedLegId: result.rows[0].legkey, legnumber };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const getContainersByInstructionId = async (instructionId) => {
  const query = `SELECT * FROM container WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const completeInstruction = async (instructionId, status) => {
  const query = `UPDATE m1_controller SET status = $1 WHERE m1key = $2`;
  try {
    await pool.query(query, [status, instructionId]);
  } catch (error) {
    throw error;
  }
};

// export const getInstructionDetails = async (instructionId) => {
//   const query = `SELECT m1key, client, pickup, dropoff, status FROM m1_controller WHERE m1key = $1`;
//   try {
//     const result = await pool.query(query, [instructionId]);
//     return result.rows.length > 0 ? result.rows[0] : null;
//   } catch (error) {
//     throw error;
//   }
// };
// Add this new function to your database service
export const getInstructionDetails = async (instructionId) => {
  const query = `
    SELECT 
      m1key, 
      client, 
      pickup, 
      dropoff, 
      status, 
      rateweight,
      weight
    FROM m1_controller 
    WHERE m1key = $1
  `;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverById = async (driverId) => {
  const query = `SELECT userid, name, surname FROM m5_employee WHERE userid = $1`;
  try {
    const result = await pool.query(query, [driverId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverInstructions = async (driverId) => {
  const query = `
    SELECT 
      m1.m1key, 
      m1.pickupdate,
      COUNT(l.legkey) as leg_count
    FROM 
      public.m1_controller m1
    JOIN 
      public.legs_m2 l ON m1.m1key = l.m1key
    WHERE 
      l.driverid = $1
    GROUP BY 
      m1.m1key, m1.pickupdate
    ORDER BY 
      m1.pickupdate DESC`;
  try {
    const result = await pool.query(query, [driverId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getLegDetailsByInstructionAndDriver = async (
  instructionId,
  driverId
) => {
  const query = `
    SELECT 
      l.legkey,
      l.legnumber,
      l.startingpoint,
      l.destination,
      l.date,
      l.driverrate,
      l.legstatus
    FROM 
      public.legs_m2 l
    WHERE 
      l.m1key = $1 AND l.driverid = $2
    ORDER BY 
      l.legnumber`;
  try {
    const result = await pool.query(query, [instructionId, driverId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getCompletedDriverLegs = async (driverId, instructionId) => {
  const client = await pool.connect();
  try {
    let query;
    let params;
    if (instructionId) {
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND l.m1key = $2::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber`;
      params = [driverId, instructionId];
    } else {
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber`;
      params = [driverId];
    }
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getDriverLegs = async (driverId, instructionId) => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.legstatus
      FROM 
        public.legs_m2 l
      WHERE 
        l.driverid = $1::integer`;
    const queryParams = [driverId];
    if (instructionId) {
      query += ` AND l.m1key = $2::integer`;
      queryParams.push(instructionId);
    }
    query += ` ORDER BY l.date DESC, l.legnumber`;
    const result = await client.query(query, queryParams);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getDocuments = async (instructionId) => {
  const query = "SELECT * FROM documents WHERE m1key = $1";
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const generateInvoice = async (instructionId) => {
  const client = await pool.connect();
  try {
    // Check if a record already exists for this instructionId
    const existingInvoiceResult = await client.query(
      "SELECT ikey FROM invoice WHERE m1key = $1",
      [instructionId]
    );

    // If a record exists, return early without creating a new invoice
    if (existingInvoiceResult.rows.length > 0) {
      return {
        success: true,
        message: `Invoice already exists for instruction ID ${instructionId}`,
        existingInvoiceId: existingInvoiceResult.rows[0].ikey,
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    const monthName = monthNames[currentMonth - 1];

    const instructionResult = await client.query(
      "SELECT client, m1key FROM m1_controller WHERE m1key = $1",
      [instructionId]
    );

    if (instructionResult.rows.length === 0)
      throw new Error(`Instruction with ID ${instructionId} not found`);

    const { client: clientId, m1key } = instructionResult.rows[0];

    const sequenceResult = await client.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_num FROM 'INV-\\d+-0*(\\d+)') AS INTEGER)), 0) + 1 AS next_invoice_num FROM invoice WHERE invoice_num LIKE $1",
      [`INV-${currentYear}-%`]
    );
    const nextInvoiceNum = sequenceResult.rows[0].next_invoice_num;

    const invoiceNum = `INV-${currentYear}-${nextInvoiceNum}`;
    const groupId = `${clientId}-${monthName}${currentYear}`;

    const insertResult = await client.query(
      "INSERT INTO invoice (clientid, m1key, invoice_num, groupid, date) VALUES ($1, $2, $3, $4, $5) RETURNING ikey",
      [clientId, m1key, invoiceNum, groupId, currentDate]
    );

    return {
      success: true,
      invoiceId: insertResult.rows[0].ikey,
      invoiceNum,
      groupId,
      date: currentDate,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const fixInvoiceSequence = async () => {
  const client = await pool.connect();
  try {
    const currentSeqResult = await client.query(
      "SELECT nextval(pg_get_serial_sequence('public.invoice', 'ikey'));"
    );
    const maxKeyResult = await client.query(
      "SELECT MAX(ikey) FROM public.invoice;"
    );
    const maxKey = maxKeyResult.rows[0].max || 0;
    const resetResult = await client.query(
      "SELECT SETVAL('public.invoice_ikey_seq', (SELECT COALESCE(MAX(ikey), 0) FROM public.invoice)+1);"
    );
    return {
      success: true,
      message: "Invoice sequence has been successfully reset.",
      oldValue: currentSeqResult.rows[0].nextval,
      newValue: resetResult.rows[0].setval,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};
