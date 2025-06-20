"use client"
import { formatDate } from "../../utils/helpers"

const DriverRatesTable = ({ driverRates, loading, error, onEdit, onDelete, onAdd }) => {
  if (loading) {
    return <div className="loading">Loading driver rates...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
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
          {driverRates.map((rate) => (
            <tr key={rate.m5ratekey}>
              <td>{rate.startingpoint}</td>
              <td>{rate.destination}</td>
              <td>{rate.driver_six_meter_rate}</td>
              <td>{rate.driver_twelve_meter_rate}</td>
              <td>{rate.subie_six_meter_rate}</td>
              <td>{rate.subie_twelve_meter_rate}</td>
              <td>{formatDate(rate.updated_at)}</td>
              <td>
                <button className="manage-edit-button" onClick={() => onEdit(rate.m5ratekey)}>
                  Edit
                </button>
              </td>
              <td>
                <button className="manage-delete-button" onClick={() => onDelete(rate.m5ratekey)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <center>
        <button className="manage-add-driver-rate-button" onClick={onAdd}>
          New Rate
        </button>
      </center>
    </div>
  )
}

export default DriverRatesTable
