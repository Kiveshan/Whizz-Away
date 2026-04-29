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
  setRates,
  ratesRouteKeyRef,
  legDate = null,
}) => {
  if (shipmentType === 4) return Promise.resolve();
  if (!startingPoint || !destination) return Promise.resolve();

  const resolvedTargetLegIndex =
    targetLegIndex !== null && targetLegIndex !== undefined
      ? targetLegIndex
      : currentLagIndex;

  // baseRouteKey guards against cross-route contamination in ratesRouteKeyRef.
  // routeKey includes the date so a date change bypasses the noRatesRoutes cache.
  const baseRouteKey = `${startingPoint}-${destination}`;
  const routeKey = legDate ? `${baseRouteKey}-${legDate}` : baseRouteKey;

  const applyNoRate = () => {
    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      setFormData((prev) => ({ ...prev, driverRate: "0" }));
      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || prevDrivers.length === 0) return prevDrivers;
        return prevDrivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal: driver.container_type === "abnormal" || driver.isAbnormal,
        }));
      });
    }
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
  };

  try {
    setRateError("");

    if (noRatesRoutes.has(routeKey)) {
      applyNoRate();
      return Promise.resolve();
    }

    const response = await api.get("/api/driver-rates-with-subbie", {
      params: { startingpoint: startingPoint, destination, legDate },
    });

    const data = response.data;

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

    ratesRouteKeyRef.current = baseRouteKey;
    setRates(newRates);

    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex &&
      ratesRouteKeyRef.current === baseRouteKey
    ) {
      setFormData((prev) => ({
        ...prev,
        driverRate:
          data.driver_rate !== null && data.driver_rate !== undefined
            ? data.driver_rate.toString()
            : "0",
      }));

      if (!isCompleted) {
        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
            return prevDrivers;

          return prevDrivers.map((driver) => {
            const newDriver = { ...driver };
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
              if (!newDriver.driverRate) newDriver.driverRate = "0";
              newDriver.isAbnormal = true;
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
    // 404 means no rate exists for this route+date — treat as valid "no rate" scenario
    if (error.response?.status === 404) {
      setRateError("Driver rate not available for this route");
      setNoRatesRoutes((prev) => {
        const newSet = new Set(prev);
        newSet.add(routeKey);
        return newSet;
      });
      applyNoRate();
      return Promise.resolve();
    }

    console.error(
      "Unexpected error fetching rate:",
      error.response ? error.response.data : error.message
    );
    setRateError("Unexpected error fetching driver rate");

    setRates({ six_meter: 0, twelve_meter: 0, subbie_six_meter: 0, subbie_twelve_meter: 0 });

    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      ratesRouteKeyRef.current = baseRouteKey;
      setFormData((prev) => ({ ...prev, driverRate: "0" }));
      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || prevDrivers.length === 0) return prevDrivers;
        return prevDrivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal: driver.container_type === "abnormal" || driver.isAbnormal,
        }));
      });
    }

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
