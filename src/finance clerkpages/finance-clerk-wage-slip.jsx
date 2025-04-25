
// "use client"
// import { useNavigate, useParams, useLocation } from "react-router-dom"
// import { useState, useEffect } from "react"

// const FinanceClerkWageSlip = () => {
//   const navigate = useNavigate()
//   const { id } = useParams() // Get the ID from URL parameters
//   const location = useLocation()
//   const { driverId, driverName, selectedMonth, selectedYear } = location.state || {}

//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)
//   const [employeeData, setEmployeeData] = useState(null)
//   const [legs, setLegs] = useState([])
//   const [wageData, setWageData] = useState({
//     payPeriod: "",
//     payDate: "",
//     earnings: [],
//     netPay: "R 0.00",
//   })

//   // Month names array for conversion
//   const monthNames = [
//     "January", "February", "March", "April", "May", "June",
//     "July", "August", "September", "October", "November", "December"
//   ]

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!id) {
//         setError("Employee ID is missing from URL parameters")
//         setLoading(false)
//         return
//       }

//       try {
//         console.log(`Fetching employee data for ID: ${id}`)
//         // Extract just the numeric part of the ID if it contains a colon
//         const cleanId = id.toString().split(":")[0]

//         // Fetch employee details with the clean ID
//         const response = await fetch(`http://localhost:5000/api/employee/${cleanId}`)

//         if (!response.ok) {
//           throw new Error(`Failed to fetch employee data: ${response.status}`)
//         }

//         const data = await response.json()
//         console.log("Employee data:", data)
//         setEmployeeData(data)

//         // Fetch all legs for the driver
//         try {
//           console.log(`Fetching all legs for driver ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`)
        
//           // Use the new endpoint that includes all legs regardless of instruction status
//           const legsResponse = await fetch(
//             `http://localhost:5000/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
//           )
        
//           if (legsResponse.ok) {
//             const legsData = await legsResponse.json()
//             console.log("All legs data:", legsData)
        
//             // Ensure legsData is an array
//             const allLegsArray = Array.isArray(legsData)
//               ? legsData
//               : legsData && typeof legsData === "object"
//                 ? [legsData]
//                 : []
        
//             setLegs(allLegsArray)
        
//             // Group legs by instruction ID
//             const legsByInstruction = {}
//             allLegsArray.forEach((leg) => {
//               const instructionId = leg.m1key
//               if (!instructionId) return
              
//               if (!legsByInstruction[instructionId]) {
//                 legsByInstruction[instructionId] = []
//               }
//               legsByInstruction[instructionId].push(leg)
//             })
        
//             // Calculate total earnings from legs
//             const totalLegsAmount = allLegsArray.reduce(
//               (total, leg) => total + (Number.parseFloat(leg.driverrate) || 0),
//               0,
//             )
        
//             // Format earnings data - include base salary and each leg
//             const earnings = []
        
//             // Add base salary if available
//             if (data.base_salary) {
//               earnings.push({
//                 description: "Base Salary",
//                 amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
//               })
//             }
        
//             // Add each leg as a separate earning, grouped by instruction
//             Object.keys(legsByInstruction).forEach((instructionId) => {
//               legsByInstruction[instructionId].forEach((leg, index) => {
//                 earnings.push({
//                   description: `INS${instructionId}-Leg${leg.legnumber || index + 1} (${leg.instruction_status})`,
//                   amount: `R ${Number.parseFloat(leg.driverrate).toFixed(2) || "0.00"}`,
//                 })
//               })
//             })
        
//             // If no earnings data is available, add dummy data for testing
//             if (allLegsArray.length === 0) {
//               earnings.push({ description: "No legs found for this month", amount: "R 0.00" })
//             }
        
//             // Calculate total (base salary + all legs)
//             const totalAmount = (Number.parseFloat(data.base_salary) || 0) + totalLegsAmount
        
//             // Calculate pay period dates
//             const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth)
//             const firstDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod, 1)
//             const lastDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod + 1, 0)
//             const formattedFirstDay = firstDay.toLocaleDateString()
//             const formattedLastDay = lastDay.toLocaleDateString()
        
//             setWageData({
//               payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
//               payDate: formattedLastDay,
//               earnings: earnings,
//               netPay: `R ${totalAmount.toFixed(2)}`,
//             })
//           }
//         } catch (legsError) {
//           console.error("Error fetching legs data:", legsError)
//           // Add dummy data for testing
//           const earnings = [
//             { description: "Error fetching legs data", amount: "R 0.00" },
//           ]

//           if (data.base_salary) {
//             earnings.unshift({
//               description: "Base Salary",
//               amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
//             })
//           }

//           const totalAmount = Number.parseFloat(data.base_salary) || 0

//           // Calculate pay period dates
//           const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth)
//           const firstDay = new Date(parseInt(selectedYear), monthIndexForPayPeriod, 1)
//           const lastDay = new Date(parseInt(selectedYear), monthIndexForPayPeriod + 1, 0)
//           const formattedFirstDay = firstDay.toLocaleDateString()
//           const formattedLastDay = lastDay.toLocaleDateString()

//           setWageData({
//             payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
//             payDate: formattedLastDay,
//             earnings: earnings,
//             netPay: `R ${totalAmount.toFixed(2)}`,
//           })
//         }

//         setLoading(false)
//       } catch (error) {
//         console.error("Error fetching employee data:", error)
//         setError(`Failed to load employee data: ${error.message}`)
//         setLoading(false)
//       }
//     }

//     fetchData()
//   }, [id, selectedMonth, selectedYear])

//   // Function to handle printing the wage slip
//   const handlePrint = () => {
//     window.print()
//   }

//   // Function to handle downloading the wage slip
//   const handleDownload = () => {
//     if (!id) {
//       console.error("Missing ID for download")
//       return
//     }

//     // Create a temporary link element
//     const link = document.createElement("a")

//     // Set the link's href to the wage slip URL
//     link.href = `http://localhost:5000/api/wage-slip/${id}/monthly/${selectedMonth}/${selectedYear}`

//     // Set the download attribute with a filename
//     const driverNameForFile = employeeData
//       ? `${employeeData.name}-${employeeData.surname}`.replace(/\s+/g, "-")
//       : driverName?.replace(/\s+/g, "-") || `driver-${id}`

//     link.download = `monthly-wage-slip-${driverNameForFile}-${selectedMonth}-${selectedYear}.pdf`

//     // Append the link to the body
//     document.body.appendChild(link)

//     // Trigger the download
//     link.click()

//     // Remove the link from the body
//     document.body.removeChild(link)

//     console.log(`Downloading monthly wage slip for Driver ID: ${id}, Month: ${selectedMonth}, Year: ${selectedYear}`)
//   }

//   // FIXED: Handle back navigation with proper state
//   const handleBack = () => {
//     // Get the actual driver name from employee data if available, otherwise use the one from location state
//     const actualDriverName = employeeData
//       ? `${employeeData.name} ${employeeData.surname}`
//       : driverName || `Driver ${id}`

//     navigate(`/finance-clerk-wage-details/${id}`, {
//       state: {
//         name: actualDriverName,
//       },
//     })
//   }

//   // Styles for the wage slip
//   const styles = {
//     pageWrapper: {
//       paddingBottom: "60px",
//     },
//     container: {
//       maxWidth: "600px",
//       margin: "0 auto",
//       marginTop: "20px",
//       padding: "5px 10px 10px 10px",
//     },
//     wageSlipContainer: {
//       border: "1px solid #d1d5db",
//       borderRadius: "8px",
//       overflow: "hidden",
//       boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
//       backgroundColor: "#fff",
//     },
//     header: {
//       backgroundColor: "#b8d1f3",
//       padding: "8px 12px",
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "center",
//     },
//     companyInfo: {
//       textAlign: "right",
//     },
//     companyName: {
//       fontWeight: 600,
//       fontSize: "16px",
//       margin: "0 0 2px 0",
//     },
//     companyContact: {
//       fontSize: "14px",
//       margin: "0 0 1px 0",
//     },
//     content: {
//       padding: "10px 12px",
//     },
//     title: {
//       fontSize: "20px",
//       fontWeight: "bold",
//       textAlign: "center",
//       margin: "0 0 8px 0",
//       color: "#333",
//     },
//     payPeriodSection: {
//       backgroundColor: "#f9fafb",
//       padding: "6px",
//       borderRadius: "6px",
//       marginBottom: "8px",
//       textAlign: "center",
//     },
//     payPeriodText: {
//       fontSize: "14px",
//       margin: "0",
//     },
//     employeeSection: {
//       backgroundColor: "#f9fafb",
//       padding: "8px",
//       borderRadius: "6px",
//       marginBottom: "8px",
//     },
//     employeeText: {
//       fontSize: "14px",
//       margin: "0",
//     },
//     employeeInfoRow: {
//       display: "flex",
//       justifyContent: "center",
//       marginBottom: "4px",
//       gap: "20px",
//     },
//     employeeInfoColumn: {
//       width: "45%",
//       display: "flex",
//       alignItems: "center",
//     },
//     employeeLabel: {
//       minWidth: "60px",
//       fontWeight: "bold",
//     },
//     tableContainer: {
//       marginBottom: "8px",
//       borderRadius: "6px",
//       overflow: "hidden",
//       boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
//     },
//     table: {
//       width: "100%",
//       borderCollapse: "collapse",
//     },
//     tableHeader: {
//       backgroundColor: "#b8d1f3",
//       padding: "5px 10px",
//       fontSize: "14px",
//       fontWeight: 600,
//       textAlign: "center",
//       borderBottom: "1px solid #e5e7eb",
//     },
//     tableCell: {
//       padding: "5px 10px",
//       fontSize: "14px",
//       borderBottom: "1px solid #e5e7eb",
//     },
//     tableCellLeft: {
//       textAlign: "left",
//     },
//     tableCellRight: {
//       textAlign: "right",
//     },
//     footer: {
//       textAlign: "center",
//       fontSize: "12px",
//       color: "#6b7280",
//       marginTop: "5px",
//       borderTop: "1px solid #e5e7eb",
//       paddingTop: "5px",
//     },
//     backButton: {
//       backgroundColor: "#8ee4a6",
//       color: "black",
//       padding: "6px 16px",
//       borderRadius: "4px",
//       fontSize: "14px",
//       border: "none",
//       cursor: "pointer",
//       marginTop: "10px",
//       marginRight: "10px",
//       transition: "background-color 0.2s",
//     },
//     printButton: {
//       backgroundColor: "#8ee4a6",
//       color: "black",
//       padding: "6px 50px",
//       borderRadius: "4px",
//       fontSize: "14px",
//       border: "none",
//       cursor: "pointer",
//       marginTop: "10px",
//       marginRight: "10px",
//       transition: "background-color 0.2s",
//     },
//     downloadButton: {
//       backgroundColor: "#87CEEB",
//       color: "black",
//       padding: "6px 16px",
//       borderRadius: "4px",
//       fontSize: "14px",
//       border: "none",
//       cursor: "pointer",
//       marginTop: "10px",
//       marginLeft: "10px",
//       transition: "background-color 0.2s",
//     },
//     loadingContainer: {
//       textAlign: "center",
//       padding: "20px",
//       fontSize: "16px",
//       color: "#666",
//     },
//     errorContainer: {
//       textAlign: "center",
//       padding: "20px",
//       fontSize: "16px",
//       color: "red",
//     },
//     combinedTablesContainer: {
//       display: "flex",
//       flexDirection: "column",
//       gap: "6px",
//     },
//     buttonContainer: {
//       display: "flex",
//       justifyContent: "flex-start",
//       marginTop: "15px",
//       marginBottom: "20px",
//     },
//     monthYearInfo: {
//       backgroundColor: "#f9fafb",
//       padding: "6px",
//       borderRadius: "6px",
//       marginBottom: "8px",
//       textAlign: "center",
//     },
//     monthYearText: {
//       fontSize: "14px",
//       margin: "0",
//     },
//   }

//   return (
//     <div style={styles.pageWrapper}>
//       <div style={styles.container}>
//         {loading ? (
//           <div style={styles.loadingContainer}>Loading employee data...</div>
//         ) : error ? (
//           <div style={styles.errorContainer}>{error}</div>
//         ) : (
//           <div style={styles.wageSlipContainer}>
//             {/* Header */}
//             <div style={styles.header}>
//               <div></div>
//               <div style={styles.companyInfo}>
//                 <p style={styles.companyName}>KSM Carriers</p>
//                 <p style={styles.companyContact}>accounts@ksmcarriers.co.za</p>
//                 <p style={styles.companyContact}>+27 71 675 2775</p>
//               </div>
//             </div>

//             {/* Content */}
//             <div style={styles.content}>
//               {/* Title */}
//               <h1 style={styles.title}>Monthly Wage Slip</h1>

//               {/* Month and Year */}
//               <div style={styles.monthYearInfo}>
//                 <p style={styles.monthYearText}>
//                   <strong>Month:</strong> {selectedMonth} {selectedYear}
//                 </p>
//               </div>

//               {/* Pay Period */}
//               <div style={styles.payPeriodSection}>
//                 <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
//                   <p style={styles.payPeriodText}>
//                     <strong>Pay Period:</strong> {wageData.payPeriod}
//                   </p>
//                   <p style={styles.payPeriodText}>
//                     <strong>Pay Date:</strong> {wageData.payDate}
//                   </p>
//                 </div>
//               </div>

//               {/* Employee Info */}
//               <div style={styles.employeeSection}>
//                 {/* First row: Name and Contact side by side */}
//                 <div style={styles.employeeInfoRow}>
//                   <div style={styles.employeeInfoColumn}>
//                     <span style={styles.employeeLabel}>Name:</span>{" "}
//                     {employeeData ? `${employeeData.name} ${employeeData.surname}` : driverName || "N/A"}
//                   </div>
//                   <div style={styles.employeeInfoColumn}>
//                     <span style={styles.employeeLabel}>Contact:</span> {employeeData ? employeeData.cellnum : "N/A"}
//                   </div>
//                 </div>

//                 {/* Second row: Role below Name */}
//                 <div style={styles.employeeInfoRow}>
//                   <div style={styles.employeeInfoColumn}>
//                     <span style={styles.employeeLabel}>Role:</span> {employeeData ? employeeData.rolename : "Driver"}
//                   </div>
//                   <div style={styles.employeeInfoColumn}></div>
//                 </div>
//               </div>

//               {/* Combined Tables Container */}
//               <div style={styles.combinedTablesContainer}>
//                 {/* Earnings Table */}
//                 <div style={styles.tableContainer}>
//                   <table style={styles.table}>
//                     <thead>
//                       <tr>
//                         <th style={{ ...styles.tableHeader, textAlign: "left" }}>Earnings</th>
//                         <th style={{ ...styles.tableHeader, textAlign: "right" }}>Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {wageData.earnings.map((item, index) => (
//                         <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
//                           <td style={{ ...styles.tableCell, ...styles.tableCellLeft }}>{item.description}</td>
//                           <td style={{ ...styles.tableCell, ...styles.tableCellRight }}>{item.amount}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 {/* Net Pay Table */}
//                 <div style={styles.tableContainer}>
//                   <table style={styles.table}>
//                     <thead>
//                       <tr>
//                         <th style={{ ...styles.tableHeader, textAlign: "left" }}>Net Pay</th>
//                         <th style={{ ...styles.tableHeader, textAlign: "right" }}>Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       <tr style={{ backgroundColor: "#f9fafb" }}>
//                         <td style={{ ...styles.tableCell, ...styles.tableCellLeft, fontWeight: 600 }}>Net Pay</td>
//                         <td style={{ ...styles.tableCell, ...styles.tableCellRight, fontWeight: 600 }}>
//                           {wageData.netPay}
//                         </td>
//                       </tr>
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {/* Footer */}
//               <div style={styles.footer}>
//                 For Inquiries, please feel free to contact HR Department at hr@whizzaway.com.
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Button Container */}
//         <div style={styles.buttonContainer}>
//           <button className="back-button" onClick={handleBack}>
//             Back
//           </button>
//           {/* <button
//             onClick={handlePrint}
//             style={styles.printButton}
//             onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#a3c2e8")}
//             onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#8ee4a6")}
//           >
//             Print
//           </button>
//           <button
//             onClick={handleDownload}
//             style={styles.downloadButton}
//             onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#5cacee")}
//             onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#87CEEB")}
//           >
//             Download
//           </button> */}
//         </div>
//       </div>
//     </div>
//   )
// }

