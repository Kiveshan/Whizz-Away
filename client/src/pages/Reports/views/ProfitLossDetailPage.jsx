"use client"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import api from "../../../api.js"
import "../../invoices/css/InvoiceTemplate.css"
import "../css/ProfitLossEnhanced.css"

const ProfitLossDetailPage = () => {
    const { month, year } = useParams()
    const navigate = useNavigate()
    const [reportData, setReportData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (month && year) {
            fetchReport()
        }
    }, [month, year])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const response = await api.get("/profit-loss-report", {
                params: { month, year },
            })
            setReportData(response.data)
        } catch (error) {
            console.error("Error fetching report:", error)
            alert(`Failed to fetch report: ${error.message}`)
        }
        setLoading(false)
    }

    const aggregateData = (details) => {
        const aggregated = details.reduce((acc, item) => {
            if (!acc[item.source]) {
                acc[item.source] = 0
            }
            acc[item.source] += item.amount
            return acc
        }, {})
        return aggregated
    }

    const downloadPDF = () => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        })

        // Header
        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")

        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35)

        // Title with background
        doc.setFillColor(34, 139, 34)
        doc.rect(20, 45, 170, 15, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("Profit & Loss Statement", 25, 55)
        doc.text(`${year}`, 150, 55)
        doc.text("current year", 150, 62)

        doc.setTextColor(0, 0, 0)
        let yPos = 75

        // Revenue Section
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Revenue", 20, yPos)
        yPos += 8

        doc.setFont("helvetica", "normal")
        const profitAgg = aggregateData(reportData.profitDetails)
        Object.entries(profitAgg).forEach(([source, amount]) => {
            doc.text(source, 25, yPos)
            doc.text(`R ${amount.toFixed(2)}`, 170, yPos, { align: "right" })
            yPos += 6
        })

        // Total Revenue
        doc.setFont("helvetica", "bold")
        doc.text("Total Revenue & Gains", 25, yPos)
        doc.text(`R ${reportData.totalProfit.toFixed(2)}`, 170, yPos, { align: "right" })
        yPos += 15

        // Expenses Section
        doc.text("Expenses", 20, yPos)
        yPos += 8

        doc.setFont("helvetica", "normal")
        const lossAgg = aggregateData(reportData.lossDetails)
        Object.entries(lossAgg).forEach(([source, amount]) => {
            doc.text(source, 25, yPos)
            doc.text(`R ${amount.toFixed(2)}`, 170, yPos, { align: "right" })
            yPos += 6
        })

        // Total Expenses
        doc.setFont("helvetica", "bold")
        doc.text("Total Expenses", 25, yPos)
        doc.text(`R ${Math.abs(reportData.totalLoss).toFixed(2)}`, 170, yPos, { align: "right" })
        yPos += 15

        // Net Profit/Loss
        doc.text("Net Profit (Loss)", 20, yPos)
        yPos += 8
        const net = reportData.net
        const netText = net >= 0 ? `R ${net.toFixed(2)}` : `R (${Math.abs(net).toFixed(2)})`
        doc.text(netText, 170, yPos, { align: "right" })

        doc.save(`Profit_Loss_Statement_${month}_${year}.pdf`)
    }

    const handleBack = () => {
        navigate("/profit-loss-reports")
    }

    if (loading) {
        return (
            <div className="pl-enhanced-wrapper">
                <div className="pl-enhanced-page">
                    <div className="pl-loading-error">
                        Loading Profit & Loss report for {month} {year}...
                    </div>
                </div>
            </div>
        )
    }

    if (!reportData) {
        return (
            <div className="pl-enhanced-wrapper">
                <div className="pl-enhanced-page">
                    <div className="pl-loading-error">
                        No data available for {month} {year}.
                    </div>
                    <div className="pl-enhanced-buttons">
                        <button className="pl-btn pl-back-btn" onClick={handleBack}>
                            Back to Reports
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const profitAgg = aggregateData(reportData.profitDetails)
    const lossAgg = aggregateData(reportData.lossDetails)

    return (
        <div className="pl-enhanced-wrapper">
            <div className="pl-enhanced-page">
                <div className="pl-enhanced-paper">
                    {/* Report Title */}
                    <div className="pl-title-section">
                        <div className="pl-title">Profit & Loss Statement</div>
                        <div className="pl-period">
                            {year} - {month}
                        </div>
                    </div>

                    {/* Revenue Section */}
                    <div className="pl-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header">
                                <tr>
                                    <th>Income</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                {Object.entries(profitAgg).map(([source, amount], index) => (
                                    <tr key={index}>
                                        <td>{source}</td>
                                        <td>R {amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="pl-total-row">
                                    <td>Total Income</td>
                                    <td>R {reportData.totalProfit.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Expenses Section */}
                    <div className="pl-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header">
                                <tr>
                                    <th>Expenditure</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                {Object.entries(lossAgg).map(([source, amount], index) => (
                                    <tr key={index}>
                                        <td>{source}</td>
                                        <td>R {amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="pl-total-row">
                                    <td>Total Expenditure</td>
                                    <td>R {Math.abs(reportData.totalLoss).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Net Profit/Loss Section */}
                    <div className="pl-section pl-net-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header pl-net-header">
                                <tr>
                                    <th>Net Profit (Loss)</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                <tr>
                                    <td>Net Profit (Loss)</td>
                                    <td className={`pl-net-amount ${reportData.net >= 0 ? "pl-profit" : "pl-loss"}`}>
                                        {reportData.net >= 0
                                            ? `R ${reportData.net.toFixed(2)}`
                                            : `R (${Math.abs(reportData.net).toFixed(2)})`}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pl-enhanced-buttons">
                    <button className="pl-btn pl-back-btn" onClick={handleBack}>
                        Back
                    </button>
                    <button className="pl-btn pl-download-btn" onClick={downloadPDF}>
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfitLossDetailPage
