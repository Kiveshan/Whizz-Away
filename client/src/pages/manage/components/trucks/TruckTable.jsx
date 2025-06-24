"use client"

import { formatDate } from "../../utils/helpers"
import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const TruckTable = ({
  trucks,
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
  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="table-container">
      <div>
        <button className="manage-add-truck-button" onClick={onAdd}>
          Add Truck
        </button>
      </div>

      <SearchFilter
        searchValue={filters.search}
        onSearchChange={onSearchChange}
        onApplyFilters={onApplyFilters}
        showStatusFilter={false}
        placeholder="Search trucks by registration, model, or VIN..."
        loading={loading}
      />

      {loading ? (
        <div className="loading">Loading trucks...</div>
      ) : (
        <>
          <div className="manage-trucks-table1">
            <table>
              <thead>
                <tr>
                  <th>Truck Registration</th>
                  <th>Trailer Size</th>
                  <th>Model</th>
                  <th>Year</th>
                  <th>Purchase Date</th>
                  <th>Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trucks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No trucks found
                    </td>
                  </tr>
                ) : (
                  trucks.map((truck) => (
                    <tr key={truck.m5truckskey}>
                      <td>{truck.truckregnum}</td>
                      <td>{truck.trailersize}</td>
                      <td>{truck.model}</td>
                      <td>{truck.year}</td>
                      <td>{formatDate(truck.truckpurchasedate)}</td>
                      <td>
                        <button className="manage-edit-button" onClick={() => onEdit(truck.m5truckskey)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button className="manage-delete-button" onClick={() => onDelete(truck.m5truckskey)}>
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

export default TruckTable
