"use client"

import { formatDate } from "../../utils/helpers"
import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"
import { showConfirmDialog } from "../../utils/alertUtils"
import Swal from 'sweetalert2'
import api from "../../../../api.js"

const DriverRatesTable = ({
  driverRates,
  loading,
  error,
  onEdit,
  onDelete,
  onAdd,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  filters,
  onSearchChange,
  onApplyFilters,
}) => {
  const buildUsageHtml = (usedRateFields = []) => {
    const isWarnableRateValue = (value) => {
      if (value === null || value === undefined || value === "") return false
      const num = Number(value)
      if (Number.isNaN(num)) return true
      return Math.abs(num) >= 1
    }

    const escapeHtml = (value) => {
      if (value === null || value === undefined) return ""
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
    }

    const formatRateValue = (value) => {
      if (value === null || value === undefined || value === "") return "(empty)"
      const num = Number(value)
      return Number.isNaN(num) ? escapeHtml(value) : escapeHtml(num.toFixed(2))
    }

    const warnableFields = usedRateFields.filter((rf) => isWarnableRateValue(rf.value))

    return warnableFields
      .map((rf) => {
        const instrList = Array.isArray(rf.instructions) ? rf.instructions : []
        const instrText = instrList.length ? instrList.join(", ") : ""

        return (
          `<div style="margin-bottom:10px;">` +
          `<div><strong>${escapeHtml(rf.label)}</strong>: ${formatRateValue(rf.value)}</div>` +
          `<div style="margin-top:4px;"><strong>Instruction no:</strong> ${escapeHtml(instrText)}</div>` +
          `</div>`
        )
      })
      .join("")
  }

  const handleDeleteClick = async (rate) => {
    if (!rate?.m5ratekey) return

    const fallbackConfirm = async () =>
      showConfirmDialog(
        "Delete Driver Rate",
        `Are you sure you want to delete the rate from ${rate.startingpoint} to ${rate.destination}?`,
        "Delete",
      )

    try {
      const usageResponse = await api.get(`/api/driver-rates/${rate.m5ratekey}/usage`)
      const usageData = usageResponse.data
      const usedRateFields = Array.isArray(usageData?.usedRateFields) ? usageData.usedRateFields : []

      let confirmed = false

      if (usageData?.inUse && usedRateFields.length > 0) {
        const usageHtml = buildUsageHtml(usedRateFields)
        if (usageHtml) {
          const html =
            `<div style="text-align:left;">` +
            `<div style="margin-bottom:10px;"><strong>Deleting this rate will affect the following instructions:</strong></div>` +
            usageHtml +
            `<div style="margin-top:15px; color: #d33;"><strong>This rate cannot be deleted while it is being used in instructions.</strong></div>` +
            `</div>`

          await Swal.fire({
            title: "Warning",
            html: html,
            icon: 'warning',
            showCancelButton: false,
            confirmButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            customClass: {
              popup: 'custom-swal-popup',
              title: 'custom-swal-title',
              content: 'custom-swal-content',
              confirmButton: 'custom-swal-confirm',
            },
          })
          return
        } else {
          confirmed = await fallbackConfirm()
        }
      } else {
        confirmed = await fallbackConfirm()
      }

      if (!confirmed) {
        return
      }

      await onDelete(rate.m5ratekey)
    } catch (err) {
      console.error(`Error preparing delete confirmation for rate ${rate.m5ratekey}:`, err)
      const confirmed = await fallbackConfirm()
      if (confirmed) {
        await onDelete(rate.m5ratekey)
      }
    }
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
        <button className="manage-add-driver-rate-button" onClick={onAdd}>
          New Rate
        </button>
      </div>

      <SearchFilter
        searchValue={filters.search}
        onSearchChange={onSearchChange}
        onApplyFilters={onApplyFilters}
        showStatusFilter={false}
        placeholder="Search rates by starting point or destination..."
        loading={loading}
      />

      {loading ? (
        <div className="loading">Loading driver rates...</div>
      ) : (
        <>
          <div className="manage-DriverRates-table1">
            <table>
              <thead>
                <tr>
                  <th>Starting Point</th>
                  <th>Ending Point</th>
                  <th>Driver Rate (6m)</th>
                  <th>Driver Rate (12m)</th>
                  <th>Subbie Rate (6m)</th>
                  <th>Subbie Rate (12m)</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {driverRates.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="no-data">
                      No driver rates found
                    </td>
                  </tr>
                ) : (
                  driverRates.map((rate) => (
                    <tr key={rate.m5ratekey}>
                      <td>{rate.startingpoint}</td>
                      <td>{rate.destination}</td>
                      <td>
                        {rate.driver_six_meter_rate
                          ? `R ${Number.parseFloat(rate.driver_six_meter_rate).toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td>
                        {rate.driver_twelve_meter_rate
                          ? `R ${Number.parseFloat(rate.driver_twelve_meter_rate).toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td>
                        {rate.subie_six_meter_rate
                          ? `R ${Number.parseFloat(rate.subie_six_meter_rate).toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td>
                        {rate.subie_twelve_meter_rate
                          ? `R ${Number.parseFloat(rate.subie_twelve_meter_rate).toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td>{formatDate(rate.effective_from)}</td>
                      <td>{rate.effective_to ? formatDate(rate.effective_to) : <span style={{ color: '#6a737d' }}>No expiry</span>}</td>
                      <td>
                        {(() => {
                          // Compare ISO date strings directly to avoid UTC-midnight timezone shift.
                          const today = new Date().toISOString().split('T')[0]
                          const from = rate.effective_from
                            ? rate.effective_from.toString().split('T')[0]
                            : null
                          const to = rate.effective_to
                            ? rate.effective_to.toString().split('T')[0]
                            : null

                          if (from && from > today) {
                            return <span style={{ color: '#0366d6', fontWeight: 'bold' }}>Future</span>
                          } else if (to && to < today) {
                            return <span style={{ color: '#6a737d' }}>Expired</span>
                          } else if (from && from <= today && (!to || to >= today)) {
                            return <span style={{ color: '#28a745', fontWeight: 'bold' }}>Active</span>
                          }
                          return <span style={{ color: '#6a737d' }}>-</span>
                        })()}
                      </td>
                      <td>
                        <button className="manage-edit-button" onClick={() => onEdit(rate.m5ratekey)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button className="manage-delete-button" onClick={() => handleDeleteClick(rate)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </>
      )}
    </div>
  )
}

export default DriverRatesTable