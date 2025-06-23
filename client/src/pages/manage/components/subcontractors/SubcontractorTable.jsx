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
    <div className="table-container">
      <div >
        <button className="manage-add-subcontractor-button" onClick={onAdd}>
          Add Subcontractor
        </button>
      </div>

      <SearchFilter
        searchValue={filters.search}
        onSearchChange={onSearchChange}
        statusValue={filters.status}
        onStatusChange={onStatusChange}
        onApplyFilters={onApplyFilters}
        placeholder="Search subcontractors by name, company, or email..."
        loading={loading}
      />

      {loading ? (
        <div className="loading">Loading subcontractors...</div>
      ) : (
        <>
          <div className="manage-subcontractor-table1">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Truck Registration</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No subcontractors found
                    </td>
                  </tr>
                ) : (
                  subcontractors.map((sub) => (
                    <tr key={sub.userid}>
                      <td>{sub.contact_person}</td>
                      <td>{sub.truckregnum}</td>
                      <td>{sub.companyname}</td>
                      <td>{sub.cellnum}</td>
                      <td>{sub.email}</td>
                      <td>
                        <span className={`status-badge ${sub.status ? "active" : "inactive"}`}>
                          {sub.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button className="manage-edit-button" onClick={() => onEdit(sub.userid)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className={sub.status ? "manage-delete-button" : "manage-enable-button"}
                          onClick={() => onToggleStatus(sub.userid, sub.status)}
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

export default SubcontractorTable
