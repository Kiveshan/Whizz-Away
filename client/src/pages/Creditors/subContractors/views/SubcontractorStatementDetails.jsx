"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../../../../api";
import jsPDF from "jspdf";
import "../css/SubcontractorStatementDetail.css";

const SubcontractorStatementDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Received state:", location.state);
  const {
    statementId,
    subcontractorName,
    subcontractorId,
    subei_reg_num,
    legids,
    date,
  } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [subcontractorInfo, setSubcontractorInfo] = useState(null);

  const statementRef = useRef(null);

  useEffect(() => {
    if (!statementId || !legids) {
      setError("No statement or leg data selected");
      setLoading(false);
      return;
    }

    const fetchStatementDetail = async () => {
      try {
        setLoading(true);
        let legKeys;
        try {
          const parsedLegids = JSON.parse(legids);
          legKeys = parsedLegids.map((item) => item.legkey);
          console.log("Parsed legKeys:", legKeys);
        } catch (e) {
          console.error("Invalid legids JSON:", e, "Received:", legids);
          legKeys = [];
        }

        if (legKeys.length === 0) {
          throw new Error("No valid leg keys found in legids");
        }

        const response = await api.get("/subcontractor/statement-details", {
          params: {
            statementId,
            legKeys: legKeys.join(","),
            subei_reg_num,
          },
        });
        console.log("Statement details response:", response.data);

        if (!response.data)
          throw new Error("Failed to fetch statement details");

        const workItems = response.data.map((leg) => ({
          id: leg.legkey,
          date: leg.date,
          startingPoint: leg.startingpoint,
          destination: leg.destination,
          rate: leg.driverrate || 0,
          instruction: leg.m1_description || "N/A",
        }));

        const totalAmount = workItems.reduce(
          (sum, item) => sum + (item.rate || 0),
          0
        );

        const companyResponse = await api.get("/subcontractor/company-info", {
          params: { roleid: 1, status: "active" },
        });
        const companyData = companyResponse.data[0] || {};
        setCompanyInfo({
          name: companyData.companyname || "Construction Management Pro",
          address:
            companyData.address ||
            "123 Business Ave, Suite 100, City, State 12345",
          phone: companyData.cell_num || "+1 (555) 000-0000",
          email: companyData.email || "billing@constructionpro.com",
        });

        const subResponse = await api.get("/subcontractor/info", {
          params: { subei_reg_num },
        });
        const subData = subResponse.data[0] || {};
        setSubcontractorInfo({
          name: subcontractorName,
          location: subData.location || "N/A",
          contact_person: subData.contact_person || "N/A",
        });

        setStatement({
          statementId,
          subcontractorName,
          subcontractorId,
          generationDate: date,
          workItems,
          summary: {
            totalAmount,
            finalAmount: totalAmount,
          },
        });
      } catch (err) {
        console.error("Error fetching statement detail:", err);
        setError(`Failed to fetch statement details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStatementDetail();
  }, [statementId, subcontractorId, subcontractorName, subei_reg_num, legids]);

  const generatePDF = () => {
    if (isGenerating || !statement || !companyInfo || !subcontractorInfo)
      return;
    setIsGenerating(true);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 10;
    const pageWidth = 210 - 2 * margin;
    let y = margin;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name, margin + pageWidth / 2, y, { align: "center" });
    y += 10;

    // Statement Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Statement #${statement.statementId}`, margin + pageWidth / 2, y, {
      align: "center",
    });
    y += 15;

    // Billing Information
    doc.setFontSize(12);
    doc.text("Bill To:", margin, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(subcontractorInfo.name, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(subcontractorInfo.location, margin, y);
    y += 5;
    doc.text(`Contact: ${subcontractorInfo.contact_person}`, margin, y);
    y += 5;

    doc.text("Statement Date:", margin + pageWidth - 40, y, { align: "right" });
    doc.text(
      new Date(statement.generationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      margin + pageWidth,
      y,
      { align: "right" }
    );
    y += 5;
    doc.text("Subcontractor ID:", margin + pageWidth - 40, y, {
      align: "right",
    });
    doc.text(statement.subcontractorId, margin + pageWidth, y, {
      align: "right",
    });
    y += 10;

    // Work Completed Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Work Completed", margin, y);
    y += 5;

    const tableHeaders = [
      "Date",
      "Starting Point",
      "Destination",
      "Rate",
      "Instructions",
    ];
    const tableY = y;
    const colWidths = [25, 40, 40, 25, 50]; // Adjusted widths to ensure Rate column is distinct
    let x = margin;

    // Draw table headers
    doc.setFillColor(44, 90, 160); // Blue gradient start color
    doc.rect(margin, y, pageWidth, 8, "F");
    x = margin;
    tableHeaders.forEach((header, index) => {
      doc.setTextColor(255, 255, 255);
      doc.text(header, x + colWidths[index] / 2, y + 5, { align: "center" });
      x += colWidths[index];
    });
    y += 8;

    // Draw table rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    statement.workItems.forEach((item, index) => {
      x = margin;
      const isEven = index % 2 === 0;
      if (isEven) doc.setFillColor(248, 250, 252);
      else doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, pageWidth, 8, "F");

      doc.text(
        new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        x + colWidths[0] / 2,
        y + 5,
        { align: "center" }
      );
      x += colWidths[0];
      doc.text(item.startingPoint, x + colWidths[1] / 2, y + 5, {
        align: "center",
      });
      x += colWidths[1];
      doc.text(item.destination, x + colWidths[2] / 2, y + 5, {
        align: "center",
      });
      x += colWidths[2];
      doc.text(`R${item.rate.toFixed(2)}`, x + colWidths[3] / 2, y + 5, {
        align: "center",
      }); // Right-aligned under Rate
      x += colWidths[3];
      doc.text(item.instruction, x + colWidths[4] / 2, y + 5, {
        align: "center",
      });
      y += 8;

      if (y > 280) {
        // New page if nearing bottom
        doc.addPage();
        y = margin;
        doc.setFillColor(44, 90, 160);
        doc.rect(margin, y, pageWidth, 8, "F");
        x = margin;
        tableHeaders.forEach((header, index) => {
          doc.setTextColor(255, 255, 255);
          doc.text(header, x + colWidths[index] / 2, y + 5, {
            align: "center",
          });
          x += colWidths[index];
        });
        y += 8;
      }
    });
    y += 5;

    // Payment Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    y += 5;
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.setFontSize(16); // Increased font size for Total Amount Due
    doc.text(
      `Total Amount Due: R${statement.summary.finalAmount.toFixed(2)}`,
      margin + pageWidth - 40,
      y,
      { align: "right" }
    );
    y += 5;
    doc.setFontSize(12);
    doc.setDrawColor(44, 90, 160);
    doc.line(margin, y, margin + pageWidth, y, "S"); // Line below Total Amount Due
    y += 5;

    // Footer
    doc.setFontSize(10);

    // Save PDF
    doc.save(`Subcontractor-Statement-${statementId}.pdf`);
    setIsGenerating(false);
  };

  if (loading)
    return (
      <div className="statement-detail-wrapper">
        <div className="loading-message">Loading statement details...</div>
      </div>
    );
  if (error)
    return (
      <div className="statement-detail-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!statement || !companyInfo || !subcontractorInfo)
    return (
      <div className="statement-detail-wrapper">
        <div className="loading-message">
          Please select a statement from the list.
        </div>
      </div>
    );

  return (
    <div className="statement-detail-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          {/* Professional Header */}
          <div className="statement-header">
            <div className="company-logo-section">
              <h1 className="company-name">{companyInfo.name}</h1>
            </div>
          </div>

          {/* Statement Title */}
          <div className="statement-title-section">
            <div className="statement-number">Statement #{statementId}</div>
          </div>

          {/* Billing Information */}
          <div className="billing-section">
            <div className="billing-info">
              <div className="billing-header">Bill To:</div>
              <div className="subcontractor-details">
                <div className="subcontractor-name">
                  {subcontractorInfo.name}
                </div>
                <div className="subcontractor-address">
                  {subcontractorInfo.location}
                </div>
                <div className="contact-person">
                  <span className="label">Contact:</span>{" "}
                  {subcontractorInfo.contact_person}
                </div>
              </div>
            </div>
            <div className="statement-meta">
              <div className="meta-row">
                <span className="meta-label">Statement Date:</span>
                <span className="meta-value">
                  {new Date(statement.generationDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Subcontractor ID:</span>
                <span className="meta-value">{subcontractorId}</span>
              </div>
            </div>
          </div>

          {/* Work Items Table */}
          <div className="work-items-section">
            <h3 className="section-title">Work Completed</h3>
            <div className="table-container">
              <table className="work-items-table">
                <thead>
                  <tr>
                    <th className="col-date">Date</th>
                    <th className="col-starting">Starting Point</th>
                    <th className="col-destination">Destination</th>
                    <th className="col-rate">Rate</th>
                    <th className="col-instruction">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.workItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index % 2 === 0 ? "row-even" : "row-odd"}
                    >
                      <td className="col-date">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="col-starting">{item.startingPoint}</td>
                      <td className="col-destination">{item.destination}</td>
                      <td className="col-rate">
                        R
                        {item.rate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="col-instruction">{item.instruction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="payment-summary-section">
            <div className="summary-container">
              <div className="summary-header">Payment Summary</div>
              <div className="summary-content">
                <div className="summary-row subtotal-row">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-value">
                    R
                    {statement.summary.totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row total-row">
                  <span className="summary-label">Total Amount Due:</span>
                  <span className="summary-value">
                    R
                    {statement.summary.finalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="statement-footer">
            <div className="footer-text">
              Thank you for your professional services and continued
              partnership.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="statement-actions">
          <button
            className="back-btn"
            onClick={() =>
              navigate("/Creditors/SubcontractorStatements", {
                state: {
                  subcontractorId: statement.subcontractorId,
                  subcontractorName: statement.subcontractorName,
                  subei_reg_num: subei_reg_num,
                },
              })
            }
          >
            ← Back to Statements
          </button>
          <button
            className={`download-btn ${isGenerating ? "generating" : ""}`}
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorStatementDetail;
