"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ExcelJS from "exceljs"
import api from "../../../api"

const VatReconReportPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const currentYear = new Date().getFullYear().toString()
    const [selectedYear, setSelectedYear] = useState(currentYear)

    const handleMonthClick = async (month, year) => {
        setLoading(true)
        try {
            const response = await api.get("/api/vat-recon", {
                params: { month, year }
            })
            const data = response.data
            await generateExcelReport(data, month, year)
        } catch (error) {
            console.error("Failed to fetch VAT recon data:", error)
            alert("Failed to generate VAT report. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const generateExcelReport = async (data, month, year) => {
        setExporting(true)
        try {
            const workbook = new ExcelJS.Workbook()
            workbook.created = new Date()
            workbook.modified = new Date()

            // Sheet 1: Output VAT
            const outputVatSheet = workbook.addWorksheet("Output VAT")
            outputVatSheet.columns = [
                { header: "Client Name", key: "clientName", width: 32 },
                { header: "Total Cost", key: "totalCost", width: 18 },
                { header: "VAT Rate (%)", key: "vatRate", width: 14 },
                { header: "VAT Amount", key: "vatAmount", width: 18 },
            ]

            let totalOutputVat = 0
            let totalOutputCost = 0

            if (data.outputVat && data.outputVat.length > 0) {
                data.outputVat.forEach((item) => {
                    const vatAmount = (item.totalCost * item.vatRate) / 100
                    totalOutputVat += vatAmount
                    totalOutputCost += item.totalCost
                    outputVatSheet.addRow({
                        clientName: item.clientName,
                        totalCost: item.totalCost,
                        vatRate: item.vatRate,
                        vatAmount: vatAmount,
                    })
                })
            }

            // Add totals row
            outputVatSheet.addRow({})
            const outputTotalRow = outputVatSheet.addRow({
                clientName: "TOTAL",
                totalCost: totalOutputCost,
                vatRate: "",
                vatAmount: totalOutputVat,
            })
            outputTotalRow.font = { bold: true }

            outputVatSheet.getColumn("totalCost").numFmt = "R #,##0.00"
            outputVatSheet.getColumn("vatRate").numFmt = "0.00"
            outputVatSheet.getColumn("vatAmount").numFmt = "R #,##0.00"

            // Sheet 2: Input VAT
            const inputVatSheet = workbook.addWorksheet("Input VAT")
            inputVatSheet.columns = [
                { header: "Date", key: "date", width: 14 },
                { header: "Expense Type", key: "expenseType", width: 24 },
                { header: "Total", key: "total", width: 18 },
                { header: "VAT", key: "vat", width: 18 },
            ]

            let totalInputVat = 0
            let totalInputCost = 0

            if (data.inputVat && data.inputVat.length > 0) {
                data.inputVat.forEach((item) => {
                    totalInputVat += item.vat || 0
                    totalInputCost += item.total || 0
                    inputVatSheet.addRow({
                        date: item.date,
                        expenseType: item.expenseType,
                        total: item.total,
                        vat: item.vat,
                    })
                })
            }

            // Add totals row
            inputVatSheet.addRow({})
            const inputTotalRow = inputVatSheet.addRow({
                date: "",
                expenseType: "TOTAL",
                total: totalInputCost,
                vat: totalInputVat,
            })
            inputTotalRow.font = { bold: true }

            inputVatSheet.getColumn("date").numFmt = "YYYY-MM-DD"
            inputVatSheet.getColumn("total").numFmt = "R #,##0.00"
            inputVatSheet.getColumn("vat").numFmt = "R #,##0.00"

            // Sheet 3: VAT Owed to SARS
            const vatOwedSheet = workbook.addWorksheet("VAT Owed to SARS")
            vatOwedSheet.columns = [
                { header: "Description", key: "description", width: 32 },
                { header: "Amount", key: "amount", width: 18 },
            ]

            const vatOwed = totalOutputVat - totalInputVat

            vatOwedSheet.addRow({
                description: "Total Output VAT (from clients)",
                amount: totalOutputVat,
            })
            vatOwedSheet.addRow({
                description: "Total Input VAT (from expenses)",
                amount: totalInputVat,
            })
            vatOwedSheet.addRow({})
            const owedRow = vatOwedSheet.addRow({
                description: "VAT Owed to SARS (Output - Input)",
                amount: vatOwed,
            })
            owedRow.font = { bold: true }

            if (vatOwed < 0) {
                const refundRow = vatOwedSheet.addRow({
                    description: "Note: Negative value indicates VAT refund due",
                    amount: "",
                })
                refundRow.font = { italic: true, color: { argb: "FF0000" } }
            }

            vatOwedSheet.getColumn("amount").numFmt = "R #,##0.00"

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = downloadUrl
            link.download = `VAT-Recon-${month}-${year}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
            console.error("Failed to export report:", err)
            alert("Failed to generate Excel file. Please try again.")
        } finally {
            setExporting(false)
        }
    }

    // Generate months
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
        navigate("/reports")
    }

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i.toString())
        }
        return years
    }

    // Split months into two columns
    const firstHalfMonths = months.slice(0, 6)
    const secondHalfMonths = months.slice(6)

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
                        {firstHalfMonths.map((month, index) => (
                            <button
                                key={index}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading || exporting}
                            >
                                {loading || exporting ? "Generating..." : month}
                            </button>
                        ))}
                    </div>
                    <div className="button-column">
                        {secondHalfMonths.map((month, index) => (
                            <button
                                key={index + 6}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading || exporting}
                            >
                                {loading || exporting ? "Generating..." : month}
                            </button>
                        ))}
                    </div>
                </div>

                {(loading || exporting) && (
                    <div className="loading-text">
                        {loading ? "Fetching data..." : "Generating Excel..."}
                    </div>
                )}
            </div>
        </div>
    )
}

export default VatReconReportPage
