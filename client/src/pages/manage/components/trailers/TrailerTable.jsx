"use client"

import { formatDate } from "../../utils/helpers"
import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const TrailerTable = ({
  trailers,
  loading,
  error,
  onEdit,
  onDelete,
  onAdd,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  filters = { search: "" },
  onSearchChange,
  onApplyFilters,
}) => {
  // Helper function to check license expiry status
  const getLicenseStatus = (expiryDate) => {
    if (!expiryDate) return { status: "unknown", text: "No Date", color: "#999" }

    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: "expired", text: "EXPIRED", color: "red" }
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring", text: `${daysUntilExpiry} days`, color: "orange" }
    } else {
      return { status: "current", text: "Current", color: "green" }
    }
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
        <button className="manage-add-truck-button" onClick={onAdd}>
          Add Trailer
        </button>
      </div>

      {/* Search Filter at the top */}
      <div className="table-filters">
        <SearchFilter
          searchValue={filters?.search || ""}
          onSearchChange={onSearchChange}
          onApplyFilters={onApplyFilters}
          showStatusFilter={false}
          placeholder="Search trailers by registration, model, or VIN..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div className="table-content">
        {loading ? (
          <div className="loading">Loading trailers...</div>
        ) : (
          <div className="manage-trucks-table1">
            <table>
              <thead>
                <tr>
                  <th>Trailer Registration</th>
                  <th>Trailer Size</th>
                  <th>Model</th>
                  <th>Year</th>
                  <th>Purchase Date</th>
                  <th>License Status</th>
                  <th>Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trailers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No trailers found
                    </td>
                  </tr>
                ) : (
                  trailers.map((trailer) => {
                    const licenseStatus = getLicenseStatus(trailer.trailer_license_expiry)
                    return (
                      <tr key={trailer.m5trailerskey}>
                        <td>{trailer.trailerregnum}</td>
                        <td>{trailer.trailersize}</td>
                        <td>{trailer.model}</td>
                        <td>{trailer.year}</td>
                        <td>{formatDate(trailer.trailerpurchasedate)}</td>
                        <td>
                          <span
                            style={{
                              color: licenseStatus.color,
                              fontWeight: "bold",
                              fontSize: "0.9em",
                            }}
                          >
                            {licenseStatus.text}
                          </span>
                          {trailer.trailer_license_expiry && (
                            <div style={{ fontSize: "0.8em", color: "#666" }}>
                              {formatDate(trailer.trailer_license_expiry)}
                            </div>
                          )}
                        </td>
                        <td>
                          <button className="manage-edit-button" onClick={() => onEdit(trailer.m5trailerskey)}>
                            Edit
                          </button>
                        </td>
                        <td>
                          <button className="manage-delete-button" onClick={() => onDelete(trailer.m5trailerskey)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination at the bottom */}
      {!loading && (
        <div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </div>
      )}
    </div>
  )
}

export default TrailerTable
