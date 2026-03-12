export const fetchDrivers = async ({ api, setEmployeeDrivers }) => {
  try {
    const response = await api.get("/employees/driverssub");
    const data = response.data;
    console.log("Drivers from backend:", data);
    const filtered = Array.isArray(data)
      ? data.filter((d) => {
          if (d?.roleid === 6) {
            return d?.status === true && d?.driverstatus === true;
          }
          return true;
        })
      : [];

    setEmployeeDrivers(filtered);
  } catch (error) {
    console.error("Error fetching drivers:", error);
  }
};

export const fetchTruckRegNums = async ({ api, setTruckRegOptions }) => {
  try {
    const response = await api.get("/trucks/regnums");
    const data = response.data;
    console.log("Truck registration numbers from backend:", data);
    setTruckRegOptions(data);
  } catch (error) {
    console.error("Error fetching truck registration numbers:", error);
  }
};
