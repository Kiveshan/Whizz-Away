"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../../../../api";
import "../css/SubcontractorStatementDetail.css";
import html2pdf from "html2pdf.js";

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
    if (isGenerating) return;
    setIsGenerating(true);

    // Hide action buttons during PDF generation
    const actionButtons = document.querySelector(".statement-actions");
    if (actionButtons) {
      actionButtons.style.display = "none";
    }

    requestAnimationFrame(() => {
      const element = statementRef.current;
      const filename = `Subcontractor-Statement-${statementId}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          letterRendering: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsGenerating(false);
          // Show action buttons again
          if (actionButtons) {
            actionButtons.style.display = "flex";
          }
        })
        .catch((error) => {
          console.error("PDF generation error:", error);
          setIsGenerating(false);
          // Show action buttons again
          if (actionButtons) {
            actionButtons.style.display = "flex";
          }
        });
    });
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
            {isGenerating ? "Generating PDF..." : "📄 Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorStatementDetail;
