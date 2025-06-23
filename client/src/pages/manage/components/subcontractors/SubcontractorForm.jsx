"use client"

const SubcontractorForm = ({ subcontractor, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await onSave(subcontractor)
    if (!success) {
      return
    }
  }

  const handleTrucksChange = (e) => {
    const value = Number.parseInt(e.target.value, 10)
    const truckCount = isNaN(value) ? 0 : value

    const trucks = Array.from({ length: truckCount }, (_, i) => subcontractor.trucks[i] || { reg: "", driver: "" })

    onChange("no_of_trucks", truckCount)
    onChange("trucks", trucks)
  }

  const handleTruckDetailChange = (index, field, value) => {
    const updatedTrucks = [...subcontractor.trucks]
    updatedTrucks[index] = { ...updatedTrucks[index], [field]: value }
    onChange("trucks", updatedTrucks)
  }

  const addTruckDriver = () => {
    const newTrucks = [...subcontractor.trucks, { reg: "", driver: "" }]
    onChange("trucks", newTrucks)
    onChange("no_of_trucks", newTrucks.length)
  }

  const removeTruckDriver = (index) => {
    const updatedTrucks = [...subcontractor.trucks]
    updatedTrucks.splice(index, 1)
    onChange("trucks", updatedTrucks)
    onChange("no_of_trucks", updatedTrucks.length)
  }

  return (
    <form onSubmit={handleSubmit} className="manage-subcontractor-form">
      <h2 className="manage-form-title" style={{ alignItems: "center", textAlign: "center" }}>
        {isEditing ? "Edit Subcontractor" : "Add Subcontractor"}
      </h2>

      <div
        className="manage-subform-group"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        <label>
          <strong>Company Name</strong>
          <input
            type="text"
            className="form-input"
            value={subcontractor.companyname || ""}
            onChange={(e) => onChange("companyname", e.target.value)}
          />
        </label>

        <label>
          <strong>Location</strong>
          <input
            type="text"
            className="form-input"
            value={subcontractor.location || ""}
            onChange={(e) => onChange("location", e.target.value)}
          />
        </label>

        <label>
          <strong>Contact Person</strong>
          <input
            type="text"
            className="form-input"
            value={subcontractor.contact_person || ""}
            onChange={(e) => onChange("contact_person", e.target.value)}
          />
        </label>

        <label>
          <strong>Phone Number</strong>
          <input
            type="text"
            className="form-input"
            value={subcontractor.cellnum || ""}
            onChange={(e) => onChange("cellnum", e.target.value)}
          />
        </label>

        <label>
          <strong>Email</strong>
          <input
            type="email"
            className="form-input"
            value={subcontractor.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </label>

        <label>
          <strong>Company Reg Number</strong>
          <input
            type="text"
            className="form-input"
            value={subcontractor.subei_reg_num || ""}
            onChange={(e) => onChange("subei_reg_num", e.target.value)}
          />
        </label>

        <label>
          <strong>No. of Trucks</strong>
          <input
            type="number"
            className="form-input"
            min="0"
            value={subcontractor.no_of_trucks || 1}
            onChange={handleTrucksChange}
          />
        </label>
      </div>

      <div style={{ marginTop: "20px", marginBottom: "10px" }}>
        <h3 className="manage-section-title">Trucks and Drivers</h3>
        <button
          type="button"
          className="add-truck-button"
          onClick={addTruckDriver}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
        >
          + Add Truck/Driver
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {subcontractor.trucks?.map((truck, index) => (
          <div
            key={index}
            className="truck-entry"
            style={{
              gridColumn: "1 / span 3",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              alignItems: "center",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
          >
            <label>
              <strong>Truck {index + 1} Reg Number</strong>
              <input
                type="text"
                className="form-input"
                value={truck.reg || ""}
                onChange={(e) => handleTruckDetailChange(index, "reg", e.target.value)}
              />
            </label>
            <label>
              <strong>Driver {index + 1} Name</strong>
              <input
                type="text"
                className="form-input"
                value={truck.driver || ""}
                onChange={(e) => handleTruckDetailChange(index, "driver", e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => removeTruckDriver(index)}
              style={{
                background: "#f44336",
                color: "white",
                border: "none",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                width: "fit-content",
                justifySelf: "end",
                marginTop: "22px",
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="manage-form-actions" style={{ marginTop: "20px" }}>
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Subcontractor" : "Add Subcontractor"}
        </button>

        <button type="button" className="manage-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default SubcontractorForm
