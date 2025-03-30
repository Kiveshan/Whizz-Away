"use client"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"
import { useState } from "react"

const FinanceClerkWage = () => {
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
        <button onClick={() => navigate("/FDashboard")} className="back-button">
          Back
        </button>
      </div>
      
      {/* <div className="dropdown-container24">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)} 
          className="dropdown"
        >
          <option value="">Select Month</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
        </select>

        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)} 
          className="dropdown"
        >
          <option value="">Select Year</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div> */}
      
      <div className="wage-table-container">
        <table className="wage-table1">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Wage</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.name}</td>
              
                <td >
                  <button onClick={() => navigate(`/finance-clerk-wage-details`)} className="view-btn">
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
