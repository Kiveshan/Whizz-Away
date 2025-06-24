"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const SubcontractorTable = ({
  subcontractors,
  loading,
  error,
  onEdit,
  onToggleStatus,
  onAdd,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  filters,
  onSearchChange,
  onStatusChange,
  onApplyFilters,
}) => {
  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
      
        <button className="manage-add-subcontractor-button" onClick={onAdd}>
          Add Subcontractor
        </button>
      </div>

      {/* Search Filter at the top */}
      <div className="table-filters">
        <SearchFilter
          searchValue={filters.search}
          onSearchChange={onSearchChange}
          statusValue={filters.status}
          onStatusChange={onStatusChange}
          onApplyFilters={onApplyFilters}
          placeholder="Search subcontractors by company, contact person, or driver name..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div className="table-content">
        {loading ? (
          <div className="loading">Loading subcontractors...</div>
        ) : (
          <div className="manage-subcontractor-table1">
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Drivers</th>
                  <th>Truck Registrations</th>
                  <th>Driver Count</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="no-data">
                      No subcontractors found
                    </td>
                  </tr>
                ) : (
                  subcontractors.map((sub) => (
                    <tr key={sub.subei_reg_num || sub.min_userid}>
                      <td>
                        <strong>{sub.companyname}</strong>
                        <br />
                        <small style={{ color: "#666" }}>Reg: {sub.subei_reg_num}</small>
                      </td>
                      <td>{sub.contact_person}</td>
                      <td>{sub.cellnum}</td>
                      <td>{sub.email}</td>
                      <td>
                        <div style={{ maxWidth: "200px", fontSize: "13px" }}>{sub.driver_names || "N/A"}</div>
                      </td>
                      <td>
                        <div style={{ maxWidth: "150px", fontSize: "13px" }}>{sub.truck_registrations || "N/A"}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: "#e3f2fd",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {sub.driver_count || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${sub.status ? "active" : "inactive"}`}>
                          {sub.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button className="manage-edit-button" onClick={() => onEdit(sub.min_userid)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className={sub.status ? "manage-delete-button" : "manage-enable-button"}
                          onClick={() => onToggleStatus(sub.min_userid, sub.status)}
                        >
                          {sub.status ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))
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

export default SubcontractorTable
