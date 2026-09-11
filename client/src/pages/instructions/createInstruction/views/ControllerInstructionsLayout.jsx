import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate"
import { AddonInvoicePicker } from "../../../../components/instructions/AddonInvoicePicker"
import { ControllerSubNav } from "../../../../components/instructions/ControllerSubNav"
import { SHIPMENT_TYPE_LABELS } from "../../../../utils/instructions/display"
import "../../css/controller-ui.css"

const CONTAINER_TYPES = [
  { label: "6m", countField: "num_six_meters", rateField: "sixMeterRate", key: "sixMeter", lockable: true },
  { label: "12m", countField: "num_twelve_meters", rateField: "twelveMeterRate", key: "twelveMeter", lockable: true },
  { label: "Abnormal", countField: "num_abnormal", rateField: "abnormalRate", key: "abnormal", lockable: false },
]

const isNumericInput = (value) => value === "" || /^[0-9]*\.?[0-9]*$/.test(value)

function Field({ label, error, hint, wide = false, children }) {
  return (
    <div className={`wa-field ${wide ? "is-wide" : ""}`}>
      <label className="wa-field-label">{label}</label>
      {children}
      {error ? <div className="wa-field-error">{error}</div> : hint ? <div className="wa-hint">{hint}</div> : null}
    </div>
  )
}

