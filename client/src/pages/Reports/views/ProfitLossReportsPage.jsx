"use client";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import api from "../../../api.js";

const ProfitLossDetailPage = () => {
    const { month, year } = useParams();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (month && year) {
            fetchReport();
        }
    }, [month, year]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get("/profit-loss-report", {
                params: { month, year },
            });
            setReportData(response.data);
        } catch (error) {
            console.error("Error fetching report:", error);
            alert(`Failed to fetch report: ${error.message}`);
        }
        setLoading(false);
    };

    const aggregateData = (details) => {
        const aggregated = details.reduce((acc, item) => {
            if (!acc[item.source]) {
                acc[item.source] = 0;
            }
            acc[item.source] += item.amount;
            return acc;
        }, {});
        return aggregated;
    };

    const downloadPDF = () => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        doc.setFontSize(16);
        doc.text("Profit & Loss Statement", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text(`For the Month of ${month} ${year}`, 105, 30, { align: "center" });

        let yPos = 50;

        // Revenue Section
        doc.setFontSize(14);
        doc.text("Revenue", 20, yPos);
        yPos += 10;

        doc.setFontSize(12);
        const profitAgg = aggregateData(reportData.profitDetails);
        Object.entries(profitAgg).forEach(([source, amount]) => {
            doc.text(source, 30, yPos);
            doc.text(`R ${amount.toFixed(2)}`, 150, yPos, { align: "right" });
            yPos += 8;
        });

        doc.setFont("bold");
        doc.text("Total Revenue", 30, yPos);
        doc.text(`R ${reportData.totalProfit.toFixed(2)}`, 150, yPos, { align: "right" });
        doc.setFont("normal");
        yPos += 15;

        // Expenses Section
        doc.setFontSize(14);
        doc.text("Expenses", 20, yPos);
        yPos += 10;

        doc.setFontSize(12);
        const lossAgg = aggregateData(reportData.lossDetails);
        Object.entries(lossAgg).forEach(([source, amount]) => {
            doc.text(source, 30, yPos);
            doc.text(`R ${amount.toFixed(2)}`, 150, yPos, { align: "right" });
            yPos += 8;
        });

        doc.setFont("bold");
        doc.text("Total Expenses", 30, yPos);
        doc.text(`R ${Math.abs(reportData.totalLoss).toFixed(2)}`, 150, yPos, { align: "right" });
        doc.setFont("normal");
        yPos += 15;

        // Net Profit/Loss
        doc.setFontSize(14);
        doc.text("Net Profit/Loss", 20, yPos);
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont("bold");
        const net = reportData.net;
        doc.text(`Net Profit/Loss: ${net >= 0 ? `R ${net.toFixed(2)}` : `R -${Math.abs(net).toFixed(2)}`}`, 30, yPos);
        doc.setFont("normal");

        doc.save(`Profit_Loss_Report_${month}_${year}.pdf`);
    };

    const handleBack = () => {
        navigate("/profit-loss-reports");
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
                <p>Loading Profit & Loss report for {month} {year}...</p>
            </div>
        );
    }

    if (!reportData) {
        return <div>No data available.</div>;
    }

    const profitAgg = aggregateData(reportData.profitDetails);
    const lossAgg = aggregateData(reportData.lossDetails);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <div className="header-actions">
                <button onClick={handleBack} className="back-button">
                    Back
                </button>
                <button onClick={downloadPDF} className="filter-button">
                    Download PDF
                </button>
            </div>

            <div id="profit-loss-report">
                <h1>Profit & Loss Statement</h1>
                <h3>
                    For the Month of {reportData.month} {reportData.year}
                </h3>
                <hr />

                <h2>Revenue</h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Description</th>
                            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd" }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(profitAgg).map(([source, amount], index) => (
                            <tr key={index}>
                                <td>{source}</td>
                                <td style={{ textAlign: "right" }}>R {amount.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: "bold" }}>
                            <td>Total Revenue</td>
                            <td style={{ textAlign: "right" }}>R {reportData.totalProfit.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <hr />

                <h2>Expenses</h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Description</th>
                            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd" }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(lossAgg).map(([source, amount], index) => (
                            <tr key={index}>
                                <td>{source}</td>
                                <td style={{ textAlign: "right" }}>R {amount.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: "bold" }}>
                            <td>Total Expenses</td>
                            <td style={{ textAlign: "right" }}>R {Math.abs(reportData.totalLoss).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <hr />

                <h2>Net Profit/Loss</h2>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    Net Profit/Loss: {reportData.net >= 0 ? `R ${reportData.net.toFixed(2)}` : `R -${Math.abs(reportData.net).toFixed(2)}`}
                </div>
            </div>
        </div>
    );
};

export default ProfitLossDetailPage;