"use client"
import { formatDate } from "../../utils/helpers"

const TruckTable = ({ trucks, loading, error, onEdit, onDelete, onAdd }) => {
  if (loading) {
    return <div className="loading">Loading trucks...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <>
      <div className="manage-trucks-table1">
        <table>
          <thead>
            <tr>
              <th>Truck Registration</th>
              <th>Trailer Size</th>
              <th>Truck Purchase Date</th>
              <th>Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <tr key={truck.m5truckskey}>
                <td>{truck.truckregnum}</td>
                <td>{truck.trailersize}</td>
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
            ))}
          </tbody>
        </table>
      </div>
      <button className="manage-add-truck-button" onClick={onAdd}>
        Add Truck
      </button>
    </>
  )
}

export default TruckTable
