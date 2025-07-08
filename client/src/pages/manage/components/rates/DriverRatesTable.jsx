"use client"

import { useState } from "react"
import { formatDate } from "../../utils/helpers"
import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"


// Confirmation Popup Component
const ConfirmationPopup = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null

  return (
    <div className="popup-backdrop" onClick={onCancel}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="popup-buttons">
          <button className="confirm-button" onClick={onConfirm}>
            Yes, delete
          </button>
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [rateToDelete, setRateToDelete] = useState(null)

  const handleDeleteClick = (rate) => {
    setRateToDelete(rate)
    setShowConfirmPopup(true)
  }

  const handleConfirmDelete = () => {
    if (rateToDelete) {
      onDelete(rateToDelete.m5ratekey)
    }
    setShowConfirmPopup(false)
    setRateToDelete(null)
  }

  const handleCancelDelete = () => {
    setShowConfirmPopup(false)
    setRateToDelete(null)
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
                  <th>Updated at</th>
                  <th>Changes</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {driverRates.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-data">
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
                      <td>{formatDate(rate.updated_at)}</td>
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

      {showConfirmPopup && rateToDelete && (
        <ConfirmationPopup
          isOpen={showConfirmPopup}
          message={`Are you sure you want to delete the rate from ${rateToDelete.startingpoint} to ${rateToDelete.destination}?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}

export default DriverRatesTable