"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const EmployeeTable = ({
  employees,
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
      <div>
        <button className="manage-add-employee-button" onClick={onAdd}>
          Add Employee
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
          placeholder="Search employees by name, email, or employee number..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div className="table-content">
        {loading ? (
          <div className="loading">Loading employees...</div>
        ) : (
          <div className="manage-employees-table1">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Employee No</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.userid}>
                      <td>{`${employee.name} ${employee.surname}`}</td>
                      <td>
                        <span className={`status-badge ${employee.status ? "active" : "inactive"}`}>
                          {employee.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{employee.employeenum}</td>
                      <td>{employee.rolename || employee.roleid}</td>
                      <td>{employee.email}</td>
                      <td>
                        <button className="manage-view-button" onClick={() => onEdit(employee.userid)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className={employee.status ? "manage-delete-button" : "manage-enable-button"}
                          onClick={() => onToggleStatus(employee.userid, employee.status)}
                        >
                          {employee.status ? "Disable" : "Enable"}
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
        <div className="table-pagination">
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

export default EmployeeTable
