"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ProfitLossReportsPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const handleMonthClick = (month, year) => {
        navigate(`/income-expenditure-reports/${month}/${year}`)
    }

    // Generate months for current year
    const currentYear = new Date().getFullYear()
    const months = [
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

    const handleBack = () => {
        navigate("/reports");
    };

    return (
        <div className="wage-reports-wrapper">
            <div className="dashboard">
                <div className="header-actions">
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>

                <div className="dropdown-container74">
                    <h2>Select Month for {currentYear}</h2>
                </div>

                <div className="dashboard-row">
                    <div className="button-column">
                        {months.map((month, index) => (
                            <button
                                key={index}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, currentYear)}
                                disabled={loading}
                            >
                                {month} {currentYear}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && <div className="loading-text">Loading report...</div>}
            </div>
        </div>
    )
}

export default ProfitLossReportsPage