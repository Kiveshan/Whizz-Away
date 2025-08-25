"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../css/wageReports.css"
import api from "../../../api.js"

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
            console.log(`Starting Profit & Loss report generation for ${monthName} ${selectedYear}`)
            const response = await api.get('/profit-loss-report', {
                params: { month: monthName, year: selectedYear },
            }, { responseType: 'blob' }); // Expecting a binary file response

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `Profit_Loss_Report_${monthName}_${selectedYear}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);

            console.log(`Report generated successfully: Profit_Loss_Report_${monthName}_${selectedYear}.xlsx`);
        } catch (error) {
            console.error('Error generating report:', error)
            alert(`Failed to generate report: ${error.message}`)
        }

        setGeneratingReport(false)
    }

    const buttons = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    return (
        <div className="wage-reports-wrapper">
            <div className="dashboard">
                <div className="header-actions">
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>

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