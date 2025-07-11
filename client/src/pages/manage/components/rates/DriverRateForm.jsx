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
    // Allow empty values or valid positive numbers for all rate fields
    if (value === "" || (!isNaN(Number.parseFloat(value)) && Number.parseFloat(value) >= 0)) {
      onChange(field, value)
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
              <strong>Driver Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_six_meter_rate", e.target.value)}
              
            />
          </div>
          <div className="form-field">
            <label>
              <strong>Driver Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_twelve_meter_rate", e.target.value)}
              
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Subbie Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_six_meter_rate", e.target.value)}
              
            />
          </div>
          <div className="form-field">
            <label>
              <strong>Subbie Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_twelve_meter_rate", e.target.value)}
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
