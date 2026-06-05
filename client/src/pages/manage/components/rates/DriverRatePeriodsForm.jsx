"use client"

import api from "../../../../api.js"
import Swal from "sweetalert2"

const DriverRatePeriodsForm = ({
  route,
  periods,
  loading,
  onSave,
  onCancel,
  onAddPeriod,
  onRemovePeriod,
  onChangePeriod,
}) => {
  const { startingpoint, destination } = route

  const checkOverlap = async (index, card) => {
    if (!card.effective_from) return
    try {
      const params = new URLSearchParams({
        startingpoint,
        destination,
        effective_from: card.effective_from,
      })
      if (card.effective_to) params.append("effective_to", card.effective_to)
      if (card.m5ratekey) params.append("exclude_id", card.m5ratekey.toString())
      const res = await api.get(`/api/driver-rates/check-overlaps?${params}`)
      onChangePeriod(index, "_overlapWarning", res.data?.hasOverlaps ? res.data.message : null)
    } catch (_) {
      onChangePeriod(index, "_overlapWarning", null)
    }
  }

  const handleDateChange = (index, field, value) => {
    onChangePeriod(index, field, value)
    setTimeout(() => {
      const updated = { ...periods[index], [field]: value }
      checkOverlap(index, updated)
    }, 0)
  }

  const handleRateChange = (index, field, value) => {
    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      onChangePeriod(index, field, value)
    }
  }

  const handleRemovePeriod = async (index) => {
    const card = periods[index]

    // New unsaved cards have no m5ratekey — safe to remove without a check
    if (!card.m5ratekey) {
      onRemovePeriod(index)
      return
    }

    // Check if this saved period is in use by any in-progress instruction
    try {
      const usageResp = await api.get(`/api/driver-rates/${card.m5ratekey}/usage`)
      const usageData = usageResp.data

      if (usageData?.inUse) {
        const instructions = Array.isArray(usageData.instructions) ? usageData.instructions : []
        const instrText = instructions.length ? instructions.join(", ") : "unknown"
        const result = await Swal.fire({
          title: "Period In Use",
          html: `<div style="text-align:left;">
            <div style="margin-bottom:8px;">This rate period is currently used by in-progress instruction(s): <strong>${instrText}</strong></div>
            <div>Removing it means those legs may lose their rate when you save. Are you sure?</div>
          </div>`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Remove anyway",
          confirmButtonColor: "#e74c3c",
          cancelButtonText: "Keep it",
          customClass: {
            popup: "custom-swal-popup",
            title: "custom-swal-title",
            confirmButton: "custom-swal-confirm",
            cancelButton: "custom-swal-cancel",
          },
        })
        if (result.isConfirmed) {
          onRemovePeriod(index)
        }
        return
      }
    } catch (_) {
      // If the usage check fails, fall through and allow removal
    }

    onRemovePeriod(index)
  }

  const handleSubmit = async () => {
    await onSave(startingpoint, destination, periods)
  }

  const rateFields = [
    { field: "driver_six_meter_rate", label: "Driver Rate (6m)" },
    { field: "driver_twelve_meter_rate", label: "Driver Rate (12m)" },
    { field: "subie_six_meter_rate", label: "Subbie Rate (6m)" },
    { field: "subie_twelve_meter_rate", label: "Subbie Rate (12m)" },
  ]

  return (
    <div className="drf-wrapper">
      {/* Page header */}
      <div className="drf-page-header">
        <div className="drf-route-badge">
          <span className="drf-route-point">{startingpoint || "—"}</span>
          <span className="drf-route-arrow">→</span>
          <span className="drf-route-point">{destination || "—"}</span>
        </div>
        <div className="drf-header-actions">
          <button className="driver-rate-cancel-button" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="driver-rate-save-button" type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="drf-cards-grid">
        {periods.map((card, index) => (
          <div key={index} className="drf-card">
            {/* Card header */}
            <div className="drf-card-header">
              <span className="drf-period-label">Period {index + 1}</span>
              {periods.length > 1 && (
                <button
                  type="button"
                  className="drf-remove-btn"
                  onClick={() => handleRemovePeriod(index)}
                  title="Remove period"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="drf-card-body">
              {/* Dates row */}
              <div className="drf-dates-row">
                <div className="drf-field">
                  <label className="drf-label">Effective From <span className="drf-required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={card.effective_from || ""}
                    onChange={(e) => handleDateChange(index, "effective_from", e.target.value)}
                    required
                  />
                </div>
                <div className="drf-field">
                  <label className="drf-label">Effective To</label>
                  <input
                    type="date"
                    className="form-input"
                    value={card.effective_to || ""}
                    min={card.effective_from || undefined}
                    onChange={(e) => handleDateChange(index, "effective_to", e.target.value || "")}
                  />
                  <span className="drf-hint">Leave empty for no expiry</span>
                </div>
              </div>

              {/* Rate fields */}
              <div className="drf-rates-grid">
                {rateFields.map(({ field, label }) => (
                  <div key={field} className="drf-field">
                    <label className="drf-label">{label}</label>
                    <div className="drf-input-prefix-wrapper">
                      <span className="drf-prefix">R</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input drf-rate-input"
                        value={card[field] ?? ""}
                        onChange={(e) => handleRateChange(index, field, e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Overlap warning */}
              {card._overlapWarning && (
                <div className="drf-overlap-warning">
                  <span className="drf-warning-icon">⚠</span>
                  {card._overlapWarning}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Period tile */}
        <div className="drf-add-tile" onClick={onAddPeriod} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onAddPeriod()}>
          <span className="drf-add-icon">+</span>
          <span className="drf-add-label">Add Period</span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="driver-rate-button-container">
        <button className="driver-rate-save-button" type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving…" : "Save All"}
        </button>
        <button className="driver-rate-cancel-button" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DriverRatePeriodsForm
