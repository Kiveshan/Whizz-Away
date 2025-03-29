"use client"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
 // State for dropdown selections
 const [selectedMonth, setSelectedMonth] = useState("")
 const [selectedYear, setSelectedYear] = useState("")
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "5px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => navigate("/DriverWageList")}
          className="back-button"
        >
          Back
        </button>
      </div>
      
      <div className="dropdown-container24">
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
      </div>
      <h2
        style={{
          textAlign: "center",
          margin: "0 0 15px 0",
          fontWeight: "normal",
          fontSize: "24px",
          marginTop:"-35px",
        }}
      >
        Wage for Driver {id}
      </h2>

      <table
        style={{
          width: "1000px",
          margin: "0 auto",
          borderCollapse: "collapse",
          fontSize: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      >
        
        <thead>
          <tr style={{ backgroundColor: "#87CEEB", padding: "12px 10px", textAlign: "left" }}>
            <th >Instruction ID</th>
            <th>Legs</th>
            <th>View Legs</th>
            <th >Date</th>
            <th>Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: "white",padding: "12px 10px", borderBottom: "1px solid #eee" } }>
            <td >33614</td>
            <td >2</td>
            <td >
            <button className="downloadwage1"  onClick={() => navigate(`/ManagerLegDetails`)}>View</button>
            </td>
            <td>22/10/2020</td>
            <td>
            <button
          onClick={() => navigate(`/DriverWageSlip`)}
          style={{
            backgroundColor: "green",
            color: "white",
            border: "none",
            padding: "8px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "normal",
          }}
        >
          View
        </button>
            </td>
            <td >
            <button className="downloadwage1" >Download</button>
            </td>
            
          </tr>
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "15px",
        }}
      >
        {/* <button
          onClick={() => navigate(`/finance-clerk-wage-slip/${id}`)}
          style={{
            backgroundColor: "green",
            color: "white",
            border: "none",
            padding: "8px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "normal",
          }}
        >
          Wage Slip
        </button> */}
      </div>
    </>
  )
}

export default FinanceClerkWageDetails
