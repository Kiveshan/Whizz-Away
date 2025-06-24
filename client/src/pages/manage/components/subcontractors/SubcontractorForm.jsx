"use client"

const SubcontractorForm = ({ subcontractor, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate that we have at least one complete truck/driver combination
    const validTrucks = (subcontractor.trucks || []).filter(
      (truck) => truck.reg && truck.reg.trim() && truck.driver && truck.driver.trim(),
    )

    if (validTrucks.length === 0) {
      alert("Please provide at least one complete truck registration and driver name combination.")
      return
    }

    const success = await onSave({
      ...subcontractor,
      trucks: validTrucks,
    })

    if (!success) {
      return
    }
  }

  const addTruckDriver = () => {
    const newTrucks = [...(subcontractor.trucks || []), { reg: "", driver: "" }]
    onChange("trucks", newTrucks)
    onChange("no_of_trucks", newTrucks.length)
  }

  const removeTruckDriver = (index) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    updatedTrucks.splice(index, 1)
    onChange("trucks", updatedTrucks)
    onChange("no_of_trucks", updatedTrucks.length)
  }

  const handleTruckDetailChange = (index, field, value) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    if (!updatedTrucks[index]) {
      updatedTrucks[index] = { reg: "", driver: "" }
    }
    updatedTrucks[index] = { ...updatedTrucks[index], [field]: value }
    onChange("trucks", updatedTrucks)
  }

  // Ensure we have at least one truck entry
  const trucks =
    subcontractor.trucks && subcontractor.trucks.length > 0 ? subcontractor.trucks : [{ reg: "", driver: "" }]

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

      {/* Trucks and Drivers Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
          <h3 className="manage-section-title">Trucks and Drivers</h3>
          <button
            type="button"
            className="add-truck-button"
            onClick={addTruckDriver}
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
            + Add Truck/Driver
          </button>
        </div>

        <div style={{ marginBottom: "10px", fontSize: "14px", color: "#666" }}>
          <strong>Note:</strong> Each truck registration will be paired with its driver name. Driver names will be split
          into first and last name automatically.
        </div>

        {trucks.map((truck, index) => (
          <div
            key={index}
            className="truck-entry"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
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
              <strong>Truck Registration {index + 1} *</strong>
              <input
                type="text"
                className="form-input"
                value={truck.reg || ""}
                onChange={(e) => handleTruckDetailChange(index, "reg", e.target.value)}
                placeholder="e.g., ABC123GP"
                required
              />
            </label>

            <label>
              <strong>Driver Name {index + 1} *</strong>
              <input
                type="text"
                className="form-input"
                value={truck.driver || ""}
                onChange={(e) => handleTruckDetailChange(index, "driver", e.target.value)}
                placeholder="e.g., John Smith"
                required
              />
              {/* <small style={{ color: "#666", fontSize: "12px" }}>Enter full name (first and last name)</small> */}
            </label>

            <button
              type="button"
              onClick={() => removeTruckDriver(index)}
              disabled={trucks.length === 1}
              style={{
                background: trucks.length === 1 ? "#ccc" : "#f44336",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: trucks.length === 1 ? "not-allowed" : "pointer",
                fontSize: "14px",
                height: "fit-content",
              }}
              title={
                trucks.length === 1 ? "At least one truck/driver combination is required" : "Remove this truck/driver"
              }
            >
              Remove
            </button>
          </div>
        ))}

        {trucks.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              border: "2px dashed #ddd",
              borderRadius: "6px",
            }}
          >
            No trucks added yet. Click "Add Truck/Driver" to get started.
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="manage-form-actions" style={{ marginTop: "30px", textAlign: "center" }}>
        <button type="submit" className="manage-save-button" disabled={loading} style={{ marginRight: "15px" }}>
          {loading ? "Saving..." : isEditing ? "Update Subcontractor" : "Add Subcontractor"}
        </button>

        <button type="button" className="manage-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* Summary */}
      {trucks.length > 0 && (
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
            This will create <strong>{trucks.filter((t) => t.reg && t.driver).length}</strong> database entries for{" "}
            <strong>{subcontractor.companyname || "this company"}</strong>, one for each truck/driver combination.
          </p>
        </div>
      )}
    </form>
  )
}

export default SubcontractorForm
