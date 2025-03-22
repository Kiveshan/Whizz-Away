"use client"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"

const FinanceClerkWage = () => {
  const navigate = useNavigate()

  // Mock data for drivers
  const drivers = [
    { id: 1, name: "Driver Name 1", wage: "R 5,348" },
    { id: 2, name: "Driver Name 2", wage: "R 8,153" },
    { id: 3, name: "Driver Name 3", wage: "R 8,448" },
    { id: 4, name: "Driver Name 4", wage: "R 1,295" },
  ]

  return (
    <div className="wage-container">

      <div className="button-container">
        <button onClick={() => navigate("/FDashboard")} className="back-btn">
          Back
        </button>
      </div>

      <div className="wage-table-container">
        <table className="wage-table1">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Wage</th>
              <th className="details-header">Delivery Details</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
                <td>{driver.wage}</td>
                <td className="view-cell">
                  <button onClick={() => navigate(`/finance-clerk-wage-details/${driver.id}`)} className="view-btn">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FinanceClerkWage

