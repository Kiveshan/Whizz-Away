"use client"

const SubcontractorForm = ({ subcontractor, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate that we have at least one driver OR one truck (not both required)
    const validDrivers = (subcontractor.drivers || []).filter((driver) => driver.name && driver.name.trim())
    const validTrucks = (subcontractor.trucks || []).filter((truck) => truck.truckregnum && truck.truckregnum.trim())

    if (validDrivers.length === 0 && validTrucks.length === 0) {
      alert("Please provide at least one driver OR one truck (or both).")
      return
    }

    const success = await onSave({
      ...subcontractor,
      drivers: validDrivers,
      trucks: validTrucks,
    })

    if (!success) {
      return
    }
  }

  const addDriver = () => {
    const newDrivers = [...(subcontractor.drivers || []), { name: "" }]
    onChange("drivers", newDrivers)
    onChange("driver_count", newDrivers.length)
  }

  const removeDriver = (index) => {
    const updatedDrivers = [...(subcontractor.drivers || [])]
    updatedDrivers.splice(index, 1)
    onChange("drivers", updatedDrivers)
    onChange("driver_count", updatedDrivers.length)
  }

  const handleDriverChange = (index, value) => {
    const updatedDrivers = [...(subcontractor.drivers || [])]
    if (!updatedDrivers[index]) {
      updatedDrivers[index] = { name: "" }
    }
    updatedDrivers[index] = { ...updatedDrivers[index], name: value }
    onChange("drivers", updatedDrivers)
  }

  const addTruck = () => {
    const newTrucks = [
      ...(subcontractor.trucks || []),
      {
        truckregnum: "",
        trailersize: "",
        year: "",
        model: "",
        vin_num: "",
      },
    ]
    onChange("trucks", newTrucks)
    onChange("truck_count", newTrucks.length)
  }

  const removeTruck = (index) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    updatedTrucks.splice(index, 1)
    onChange("trucks", updatedTrucks)
    onChange("truck_count", updatedTrucks.length)
  }

  const handleTruckChange = (index, field, value) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    if (!updatedTrucks[index]) {
      updatedTrucks[index] = {
        truckregnum: "",
        trailersize: "",
        year: "",
        model: "",
        vin_num: "",
      }
    }
    updatedTrucks[index] = { ...updatedTrucks[index], [field]: value }
    onChange("trucks", updatedTrucks)
  }

  // Both drivers and trucks can be empty initially
  const drivers = subcontractor.drivers || []
  const trucks = subcontractor.trucks || []

  return (
    <form onSubmit={handleSubmit} className="manage-subcontractor-form">
      <h2 className="manage-form-title" style={{ alignItems: "center", textAlign: "center" }}>
        {isEditing ? "Edit Subcontractor" : "Add Subcontractor"}
      </h2>

      {/* Company Information */}
      <div style={{ marginBottom: "20px" }}>
        <h3 className="manage-section-title">Company Information</h3>
        <div
          className="manage-subform-group"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          <label>
            <strong>Company Name *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.companyname || ""}
              onChange={(e) => onChange("companyname", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Location *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.location || ""}
              onChange={(e) => onChange("location", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Contact Person *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.contact_person || ""}
              onChange={(e) => onChange("contact_person", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Phone Number *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.cellnum || ""}
              onChange={(e) => onChange("cellnum", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Email *</strong>
            <input
              type="email"
              className="form-input"
              value={subcontractor.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Company Reg Number *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.subei_reg_num || ""}
              onChange={(e) => onChange("subei_reg_num", e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {/* Flexible Options Notice */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          borderRadius: "6px",
          border: "1px solid #ffeaa7",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>📋 Flexible Options:</h4>
        <p style={{ margin: "0", color: "#856404", fontSize: "14px" }}>You can choose to add:</p>
        <ul style={{ margin: "5px 0 0 20px", color: "#856404", fontSize: "14px" }}>
          <li>
            <strong>Drivers only</strong> - Just add drivers without trucks
          </li>
          <li>
            <strong>Trucks only</strong> - Just add trucks without drivers
          </li>
          <li>
            <strong>Both</strong> - Add both drivers and trucks
          </li>
        </ul>
        <p style={{ margin: "10px 0 0 0", color: "#856404", fontSize: "14px" }}>
          <strong>Note:</strong> At least one driver OR one truck must be provided.
        </p>
      </div>

      {/* Drivers Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
          <h3 className="manage-section-title">Drivers (Optional)</h3>
          <button
            type="button"
            className="add-driver-button"
            onClick={addDriver}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + Add Driver
          </button>
        </div>

        {drivers.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              border: "2px dashed #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            No drivers added yet. Click "Add Driver" to get started, or skip to add trucks only.
          </div>
        ) : (
          drivers.map((driver, index) => (
            <div
              key={index}
              className="driver-entry"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "15px",
                alignItems: "end",
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "15px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <label>
                <strong>Driver Name {index + 1}</strong>
                <input
                  type="text"
                  className="form-input"
                  value={driver.name || ""}
                  onChange={(e) => handleDriverChange(index, e.target.value)}
                  placeholder="e.g., John Smith"
                />
                <small style={{ color: "#666", fontSize: "12px" }}>Enter full name (first and last name)</small>
              </label>

              <button
                type="button"
                onClick={() => removeDriver(index)}
                style={{
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  height: "fit-content",
                }}
                title="Remove this driver"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Trucks Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
          <h3 className="manage-section-title">Trucks (Optional)</h3>
          <button
            type="button"
            className="add-truck-button"
            onClick={addTruck}
            style={{
              background: "#2196F3",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + Add Truck
          </button>
        </div>

        {trucks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              border: "2px dashed #ddd",
              borderRadius: "6px",
              backgroundColor: "#f0f8ff",
            }}
          >
            No trucks added yet. Click "Add Truck" to get started, or skip to add drivers only.
          </div>
        ) : (
          trucks.map((truck, index) => (
            <div
              key={index}
              className="truck-entry"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr) auto",
                gap: "15px",
                alignItems: "end",
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "15px",
                backgroundColor: "#f0f8ff",
              }}
            >
              <label>
                <strong>Truck Registration</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.truckregnum || ""}
                  onChange={(e) => handleTruckChange(index, "truckregnum", e.target.value)}
                  placeholder="e.g., ABC123GP"
                />
              </label>

              <label>
                <strong>Trailer Size</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.trailersize || ""}
                  onChange={(e) => handleTruckChange(index, "trailersize", e.target.value)}
                  placeholder="e.g., 34 Ton"
                />
              </label>

              <label>
                <strong>Year</strong>
                <input
                  type="number"
                  className="form-input"
                  value={truck.year || ""}
                  onChange={(e) => handleTruckChange(index, "year", e.target.value)}
                  placeholder="e.g., 2020"
                />
              </label>

              <button
                type="button"
                onClick={() => removeTruck(index)}
                style={{
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  height: "fit-content",
                }}
                title="Remove this truck"
              >
                Remove
              </button>

              <label style={{ gridColumn: "1 / 2" }}>
                <strong>Model</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.model || ""}
                  onChange={(e) => handleTruckChange(index, "model", e.target.value)}
                  placeholder="e.g., Volvo FH"
                />
              </label>

              <label style={{ gridColumn: "2 / 3" }}>
                <strong>VIN Number</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.vin_num || ""}
                  onChange={(e) => handleTruckChange(index, "vin_num", e.target.value)}
                  placeholder="Vehicle identification number"
                />
              </label>
            </div>
          ))
        )}
      </div>

      {/* Form Actions */}
    <div className="subcontractor-button-container">
        <button type="submit" className="subcontractor-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Subcontractor" : "Add Subcontractor"}
        </button>
        <button type="button" className="subcontractor-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* Dynamic Summary */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e8f4fd",
          borderRadius: "6px",
          border: "1px solid #bee5eb",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#0c5460" }}>Summary:</h4>
        <p style={{ margin: "0", color: "#0c5460" }}>
          This will create{" "}
          {drivers.filter((d) => d.name).length > 0 && (
            <>
              <strong>{drivers.filter((d) => d.name).length}</strong> driver record(s)
            </>
          )}
          {drivers.filter((d) => d.name).length > 0 && trucks.filter((t) => t.truckregnum).length > 0 && " and "}
          {trucks.filter((t) => t.truckregnum).length > 0 && (
            <>
              <strong>{trucks.filter((t) => t.truckregnum).length}</strong> truck record(s)
            </>
          )}
          {drivers.filter((d) => d.name).length === 0 && trucks.filter((t) => t.truckregnum).length === 0 && (
            <span style={{ color: "#dc3545" }}>
              <strong>No records</strong> - Please add at least one driver or truck
            </span>
          )}
          {(drivers.filter((d) => d.name).length > 0 || trucks.filter((t) => t.truckregnum).length > 0) && (
            <>
              {" "}
              for <strong>{subcontractor.companyname || "this company"}</strong>
            </>
          )}
          .
        </p>
        <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#0c5460" }}>
          Drivers will be stored in the employee table, trucks will be stored in the trucks table with subcontractor
          flag.
        </p>
      </div>
    </form>
  )
}

export default SubcontractorForm
