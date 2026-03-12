export const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '').trim();
};

export const dedupeDrivers = (drivers) => {
  if (!Array.isArray(drivers) || drivers.length === 0) return drivers || [];

  const seen = new Set();
  const result = [];

  for (const d of drivers) {
    const key = [
      d.driverid || "",
      d.truckregnumber || "",
      d.containernumber || "",
      d.date || "",
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }

  return result;
};

export const debugDriverData = (drivers) => {
  if (!drivers || drivers.length === 0) {
    console.log("No drivers to debug");
    return;
  }

  console.log("Debugging driver data:");
  drivers.forEach((driver, index) => {
    console.log(`Driver ${index}:`);
    console.log(`  ID: ${driver.id} (${typeof driver.id})`);
    console.log(`  Driver ID: ${driver.driverid} (${typeof driver.driverid})`);
    console.log(
      `  Truck Reg: ${driver.truckregnumber} (${typeof driver.truckregnumber})`
    );
    console.log(
      `  Container: ${
        driver.containernumber
      } (${typeof driver.containernumber})`
    );
    console.log(`  Container Type: ${driver.container_type}`);
    console.log(`  Date: ${driver.date} (${typeof driver.date})`);
    console.log(`  Full Name: ${driver.full_name}`);
    console.log(`  Driver Rate: ${driver.driverRate}`);
  });
};

export const calculateLegDriverRate = (drivers, rates, shipmentType) => {
  if (!drivers || drivers.length === 0) {
    return 0;
  }

  let sixMeterCount = 0;
  let twelveMeterCount = 0;
  let abnormalCount = 0;

  drivers.forEach((driver) => {
    if (driver.container_type === "12m") {
      twelveMeterCount++;
    } else if (driver.container_type === "abnormal") {
      abnormalCount++;
    } else {
      sixMeterCount++;
    }
  });

  if (shipmentType === 4) {
    const firstDriverWithRate = drivers.find(
      (d) => d.driverRate !== undefined && d.driverRate !== null && d.driverRate !== ""
    );
    return firstDriverWithRate
      ? Number.parseFloat(firstDriverWithRate.driverRate) || 0
      : 0;
  }

  if (
    twelveMeterCount >= sixMeterCount &&
    twelveMeterCount >= abnormalCount
  ) {
    return Number.parseFloat(rates.twelve_meter) || 0;
  } else if (
    sixMeterCount >= twelveMeterCount &&
    sixMeterCount >= abnormalCount
  ) {
    return Number.parseFloat(rates.six_meter) || 0;
  } else {
    const abnormalDriver = drivers.find(
      (d) => d.container_type === "abnormal"
    );
    return abnormalDriver
      ? Number.parseFloat(abnormalDriver.driverRate) || 0
      : 0;
  }
};
