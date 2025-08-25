// src/pages/Reports/ProfitLossReportsPage.jsx
"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../css/wageReports.css" // Reuse the same CSS for similar styling; can create a new one later if needed

const ProfitLossReportsPage = () => {
    const navigate = useNavigate()
    const currentYear = new Date().getFullYear().toString()
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [generatingReport, setGeneratingReport] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState('')

    const handleBack = () => {
        navigate("/reports")
    }

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear; i++) {
            years.push(i.toString())
        }
        return years
    }

    const generateReport = async (monthName) => {
        if (!selectedYear) {
            alert('Please select a year for the report')
            return
        }

        setGeneratingReport(true)
        setSelectedMonth(monthName)

        try {
            console.log(`Placeholder: Generating Profit & Loss report for ${monthName} ${selectedYear}`)
            // TODO: Implement actual report generation logic here (e.g., fetch data, create Excel with ExcelJS, etc.)
            // For now, this is just a placeholder to simulate the view and button interaction
            // You can add the full logic similar to WageReportsPage later

            // Simulate a delay for report generation
            await new Promise(resolve => setTimeout(resolve, 1000))

            alert(`Profit & Loss report generated for ${monthName} ${selectedYear}! (Placeholder action)`)
        } catch (error) {
            console.error('Error generating report:', error)
            alert(`Failed to generate report: ${error.message}`)
        }

        setGeneratingReport(false)
    }

    const buttons = [
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

    return (
        <div className="wage-reports-wrapper"> {/* Reusing the class for similar layout; adjust if needed */}
            <div className="dashboard">
                <div className="header-actions">
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>

                {/* Year Filter Dropdown */}
                <div className="dropdown-container74">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="dropdown"
                        disabled={generatingReport}
                    >
                        {getYearOptions().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 12 Buttons (6 on each side) labeled as months */}
                <div className="dashboard-row">
                    <div className="button-column">
                        {buttons.slice(0, 6).map((button, index) => (
                            <button
                                key={index}
                                className="filter-button"
                                onClick={() => generateReport(button)}
                                disabled={generatingReport}
                            >
                                {generatingReport && selectedMonth === button ? 'Generating...' : button}
                            </button>
                        ))}
                    </div>
                    <div className="button-column">
                        {buttons.slice(6, 12).map((button, index) => (
                            <button
                                key={index + 6}
                                className="filter-button"
                                onClick={() => generateReport(button)}
                                disabled={generatingReport}
                            >
                                {generatingReport && selectedMonth === button ? 'Generating...' : button}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading indicator */}
                {generatingReport && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <p>Generating Profit & Loss report for {selectedMonth} {selectedYear}...</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProfitLossReportsPage