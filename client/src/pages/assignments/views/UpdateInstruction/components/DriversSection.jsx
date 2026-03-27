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
}) {
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
                          const updatedDrivers = [...drivers];
                          updatedDrivers[index].driverid = e.target.value;

                          if (e.target.value) {
                            const selectedDriver = employeeDrivers.find(
                              (d) => d.userid.toString() === e.target.value
                            );
                            if (selectedDriver) {
                              updatedDrivers[
                                index
                              ].full_name = `${selectedDriver.name} ${selectedDriver.surname}`;

                              const isSubcontractor = selectedDriver.roleid === 6;
                              console.log(
                                `Selected driver ${driverId} is subcontractor: ${isSubcontractor}`
                              );

                              if (updatedDrivers[index].container_type) {
                                if (updatedDrivers[index].container_type === "12m") {
                                  updatedDrivers[index].driverRate =
                                    isSubcontractor
                                      ? rates.subbie_twelve_meter
                                        ? rates.subbie_twelve_meter.toString()
                                        : "0"
                                      : rates.twelve_meter
                                      ? rates.twelve_meter.toString()
                                      : "0";
                                } else if (
                                  updatedDrivers[index].container_type === "abnormal"
                                ) {
                                  if (!updatedDrivers[index].driverRate) {
                                    updatedDrivers[index].driverRate = "0";
                                  }
                                  updatedDrivers[index].isAbnormal = true;
                                } else {
                                  updatedDrivers[index].driverRate =
                                    isSubcontractor
                                      ? rates.subbie_six_meter
                                        ? rates.subbie_six_meter.toString()
                                        : "0"
                                      : rates.six_meter
                                      ? rates.six_meter.toString()
                                      : "0";
                                }
                                console.log(
                                  `Updated rate for driver ${driverId} to ${updatedDrivers[index].driverRate}`
                                );
                              }
                            } else {
                              updatedDrivers[index].full_name = "";
                            }

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated driver at index ${index}:`,
                              updatedDrivers[index]
                            );
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
                          const updatedDrivers = [...drivers];
                          updatedDrivers[index].truckregnumber = e.target.value;

                          setEditedFields((prev) => ({
                            ...prev,
                            drivers: {
                              ...prev.drivers,
                              [updatedDrivers[index].id]: true,
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

                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].containernumber = weightValue;

                            updatedDrivers[index].container_type = "";
                            updatedDrivers[index].driverRate = formData.driverRate || "0";

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
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

                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].containernumber = containerValue;

                            if (containerValue && containerDetailsMap[containerValue]) {
                              const containerType = (
                                containerDetailsMap[containerValue].type || ""
                              ).trim();
                              updatedDrivers[index].container_type = containerType;

                              const isSubcontractor =
                                employeeDrivers.find(
                                  (d) =>
                                    d.userid.toString() ===
                                    updatedDrivers[index].driverid
                                )?.roleid === 6;
                              console.log(
                                `Driver ${updatedDrivers[index].driverid} is subcontractor: ${isSubcontractor}`
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
                                updatedDrivers[index].driverRate =
                                  updatedDrivers[index].driverRate || twelveMeterRate;
                                updatedDrivers[index].isAbnormal = true;
                                console.log(
                                  "Setting abnormal rate (editable):",
                                  updatedDrivers[index].driverRate
                                );
                              } else if (containerType === "12m") {
                                updatedDrivers[index].driverRate = twelveMeterRate;
                                updatedDrivers[index].isAbnormal = false;
                                console.log("Setting 12m rate:", twelveMeterRate);
                              } else {
                                updatedDrivers[index].driverRate = sixMeterRate;
                                updatedDrivers[index].isAbnormal = false;
                                console.log("Setting 6m rate:", sixMeterRate);
                              }
                            } else {
                              updatedDrivers[index].container_type = "";
                              updatedDrivers[index].driverRate = "";
                              updatedDrivers[index].isAbnormal = false;
                            }

                            setEditedFields((prev) => ({
                              ...prev,
                              drivers: {
                                ...prev.drivers,
                                [updatedDrivers[index].id]: true,
                              },
                            }));

                            setDrivers(updatedDrivers);
                            console.log(
                              `Updated container for driver at index ${index}:`,
                              containerValue
                            );
                            console.log(
                              "Updated driver data:",
                              updatedDrivers[index]
                            );
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
                          backgroundColor: (entry.isAbnormal || isWeightBased)
                            ? "white"
                            : "#f3f4f6",
                        }}
                        value={entry.driverRate || ""}
                        onChange={(e) => {
                          if (isCompleted || (!entry.isAbnormal && !isWeightBased)) return;

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
                        readOnly={!entry.isAbnormal && !isWeightBased}
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
                              ? (() => {
                                  const date = new Date(entry.date);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, "0");
                                  const day = String(date.getDate()).padStart(2, "0");
                                  return `${year}-${month}-${day}`;
                                })()
                              : ""
                          }
                          onChange={(e) => {
                            if (isCompleted) return;
                            const updatedDrivers = [...drivers];
                            updatedDrivers[index].date = e.target.value;

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
                              e.target.value
                            );
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