// export default FinanceClerkWageSlip

"use client"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import "../finance clerkpages/css/finance-clerk-wageslip.css"

const FinanceClerkWageSlip = () => {
  const navigate = useNavigate()
  const { id } = useParams() // Get the ID from URL parameters
  const location = useLocation()
  const { driverId, driverName, selectedMonth, selectedYear } = location.state || {}

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)
  const [legs, setLegs] = useState([])
  const [wageData, setWageData] = useState({
    payPeriod: "",
    payDate: "",
    earnings: [],
    deductions: [
      { description: "Tax", amount: "R 0.00" },
      { description: "Insurance", amount: "R 0.00" },
    ],
    totalEarnings: "R 0.00",
    totalDeductions: "R 0.00",
    netPay: "R 0.00",
  })

  // Month names array for conversion
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Helper function to safely parse numeric values from various formats
  const parseAmount = (value) => {
    if (value === null || value === undefined) return 0

    // If it's already a number, return it
    if (typeof value === "number") return value

    // If it's a string that might contain currency symbols or commas
    if (typeof value === "string") {
      // Remove currency symbols, spaces, and commas
      const cleanValue = value.replace(/[R\s,]/g, "")
      return Number.parseFloat(cleanValue) || 0
    }

    return 0
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Employee ID is missing from URL parameters")
        setLoading(false)
        return
      }

      try {
        console.log(`Fetching employee data for ID: ${id}`)
        // Extract just the numeric part of the ID if it contains a colon
        const cleanId = id.toString().split(":")[0]

        // Fetch employee details with the clean ID
        const response = await fetch(`http://localhost:5000/api/employee/${cleanId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch employee data: ${response.status}`)
        }

        const data = await response.json()
        console.log("Employee data:", data)
        setEmployeeData(data)

        // Calculate pay period dates
        const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth)
        const firstDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod, 1)
        const lastDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod + 1, 0)
        const formattedFirstDay = firstDay.toLocaleDateString()
        const formattedLastDay = lastDay.toLocaleDateString()

        // Fetch all legs for the driver
        try {
          console.log(`Fetching all legs for driver ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`)

          // Use the new endpoint that includes all legs regardless of instruction status
          const legsResponse = await fetch(
            `http://localhost:5000/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
          )

          if (legsResponse.ok) {
            const legsData = await legsResponse.json()
            console.log("All legs data:", legsData)

            // Ensure legsData is an array
            const allLegsArray = Array.isArray(legsData)
              ? legsData
              : legsData && typeof legsData === "object"
                ? [legsData]
                : []

            setLegs(allLegsArray)

            // Group legs by instruction ID
            const legsByInstruction = {}
            allLegsArray.forEach((leg) => {
              const instructionId = leg.m1key
              if (!instructionId) return

              if (!legsByInstruction[instructionId]) {
                legsByInstruction[instructionId] = []
              }
              legsByInstruction[instructionId].push(leg)
            })

            // Calculate total earnings from legs
            const totalLegsAmount = allLegsArray.reduce((total, leg) => total + parseAmount(leg.driverrate), 0)

            // Format earnings data - include base salary and each leg
            const earnings = []
            let totalEarningsAmount = 0

            // Add base salary if available
            if (data.base_salary) {
              const baseSalary = parseAmount(data.base_salary)
              totalEarningsAmount += baseSalary
              earnings.push({
                description: "Base Salary",
                amount: `R ${baseSalary.toFixed(2)}`,
              })
            }

            // Add each leg as a separate earning, grouped by instruction
            Object.keys(legsByInstruction).forEach((instructionId) => {
              legsByInstruction[instructionId].forEach((leg, index) => {
                const legAmount = parseAmount(leg.driverrate)
                totalEarningsAmount += legAmount
                earnings.push({
                  description: `INS${instructionId}-Leg${leg.legnumber || index + 1} (${leg.instruction_status || "Unknown"})`,
                  amount: `R ${legAmount.toFixed(2)}`,
                })
              })
            })

            // If no earnings data is available, add dummy data for testing
            if (allLegsArray.length === 0 && !data.base_salary) {
              earnings.push({ description: "No earnings found for this month", amount: "R 0.00" })
            }

            // After calculating earnings, fetch and process deductions
            try {
              // Fetch deductions from wages table for this employee and month
              console.log(
                `Fetching deductions for employee ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`,
              )

              // First try the debug endpoint to see all data
              const debugResponse = await fetch(
                `http://localhost:5000/api/debug/wages/${cleanId}?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
              )

              if (debugResponse.ok) {
                const debugData = await debugResponse.json()
                console.log("Debug wages data:", debugData)
              }

              // Now fetch the actual deductions
              const wagesResponse = await fetch(
                `http://localhost:5000/api/employee-deductions/${cleanId}?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
              )

              // Log the raw response for debugging
              console.log("Deductions API response status:", wagesResponse.status)

              let deductions = []
              let totalDeductionsAmount = 0

              if (wagesResponse.ok) {
                const wagesData = await wagesResponse.json()
                console.log("Raw deductions data:", wagesData)

                // Define all possible deduction fields
                const deductionFields = [
                  { key: "deduction_income_tax", label: "Income Tax" },
                  { key: "deduction_other_deductions", label: "Other Deductions" },
                  { key: "deduction_uif", label: "UIF" },
                  { key: "deduction_bonus", label: "Bonus Deduction" },
                  { key: "deduction_savings", label: "Savings" },
                  { key: "deduction_loan", label: "Loan Repayment" },
                  { key: "deduction_damage", label: "Damage Recovery" },
                ]

                // Process each deduction field
                deductionFields.forEach((field) => {
                  if (wagesData && wagesData[field.key] !== null && wagesData[field.key] !== undefined) {
                    const amount = parseAmount(wagesData[field.key])
                    console.log(
                      `${field.label} amount:`,
                      amount,
                      "Type:",
                      typeof wagesData[field.key],
                      "Raw value:",
                      wagesData[field.key],
                    )

                    if (!isNaN(amount) && amount > 0) {
                      totalDeductionsAmount += amount
                      deductions.push({
                        description: field.label,
                        amount: `R ${amount.toFixed(2)}`,
                      })
                    }
                  }
                })

                // If no deductions were found in the data, use mock data
                if (deductions.length === 0 && Object.keys(wagesData).length > 0) {
                  console.log("No positive deductions found in data, creating mock data")

                  // Create mock data with the same structure as the API response
                  const mockDeductions = [
                    { description: "Income Tax (Mock)", amount: "R 1500.00" },
                    { description: "UIF (Mock)", amount: "R 200.00" },
                    { description: "Other Deductions (Mock)", amount: "R 300.00" },
                  ]

                  deductions = mockDeductions
                  totalDeductionsAmount = 2000 // Mock total
                }
              } else {
                console.log("Failed to fetch deductions data:", wagesResponse.status)

                // Use mock data for testing if API fails
                deductions = [
                  { description: "Income Tax (API Error)", amount: "R 1500.00" },
                  { description: "UIF (API Error)", amount: "R 200.00" },
                  { description: "Other Deductions (API Error)", amount: "R 300.00" },
                ]
                totalDeductionsAmount = 2000 // Mock total
              }

              // If no deductions were found, use default placeholder deductions
              if (deductions.length === 0) {
                console.log("No deductions found, using default placeholders")
                deductions = [
                  { description: "Tax", amount: "R 0.00" },
                  { description: "Insurance", amount: "R 0.00" },
                ]
              }

              console.log("Final deductions:", deductions)
              console.log("Total deductions amount:", totalDeductionsAmount)

              // Calculate net pay as total earnings minus total deductions
              const netPayAmount = totalEarningsAmount - totalDeductionsAmount
              console.log("Net pay calculation:", totalEarningsAmount, "-", totalDeductionsAmount, "=", netPayAmount)

              setWageData({
                payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
                payDate: formattedLastDay,
                earnings: earnings,
                deductions: deductions,
                totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
                totalDeductions: `R ${totalDeductionsAmount.toFixed(2)}`,
                netPay: `R ${netPayAmount.toFixed(2)}`,
              })
            } catch (deductionsError) {
              console.error("Error fetching deductions data:", deductionsError)

              // Use default deductions if there was an error
              const deductions = [
                { description: "Tax (Error)", amount: "R 0.00" },
                { description: "Insurance (Error)", amount: "R 0.00" },
              ]

              setWageData({
                payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
                payDate: formattedLastDay,
                earnings: earnings,
                deductions: deductions,
                totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
                totalDeductions: "R 0.00",
                netPay: `R ${totalEarningsAmount.toFixed(2)}`,
              })
            }
          }
        } catch (legsError) {
          console.error("Error fetching legs data:", legsError)
          // Add dummy data for testing
          const earnings = [{ description: "Error fetching legs data", amount: "R 0.00" }]

          let totalEarningsAmount = 0
          if (data.base_salary) {
            const baseSalary = parseAmount(data.base_salary)
            totalEarningsAmount = baseSalary
            earnings.unshift({
              description: "Base Salary",
              amount: `R ${baseSalary.toFixed(2)}`,
            })
          }

          const totalAmount = parseAmount(data.base_salary) || 0

          setWageData({
            payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
            payDate: formattedLastDay,
            earnings: earnings,
            deductions: [
              { description: "Tax", amount: "R 0.00" },
              { description: "Insurance", amount: "R 0.00" },
            ],
            totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
            totalDeductions: "R 0.00",
            netPay: `R ${totalAmount.toFixed(2)}`,
          })
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching employee data:", error)
        setError(`Failed to load employee data: ${error.message}`)
        setLoading(false)
      }
    }

    fetchData()
  }, [id, selectedMonth, selectedYear])


  const handleBack = () => {
    // Get the actual driver name from employee data if available, otherwise use the one from location state
    const actualDriverName = employeeData
      ? `${employeeData.name} ${employeeData.surname}`
      : driverName || `Driver ${id}`

    navigate(`/finance-clerk-wage-details/${id}`, {
      state: {
        name: actualDriverName,
      },
    })
  }

  return (
    <div className="wageslip-page-wrapper">
      <div className="wageslip-container">
        {loading ? (
          <div className="wageslip-loading-container">Loading employee data...</div>
        ) : error ? (
          <div className="wageslip-error-container">{error}</div>
        ) : (
          <div className="wageslip-slip-container">
            {/* Header */}
            <div className="wageslip-header">
              <div></div>
              <div className="wageslip-company-info">
                <p className="wageslip-company-name">KSM Carriers</p>
                <p className="wageslip-company-contact">accounts@ksmcarriers.co.za</p>
                <p className="wageslip-company-contact">+27 71 675 2775</p>
              </div>
            </div>

            {/* Content */}
            <div className="wageslip-content">
              {/* Title */}
              <h1 className="wageslip-title">Monthly Wage Slip</h1>

              {/* Month and Year */}
              <div className="wageslip-month-year-info">
                <p className="wageslip-month-year-text">
                  <strong>Month:</strong> {selectedMonth} {selectedYear}
                </p>
              </div>

              {/* Pay Period */}
              <div className="wageslip-pay-period-section">
                <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                  <p className="wageslip-pay-period-text">
                    <strong>Pay Period:</strong> {wageData.payPeriod}
                  </p>
                  <p className="wageslip-pay-period-text">
                    <strong>Pay Date:</strong> {wageData.payDate}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="wageslip-employee-section">
                {/* First row: Name and Contact side by side */}
                <div className="wageslip-employee-info-row">
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Name:</span>{" "}
                    {employeeData ? `${employeeData.name} ${employeeData.surname}` : driverName || "N/A"}
                  </div>
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Contact:</span>{" "}
                    {employeeData ? employeeData.cellnum : "N/A"}
                  </div>
                </div>

                {/* Second row: Role below Name */}
                <div className="wageslip-employee-info-row">
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Role:</span>{" "}
                    {employeeData ? employeeData.rolename : "Driver"}
                  </div>
                  <div className="wageslip-employee-info-column"></div>
                </div>
              </div>

              {/* Combined Tables Container */}
              <div className="wageslip-combined-tables-container">
                {/* Earnings Table */}
                <div className="wageslip-table-container">
                  <table className="wageslip-table">
                    <thead>
                      <tr>
                        <th className="wageslip-table-header wageslip-table-cell-left">Earnings</th>
                        <th className="wageslip-table-header wageslip-table-cell-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wageData.earnings.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td className="wageslip-table-cell wageslip-table-cell-left">{item.description}</td>
                          <td className="wageslip-table-cell wageslip-table-cell-right">{item.amount}</td>
                        </tr>
                      ))}
                      {/* Added Total Earnings row */}
                      <tr style={{ backgroundColor: "#f0f0f0" }}>
                        <td className="wageslip-table-cell wageslip-table-cell-left" style={{ fontWeight: 700 }}>
                          Total Earnings
                        </td>
                        <td className="wageslip-table-cell wageslip-table-cell-right" style={{ fontWeight: 700 }}>
                          {wageData.totalEarnings}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions Table */}
                <div className="wageslip-table-container">
                  <table className="wageslip-table">
                    <thead>
                      <tr>
                        <th className="wageslip-table-header wageslip-table-cell-left">Deductions</th>
                        <th className="wageslip-table-header wageslip-table-cell-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wageData.deductions.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td className="wageslip-table-cell wageslip-table-cell-left">{item.description}</td>
                          <td className="wageslip-table-cell wageslip-table-cell-right">{item.amount}</td>
                        </tr>
                      ))}
                      {/* Total Deductions row */}
                      <tr style={{ backgroundColor: "#f0f0f0" }}>
                        <td className="wageslip-table-cell wageslip-table-cell-left" style={{ fontWeight: 700 }}>
                          Total Deductions
                        </td>
                        <td className="wageslip-table-cell wageslip-table-cell-right" style={{ fontWeight: 700 }}>
                          {wageData.totalDeductions}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay Table */}
                <div className="wageslip-table-container">
                  <table className="wageslip-table">
                    <thead>
                      <tr>
                        <th className="wageslip-table-header wageslip-table-cell-left">Net Pay</th>
                        <th className="wageslip-table-header wageslip-table-cell-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <td className="wageslip-table-cell wageslip-table-cell-left" style={{ fontWeight: 600 }}>
                          Net Pay
                        </td>
                        <td className="wageslip-table-cell wageslip-table-cell-right" style={{ fontWeight: 600 }}>
                          {wageData.netPay}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="wageslip-footer">
                For Inquiries, please feel free to contact HR Department at hr@whizzaway.com.
              </div>
            </div>
          </div>
        )}

        {/* Button Container */}
        <div className="wageslip-button-container">
          <button className="back-button" onClick={handleBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinanceClerkWageSlip

