"use client"
import { useNavigate, useParams } from "react-router-dom"

const DirectorDriverWageSlip = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  // Mock data for the wage slip
  const wageSlipData = {
    employeeName: "Sigmund Crowin",
    employeeContacts: "087 586 8475",
    position: "Driver",
    payPeriod: "1 March 2025 - 25 March 2025",
    payDate: "30 March",
    earnings: [
      { description: "Base Salary", amount: "R 5000" },
      { description: "Leg 1", amount: "R 350" },
      { description: "Leg 2", amount: "R 250" },
    ],
    netPay: "R 5600",
  }

  return (
    <div
    //   style={{
    //     display: "flex",
    //     flexDirection: "column",
    //     minHeight: "100vh",
    //     backgroundColor: "white",
    //   }}
    >
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
              <p style={{ fontWeight: 600, fontSize: "14px" }}>Company Name</p>
              <p style={{ fontSize: "12px" }}>Company Email</p>
              <p style={{ fontSize: "12px" }}>Company Contact Details</p>
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
                <strong>Pay Period:</strong> {wageSlipData.payPeriod}
              </p>
              <p style={{ textAlign: "center", fontSize: "14px" }}>
                <strong>Pay Date:</strong> {wageSlipData.payDate}
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "14px" }}>
                <strong>Employee Name:</strong> {wageSlipData.employeeName}
              </p>
              <p style={{ fontSize: "14px" }}>
                <strong>Employee contacts:</strong> {wageSlipData.employeeContacts}
              </p>
              <p style={{ fontSize: "14px" }}>
                <strong>Position:</strong> {wageSlipData.position}
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
                  {wageSlipData.earnings.map((item, index) => (
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
                    <td style={{ padding: "8px 16px", fontSize: "14px" }}>{wageSlipData.netPay}</td>
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
              For Inquiries, please feel free to contact [You Name] at [Your Email].
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
       <button
                onClick={() => navigate(`/DirectorDriverWage`)}
                style={{
                  backgroundColor: "#8ee4a6",
                  color: "black",
                  padding: "8px 24px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  marginBottom:"40px",
                 
                }}
              >
                Back
              </button>
    </div>
  )
}

export default DirectorDriverWageSlip

