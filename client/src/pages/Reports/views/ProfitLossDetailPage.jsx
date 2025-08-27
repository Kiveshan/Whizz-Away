"use client"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import api from "../../../api.js"
import "../../invoices/css/InvoiceTemplate.css"

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
        doc.text("KSM Carries", 105, 20, { align: "center" })

        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35)

        // Title with background
        doc.setFillColor(34, 139, 34)
        doc.rect(20, 45, 170, 15, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("Income & Expenditure", 25, 55)
        doc.text(`${year}`, 150, 55)

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
            <div className="client-invoice-wrapper">
                <div className="invoice-page">
                    <div className="loading-error">
                        Loading Profit & Loss report for {month} {year}...
                    </div>
                </div>
            </div>
        )
    }

    if (!reportData) {
        return (
            <div className="client-invoice-wrapper">
                <div className="invoice-page">
                    <div className="loading-error">
                        No data available for {month} {year}.
                    </div>
                    <div className="invoicedownloadbtn1">
                        <button className="back-btn" onClick={handleBack}>
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
        <div className="client-invoice-wrapper">
            <div className="invoice-page">
                <div className="invoice-paper">
                    {/* Company Header */}
                    <div className="transport-section">
                        <div className="section-title">KSM Carriers</div>
                    </div>

                    {/* Date section */}
                    <div className="middle-section">
                        <div className="company-info">Date: {new Date().toLocaleDateString()}</div>
                    </div>

                    {/* Report Title section */}
                    <div className="invoice-title-section">
                        <div className="invoice-title">Income & Expenditure</div>
                    </div>

                    {/* Revenue Section */}
                    <div className="invoice-details">
                        <div className="container-section">
                            <table className="container-table5">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold" }}>Revenue</th>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold", textAlign: "right" }}>
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(profitAgg).map(([source, amount], index) => (
                                        <tr key={index}>
                                            <td className="container-number">{source}</td>
                                            <td className="amount" style={{ textAlign: "right" }}>
                                                R {amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                                        <td className="container-number">Total Revenue & Gains</td>
                                        <td className="amount" style={{ textAlign: "right" }}>
                                            R {reportData.totalProfit.toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Expenses Section */}
                        <div className="container-section">
                            <table className="container-table5">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold" }}>Expenses</th>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold", textAlign: "right" }}>
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(lossAgg).map(([source, amount], index) => (
                                        <tr key={index}>
                                            <td className="container-number">{source}</td>
                                            <td className="amount" style={{ textAlign: "right" }}>
                                                R {amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                                        <td className="container-number">Total Expenses</td>
                                        <td className="amount" style={{ textAlign: "right" }}>
                                            R {Math.abs(reportData.totalLoss).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Net Profit/Loss Section */}
                        <div className="container-section">
                            <table className="container-table5">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold" }}>
                                            Net Profit (Loss)
                                        </th>
                                        <th style={{ backgroundColor: "#34a853", color: "white", fontWeight: "bold", textAlign: "right" }}>
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                                        <td className="container-number">Net Profit (Loss)</td>
                                        <td className="amount" style={{ textAlign: "right" }}>
                                            {reportData.net >= 0
                                                ? `R ${reportData.net.toFixed(2)}`
                                                : `R (${Math.abs(reportData.net).toFixed(2)})`}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="invoicedownloadbtn1">
                    <button className="back-btn" onClick={handleBack}>
                        Back
                    </button>
                    <button className="download-btn" onClick={downloadPDF}>
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfitLossDetailPage
