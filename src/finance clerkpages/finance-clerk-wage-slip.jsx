
"use client"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import "../finance clerkpages/css/finance-clerk-wageslip.css"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

const FinanceClerkWageSlip = () => {
  const navigate = useNavigate()
  const { id } = useParams() // Get the ID from URL parameters
  const location = useLocation()
  const { driverId, driverName, selectedMonth, selectedYear } = location.state || {}

  // Add a ref to track if we've already saved a wage slip in this component instance
  const hasAttemptedSave = useRef(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)
  const [legs, setLegs] = useState([])
  const [downloading, setDownloading] = useState(false)

  const wageSlipRef = useRef(null)
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

  // Helper function to get the last day of a month
  const getLastDayOfMonth = (year, month) => {
    const lastDay = new Date(year, month + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  };

  // Update the checkExistingWageSlip function to include better error handling
  const checkExistingWageSlip = async (employeeId, month, year) => {
    try {
      // Add logging to track function execution
      console.log(`Checking for existing wage slip: employeeId=${employeeId}, month=${month}, year=${year}`)

      const response = await fetch(
        `http://localhost:5000/api/check-wage-slip?employeeId=${employeeId}&month=${month}&year=${year}`,
      )

      if (!response.ok) {
        console.error("Failed to check existing wage slip:", response.status)
        return { exists: false, error: true }
      }

      const data = await response.json()
      console.log("Existing wage slip check result:", data)

      // Return the wage slip data and useHistoricalValues flag
      return data.exists
        ? { exists: true, wageSlip: data.wageSlip, useHistoricalValues: data.useHistoricalValues }
        : { exists: false }
    } catch (error) {
      console.error("Error checking existing wage slip:", error)
      return { exists: false, error: true }
    }
  }

  // Create a separate function for saving wage data to avoid duplicate code
  const saveWageData = async (wagePayload) => {
    // If we've already attempted to save in this component instance, don't try again
    if (hasAttemptedSave.current) {
      console.log("Already attempted to save wage data in this session, skipping")
      return { success: false, exists: true }
    }

    try {
      console.log("Creating new wage slip")

      const saveResponse = await fetch("http://localhost:5000/api/save-wage-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wagePayload),
      })

      // Mark that we've attempted a save
      hasAttemptedSave.current = true

      if (!saveResponse.ok) {
        // If status is 409 (Conflict), it means the wage slip already exists
        if (saveResponse.status === 409) {
          console.log("Server detected existing wage slip (409 Conflict)")
          return { success: false, exists: true }
        }

        console.error("Failed to save wage data:", saveResponse.status)
        return { success: false, exists: false }
      }

      const saveResult = await saveResponse.json()
      console.log("Wage data save result:", saveResult)

      // Check if the save operation detected an existing record
      if (saveResult.exists) {
        console.log("Server detected existing wage slip during save operation")
        return { success: false, exists: true }
      }

      console.log("Wage data saved successfully")
      return { success: true, exists: false }
    } catch (error) {
      console.error("Error saving wage data:", error)
      return { success: false, error: true }
    }
  }

  // Update the useEffect hook to handle wage slip saving more carefully
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

        // IMPORTANT: Check for existing wage slip FIRST, before doing any other processing
        // This ensures we don't waste time calculating data if we're not going to save it
        const existingWageSlipResult = await checkExistingWageSlip(
          cleanId,
          monthIndexForPayPeriod + 1, // 1-based month index
          Number.parseInt(selectedYear),
        )

        // If there's already a wage slip, we can still fetch the data to display it,
        // but we'll skip saving a new one
        const wageSlipExists = existingWageSlipResult.exists

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
                  description: `INS${instructionId}-Leg${leg.legnumber || index + 1} `,
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
              // Fetch deductions from employee table for this employee
              console.log(
                `Fetching deductions for employee ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`,
              )

              // Fetch the deductions - this endpoint now handles historical values
              const deductionsResponse = await fetch(
                `http://localhost:5000/api/employee-deductions/${cleanId}?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`,
              )

              // Log the raw response for debugging
              console.log("Deductions API response status:", deductionsResponse.status)

              let deductions = []
              let totalDeductionsAmount = 0
              let deductionsData = {} // Store deductions data for later use

              if (deductionsResponse.ok) {
                deductionsData = await deductionsResponse.json()
                console.log("Deductions data from API (includes historical values if applicable):", deductionsData)

                // Define all possible deduction fields
                const deductionFields = [
                  { key: "income_tax_rate", label: "Income Tax", isRate: true },
                  { key: "deduction_income_tax", label: "Income Tax (Fixed)", isRate: false },
                  { key: "deduction_other_deductions", label: "Other Deductions", isRate: false },
                  { key: "deduction_uif", label: "UIF", isRate: true },
                  { key: "deduction_bonus", label: "Bonus Deduction", isRate: false },
                  { key: "deduction_savings", label: "Savings", isRate: false },
                  { key: "deduction_loan", label: "Loan Repayment", isRate: false },
                  { key: "deduction_damage", label: "Damage Recovery", isRate: false },
                ]

                // Process each deduction field
                deductionFields.forEach((field) => {
                  if (deductionsData && deductionsData[field.key] !== null && deductionsData[field.key] !== undefined) {
                    const rawValue = parseAmount(deductionsData[field.key])

                    // Handle rate-based deductions (like UIF)
                    let amount = rawValue
                    if (field.isRate && rawValue > 0) {
                      // Convert percentage to decimal and multiply by total earnings
                      amount = (rawValue / 100) * totalEarningsAmount
                      console.log(`${field.label} rate:`, rawValue, "% of", totalEarningsAmount, "=", amount)
                    }

                    console.log(
                      `${field.label} amount:`,
                      amount,
                      "Type:",
                      typeof deductionsData[field.key],
                      "Raw value:",
                      deductionsData[field.key],
                      field.isRate ? "(Rate)" : "",
                    )

                    if (!isNaN(amount) && amount > 0) {
                      totalDeductionsAmount += amount
                      deductions.push({
                        description: field.isRate ? `${field.label} (Rate: ${rawValue.toFixed(2)}%)` : field.label,
                        amount: `R ${amount.toFixed(2)}`,
                      })
                    }
                  }
                })
              } else {
                console.log("Failed to fetch deductions data:", deductionsResponse.status)

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

              // Get the last day of the month for the wage slip date
              const lastDayOfMonth = getLastDayOfMonth(Number.parseInt(selectedYear), monthIndexForPayPeriod)

              // Update UI with calculated data
              setWageData({
                payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
                payDate: formattedLastDay,
                earnings: earnings,
                deductions: deductions,
                totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
                totalDeductions: `R ${totalDeductionsAmount.toFixed(2)}`,
                netPay: `R ${netPayAmount.toFixed(2)}`,
              })

              // Only attempt to save if we haven't found an existing wage slip
              if (!wageSlipExists) {
                // Calculate income tax based on rate
                const incomeTaxRate = parseAmount(deductionsData.income_tax_rate || 0)
                const calculatedIncomeTax = (incomeTaxRate / 100) * totalEarningsAmount

                // Create wage payload with individual deduction values
                const wagePayload = {
                  employeeId: cleanId,
                  month: monthIndexForPayPeriod + 1,
                  year: Number.parseInt(selectedYear),
                  totalEarnings: totalEarningsAmount,
                  totalDeductions: totalDeductionsAmount,
                  netPay: netPayAmount,
                  calculatedIncomeTax: calculatedIncomeTax, // Add the calculated income tax
                  date: getLastDayOfMonth(Number.parseInt(selectedYear), monthIndexForPayPeriod),
                }

                console.log("Wage payload:", wagePayload)

                // Use the separate function to save wage data
                await saveWageData(wagePayload)
              } else {
                console.log("Wage slip already exists, skipping save operation")
              }
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

  const handleDownloadWageSlip = async () => {
    try {
      setDownloading(true)

      if (!wageSlipRef.current) {
        console.error("Wage slip container not found")
        setDownloading(false)
        return
      }

      // Create a filename with employee name, month and year
      const employeeName = employeeData
        ? `${employeeData.name}_${employeeData.surname}`
        : driverName?.replace(/\s+/g, "_") || `Driver_${id}`
      const filename = `${employeeName}_WageSlip_${selectedMonth}_${selectedYear}.pdf`

      // Capture the wage slip as an image
      const canvas = await html2canvas(wageSlipRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      // Calculate PDF dimensions based on the canvas
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4")
      const imgData = canvas.toDataURL("image/png")

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(filename)

      setDownloading(false)
    } catch (error) {
      console.error("Error downloading wage slip:", error)
      setDownloading(false)
    }
  }

  return (
    <div className="wageslip-page-wrapper">
      <div className="wageslip-container">
        {loading ? (
          <div className="wageslip-loading-container">Loading employee data...</div>
        ) : error ? (
          <div className="wageslip-error-container">{error}</div>
        ) : (
          <div className="wageslip-slip-container" ref={wageSlipRef}>
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
          <button
            className="downloadwage1 wageslip-download-button"
            onClick={handleDownloadWageSlip}
            disabled={downloading}
            style={{ marginLeft: "202px" }}
          >
            {downloading ? "Downloading..." : "Download Wage Slip"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinanceClerkWageSlip
