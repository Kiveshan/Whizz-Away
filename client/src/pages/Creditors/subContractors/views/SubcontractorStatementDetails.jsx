"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../css/SubcontractorStatementDetail.css";
import html2pdf from "html2pdf.js";

const SubcontractorStatementDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { statementId, subcontractorName, subcontractorId } =
    location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Add ref for PDF generation
  const statementRef = useRef(null);

  useEffect(() => {
    if (!statementId) {
      setError("No statement selected");
      setLoading(false);
      return;
    }

    const fetchStatementDetail = async () => {
      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate dummy detailed statement data
        const dummyStatement = {
          statementId: statementId,
          subcontractorName: subcontractorName,
          subcontractorId: subcontractorId,
          generationDate: new Date(),
          month: "December",
          year: 2024,
          workItems: [
            {
              id: 1,
              date: "2024-12-05",
              projectName: "Downtown Office Complex",
              description: "Electrical installation - Phase 1",
              hoursWorked: 40,
              hourlyRate: 85,
              materialCost: 2500,
              totalAmount: 5900,
            },
            {
              id: 2,
              date: "2024-12-12",
              projectName: "Residential Building A",
              description: "Wiring and panel installation",
              hoursWorked: 32,
              hourlyRate: 85,
              materialCost: 1800,
              totalAmount: 4520,
            },
            {
              id: 3,
              date: "2024-12-18",
              projectName: "Shopping Center Renovation",
              description: "Emergency lighting system",
              hoursWorked: 24,
              hourlyRate: 90,
              materialCost: 3200,
              totalAmount: 5360,
            },
            {
              id: 4,
              date: "2024-12-22",
              projectName: "Industrial Warehouse",
              description: "High voltage electrical work",
              hoursWorked: 48,
              hourlyRate: 95,
              materialCost: 4500,
              totalAmount: 9060,
            },
          ],
          companyInfo: {
            name: "Construction Management Pro",
            address: "123 Business Ave, Suite 100, City, State 12345",
            phone: "+1 (555) 000-0000",
            email: "billing@constructionpro.com",
          },
        };

        // Calculate totals
        const totalHours = dummyStatement.workItems.reduce(
          (sum, item) => sum + item.hoursWorked,
          0
        );
        const totalMaterials = dummyStatement.workItems.reduce(
          (sum, item) => sum + item.materialCost,
          0
        );
        const totalAmount = dummyStatement.workItems.reduce(
          (sum, item) => sum + item.totalAmount,
          0
        );

        dummyStatement.summary = {
          totalHours,
          totalMaterials,
          totalAmount,
          taxRate: 0.15,
          taxAmount: totalAmount * 0.15,
          finalAmount: totalAmount + totalAmount * 0.15,
        };

        setStatement(dummyStatement);
      } catch (err) {
        console.error("Error fetching statement detail:", err);
        setError("Failed to fetch statement details");
      } finally {
        setLoading(false);
      }
    };

    fetchStatementDetail();
  }, [statementId, subcontractorName, subcontractorId]);

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
        html2canvas: {
          scale: 1.2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
        },
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsGenerating(false);
        })
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
          {/* Header */}
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

          {/* Statement Info Section */}
          <div className="statement-info-section">
            {/* Subcontractor Info - Left Side */}
            <div className="subcontractor-info">
              <div className="to-label">Bill To:</div>
              <div className="subcontractor-name">
                {statement.subcontractorName}
              </div>
              <div className="subcontractor-id">
                ID: {statement.subcontractorId}
              </div>
            </div>

            {/* Statement Details - Right Side */}
            <div className="statement-details">
              <h2>Work Statement</h2>
              <div className="statement-meta">
                <p>
                  <strong>Statement ID:</strong> {statement.statementId}
                </p>
                <p>
                  <strong>Period:</strong> {statement.month} {statement.year}
                </p>
                <p>
                  <strong>Generated:</strong>{" "}
                  {statement.generationDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal Line */}
          <div className="statement-divider"></div>

          {/* Work Items Table */}
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
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {statement.workItems.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.projectName}</td>
                    <td>{item.description}</td>
                    <td>{item.hoursWorked}</td>
                    <td>R{item.materialCost.toLocaleString()}</td>
                    <td>R{item.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="payment-summary">
            <div className="summary-details">
              <div className="summary-row">
                <span>Total Hours Worked:</span>
                <span>{statement.summary.totalHours} hours</span>
              </div>
              <div className="summary-row">
                <span>Total Materials:</span>
                <span>
                  R{statement.summary.totalMaterials.toLocaleString()}
                </span>
              </div>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>R{statement.summary.totalAmount.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Tax (15%):</span>
                <span>R{statement.summary.taxAmount.toLocaleString()}</span>
              </div>
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

          {/* Payment Terms */}
          <div className="payment-terms">
            <h4>Payment Terms</h4>
            <p>
              Payment is due within 30 days of statement date. Late payments may
              incur additional charges.
            </p>
            <p>
              Please reference Statement ID: {statement.statementId} when making
              payment.
            </p>
          </div>
        </div>

        {/* Buttons */}
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
