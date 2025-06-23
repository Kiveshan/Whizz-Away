"use client"

const DriverRateForm = ({ driverRate, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    const success = await onSave(driverRate)
    if (!success) {
      return
    }
  }

  const handleNumberChange = (field, value) => {
    // For driver rates, ensure they are valid numbers
    if (field.includes("driver_") && value !== "") {
      const numValue = Number.parseFloat(value)
      if (numValue >= 0 || value === "") {
        onChange(field, value)
      }
    } else {
      // For subie rates, allow empty values (will be converted to null)
      if (value === "" || Number.parseFloat(value) >= 0 || value === "") {
        onChange(field, value)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="manage-driver-rate-form" noValidate>
      <h2 className="manage-form-title">{isEditing ? "Edit Rate" : "Add Rate"}</h2>

      <div className="manage-form-group">
        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Starting Point *</strong>
            </label>
            <input
              type="text"
              className="form-input"
              value={driverRate.startingpoint || ""}
              onChange={(e) => onChange("startingpoint", e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Destination *</strong>
            </label>
            <input
              type="text"
              className="form-input"
              value={driverRate.destination || ""}
              onChange={(e) => onChange("destination", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Driver Rate (6m) * (Required)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_six_meter_rate", e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Driver Rate (12m) * (Required)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_twelve_meter_rate", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Subbie Rate (6m) (Optional)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_six_meter_rate", e.target.value)}
              placeholder="Leave empty if not applicable"
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Subbie Rate (12m) (Optional)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_twelve_meter_rate", e.target.value)}
              placeholder="Leave empty if not applicable"
            />
          </div>
        </div>
      </div>

      <div className="manage-form-actions">
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" className="manage-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DriverRateForm
