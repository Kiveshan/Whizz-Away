"use client"

const DriverRateForm = ({ driverRate, loading, isEditing, onSave, onCancel, onChange }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    if (
      driverRate.effective_from &&
      driverRate.effective_to &&
      driverRate.effective_to < driverRate.effective_from
    ) {
      alert("Effective To date cannot be before Effective From date.")
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

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Effective From *</strong>
            </label>
            <input
              type="date"
              className="form-input"
              value={driverRate.effective_from || ""}
              onChange={(e) => onChange("effective_from", e.target.value)}
              required
            />
            <small className="form-hint">Rate becomes effective on this date</small>
          </div>
          <div className="form-field">
            <label>
              <strong>Effective To</strong>
            </label>
            <input
              type="date"
              className="form-input"
              value={driverRate.effective_to || ""}
              min={driverRate.effective_from || undefined}
              onChange={(e) => onChange("effective_to", e.target.value || null)}
            />
            <small className="form-hint">Leave empty for no expiration</small>
          </div>
        </div>

        {driverRate._overlapWarning && (
          <div className="form-warning" style={{ 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '4px',
            marginTop: '10px',
            color: '#856404'
          }}>
            <strong>Warning:</strong> {driverRate._overlapWarning}
          </div>
        )}
      </div>

      <div className="driver-rate-button-container">
        <button type="submit" className="driver-rate-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" className="driver-rate-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DriverRateForm