export const fetchRate = async ({
  api,
  startingPoint,
  destination,
  targetLegIndex,
  requestId,
  currentLagIndex,
  shipmentType,
  isCompleted,
  noRatesRoutes,
  setNoRatesRoutes,
  setRateError,
  legSwitchIdRef,
  currentLegIndexRef,
  setFormData,
  setDrivers,
  setLegs,
  legs,
  employeeDrivers,
  rates,
  setRates,
  ratesRouteKeyRef,
}) => {
  console.log(
    `fetchRate called with: startingPoint=${startingPoint}, destination=${destination}`
  );

  // For shipment type 4 (cross-haul break bulk), driver rates are manually
  // maintained in legs_m2 and must not be overridden by automatic route rates.
  if (shipmentType === 4) {
    console.log("Shipment type 4 detected - skipping automatic rate fetch");
    return Promise.resolve();
  }

  if (!startingPoint || !destination) return Promise.resolve();

  const resolvedTargetLegIndex =
    targetLegIndex !== null && targetLegIndex !== undefined
      ? targetLegIndex
      : currentLagIndex;

  const routeKey = `${startingPoint}-${destination}`;

  try {
    setRateError("");

    if (noRatesRoutes.has(routeKey)) {
      console.log(`Route ${routeKey} is known to have no rates, skipping fetch`);
      // Only apply if still on same leg and request
      if (
        legSwitchIdRef.current === requestId &&
        currentLegIndexRef.current === resolvedTargetLegIndex
      ) {
        setFormData((prev) => ({
          ...prev,
          driverRate: "0",
        }));
        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
            return prevDrivers;
          return prevDrivers.map((driver) => ({
            ...driver,
            driverRate: "0",
            isAbnormal: driver.container_type === "abnormal" || driver.isAbnormal,
          }));
        });
      }
      // Update legs state for current leg
      if (
        resolvedTargetLegIndex !== null &&
        resolvedTargetLegIndex !== undefined &&
        legSwitchIdRef.current === requestId &&
        currentLegIndexRef.current === resolvedTargetLegIndex
      ) {
        const updatedLegs = [...legs];
        updatedLegs[resolvedTargetLegIndex] = {
          ...updatedLegs[resolvedTargetLegIndex],
          driverRate: "0",
        };
        setLegs(updatedLegs);
      }
      return Promise.resolve();
    }

    console.log(
      `Sending request to /api/driver-rates-with-subbie with params:`,
      {
        startingpoint: startingPoint,
        destination: destination,
      }
    );
    const response = await api.get("/api/driver-rates-with-subbie", {
      params: {
        startingpoint: startingPoint,
        destination: destination,
      },
    });

    // Handle 404 as a successful case since no rates are a valid scenario
    if (response.status === 404) {
      setRateError("Driver rate not available for this route");
      setNoRatesRoutes((prev) => {
        const newSet = new Set(prev);
        newSet.add(routeKey);
        return newSet;
      });
      console.log(`Added route ${routeKey} to noRatesRoutes set`);
      // Only apply if still on same leg and request
      if (
        legSwitchIdRef.current === requestId &&
        currentLegIndexRef.current === resolvedTargetLegIndex
      ) {
        setFormData((prev) => ({
          ...prev,
          driverRate: "0",
        }));
        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
            return prevDrivers;
          return prevDrivers.map((driver) => ({
            ...driver,
            driverRate: "0",
            isAbnormal: driver.container_type === "abnormal" || driver.isAbnormal,
          }));
        });
      }
      // Update legs state for current leg
      if (
        resolvedTargetLegIndex !== null &&
        resolvedTargetLegIndex !== undefined &&
        legSwitchIdRef.current === requestId &&
        currentLegIndexRef.current === resolvedTargetLegIndex
      ) {
        const updatedLegs = [...legs];
        updatedLegs[resolvedTargetLegIndex] = {
          ...updatedLegs[resolvedTargetLegIndex],
          driverRate: "0",
        };
        setLegs(updatedLegs);
      }
      return Promise.resolve();
    }

    const data = response.data;
    console.log("Rates from backend:", data);

    setNoRatesRoutes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(routeKey);
      return newSet;
    });

    const newRates = {
      six_meter: data.driver_six_meter_rate || 0,
      twelve_meter: data.driver_twelve_meter_rate || 0,
      subbie_six_meter: data.subie_six_meter_rate || 0,
      subbie_twelve_meter: data.subie_twelve_meter_rate || 0,
    };

    console.log("Setting new rates:", newRates);
    ratesRouteKeyRef.current = routeKey;
    setRates(newRates);

    // Only apply if still on same leg and request
    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex &&
      ratesRouteKeyRef.current === routeKey
    ) {
      setFormData((prev) => ({
        ...prev,
        driverRate:
          data.driver_rate !== null && data.driver_rate !== undefined
            ? data.driver_rate.toString()
            : "0",
      }));

      // Only update driver rates with meter rates if instruction is not completed
      if (!isCompleted) {
        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
            return prevDrivers;

          return prevDrivers.map((driver) => {
            const newDriver = { ...driver };

            // Check if driver is a subcontractor (roleid = 6)
            const isSubcontractor =
              employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
                ?.roleid === 6;

            if (newDriver.container_type === "12m") {
              newDriver.driverRate = isSubcontractor
                ? data.subie_twelve_meter_rate
                  ? data.subie_twelve_meter_rate.toString()
                  : "0"
                : data.driver_twelve_meter_rate
                ? data.driver_twelve_meter_rate.toString()
                : "0";
            } else if (newDriver.container_type === "abnormal") {
              // For abnormal container types, keep existing rate or set to 0
              if (!newDriver.driverRate) {
                newDriver.driverRate = "0";
              }
              newDriver.isAbnormal = true; // Mark as abnormal to allow editing
            } else {
              newDriver.driverRate = isSubcontractor
                ? data.subie_six_meter_rate
                  ? data.subie_six_meter_rate.toString()
                  : "0"
                : data.driver_six_meter_rate
                ? data.driver_six_meter_rate.toString()
                : "0";
            }

            return newDriver;
          });
        });
      }
    }

    // Update legs state for current leg
    if (
      resolvedTargetLegIndex !== null &&
      resolvedTargetLegIndex !== undefined &&
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      const updatedLegs = [...legs];
      updatedLegs[resolvedTargetLegIndex] = {
        ...updatedLegs[resolvedTargetLegIndex],
        driverRate: data.driver_rate ? data.driver_rate.toString() : "0",
      };
      setLegs(updatedLegs);
    }

    return Promise.resolve();
  } catch (error) {
    console.error(
      "Unexpected error fetching rate:",
      error.response ? error.response.data : error.message
    );
    setRateError("Unexpected error fetching driver rate");

    setRates({
      six_meter: 0,
      twelve_meter: 0,
      subbie_six_meter: 0,
      subbie_twelve_meter: 0,
    });

    // Only apply if still on same leg and request
    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      ratesRouteKeyRef.current = routeKey;
      setFormData((prev) => ({
        ...prev,
        driverRate: "0",
      }));
      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
          return prevDrivers;
        return prevDrivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal: driver.container_type === "abnormal" || driver.isAbnormal,
        }));
      });
    }

    // Update legs state for current leg
    if (
      resolvedTargetLegIndex !== null &&
      resolvedTargetLegIndex !== undefined &&
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      const updatedLegs = [...legs];
      updatedLegs[resolvedTargetLegIndex] = {
        ...updatedLegs[resolvedTargetLegIndex],
        driverRate: "0",
      };
      setLegs(updatedLegs);
    }

    return Promise.resolve();
  }
};
