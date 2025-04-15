"use client"
import { useNavigate, useParams } from "react-router-dom"
import { useState, useEffect } from "react"

const FinanceClerkWageSlip = () => {
  const navigate = useNavigate()
  const { id } = useParams() // Get the ID from URL parameters
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)
  const [wageData, setWageData] = useState({
    payPeriod: "1 March 2025 - 25 March 2025",
    payDate: "30 March",
    earnings: [],
    netPay: "R 0.00"
  })

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!id) {
        setError("Employee ID is missing from URL parameters")
        setLoading(false)
        return
      }
  
      try {
        console.log(`Fetching employee data for ID: ${id}`)
        // Extract just the numeric part of the ID if it contains a colon
        const cleanId = id.toString().split(':')[0];
        
        // Fetch employee details with the clean ID
        const response = await fetch(`http://localhost:5000/api/employee/${cleanId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch employee data: ${response.status}`)
        }
        
        const data = await response.json()
        console.log("Employee data:", data)
        setEmployeeData(data)
        
        // Use the same clean ID for wage details
        try {
          const wageResponse = await fetch(`http://localhost:5000/wage-details/driver/${cleanId}`)
          
          if (wageResponse.ok) {
            const wageData = await wageResponse.json()
            console.log("Wage data:", wageData)
            
            // Format earnings data
            const earnings = [
              { description: "Base Salary", amount: `R ${wageData.base_salary?.toFixed(2) || '0.00'}` }
            ]
            
            // Add leg payments if available
            if (wageData.leg_payments) {
              earnings.push({ description: "Leg Payments", amount: `R ${wageData.leg_payments?.toFixed(2) || '0.00'}` })
            }
            
            setWageData({
              payPeriod: "1 March 2025 - 25 March 2025",
              payDate: "30 March",
              earnings: earnings,
              netPay: `R ${wageData.total?.toFixed(2) || '0.00'}`
            })
          }
        } catch (wageError) {
          console.error("Error fetching wage data:", wageError)
          // Continue with employee data even if wage data fails
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching employee data:", error)
        setError(`Failed to load employee data: ${error.message}`)
        setLoading(false)
      }
    }
  
    fetchEmployeeData()
  }, [id])

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Loading employee data...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>{error}</div>
      ) : (
        <div
          style={{
            flex: 1,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                backgroundColor: "#b8d1f3",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
              
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 600, fontSize: "14px" }}>Whizz Away Logistics</p>
                <p style={{ fontSize: "12px" }}>info@whizzaway.com</p>
                <p style={{ fontSize: "12px" }}>+27 31 123 4567</p>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                Wage Slip
              </h1>

              <div style={{ marginBottom: "24px" }}>
                <p style={{ textAlign: "center", fontSize: "14px" }}>
                  <strong>Pay Period:</strong> {wageData.payPeriod}
                </p>
                <p style={{ textAlign: "center", fontSize: "14px" }}>
                  <strong>Pay Date:</strong> {wageData.payDate}
                </p>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "14px" }}>
                  <strong>Employee Name:</strong> {employeeData ? `${employeeData.name} ${employeeData.surname}` : "N/A"}
                </p>
                <p style={{ fontSize: "14px" }}>
                  <strong>Employee contacts:</strong> {employeeData ? employeeData.cellnum : "N/A"}
                </p>
                <p style={{ fontSize: "14px" }}>
                  <strong>Position:</strong> {employeeData ? employeeData.rolename : "N/A"}
                </p>
              </div>

              <div style={{ overflowX: "auto", marginBottom: "16px", marginLeft:"220px" }}>
                <table style={{ width: "1000PX" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#b8d1f3" }}>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: "14px" }}>Earnings</th>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: "14px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wageData.earnings.map((item, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px 16px", fontSize: "14px" }}>{item.description}</td>
                        <td style={{ padding: "8px 16px", fontSize: "14px" }}>{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ overflowX: "auto", marginBottom: "24px" , marginLeft:"220px" }}>
                <table style={{ width: "1000PX" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#b8d1f3" }}>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: "14px" }}>Net Pay</th>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: "14px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 16px", fontSize: "14px" }}>Net Pay</td>
                      <td style={{ padding: "8px 16px", fontSize: "14px" }}>{wageData.netPay}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "24px",
                  
                }}
              >
                For Inquiries, please feel free to contact HR Department at hr@whizzaway.com.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "auto",
                }}
              >
               
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => navigate(`/finance-clerk-wage-details/${id}`)}
        style={{
          backgroundColor: "#8ee4a6",
          color: "black",
          padding: "8px 24px",
          borderRadius: "4px",
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          marginBottom:"40px",
          marginLeft: "16px"
        }}
      >
        Back
      </button>
    </div>
  )
}

export default FinanceClerkWageSlip