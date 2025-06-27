"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../../../../api";
import "../css/SubcontractorStatementDetail.css";
import html2pdf from "html2pdf.js";

const SubcontractorStatementDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Received state:", location.state); // Debug log
  const {
    statementId,
    subcontractorName,
    subcontractorId,
    subei_reg_num,
    legids,
  } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
        // Parse legids string to extract legkey values
        let legKeys;
        try {
          const parsedLegids = JSON.parse(legids);
          legKeys = parsedLegids.map((item) => item.legkey); // Extract only legkey
          console.log("Parsed legKeys:", legKeys); // Debug log
        } catch (e) {
          console.error("Invalid legids JSON:", e, "Received:", legids);
          legKeys = []; // Fallback to empty array if parsing fails
        }

        if (legKeys.length === 0) {
          throw new Error("No valid leg keys found in legids");
        }

        // API call to fetch leg details
        const response = await api.get("/subcontractor/statement-details", {
          params: {
            statementId,
            legKeys: legKeys.join(","),
            subei_reg_num,
          },
        });
        console.log("Statement details response:", response.data); // Debug log

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

        // Calculate totals
        const totalAmount = workItems.reduce(
          (sum, item) => sum + (item.rate || 0),
          0
        );

        const companyInfo = {
          name: "Construction Management Pro",
          address: "123 Business Ave, Suite 100, City, State 12345",
          phone: "+1 (555) 000-0000",
          email: "billing@constructionpro.com",
        };

        setStatement({
          statementId,
          subcontractorName,
          subcontractorId,
          generationDate: new Date(),
          workItems,
          companyInfo,
          summary: {
            totalAmount,
            taxRate: 0.15,
            taxAmount: totalAmount * 0.15,
            finalAmount: totalAmount + totalAmount * 0.15,
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

    requestAnimationFrame(() => {
      const element = statementRef.current;
      const filename = `Subcontractor-Statement-${statementId}.pdf`;

      const opt = {
        margin: [20, 15, 20, 15],
        filename: filename,
        image: { type: "png", quality: 0.98 },
        html2canvas: { scale: 1.2, useCORS: true, scrollY: 0, scrollX: 0 },
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
        .then(() => setIsGenerating(false))
        .catch((error) => {
          console.error("PDF generation error:", error);
          setIsGenerating(false);
        });
    });
  };

  if (loading)
    return (
      <div className="statement-detail-wrapper">
        <div>Loading statement details...</div>
      </div>
    );
  if (error)
    return (
      <div className="statement-detail-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!statement)
    return (
      <div className="statement-detail-wrapper">
        <div>Please select a statement from the list.</div>
      </div>
    );

  return (
    <div className="statement-detail-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          <div className="statement-header">
            <h1>{statement.companyInfo.name}</h1>
            <div className="company-details">
              <p>{statement.companyInfo.address}</p>
              <p>
                Phone: {statement.companyInfo.phone} | Email:{" "}
                {statement.companyInfo.email}
              </p>
            </div>
          </div>

          <div className="statement-info-section">
            <div className="subcontractor-info">
              <div className="to-label">Bill To:</div>
              <div className="subcontractor-name">
                {statement.subcontractorName}
              </div>
              <div className="subcontractor-id">
                ID: {statement.subcontractorId}
              </div>
            </div>
            <div className="statement-details">
              <h2>Work Statement</h2>
              <div className="statement-meta">
                <p>
                  <strong>Statement ID:</strong> {statement.statementId}
                </p>
                <p>
                  <strong>Generated:</strong>{" "}
                  {statement.generationDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="statement-divider"></div>

          <div className="work-items-section">
            <h3>Work Completed</h3>
            <table className="work-items-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Starting</th>
                  <th>Destination</th>
                  <th>Rate</th>
                  <th>Instruction</th>
                </tr>
              </thead>
              <tbody>
                {statement.workItems.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.startingPoint}</td>
                    <td>{item.destination}</td>
                    <td>R{item.rate.toLocaleString()}</td>
                    <td>{item.instruction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="payment-summary">
            <div className="summary-details">
              <div className="summary-row total-row">
                <span>
                  <strong>Total Amount Due:</strong>
                </span>
                <span>
                  <strong>
                    R{statement.summary.finalAmount.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="statement-actions">
          <button
            className="back-btn"
            onClick={() =>
              navigate("/Creditors/SubcontractorStatements", {
                state: {
                  subcontractorId: statement.subcontractorId,
                  subcontractorName: statement.subcontractorName,
                },
              })
            }
          >
            Back to Statements
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
