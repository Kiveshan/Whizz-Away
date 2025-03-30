"use client"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"
import { useState } from "react"

const DirectorDriverWageList = () => {
  const navigate = useNavigate()

  // Mock data for drivers
  const drivers = [
    { id: 1, name: "Driver Name 1", wage: "R 5,348" },
    { id: 2, name: "Driver Name 2", wage: "R 8,153" },
    { id: 3, name: "Driver Name 3", wage: "R 8,448" },
    { id: 4, name: "Driver Name 4", wage: "R 1,295" },
  ]

  // // State for dropdown selections
  // const [selectedMonth, setSelectedMonth] = useState("")
  // const [selectedYear, setSelectedYear] = useState("")

  return (
    <div className="wage-container">
      <div className="button-container">
        <button onClick={() => navigate("/DirectorDashboard")} className="back-button">
          Back
        </button>
      </div>
      
      
      <div className="wage-table-container">
        <table className="wage-table1" style={{ width: "30%",marginLeft:"540px" }}>
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
                <td >
                  <button onClick={() => navigate(`/DirectorDriverWage`)} className="view-btn">
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

export default DirectorDriverWageList
