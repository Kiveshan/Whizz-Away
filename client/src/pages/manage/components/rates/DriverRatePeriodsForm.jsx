"use client"

import { useState } from "react"
import api from "../../../../api.js"
import Swal from "sweetalert2"

const isCoveredByPeriods = (dateStr, periods) =>
  periods.some((card) => {
    if (!card.effective_from) return false
    if (dateStr < card.effective_from) return false
    if (card.effective_to && dateStr > card.effective_to) return false
    return true
  })

const DriverRatePeriodsForm = ({
  route,
  periods,
  legDates = [],
  loading,
  onSave,
  onCancel,
  onAddPeriod,
  onRemovePeriod,
  onChangePeriod,
}) => {
  const { startingpoint: originalStartingpoint, destination: originalDestination } = route
  const [editStartingpoint, setEditStartingpoint] = useState(originalStartingpoint)
  const [editDestination, setEditDestination] = useState(originalDestination)
  const [showCoverageModal, setShowCoverageModal] = useState(false)

  const routeChanged =
    editStartingpoint.trim().toLowerCase() !== originalStartingpoint.trim().toLowerCase() ||
    editDestination.trim().toLowerCase() !== originalDestination.trim().toLowerCase()

  // Compute coverage gaps on every render — fires automatically when periods change
  const uncoveredByInstruction = legDates.reduce((acc, leg) => {
    const d = leg.date ? leg.date.toString().split("T")[0] : null
    if (!d || isCoveredByPeriods(d, periods)) return acc
    if (!acc[leg.m1key]) acc[leg.m1key] = []
    acc[leg.m1key].push(d)
    return acc
  }, {})
  const uncoveredInstructions = Object.entries(uncoveredByInstruction)

  const startingpoint = editStartingpoint
  const destination = editDestination

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
    if (!editStartingpoint.trim() || !editDestination.trim()) {
      alert("Starting point and destination cannot be empty.")
      return
    }
    await onSave(
      editStartingpoint.trim(),
      editDestination.trim(),
      periods,
      originalStartingpoint,
      originalDestination,
    )
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
          <input
            type="text"
            className="drf-route-input"
            value={editStartingpoint}
            onChange={(e) => setEditStartingpoint(e.target.value)}
            placeholder="Starting point"
            aria-label="Starting point"
          />
          <span className="drf-route-arrow">→</span>
          <input
            type="text"
            className="drf-route-input"
            value={editDestination}
            onChange={(e) => setEditDestination(e.target.value)}
            placeholder="Destination"
            aria-label="Destination"
          />
          {routeChanged && (
            <span className="drf-route-rename-badge">Renaming</span>
          )}
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

      {/* Coverage gap banner — compact strip with modal for details */}
      {uncoveredInstructions.length > 0 && (
        <div className="drf-coverage-warning">
          <span className="drf-warning-icon">⚠</span>
          <span className="drf-coverage-summary">
            <strong>{uncoveredInstructions.length}</strong> instruction{uncoveredInstructions.length > 1 ? "s have" : " has"} legs outside the current periods and will have no rate.
          </span>
          <button
            type="button"
            className="drf-coverage-details-btn"
            onClick={() => setShowCoverageModal(true)}
          >
            View details
          </button>
        </div>
      )}

      {/* Coverage gap modal */}
      {showCoverageModal && (
        <div className="drf-modal-overlay" onClick={() => setShowCoverageModal(false)}>
          <div className="drf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drf-modal-header">
              <span className="drf-warning-icon">⚠</span>
              <h3 className="drf-modal-title">Uncovered Leg Dates</h3>
              <button
                type="button"
                className="drf-modal-close"
                onClick={() => setShowCoverageModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="drf-modal-intro">
              The following instructions have legs on dates not covered by any period. Ensure you add or extend a period to cover these dates before saving.
            </p>
            <ul className="drf-coverage-list">
              {uncoveredInstructions.map(([instrNum, dates]) => (
                <li key={instrNum} className="drf-coverage-list-item">
                  <span className="drf-coverage-instr">Instruction <strong>#{instrNum}</strong></span>
                  <span className="drf-coverage-dates">{dates.join(", ")}</span>
                </li>
              ))}
            </ul>
            <div className="drf-modal-footer">
              <button
                type="button"
                className="driver-rate-cancel-button"
                onClick={() => setShowCoverageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
