"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/controller-ui.css"
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import { ControllerSubNav } from "../../../../components/instructions/ControllerSubNav"
import { useAuth } from "../../../../context/AuthContext"
import { reopenInstruction as reopenInstructionService } from "../../../../services/instructionService"
import api from "../../../../api"
import {
  shipmentTypeId,
  shipmentTypeLabel,
  statusPillClass,
  formatRand,
  formatDate,
  WEIGHT_UNITS,
} from "../../../../utils/instructions/display"

// Reopening a Completed instruction is a supervisory override — restrict it
// to the same roles the backend enforces (server/config/roles.js).
const REOPEN_ROLES = [1, 4] // MANAGER, DIRECTOR

const KeyValue = ({ label, value }) => (
  <div>
    <div className="wa-kv-label">{label}</div>
    <div className="wa-kv-value">{value || value === 0 ? value : "—"}</div>
  </div>
)

const YesNo = ({ value }) => (value ? <span className="wa-yes">Yes</span> : <span className="wa-no">No</span>)

const sumWeights = (rows) =>
  rows.reduce((sum, row) => {
    const parsed = Number.parseFloat(row.weight)
    return Number.isNaN(parsed) ? sum : sum + parsed
  }, 0)

const Viewcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { instructionId, clientId, clientName, selectedMonth, selectedYear, activeFilter, invoiceNo } =
    location.state || {}

  const [instruction, setInstruction] = useState(null)
  const [loading, setLoading] = useState(Boolean(instructionId))
  const [error, setError] = useState("")
  const [actionError, setActionError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenReason, setReopenReason] = useState("")
  const [isReopening, setIsReopening] = useState(false)

  const canReopen = REOPEN_ROLES.includes(user?.roleid)

  useEffect(() => {
    if (!instructionId) {
      navigate("/CompanyInstructionView")
      return
    }

    let cancelled = false
    const fetchInstruction = async () => {
      try {
        setLoading(true)
        setError("")
        const response = await api.get(`/api/instructions/instruction/${instructionId}`)
        if (!response.data) throw new Error("No data received from server")
        if (!cancelled) setInstruction(response.data)
      } catch (err) {
        console.error("Error fetching instruction data:", err)
        if (!cancelled) {
          setError(
            err.response
              ? `Server error: ${err.response.status} ${err.response.statusText}`
              : err.request
                ? "Network error. Please check your connection."
                : "Failed to fetch instruction data. Please try again.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchInstruction()
    return () => {
      cancelled = true
    }
  }, [instructionId, navigate])

  // Return to the list with the filters it was opened with.
  const handleBack = () => {
    if (clientId) {
      navigate("/CompanyInstructions", {
        state: { clientId, clientName, selectedMonth, selectedYear, activeFilter },
      })
    } else {
      navigate(-1)
    }
  }

  const performReopen = async () => {
    setShowReopenModal(false)
    try {
      setIsReopening(true)
      setActionError("")
      const result = await reopenInstructionService(instructionId, reopenReason)
      setInstruction((prev) => ({ ...prev, status: result.status }))
      setSuccessMessage("Instruction reopened successfully. Open it from the instructions list to edit.")
    } catch (err) {
      console.error("Error reopening instruction:", err)
      setActionError(err.response?.data?.error || "Failed to reopen instruction. Please try again.")
    } finally {
      setIsReopening(false)
    }
  }

  const page = (content) => (
    <div className="wa-page">
      <ControllerSubNav active="clients" backLabel="← Instructions" onBack={handleBack} />
      <div className="wa-container is-narrow">{content}</div>
    </div>
  )

  if (loading) {
    return page(
      <div className="wa-card">
        <div className="wa-state">Loading instruction…</div>
      </div>,
    )
  }

  if (error || !instruction) {
    return page(
      <div className="wa-card">
        <div className="wa-state is-error">
          <p>{error || "Instruction not found."}</p>
          <button type="button" className="wa-btn wa-btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>,
    )
  }

  const d = instruction
  const typeId = shipmentTypeId(d)
  const isImport = typeId === "1"
  const isExport = typeId === "2"
  const isCrossHaul = typeId === "3" || typeId === "4"
  const isAddOn = typeId === "5"
  const isWeightBased = WEIGHT_UNITS.includes(d.rateweight)
  const usesWeightTable = typeId === "4" || (isAddOn && isWeightBased)
  const isSetRate = Boolean(d.is_set_rate)
  const unit = d.rateweight || ""
  const containers = Array.isArray(d.containers) ? d.containers : []
  const weightRows = Array.isArray(d.weight_rows) ? d.weight_rows : []
  const invoice = isAddOn ? d.addon_invoice_number : invoiceNo
  const lastFreeDate = d.lastfreedate || d.deadline

  const containerLines = [
    { label: "6m", qty: Number(d.num_six_meters) || 0, rate: Number(d.rateper_6) || 0 },
    { label: "12m", qty: Number(d.num_twelve_meters) || 0, rate: Number(d.rateper_12) || 0 },
    { label: "Abnormal", qty: Number(d.num_abnormal) || 0, rate: Number(d.rateper_abnormal) || 0 },
  ].filter((line) => line.qty > 0)

  const totalWeight = usesWeightTable && weightRows.length > 0 ? sumWeights(weightRows) : Number(d.weight) || 0
  const unitRate = Number(d.unitrate) || 0
  const setRate = Number(d.historical_set_rate) || 0
  const weightAmount = isSetRate ? setRate * (weightRows.length || 1) : totalWeight * unitRate

  const showWeightColumn = isImport || isExport || isCrossHaul

  return page(
    <div className="wa-card" style={{ padding: "32px 36px" }}>
      {successMessage && <div className="wa-alert wa-alert-success">{successMessage}</div>}
      {actionError && <div className="wa-alert wa-alert-error">{actionError}</div>}

      <div className="wa-doc-head">
        <div>
          <div className="wa-eyebrow">Instruction</div>
          <div className="wa-doc-title">#{d.m1controllerkey || d.m1key}</div>
        </div>
        <div className="wa-doc-head-pills">
          <span className={`wa-pill wa-pill-lg ${statusPillClass(d.status)}`}>{d.status || "—"}</span>
          <span className="wa-pill wa-pill-lg wa-pill-type">{shipmentTypeLabel(d)}</span>
        </div>
      </div>

      <div className="wa-doc-section">
        <div className="wa-doc-grid">
          <div>
            <div className="wa-section-label">Client</div>
            <div className="wa-client-name">{d.companyname || clientName || "—"}</div>
            <div className="wa-client-contact">
              {[d.representative, d.email, d.cellnum].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="wa-kv-grid is-spaced">
              <KeyValue label="Pick-Up" value={d.pickup} />
              <KeyValue label="Drop-Off" value={d.dropoff} />
            </div>
          </div>
          <div>
            <div className="wa-section-label">References</div>
            <div className="wa-kv-grid">
              <KeyValue label={isAddOn ? "Add-On Invoice" : "Invoice No"} value={invoice || "N/A"} />
              <KeyValue label="Booking Ref" value={d.booking_ref} />
              <KeyValue label="Client File Ref" value={d.clientFileRef} />
              <KeyValue label="KSM File Ref" value={d.ksmFileRef} />
              <KeyValue label="Created" value={formatDate(d.created_at)} />
              {lastFreeDate && <KeyValue label="Last Free Date" value={formatDate(lastFreeDate)} />}
              {!isCrossHaul && d.stackdate && (
                <KeyValue label={isImport ? "ETA" : "Stack Date"} value={formatDate(d.stackdate)} />
              )}
              {d.vessel_name && <KeyValue label="Vessel" value={d.vessel_name} />}
              <KeyValue label="VAT" value={d.vat !== null && d.vat !== undefined ? `${d.vat}%` : null} />
            </div>
          </div>
        </div>
      </div>

      {d.description && (
        <div className="wa-doc-section">
          <div className="wa-section-label">{isCrossHaul ? "Description From Client" : "Description"}</div>
          <p className="wa-description">{d.description}</p>
        </div>
      )}

      <div className="wa-doc-section">
        <h3 className="wa-section-title">{isWeightBased ? "Weight & Rate" : "Containers & Rates"}</h3>

        {isWeightBased ? (
          <>
            {usesWeightTable && weightRows.length > 0 && (
              <div className="wa-table-wrap" style={{ marginBottom: 16 }}>
                <table className="wa-table is-light">
                  <thead>
                    <tr>
                      <th>KSM DN Number</th>
                      <th>Ticket Number</th>
                      <th>Receipt Book Number</th>
                      <th className="is-right">Weight ({unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightRows.map((row, index) => (
                      <tr key={row.weight_pk || index}>
                        <td>{row.ksm_dm_no || "—"}</td>
                        <td>{row.ticket_no || "—"}</td>
                        <td>{row.receipt_book_no || "—"}</td>
                        <td className="is-right">{row.weight ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="wa-table-wrap">
              <table className="wa-table is-light">
                <thead>
                  <tr>
                    <th className="is-right">Weight</th>
                    <th className="is-right">Rate</th>
                    <th className="is-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="is-right">
                      {totalWeight} {unit}
                    </td>
                    <td className="is-right">
                      {isSetRate
                        ? `${formatRand(setRate)} set rate${weightRows.length > 1 ? ` × ${weightRows.length}` : ""}`
                        : `${formatRand(unitRate)} / ${unit}`}
                    </td>
                    <td className="is-right is-strong">{formatRand(weightAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="wa-table-wrap">
            <table className="wa-table is-light">
              <thead>
                <tr>
                  <th>Trailer Size</th>
                  <th className="is-right">Qty</th>
                  <th className="is-right">Rate</th>
                  <th className="is-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {containerLines.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="wa-empty">
                      No containers on this instruction.
                    </td>
                  </tr>
                ) : (
                  containerLines.map((line) => (
                    <tr key={line.label}>
                      <td>{line.label}</td>
                      <td className="is-right">{line.qty}</td>
                      <td className="is-right">{formatRand(line.rate)}</td>
                      <td className="is-right is-strong">{formatRand(line.qty * line.rate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="wa-total">
          <span className="wa-total-label">Total</span>
          <span className="wa-total-value">{formatRand(d.total_cost)}</span>
        </div>
      </div>

      {!isWeightBased && containers.length > 0 && (
        <div className="wa-doc-section">
          <h3 className="wa-section-title">Container Details</h3>
          <div className="wa-table-wrap">
            <table className="wa-table is-light">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Container Number</th>
                  {isExport && <th>File Reference</th>}
                  {showWeightColumn && <th className="is-right">Weight (kg)</th>}
                  <th>Cargo Description</th>
                  <th className="is-center">Hazardous</th>
                  <th className="is-center">Surcharges</th>
                  <th className="is-center">VGM</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container, index) => (
                  <tr key={container.containerkey || index}>
                    <td>{container.container_type || "—"}</td>
                    <td className="is-strong">{container.containernum || "Not specified"}</td>
                    {isExport && <td>{container.file_ref || "—"}</td>}
                    {showWeightColumn && <td className="is-right">{container.weight ?? "—"}</td>}
                    <td>{container.cargo_description || "—"}</td>
                    <td className="is-center">
                      <YesNo value={container.Hazardous === true} />
                    </td>
                    <td className="is-center">
                      <YesNo value={container["Add Surcharges"] === true} />
                    </td>
                    <td className="is-center">
                      <YesNo value={container.vgm === true} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canReopen && d.status === "Completed" && (
        <div className="wa-doc-actions">
          <button
            type="button"
            className="wa-btn wa-btn-warn wa-btn-lg"
            onClick={() => {
              setReopenReason("")
              setShowReopenModal(true)
            }}
            disabled={isReopening}
          >
            {isReopening ? "Reopening…" : "Reopen Instruction"}
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showReopenModal}
        title="Reopen Instruction"
        message={
          Number(d.paid_amount) > 0
            ? `This instruction has ${formatRand(d.paid_amount)} paid against it. ` +
              "Reopening will let it be edited again even though a payment has already been made against it. Continue?"
            : "Reopen this completed instruction for editing?"
        }
        onConfirm={performReopen}
        onCancel={() => setShowReopenModal(false)}
        extraContent={
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="reopen-reason"
              style={{ display: "block", marginBottom: "6px", color: "#666", fontSize: "14px" }}
            >
              Reason for reopening (optional)
            </label>
            <textarea
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              placeholder="e.g. Client requested a rate correction"
            />
          </div>
        }
      />
    </div>,
  )
}

export default Viewcontrollerinstructions
