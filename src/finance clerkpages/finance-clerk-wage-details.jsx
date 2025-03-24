"use client"

import { useNavigate, useParams } from "react-router-dom"

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()

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
          margin: "0 auto",
          borderCollapse: "collapse",
          fontSize: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          borderRadius: "5px",
          overflow: "hidden",
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
