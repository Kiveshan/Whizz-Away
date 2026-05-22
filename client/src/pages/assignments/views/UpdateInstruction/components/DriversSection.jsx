import Select from "react-select";

export default function DriversSection({
  currentLagIndex,
  drivers,
  setDrivers,
  employeeDrivers,
  truckRegOptions,
  instructionContainers,
  containerOptions,
  containerDetailsMap,
  isWeightBased,
  weightUnit,
  isCompleted,
  rates,
  formData,
  addDriverButtonRef,
  addDriver,
  handleSave,
  saving,
  setEditedFields,
  editedFields,
  legs,
  setContainerReachedDetails,
  setShowContainerReachedModal,
  hasContainerReachedDropoff,
  setDriverToRemove,
  setShowRemoveDriverModal,
  savedMessage,
  savedLegs,
  onDateChange,
  rateError,
}) {
  console.log("DriversSection received rateError:", rateError);
  
  const selectableEmployeeDrivers = employeeDrivers.filter((driver) => {
    if (driver?.roleid === 6) {
      return driver?.status === true && driver?.driverstatus === true;
    }
    return driver?.status !== false;
  });

  return (
    <>
      {currentLagIndex !== null && (
        <div className="bg-blue-50 p-6 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-4">Driver Information</h3>

          {rateError && (
            <div
              style={{
                backgroundColor: "#fef3c7",
                border: "1px solid #f59e0b",
                color: "#92400e",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {rateError}
            </div>
          )}

          {drivers && drivers.length > 0 ? (
            <>
              {drivers.map((entry, index) => (
                <div
                  key={entry.id || index}
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    backgroundColor: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      margin: "0 -0.5rem",
                    }}
                  >
                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {employeeDrivers.find(
                          (d) => d.userid.toString() === entry.driverid
                        )?.roleid === 6
                          ? "Driver (subbie)"
                          : "Driver"}
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          backgroundColor: isCompleted ? "#f3f4f6" : "white",
                        }}
                        className="dropdown"
                        value={entry.driverid || ""}
                        onChange={(e) => {
                          if (isCompleted) return;
                          const driverId = e.target.value;
                          // Create a new driver object — never mutate the existing one, as it may
                          // share a reference with legs[n].drivers after refreshLegData.
                          const updatedDriver = { ...drivers[index], driverid: driverId };

                          if (driverId) {
                            const selectedDriver = employeeDrivers.find(
                              (d) => d.userid.toString() === driverId
                            );
                            if (selectedDriver) {
                              updatedDriver.full_name = `${selectedDriver.name} ${selectedDriver.surname}`;

                              const isSubcontractor = selectedDriver.roleid === 6;
                              console.log(
                                `Selected driver ${driverId} is subcontractor: ${isSubcontractor}`
                              );

                              if (updatedDriver.container_type) {
                                const ct = (updatedDriver.container_type || "").toLowerCase().trim();
                                if (ct === "12m") {
                                  updatedDriver.driverRate =
                                    isSubcontractor
                                      ? rates.subbie_twelve_meter
                                        ? rates.subbie_twelve_meter.toString()
                                        : "0"
                                      : rates.twelve_meter
                                      ? rates.twelve_meter.toString()
                                      : "0";
                                } else if (ct === "abnormal") {
                                  if (!updatedDriver.driverRate) {
                                    updatedDriver.driverRate = "0";
                                  }
                                  updatedDriver.isAbnormal = true;
                                } else {
                                  updatedDriver.driverRate =
                                    isSubcontractor
                                      ? rates.subbie_six_meter
                                        ? rates.subbie_six_meter.toString()
                                        : "0"
                                      : rates.six_meter
                                      ? rates.six_meter.toString()
                                      : "0";
                                }
                                console.log(
                                  `Updated rate for driver ${driverId} to ${updatedDriver.driverRate}`
                                );
                              }
                            } else {
                              updatedDriver.full_name = "";
                            }

                            const updatedDrivers = drivers.map((d, i) =>
                              i === index ? updatedDriver : d
                            );

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDriver.id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated driver at index ${index}:`,
                              updatedDriver
                            );

                            // Re-fetch a date-aware rate using this driver's existing date
                            // so changing the driver picks up the correct rate period.
                            if (
                              updatedDriver.date &&
                              (updatedDriver.container_type || "").toLowerCase().trim() !== "abnormal" &&
                              onDateChange
                            ) {
                              onDateChange(index, updatedDriver.date);
                            }
                          }
                        }}
                        disabled={isCompleted}
                      >
                        <option value="" disabled hidden>
                          Select driver
                        </option>
                        {entry.driverid &&
                          !selectableEmployeeDrivers.some(
                            (d) => d.userid.toString() === entry.driverid
                          ) && (
                            <option value={entry.driverid}>
                              {entry.full_name || `Driver ID: ${entry.driverid}`} (inactive)
                            </option>
                          )}
                        {selectableEmployeeDrivers.map((driver) => (
                          <option
                            key={driver.userid}
                            value={driver.userid.toString()}
                          >
                            {driver.name} {driver.surname}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Truck Reg Number
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          backgroundColor: isCompleted ? "#f3f4f6" : "white",
                        }}
                        className="dropdown"
                        value={entry.truckregnumber || ""}
                        onChange={(e) => {
                          if (isCompleted) return;
                          const updatedDriver = { ...drivers[index], truckregnumber: e.target.value };
                          const updatedDrivers = drivers.map((d, i) =>
                            i === index ? updatedDriver : d
                          );

                          setEditedFields((prev) => ({
                            ...prev,
                            drivers: {
                              ...prev.drivers,
                              [updatedDriver.id]: true,
                            },
                          }));

                          setDrivers(updatedDrivers);
                          console.log(
                            `Updated truck reg for driver at index ${index}:`,
                            e.target.value
                          );
                        }}
                        disabled={isCompleted}
                      >
                        <option value="">Select Truck</option>
                        {truckRegOptions.map((truck) => (
                          <option key={truck} value={truck}>
                            {truck}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {isWeightBased ? `Weight (${weightUnit})` : "Container Number"}
                      </label>
                      {isWeightBased ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: isCompleted ? "#f3f4f6" : "white",
                          }}
                          value={entry.containernumber || ""}
                          onChange={(e) => {
                            if (isCompleted) return;
                            const weightValue = e.target.value;

                            const updatedDriver = {
                              ...drivers[index],
                              containernumber: weightValue,
                              container_type: "",
                              driverRate: formData.driverRate || "0",
                            };
                            const updatedDrivers = drivers.map((d, i) =>
                              i === index ? updatedDriver : d
                            );

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDriver.id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated weight for driver at index ${index}:`,
                              weightValue
                            );
                          }}
                          disabled={isCompleted}
                          placeholder={`Enter weight in ${weightUnit}`}
                        />
                      ) : (
                        <Select
                          classNamePrefix="select"
                          isClearable
                          isDisabled={isCompleted}
                          placeholder="Select container"
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: "38px",
                              backgroundColor: isCompleted ? "#f3f4f6" : "white",
                              borderColor: "#d1d5db",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 20,
                            }),
                          }}
                          value={
                            entry.containernumber
                              ? {
                                  value: entry.containernumber,
                                  label: entry.containernumber,
                                }
                              : null
                          }
                          options={
                            (instructionContainers.length
                              ? instructionContainers.map((c) => c.containernum.toString())
                              : containerOptions || [])
                              .filter((container) => {
                                const usedByAnotherDriver = drivers.some(
                                  (d, i) =>
                                    i !== index &&
                                    d.containernumber &&
                                    d.containernumber.toString() === container
                                );
                                if (usedByAnotherDriver) return false;

                                if (currentLagIndex === 0) return true;
                                return !hasContainerReachedDropoff(container);
                              })
                              .map((container) => ({
                                value: container,
                                label: container,
                              }))
                          }
                          onChange={(option) => {
                            if (isCompleted) return;
                            const containerValue = option ? option.value : "";

                            console.log("Current rates:", rates);
                            console.log(
                              "Current driver data before update:",
                              drivers[index]
                            );

                            if (containerValue) {
                              const containerDropoff = instructionContainers.find(
                                (c) => c.containernum.toString() === containerValue
                              )?.dropoff;

                              if (containerDropoff) {
                                const containerReachedDropoff = legs.some(
                                  (leg, legIndex) => {
                                    if (legIndex >= currentLagIndex) return false;
                                    if (leg.destination === containerDropoff) {
                                      return (
                                        leg.drivers &&
                                        leg.drivers.some(
                                          (driver) =>
                                            driver.containernumber === containerValue
                                        )
                                      );
                                    }
                                    return false;
                                  }
                                );

                                if (containerReachedDropoff) {
                                  setContainerReachedDetails({
                                    containerNumber: containerValue,
                                  });
                                  setShowContainerReachedModal(true);
                                  return;
                                }
                              }
                            }

                            // Create a new driver object — never mutate the existing one.
                            const currentDriver = drivers[index];
                            let updatedDriver = { ...currentDriver, containernumber: containerValue };

                            if (containerValue && containerDetailsMap[containerValue]) {
                              const containerType = (
                                containerDetailsMap[containerValue].type || ""
                              ).trim();
                              updatedDriver = { ...updatedDriver, container_type: containerType };

                              const isSubcontractor =
                                employeeDrivers.find(
                                  (d) =>
                                    d.userid.toString() ===
                                    currentDriver.driverid
                                )?.roleid === 6;
                              console.log(
                                `Driver ${currentDriver.driverid} is subcontractor: ${isSubcontractor}`
                              );

                              const sixMeterRate = isSubcontractor
                                ? rates && rates.subbie_six_meter
                                  ? rates.subbie_six_meter.toString()
                                  : "0"
                                : rates && rates.six_meter
                                ? rates.six_meter.toString()
                                : "0";

                              const twelveMeterRate = isSubcontractor
                                ? rates && rates.subbie_twelve_meter
                                  ? rates.subbie_twelve_meter.toString()
                                  : "0"
                                : rates && rates.twelve_meter
                                ? rates.twelve_meter.toString()
                                : "0";

                              console.log(
                                "Using rates - 6m:",
                                sixMeterRate,
                                "12m:",
                                twelveMeterRate
                              );

                              if (containerType.toLowerCase() === "abnormal") {
                                updatedDriver = {
                                  ...updatedDriver,
                                  driverRate: updatedDriver.driverRate || twelveMeterRate,
                                  isAbnormal: true,
                                };
                                console.log(
                                  "Setting abnormal rate (editable):",
                                  updatedDriver.driverRate
                                );
                              } else if (containerType.toLowerCase() === "12m") {
                                updatedDriver = { ...updatedDriver, driverRate: twelveMeterRate, isAbnormal: false };
                                console.log("Setting 12m rate:", twelveMeterRate);
                              } else {
                                updatedDriver = { ...updatedDriver, driverRate: sixMeterRate, isAbnormal: false };
                                console.log("Setting 6m rate:", sixMeterRate);
                              }
                            } else {
                              updatedDriver = { ...updatedDriver, container_type: "", driverRate: "", isAbnormal: false };
                            }

                            const updatedDrivers = drivers.map((d, i) =>
                              i === index ? updatedDriver : d
                            );

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDriver.id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated container for driver at index ${index}:`,
                              containerValue
                            );
                            console.log(
                              "Updated driver data:",
                              updatedDriver
                            );

                            // If the driver already has a date, re-fetch the date-aware rate
                            // so the container type change picks up the correct rate version.
                            // Skip for abnormal — those rates are manually entered.
                            if (
                              containerValue &&
                              updatedDriver.date &&
                              updatedDriver.container_type?.toLowerCase() !== "abnormal" &&
                              onDateChange
                            ) {
                              onDateChange(index, updatedDriver.date);
                            }
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Type
                      </label>
                      <input
                        type="text"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          backgroundColor: "#f3f4f6",
                        }}
                        value={isWeightBased ? weightUnit : (entry.container_type || "")}
                        readOnly
                      />
                    </div>

                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {employeeDrivers.find(
                          (d) => d.userid.toString() === entry.driverid
                        )?.roleid === 6
                          ? "Subbie Rate"
                          : "Driver Rate"}
                      </label>
                      <input
                        type="text"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          backgroundColor: isCompleted ? "#f3f4f6" : "white",
                        }}
                        value={entry.driverRate ?? ""}
                        onChange={(e) => {
                          if (isCompleted) return;

                          const value = e.target.value;
                          if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].driverRate = value;

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                          }
                        }}
                        readOnly={isCompleted}
                      />
                      {entry._rateEffectiveFrom && (
                        <small style={{ color: "#6b7280", fontSize: "0.7rem", marginTop: "2px", display: "block" }}>
                          Rate from {entry._rateEffectiveFrom.split("T")[0]}
                          {entry._rateEffectiveTo ? ` to ${entry._rateEffectiveTo.split("T")[0]}` : " (no expiry)"}
                        </small>
                      )}
                    </div>

                    <div
                      style={{
                        width: "16.666%",
                        padding: "0 0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "#374151",
                          fontWeight: "500",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Date
                      </label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="date"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: isCompleted ? "#f3f4f6" : "white",
                          }}
                          value={
                            entry.date
                              ? entry.date.toString().split("T")[0]
                              : ""
                          }
                          onChange={(e) => {
                            if (isCompleted) return;
                            const newDate = e.target.value;
                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].date = newDate;

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated date for driver at index ${index}:`,
                              newDate
                            );

                            // Trigger rate refetch with new date
                            if (onDateChange) {
                              onDateChange(index, newDate);
                            }
                          }}
                          disabled={isCompleted}
                        />
                        <button
                          style={{
                            backgroundColor: "#dc2626",
                            color: "white",
                            padding: "0.5rem",
                            borderRadius: "0.375rem",
                            marginLeft: "0.5rem",
                            border: "none",
                            cursor: isCompleted ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            const driverName =
                              entry.full_name ||
                              (entry.driverid
                                ? `Driver ID: ${entry.driverid}`
                                : `Driver #${index + 1}`);

                            setDriverToRemove({ index, name: driverName });
                            setShowRemoveDriverModal(true);
                          }}
                          disabled={isCompleted}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No driver information available for this leg. Click "Add Driver" to add a driver.
            </p>
          )}

          {drivers.length > 0 && !isCompleted && (
            <div className="flex justify-center mt-6 gap-4">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-md transition-colors"
                onClick={handleSave}
                disabled={
                  saving ||
                  isCompleted ||
                  !formData.startingPoint ||
                  !formData.destination
                }
              >
                {saving ? "Saving..." : "Save"}
              </button>

              {drivers.length > 5 && (
                <button
                  ref={addDriverButtonRef}
                  onClick={addDriver}
                  className={`px-8 py-2 rounded-md transition-colors ${
                    currentLagIndex !== null && !isCompleted
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-400 text-gray-200 cursor-not-allowed"
                  }`}
                  disabled={currentLagIndex === null || isCompleted}
                >
                  Add Driver
                </button>
              )}
            </div>
          )}

          {savedMessage && !savedMessage.includes("Error") && (
            <div className="toast-popup">{savedMessage}</div>
          )}

          {savedMessage && savedMessage.includes("Error") && (
            <div className="mt-4 text-center">
              <p className="text-red-500">{savedMessage}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