export function ControllerInstructionsLayout({
  spinnerKeyframes,
  showConfirmationPopup,
  confirmationMessage,
  handleConfirmSubmit,
  handleCancelSubmit,
  showNoRatesModal,
  setShowNoRatesModal,
  isLoadingLocations,
  isLoadingComplete,
  hasDataFailure,
  handleSubmit,
  formData,
  setFormData,
  clients,
  fieldErrors,
  setFieldErrors,
  handleClientChange,
  handlePickupChange,
  clientStartingPoints,
  handleDropoffChange,
  clientDestinations,
  isLoading,
  isWeightBased,
  isSetRateMode,
  isSetRate,
  setIsSetRate,
  setRateValue,
  rateFieldsEnabled,
  rateLockStatus,
  handleInputChange,
  handleShipmentTypeChange,
  handleContainerCountChange,
  shipmentTypes,
  isCrossHaul,
  isImport,
  isExport,
  isAddOn,
  instructionId,
  lastFreeDateRef,
  etaDateRef,
  today,
  showContainerDetails,
  allowVgmUI,
  containers,
  containerFieldErrors,
  handleContainerChange,
  isSubmitting,
  submitError,
  weightRows,
  updateWeightRow,
  removeWeightRow,
  addWeightRow,
  openCalendar,
}) {
  const typeId = String(formData.shipmentTypeId || "")
  const isFixedContainer = ["1", "2", "3"].includes(typeId)
  const usesWeightTable = typeId === "4" || (typeId === "5" && isWeightBased)
  const unitOptions = isFixedContainer ? ["Container"] : typeId === "4" ? ["kg", "ton"] : ["kg", "ton", "Container"]
  const errClass = (name) => (fieldErrors[name] ? " has-error" : "")
  const hasErrors = Object.values(fieldErrors).some(Boolean)

  const numericChange = (e) => {
    if (isNumericInput(e.target.value)) handleInputChange(e)
  }

  // Rate inputs keep two decimals on display and store a number on blur.
  const rateInputProps = (field) => ({
    value: formData[field] !== undefined && formData[field] !== "" ? Number.parseFloat(formData[field]).toFixed(2) : "",
    onChange: (e) => {
      const value = e.target.value
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [field]: value === "" ? "" : Number.parseFloat(value) || 0 }))
      }
    },
    onFocus: (e) => {
      e.target.select()
      if (formData[field]) {
        setFormData((prev) => ({ ...prev, [field]: Number.parseFloat(prev[field]).toString() }))
      }
    },
    onBlur: () => {
      if (formData[field] !== "") {
        setFormData((prev) => ({ ...prev, [field]: Number.parseFloat(prev[field]) }))
      }
    },
  })

  const containerCellError = (key) =>
    containerFieldErrors[key] ? <div className="wa-field-error">{containerFieldErrors[key]}</div> : null

  return (
    <div className="wa-page">
      <style>{spinnerKeyframes}</style>

      <ConfirmationModal
        isOpen={showConfirmationPopup}
        title="Confirm Submission"
        message={confirmationMessage}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />

      {showNoRatesModal && (
        <div className="wa-modal-overlay" role="dialog" aria-modal="true">
          <div className="wa-modal">
            <h3>No Rates Available</h3>
            <p>This client has no rates configured. Please contact the manager to set up rates.</p>
            <button type="button" className="wa-btn wa-btn-primary" onClick={() => setShowNoRatesModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      <ControllerSubNav active="create" />

      <div className="wa-container is-form">
        <InstructionLoadingGate
          isLoadingComplete={isLoadingComplete}
          hasDataFailure={hasDataFailure}
          onRetry={() => window.location.reload()}
        >
          <form onSubmit={handleSubmit} className="wa-card" noValidate>
            <h2 className="wa-card-title wa-form-heading">New Instruction</h2>

            {hasErrors && (
              <div className="wa-alert wa-alert-error">
                Some required fields are missing or invalid — they're highlighted below.
              </div>
            )}

            {/* ---------- Client & route ---------- */}
            <div className="wa-form-section is-first">
              <div className="wa-form-grid">
                <Field label="Client" error={fieldErrors.clientId}>
                  <select
                    className={`wa-select${errClass("clientId")}`}
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleClientChange}
                  >
                    <option value="" disabled>
                      Select Client
                    </option>
                    {clients.map((client) => (
                      <option key={client.m5clientkey} value={client.m5clientkey}>
                        {client.companyname}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Pick-Up Location"
                  error={fieldErrors.pickup}
                  hint={isLoadingLocations ? "Loading locations…" : undefined}
                >
                  <select
                    className={`wa-select${errClass("pickup")}`}
                    name="pickup"
                    value={formData.pickup}
                    onChange={handlePickupChange}
                    disabled={!formData.clientId || isLoadingLocations}
                  >
                    <option value="" disabled>
                      {formData.clientId ? "Select Pick-Up" : "Select a client first"}
                    </option>
                    {Array.isArray(clientStartingPoints) &&
                      clientStartingPoints.map((location) => (
                        <option key={location.value} value={location.value}>
                          {location.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field
                  label="Drop-Off Location"
                  error={fieldErrors.dropoff}
                  hint={isLoading.destinations ? "Loading destinations…" : undefined}
                >
                  <select
                    className={`wa-select${errClass("dropoff")}`}
                    name="dropoff"
                    value={formData.dropoff}
                    onChange={handleDropoffChange}
                    disabled={!formData.clientId || !formData.pickup || isLoading.destinations}
                  >
                    <option value="">
                      {!formData.clientId || !formData.pickup ? "Select client and pick-up first" : "Select Drop-Off"}
                    </option>
                    {Array.isArray(clientDestinations) &&
                      clientDestinations.map((location) => (
                        <option key={location.value} value={location.value}>
                          {location.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Representative">
                  <input type="text" className="wa-input" value={formData.representative} readOnly />
                </Field>
                <Field label="Contact Details">
                  <input type="text" className="wa-input" value={formData.contactDetails} readOnly />
                </Field>
                <Field label="Email">
                  <input type="email" className="wa-input" value={formData.email} readOnly />
                </Field>
              </div>
            </div>

            {/* ---------- Shipment type ---------- */}
            <div className="wa-form-section">
              <label className="wa-field-label">Shipment Type</label>
              <div className="wa-chips" style={{ marginTop: 4 }} role="radiogroup" aria-label="Shipment Type">
                {shipmentTypes.map((type) => {
                  const key = String(type.shipkey)
                  const active = typeId === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`wa-chip is-outline ${active ? "is-active" : ""}`}
                      disabled={isLoading.shipmentTypes}
                      onClick={() => handleShipmentTypeChange({ target: { name: "shipmentTypeId", value: key } })}
                    >
                      {SHIPMENT_TYPE_LABELS[key] || type.shipmenttype}
                    </button>
                  )
                })}
              </div>
              {fieldErrors.shipmentTypeId && <div className="wa-field-error">{fieldErrors.shipmentTypeId}</div>}
            </div>

            {/* ---------- References ---------- */}
            <div className="wa-form-section">
              <div className="wa-form-grid">
                <Field label="Booking Ref" error={fieldErrors.bookingRef}>
                  <input
                    type="text"
                    className={`wa-input${errClass("bookingRef")}`}
                    name="bookingRef"
                    value={formData.bookingRef}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field label="Client File Reference" error={fieldErrors.fileRef}>
                  <input
                    type="text"
                    className={`wa-input${errClass("fileRef")}`}
                    name="fileRef"
                    value={formData.fileRef}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field label="KSM File Reference" error={fieldErrors.task}>
                  <input
                    type="text"
                    className={`wa-input${errClass("task")}`}
                    name="task"
                    value={formData.task}
                    onChange={handleInputChange}
                  />
                </Field>
                {isAddOn && (
                  <AddonInvoicePicker
                    clientId={formData.clientId}
                    instructionId={instructionId}
                    value={formData.addon_id}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, addon_id: val }))
                      setFieldErrors((prev) => ({ ...prev, addon_id: "" }))
                    }}
                    error={fieldErrors.addon_id}
                  />
                )}
              </div>
            </div>

            {/* ---------- Rates ---------- */}
            <div className="wa-form-section">
              <div className="wa-section-head">
                <label className="wa-field-label">{isWeightBased ? "Weight & Rate" : "Containers & Rates"}</label>
                {isFixedContainer ? (
                  <span className="wa-muted">Charged per container</span>
                ) : (
                  <span className="wa-inline-control">
                    Unit per
                    <select
                      className="wa-select"
                      name="rateWeight"
                      value={String(formData.rateWeight || "Container")}
                      onChange={handleInputChange}
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </span>
                )}
              </div>

              {!isWeightBased && (
                <div className="wa-rate-cards">
                  {CONTAINER_TYPES.map(({ label, countField, rateField, key, lockable }) => {
                    const locked = lockable && rateLockStatus[key]
                    const rateEditable = rateFieldsEnabled[key] && !locked
                    return (
                      <div key={key} className={`wa-rate-card ${isSetRateMode ? "is-disabled" : ""}`}>
                        <div className="wa-rate-card-title">{label}</div>
                        <div className="wa-rate-card-inputs">
                          <label>
                            <span>Qty</span>
                            <input
                              type="number"
                              min="0"
                              className={`wa-input${fieldErrors.containers ? " has-error" : ""}`}
                              name={countField}
                              value={formData[countField]}
                              onChange={(e) => handleContainerCountChange(countField, e.target.value)}
                              disabled={isSetRateMode}
                            />
                          </label>
                          <label>
                            <span>Rate</span>
                            <input
                              type="text"
                              className="wa-input"
                              placeholder={rateEditable ? "0.00" : ""}
                              disabled={!rateEditable}
                              {...rateInputProps(rateField)}
                            />
                          </label>
                        </div>
                        {locked && <div className="wa-hint">From the client's rate card</div>}
                      </div>
                    )
                  })}
                </div>
              )}
              {!isWeightBased && (fieldErrors.containers || fieldErrors.containerCount) && (
                <div className="wa-field-error">{fieldErrors.containers || fieldErrors.containerCount}</div>
              )}

              {isWeightBased && (
                <div className="wa-weight-row">
                  {!usesWeightTable && (
                    <Field label={`Weight (${formData.rateWeight})`} error={fieldErrors.weight}>
                      <input
                        type="text"
                        className={`wa-input${errClass("weight")}`}
                        name="weight"
                        placeholder="0"
                        value={formData.weight}
                        onChange={numericChange}
                      />
                    </Field>
                  )}
                  <Field label={`Rate per ${formData.rateWeight}`} error={fieldErrors.unitrate}>
                    <input
                      type="text"
                      className={`wa-input${errClass("unitrate")}`}
                      name="unitrate"
                      placeholder="0.00"
                      value={formData.unitrate || ""}
                      onChange={numericChange}
                      disabled={usesWeightTable && isSetRate}
                    />
                  </Field>
                </div>
              )}

              {typeId === "4" && (
                <div className="wa-weight-row" style={{ marginTop: 14 }}>
                  <label className="wa-checkbox">
                    <input
                      type="checkbox"
                      checked={isSetRate}
                      onChange={(e) => {
                        const nextChecked = e.target.checked
                        setIsSetRate(nextChecked)
                        if (nextChecked) {
                          setFormData((prev) => ({ ...prev, unitrate: "" }))
                          setFieldErrors((prev) => {
                            if (!prev.unitrate) return prev
                            const next = { ...prev }
                            delete next.unitrate
                            return next
                          })
                        }
                      }}
                    />
                    Break Bulk Set Rate
                  </label>
                  {isSetRate && (
                    <input
                      type="text"
                      className="wa-input"
                      style={{ width: 140 }}
                      value={Number.isFinite(Number(setRateValue)) ? String(setRateValue) : ""}
                      readOnly
                      aria-label="Set rate"
                    />
                  )}
                </div>
              )}

              {usesWeightTable && (
                <div className="wa-table-wrap wa-subtable">
                  <table className="wa-table is-light">
                    <thead>
                      <tr>
                        <th>KSM DN Number</th>
                        <th>Ticket Number</th>
                        <th>Receipt Book Number</th>
                        <th>Weight ({formData.rateWeight})</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {weightRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              type="text"
                              className="wa-input"
                              value={row.ksmDmNo || ""}
                              onChange={(e) => updateWeightRow(row.id, "ksmDmNo", e.target.value)}
                              aria-label="KSM DN Number"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="wa-input"
                              value={row.ticketNo || ""}
                              onChange={(e) => updateWeightRow(row.id, "ticketNo", e.target.value)}
                              aria-label="Ticket Number"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="wa-input"
                              value={row.receiptBookNo || ""}
                              onChange={(e) => updateWeightRow(row.id, "receiptBookNo", e.target.value)}
                              aria-label="Receipt Book Number"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="wa-input"
                              value={row.weight || ""}
                              onChange={(e) => updateWeightRow(row.id, "weight", e.target.value)}
                              aria-label="Weight"
                            />
                          </td>
                          <td className="is-right">
                            <button
                              type="button"
                              className="wa-btn wa-btn-danger-outline"
                              onClick={() => removeWeightRow(row.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="wa-subtable-foot">
                    <button type="button" className="wa-btn wa-btn-secondary" onClick={addWeightRow}>
                      + Add Row
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ---------- Dates & details ---------- */}
            <div className="wa-form-section">
              <div className="wa-form-grid">
                {!isCrossHaul && (
                  <Field label={isImport ? "ETA" : "Stack Date"} error={fieldErrors.stackDate}>
                    <input
                      type="date"
                      ref={etaDateRef}
                      className={`wa-input${errClass("stackDate")}`}
                      name="stackDate"
                      value={formData.stackDate}
                      onChange={handleInputChange}
                      min={today}
                      onClick={() => openCalendar(etaDateRef)}
                      onKeyDown={(e) => e.preventDefault()}
                    />
                  </Field>
                )}
                <Field label="Last Free Date" error={fieldErrors.lastFreeDate}>
                  <input
                    type="date"
                    ref={lastFreeDateRef}
                    className={`wa-input${errClass("lastFreeDate")}`}
                    name="lastFreeDate"
                    value={formData.lastFreeDate}
                    onChange={handleInputChange}
                    min={today}
                    onKeyDown={(e) => e.preventDefault()}
                  />
                </Field>
                {!isCrossHaul && (
                  <Field label="VAT">
                    <div className="wa-chips" style={{ marginTop: 0 }}>
                      {[15, 0].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`wa-chip ${(formData.vat !== 0) === (rate !== 0) ? "is-active" : ""}`}
                          onClick={() => setFormData((prev) => ({ ...prev, vat: rate }))}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
                {!isCrossHaul && (
                  <Field label="Vessel Name" error={fieldErrors.vesselName}>
                    <input
                      type="text"
                      className={`wa-input${errClass("vesselName")}`}
                      name="vesselName"
                      value={formData.vesselName}
                      onChange={handleInputChange}
                    />
                  </Field>
                )}
                <Field
                  label={isCrossHaul ? "Description From Client" : "Description"}
                  error={fieldErrors.description}
                  wide
                >
                  <input
                    type="text"
                    className={`wa-input${errClass("description")}`}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </Field>
              </div>
            </div>

            {/* ---------- Container details ---------- */}
            {!isWeightBased && showContainerDetails && (
              <div className="wa-form-section container-details-section">
                <label className="wa-field-label">Container Details</label>
                <div className="wa-table-wrap">
                  <table className="wa-table is-light">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Container Number</th>
                        {(isExport || typeId === "2") && <th>File Reference</th>}
                        {(isImport || isExport || isCrossHaul) && <th>Weight</th>}
                        <th>Cargo Description</th>
                        <th className="is-center">Hazardous</th>
                        <th className="is-center">Surcharges</th>
                        {allowVgmUI && <th className="is-center">VGM</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((container) => (
                        <tr key={container.id}>
                          <td>{container.id}</td>
                          <td>{container.containerType}</td>
                          <td>
                            <input
                              type="text"
                              className={`wa-input${containerFieldErrors[`container-${container.id}`] ? " has-error" : ""}`}
                              value={container.containerNum}
                              onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                              placeholder="Container number"
                              maxLength={20}
                            />
                            {containerCellError(`container-${container.id}`)}
                          </td>
                          {(isExport || typeId === "2") && (
                            <td>
                              <input
                                type="text"
                                className={`wa-input${containerFieldErrors[`file-ref-${container.id}`] ? " has-error" : ""}`}
                                value={container.fileRef || ""}
                                onChange={(e) => handleContainerChange(container.id, "fileRef", e.target.value)}
                                placeholder="File reference"
                                maxLength={20}
                              />
                              {containerCellError(`file-ref-${container.id}`)}
                            </td>
                          )}
                          {(isImport || isExport || isCrossHaul) && (
                            <td>
                              <input
                                type="text"
                                className={`wa-input${containerFieldErrors[`weight-${container.id}`] ? " has-error" : ""}`}
                                value={container.weight || ""}
                                onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                                placeholder="Weight"
                                style={{ minWidth: 80 }}
                              />
                              {containerCellError(`weight-${container.id}`)}
                            </td>
                          )}
                          <td>
                            <input
                              type="text"
                              className="wa-input"
                              value={container.cargoDescription}
                              onChange={(e) => handleContainerChange(container.id, "cargoDescription", e.target.value)}
                              placeholder="Cargo description"
                            />
                          </td>
                          <td className="is-center">
                            <input
                              type="checkbox"
                              checked={container.hazardous || false}
                              onChange={(e) => handleContainerChange(container.id, "hazardous", e.target.checked)}
                              aria-label="Hazardous"
                            />
                          </td>
                          <td className="is-center">
                            <input
                              type="checkbox"
                              checked={container.addSurcharges || false}
                              onChange={(e) => handleContainerChange(container.id, "addSurcharges", e.target.checked)}
                              aria-label="Add surcharges"
                            />
                          </td>
                          {allowVgmUI && (
                            <td className="is-center">
                              <input
                                type="checkbox"
                                checked={container.vgm || false}
                                onChange={(e) => handleContainerChange(container.id, "vgm", e.target.checked)}
                                aria-label="VGM"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="wa-form-actions">
              {submitError && <div className="wa-form-message">{submitError}</div>}
              <button type="submit" className="wa-btn wa-btn-primary wa-btn-lg" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Instruction"}
              </button>
            </div>
          </form>
        </InstructionLoadingGate>
      </div>
    </div>
  )
}
