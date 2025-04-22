// "use client"
// import { useNavigate, useParams, useLocation } from "react-router-dom"
// import { useState, useEffect } from "react"

// const FinanceClerkWageSlip = () => {
//   const navigate = useNavigate()
//   const { id } = useParams() // Get the ID from URL parameters
//   const location = useLocation()
//   const { instructionId, driverName } = location.state || {}

//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(null)
//   const [employeeData, setEmployeeData] = useState(null)
//   const [legs, setLegs] = useState([])
//   const [wageData, setWageData] = useState({
//     payPeriod: "1 March 2025 - 25 March 2025",
//     payDate: "30 March",
//     earnings: [],
//     netPay: "R 0.00",
//   })

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!id) {
//         setError("Employee ID is missing from URL parameters")
//         setLoading(false)
//         return
//       }

//       if (!instructionId) {
//         setError("Instruction ID is missing from location state")
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

//         // CHANGED: Fetch legs for the specific instruction ID instead of all legs for the driver
//         try {
//           console.log(`Fetching legs for instruction ID: ${instructionId} and driver ID: ${cleanId}`)

//           // Try to fetch legs for the specific instruction
//           const legsResponse = await fetch(`http://localhost:5000/legs/instruction/${instructionId}/driver/${cleanId}`)

//           if (legsResponse.ok) {
//             const legsData = await legsResponse.json()
//             console.log("Legs data for specific instruction:", legsData)

//             // Ensure legsData is an array
//             const legsArray = Array.isArray(legsData)
//               ? legsData
//               : legsData && typeof legsData === "object"
//                 ? [legsData]
//                 : []

//             setLegs(legsArray)

//             // Calculate total earnings from legs
//             const totalLegsAmount = legsArray.reduce(
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

//             // Add each leg as a separate earning
//             legsArray.forEach((leg, index) => {
//               earnings.push({
//                 description: `Leg ${leg.legnumber || index + 1}`,
//                 amount: `R ${Number.parseFloat(leg.driverrate).toFixed(2) || "0.00"}`,
//               })
//             })

//             // If no earnings data is available, add dummy data for testing
//             if (earnings.length === 0) {
//               // CHANGED: Only add one leg as dummy data
//               earnings.push({ description: "Leg 1", amount: "R 1200.00" })
//               const totalLegsAmount = 1200.0
//             }

//             // Calculate total (base salary + all legs)
//             const totalAmount = (Number.parseFloat(data.base_salary) || 0) + totalLegsAmount

//             setWageData({
//               payPeriod: "1 March 2025 - 25 March 2025",
//               payDate: "30 March",
//               earnings: earnings,
//               netPay: `R ${totalAmount.toFixed(2)}`,
//             })
//           } else {
//             console.error("Failed to fetch legs data for specific instruction, trying fallback endpoint")

//             // Fallback: Try to fetch all legs for the driver and filter by instruction ID
//             const allLegsResponse = await fetch(`http://localhost:5000/legs/driver/${cleanId}`)

//             if (allLegsResponse.ok) {
//               const allLegsData = await allLegsResponse.json()
//               console.log("All legs data:", allLegsData)

//               // Ensure allLegsData is an array
//               const allLegsArray = Array.isArray(allLegsData)
//                 ? allLegsData
//                 : allLegsData && typeof allLegsData === "object"
//                   ? [allLegsData]
//                   : []

//               // Filter legs by instruction ID
//               const filteredLegs = allLegsArray.filter(
//                 (leg) => leg.instructionid === instructionId || leg.m1key === instructionId,
//               )

//               console.log("Filtered legs for instruction:", filteredLegs)
//               setLegs(filteredLegs)

//               // Calculate total earnings from filtered legs
//               const totalLegsAmount = filteredLegs.reduce(
//                 (total, leg) => total + (Number.parseFloat(leg.driverrate) || 0),
//                 0,
//               )

//               // Format earnings data - include base salary and each leg
//               const earnings = []

//               // Add base salary if available
//               if (data.base_salary) {
//                 earnings.push({
//                   description: "Base Salary",
//                   amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
//                 })
//               }

//               // Add each leg as a separate earning
//               filteredLegs.forEach((leg, index) => {
//                 earnings.push({
//                   description: `Leg ${leg.legnumber || index + 1}`,
//                   amount: `R ${Number.parseFloat(leg.driverrate).toFixed(2) || "0.00"}`,
//                 })
//               })

//               // If no earnings data is available, add dummy data for testing
//               if (earnings.length === 0) {
//                 // CHANGED: Only add one leg as dummy data
//                 earnings.push({ description: "Leg 1", amount: "R 1200.00" })
//                 const totalLegsAmount = 1200.0
//               }

//               // Calculate total (base salary + all legs)
//               const totalAmount = (Number.parseFloat(data.base_salary) || 0) + totalLegsAmount

//               setWageData({
//                 payPeriod: "1 March 2025 - 25 March 2025",
//                 payDate: "30 March",
//                 earnings: earnings,
//                 netPay: `R ${totalAmount.toFixed(2)}`,
//               })
//             } else {
//               console.error("Failed to fetch any legs data, adding dummy data for testing")
//               // Add dummy data for testing
//               const earnings = [
//                 // CHANGED: Only add one leg as dummy data
//                 { description: "Leg 1", amount: "R 1200.00" },
//               ]

//               if (data.base_salary) {
//                 earnings.unshift({
//                   description: "Base Salary",
//                   amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
//                 })
//               }

//               const totalAmount = (Number.parseFloat(data.base_salary) || 0) + 1200.0

//               setWageData({
//                 payPeriod: "1 March 2025 - 25 March 2025",
//                 payDate: "30 March",
//                 earnings: earnings,
//                 netPay: `R ${totalAmount.toFixed(2)}`,
//               })
//             }
//           }
//         } catch (legsError) {
//           console.error("Error fetching legs data:", legsError)
//           // Add dummy data for testing
//           const earnings = [
//             // CHANGED: Only add one leg as dummy data
//             { description: "Leg 1", amount: "R 1200.00" },
//           ]

//           if (data.base_salary) {
//             earnings.unshift({
//               description: "Base Salary",
//               amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
//             })
//           }

//           const totalAmount = (Number.parseFloat(data.base_salary) || 0) + 1200.0

//           setWageData({
//             payPeriod: "1 March 2025 - 25 March 2025",
//             payDate: "30 March",
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
//   }, [id, instructionId])

//   // Function to handle printing the wage slip
//   const handlePrint = () => {
//     window.print()
//   }

//   // Function to handle downloading the wage slip
//   const handleDownload = () => {
//     if (!id || !instructionId) {
//       console.error("Missing ID or instruction ID for download")
//       return
//     }

//     // Create a temporary link element
//     const link = document.createElement("a")

//     // Set the link's href to the wage slip URL
//     link.href = `http://localhost:5000/api/wage-slip/${id}/${instructionId}`

//     // Set the download attribute with a filename
//     const driverNameForFile = employeeData
//       ? `${employeeData.name}-${employeeData.surname}`.replace(/\s+/g, "-")
//       : driverName?.replace(/\s+/g, "-") || `driver-${id}`

//     link.download = `wage-slip-${driverNameForFile}-${instructionId}.pdf`

//     // Append the link to the body
//     document.body.appendChild(link)

//     // Trigger the download
//     link.click()

//     // Remove the link from the body
//     document.body.removeChild(link)

//     console.log(`Downloading wage slip for Driver ID: ${id}, Instruction ID: ${instructionId}`)
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
//     // CHANGED: Modified employee info row to center content better
//     employeeInfoRow: {
//       display: "flex",
//       justifyContent: "center", // Changed from space-between to center
//       marginBottom: "4px",
//       gap: "20px", // Added gap for better spacing
//     },
//     // CHANGED: Modified employee info column to have fixed widths
//     employeeInfoColumn: {
//       width: "45%", // Fixed width instead of flex
//       display: "flex", // Added flex display
//       alignItems: "center", // Center vertically
//     },
//     // ADDED: Style for the label to ensure consistent width
//     employeeLabel: {
//       minWidth: "60px", // Fixed width for labels
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
//       transition: "background-color 0.2s",
//       marginLeft: "225px",
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
//     // CHANGED: Modified button container to include multiple buttons
//     buttonContainer: {
//       display: "flex",
//       justifyContent: "flex-start",
//       marginTop: "15px",
//       marginBottom: "20px",
//     },
//     // ADDED: Style for instruction ID display
//     instructionInfo: {
//       backgroundColor: "#f9fafb",
//       padding: "6px",
//       borderRadius: "6px",
//       marginBottom: "8px",
//       textAlign: "center",
//     },
//     instructionText: {
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
//                 <p style={styles.companyName}>Whizz Away Logistics</p>
//                 <p style={styles.companyContact}>info@whizzaway.com</p>
//                 <p style={styles.companyContact}>+27 31 123 4567</p>
//               </div>
//             </div>

//             {/* Content */}
//             <div style={styles.content}>
//               {/* Title */}
//               <h1 style={styles.title}>Wage Slip</h1>

//               {/* ADDED: Instruction ID */}
//               <div style={styles.instructionInfo}>
//                 <p style={styles.instructionText}>
//                   <strong>Instruction ID:</strong> {instructionId}
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

//               {/* Employee Info - CHANGED: Restructured to center labels better */}
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

//         {/* Button Container - Updated with download button */}
//         <div style={styles.buttonContainer}>
//           {/* FIXED: Use handleBack instead of direct navigation */}
//           <button className="back-button" onClick={handleBack}>
//             Back
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default FinanceClerkWageSlip
"use client"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"

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
    netPay: "R 0.00",
  })

  // Month names array for conversion
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

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
            const totalLegsAmount = allLegsArray.reduce(
              (total, leg) => total + (Number.parseFloat(leg.driverrate) || 0),
              0,
            )
        
            // Format earnings data - include base salary and each leg
            const earnings = []
        
            // Add base salary if available
            if (data.base_salary) {
              earnings.push({
                description: "Base Salary",
                amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
              })
            }
        
            // Add each leg as a separate earning, grouped by instruction
            Object.keys(legsByInstruction).forEach((instructionId) => {
              legsByInstruction[instructionId].forEach((leg, index) => {
                earnings.push({
                  description: `INS${instructionId}-Leg${leg.legnumber || index + 1} (${leg.instruction_status})`,
                  amount: `R ${Number.parseFloat(leg.driverrate).toFixed(2) || "0.00"}`,
                })
              })
            })
        
            // If no earnings data is available, add dummy data for testing
            if (allLegsArray.length === 0) {
              earnings.push({ description: "No legs found for this month", amount: "R 0.00" })
            }
        
            // Calculate total (base salary + all legs)
            const totalAmount = (Number.parseFloat(data.base_salary) || 0) + totalLegsAmount
        
            // Calculate pay period dates
            const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth)
            const firstDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod, 1)
            const lastDay = new Date(Number.parseInt(selectedYear), monthIndexForPayPeriod + 1, 0)
            const formattedFirstDay = firstDay.toLocaleDateString()
            const formattedLastDay = lastDay.toLocaleDateString()
        
            setWageData({
              payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
              payDate: formattedLastDay,
              earnings: earnings,
              netPay: `R ${totalAmount.toFixed(2)}`,
            })
          }
        } catch (legsError) {
          console.error("Error fetching legs data:", legsError)
          // Add dummy data for testing
          const earnings = [
            { description: "Error fetching legs data", amount: "R 0.00" },
          ]

          if (data.base_salary) {
            earnings.unshift({
              description: "Base Salary",
              amount: `R ${Number.parseFloat(data.base_salary).toFixed(2) || "0.00"}`,
            })
          }

          const totalAmount = Number.parseFloat(data.base_salary) || 0

          // Calculate pay period dates
          const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth)
          const firstDay = new Date(parseInt(selectedYear), monthIndexForPayPeriod, 1)
          const lastDay = new Date(parseInt(selectedYear), monthIndexForPayPeriod + 1, 0)
          const formattedFirstDay = firstDay.toLocaleDateString()
          const formattedLastDay = lastDay.toLocaleDateString()

          setWageData({
            payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
            payDate: formattedLastDay,
            earnings: earnings,
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

  // Function to handle printing the wage slip
  const handlePrint = () => {
    window.print()
  }

  // Function to handle downloading the wage slip
  const handleDownload = () => {
    if (!id) {
      console.error("Missing ID for download")
      return
    }

    // Create a temporary link element
    const link = document.createElement("a")

    // Set the link's href to the wage slip URL
    link.href = `http://localhost:5000/api/wage-slip/${id}/monthly/${selectedMonth}/${selectedYear}`

    // Set the download attribute with a filename
    const driverNameForFile = employeeData
      ? `${employeeData.name}-${employeeData.surname}`.replace(/\s+/g, "-")
      : driverName?.replace(/\s+/g, "-") || `driver-${id}`

    link.download = `monthly-wage-slip-${driverNameForFile}-${selectedMonth}-${selectedYear}.pdf`

    // Append the link to the body
    document.body.appendChild(link)

    // Trigger the download
    link.click()

    // Remove the link from the body
    document.body.removeChild(link)

    console.log(`Downloading monthly wage slip for Driver ID: ${id}, Month: ${selectedMonth}, Year: ${selectedYear}`)
  }

  // FIXED: Handle back navigation with proper state
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

  // Styles for the wage slip
  const styles = {
    pageWrapper: {
      paddingBottom: "60px",
    },
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      marginTop: "20px",
      padding: "5px 10px 10px 10px",
    },
    wageSlipContainer: {
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
      backgroundColor: "#fff",
    },
    header: {
      backgroundColor: "#b8d1f3",
      padding: "8px 12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    companyInfo: {
      textAlign: "right",
    },
    companyName: {
      fontWeight: 600,
      fontSize: "16px",
      margin: "0 0 2px 0",
    },
    companyContact: {
      fontSize: "14px",
      margin: "0 0 1px 0",
    },
    content: {
      padding: "10px 12px",
    },
    title: {
      fontSize: "20px",
      fontWeight: "bold",
      textAlign: "center",
      margin: "0 0 8px 0",
      color: "#333",
    },
    payPeriodSection: {
      backgroundColor: "#f9fafb",
      padding: "6px",
      borderRadius: "6px",
      marginBottom: "8px",
      textAlign: "center",
    },
    payPeriodText: {
      fontSize: "14px",
      margin: "0",
    },
    employeeSection: {
      backgroundColor: "#f9fafb",
      padding: "8px",
      borderRadius: "6px",
      marginBottom: "8px",
    },
    employeeText: {
      fontSize: "14px",
      margin: "0",
    },
    employeeInfoRow: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "4px",
      gap: "20px",
    },
    employeeInfoColumn: {
      width: "45%",
      display: "flex",
      alignItems: "center",
    },
    employeeLabel: {
      minWidth: "60px",
      fontWeight: "bold",
    },
    tableContainer: {
      marginBottom: "8px",
      borderRadius: "6px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableHeader: {
      backgroundColor: "#b8d1f3",
      padding: "5px 10px",
      fontSize: "14px",
      fontWeight: 600,
      textAlign: "center",
      borderBottom: "1px solid #e5e7eb",
    },
    tableCell: {
      padding: "5px 10px",
      fontSize: "14px",
      borderBottom: "1px solid #e5e7eb",
    },
    tableCellLeft: {
      textAlign: "left",
    },
    tableCellRight: {
      textAlign: "right",
    },
    footer: {
      textAlign: "center",
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "5px",
      borderTop: "1px solid #e5e7eb",
      paddingTop: "5px",
    },
    backButton: {
      backgroundColor: "#8ee4a6",
      color: "black",
      padding: "6px 16px",
      borderRadius: "4px",
      fontSize: "14px",
      border: "none",
      cursor: "pointer",
      marginTop: "10px",
      marginRight: "10px",
      transition: "background-color 0.2s",
    },
    printButton: {
      backgroundColor: "#8ee4a6",
      color: "black",
      padding: "6px 50px",
      borderRadius: "4px",
      fontSize: "14px",
      border: "none",
      cursor: "pointer",
      marginTop: "10px",
      marginRight: "10px",
      transition: "background-color 0.2s",
    },
    downloadButton: {
      backgroundColor: "#87CEEB",
      color: "black",
      padding: "6px 16px",
      borderRadius: "4px",
      fontSize: "14px",
      border: "none",
      cursor: "pointer",
      marginTop: "10px",
      marginLeft: "10px",
      transition: "background-color 0.2s",
    },
    loadingContainer: {
      textAlign: "center",
      padding: "20px",
      fontSize: "16px",
      color: "#666",
    },
    errorContainer: {
      textAlign: "center",
      padding: "20px",
      fontSize: "16px",
      color: "red",
    },
    combinedTablesContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    buttonContainer: {
      display: "flex",
      justifyContent: "flex-start",
      marginTop: "15px",
      marginBottom: "20px",
    },
    monthYearInfo: {
      backgroundColor: "#f9fafb",
      padding: "6px",
      borderRadius: "6px",
      marginBottom: "8px",
      textAlign: "center",
    },
    monthYearText: {
      fontSize: "14px",
      margin: "0",
    },
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        {loading ? (
          <div style={styles.loadingContainer}>Loading employee data...</div>
        ) : error ? (
          <div style={styles.errorContainer}>{error}</div>
        ) : (
          <div style={styles.wageSlipContainer}>
            {/* Header */}
            <div style={styles.header}>
              <div></div>
              <div style={styles.companyInfo}>
                <p style={styles.companyName}>Whizz Away Logistics</p>
                <p style={styles.companyContact}>info@whizzaway.com</p>
                <p style={styles.companyContact}>+27 31 123 4567</p>
              </div>
            </div>

            {/* Content */}
            <div style={styles.content}>
              {/* Title */}
              <h1 style={styles.title}>Monthly Wage Slip</h1>

              {/* Month and Year */}
              <div style={styles.monthYearInfo}>
                <p style={styles.monthYearText}>
                  <strong>Month:</strong> {selectedMonth} {selectedYear}
                </p>
              </div>

              {/* Pay Period */}
              <div style={styles.payPeriodSection}>
                <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                  <p style={styles.payPeriodText}>
                    <strong>Pay Period:</strong> {wageData.payPeriod}
                  </p>
                  <p style={styles.payPeriodText}>
                    <strong>Pay Date:</strong> {wageData.payDate}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div style={styles.employeeSection}>
                {/* First row: Name and Contact side by side */}
                <div style={styles.employeeInfoRow}>
                  <div style={styles.employeeInfoColumn}>
                    <span style={styles.employeeLabel}>Name:</span>{" "}
                    {employeeData ? `${employeeData.name} ${employeeData.surname}` : driverName || "N/A"}
                  </div>
                  <div style={styles.employeeInfoColumn}>
                    <span style={styles.employeeLabel}>Contact:</span> {employeeData ? employeeData.cellnum : "N/A"}
                  </div>
                </div>

                {/* Second row: Role below Name */}
                <div style={styles.employeeInfoRow}>
                  <div style={styles.employeeInfoColumn}>
                    <span style={styles.employeeLabel}>Role:</span> {employeeData ? employeeData.rolename : "Driver"}
                  </div>
                  <div style={styles.employeeInfoColumn}></div>
                </div>
              </div>

              {/* Combined Tables Container */}
              <div style={styles.combinedTablesContainer}>
                {/* Earnings Table */}
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.tableHeader, textAlign: "left" }}>Earnings</th>
                        <th style={{ ...styles.tableHeader, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wageData.earnings.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td style={{ ...styles.tableCell, ...styles.tableCellLeft }}>{item.description}</td>
                          <td style={{ ...styles.tableCell, ...styles.tableCellRight }}>{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Net Pay Table */}
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.tableHeader, textAlign: "left" }}>Net Pay</th>
                        <th style={{ ...styles.tableHeader, textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <td style={{ ...styles.tableCell, ...styles.tableCellLeft, fontWeight: 600 }}>Net Pay</td>
                        <td style={{ ...styles.tableCell, ...styles.tableCellRight, fontWeight: 600 }}>
                          {wageData.netPay}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={styles.footer}>
                For Inquiries, please feel free to contact HR Department at hr@whizzaway.com.
              </div>
            </div>
          </div>
        )}

        {/* Button Container */}
        <div style={styles.buttonContainer}>
          <button className="back-button" onClick={handleBack}>
            Back
          </button>
          {/* <button
            onClick={handlePrint}
            style={styles.printButton}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#a3c2e8")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#8ee4a6")}
          >
            Print
          </button>
          <button
            onClick={handleDownload}
            style={styles.downloadButton}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#5cacee")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#87CEEB")}
          >
            Download
          </button> */}
        </div>
      </div>
    </div>
  )
}

export default FinanceClerkWageSlip