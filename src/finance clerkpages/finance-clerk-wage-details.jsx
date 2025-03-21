"use client"

import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("Current Month")

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
          onClick={() => navigate("/finance-clerk-wage")}
          className="back-button"
        >
          Back
        </button>
       
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "15px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "200px",
          }}
        >
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "8px 12px",
              backgroundColor: "white",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "14px",
            }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span>{selectedMonth}</span>
            <span style={{ fontSize: "12px" }}>▼</span>
          </div>

          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "4px",
                width: "100%",
                border: "1px solid #ccc",
                borderRadius: "5px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                zIndex: 10,
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  hover: { backgroundColor: "#f3f4f6" },
                }}
                onClick={() => {
                  setSelectedMonth("Current Month")
                  setShowDropdown(false)
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                Current Month
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={() => {
                  setSelectedMonth("January")
                  setShowDropdown(false)
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                January
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={() => {
                  setSelectedMonth("February")
                  setShowDropdown(false)
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                February
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={() => {
                  setSelectedMonth("March")
                  setShowDropdown(false)
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                March
              </div>
            </div>
          )}
        </div>
      </div>

      <h2
        style={{
          textAlign: "center",
          margin: "0 0 15px 0",
          fontWeight: "normal",
          fontSize: "24px",
        }}
      >
        Wage for Driver {id}
      </h2>

      <table
        style={{
          width: "1000px",
          margin: "0 10px",
          borderCollapse: "collapse",
          fontSize: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          borderRadius: "5px",
          overflow: "hidden",
          marginLeft:"220px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#87CEEB" }}>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Instruction ID</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Truck Reg</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Start</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>End</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Trailer</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Date</th>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: "white" }}>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>33614</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>33614</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>A</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>B</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>12m</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>22/10/2020</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>R 46</td>
          </tr>
          <tr style={{ backgroundColor: "white" }}>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>38111</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>38111</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>B</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>C</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>6m</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>18/03/2024</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>R 14</td>
          </tr>
          <tr style={{ backgroundColor: "white" }}>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>70117</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>70117</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>A</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>C</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>12m</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>15/10/2024</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>R 5</td>
          </tr>
          <tr style={{ backgroundColor: "white" }}>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>78746</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>78746</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>A</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>D</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>6m</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>28/07/2020</td>
            <td style={{ padding: "12px 10px", borderBottom: "1px solid #eee" }}>R 91</td>
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
        <button
          onClick={() => navigate(`/finance-clerk-wage-slip/${id}`)}
          style={{
            backgroundColor: "#00e676",
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
        </button>
      </div>
    </>
  )
}

export default FinanceClerkWageDetails

