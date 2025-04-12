"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../finance clerkpages/css/ClientStatement.css";

const ClientStatement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { statementId } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAgeAnalysisOpen, setIsAgeAnalysisOpen] = useState(true);
  // NEW: Add state for PDF generation
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!statementId) {
      setError("No statement selected");
      setLoading(false);
      return;
    }

    const fetchStatement = async () => {
      try {
        const response = await fetch(`/api/statement/${statementId}`);
        if (!response.ok) throw new Error("Failed to fetch statement");
        const data = await response.json();

        if (data.success) {
          setStatement(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch statement");
        }
      } catch (err) {
        console.error("Error fetching statement:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [statementId]);

  if (loading) return <div>Loading statement...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!statement) return <div>Please select a statement from the list.</div>;

  // Calculate totals (invoices only for now)
  const invoicedAmount = statement.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const openingBalance = 0; // No payment data yet
  const amountPaid = 0; // No payment data yet
  const balanceDue = invoicedAmount;

  const handleDownloadPDF = async () => {
    // NEW: Prevent spam clicks
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/statement/${statement.statement_key}/pdf`, {
        method: 'GET',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement_${statement.statement_key}.pdf`;
      document.body.appendChild(link); // Ensure link is in DOM
      link.click();
      document.body.removeChild(link); // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Failed to download PDF: ${error.message}`);
    } finally {
      // NEW: Reset generating state
      setIsGenerating(false);
    }
  };

  return (
    <div className="statement-page">
      <div className="statement-paper">
        {/* Header */}
        <div className="statement-header1">
          <h1>Transport and Logistics</h1>
        </div>

        {/* Statement Info and Client Info Section */}
        <div className="statement-info-section">
          {/* Client Info - Left Side */}
          <div className="client-info">
            <div className="to-label">To</div>
            <div className="client-name">{statement.client.representative}</div>
            <div className="client-email">{statement.client.email}</div>
            <div className="client-phone">{statement.client.phone}</div>
            <div className="client-address">{statement.client.address}</div>
          </div>

          {/* Statement Title and Account Summary - Right Side */}
          <div className="statement-title">
            <h2>Statement of Accounts</h2>
            <div className="statement-date">
              {new Date(statement.generation_date).toLocaleDateString()}
            </div>

            <h3>Account Summary</h3>

            <table className="summary-table">
              <tbody>
                <tr>
                  <td className="summary-label">Opening Balance</td>
                  <td className="summary-value">R{openingBalance.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="summary-label">Invoiced Amount</td>
                  <td className="summary-value">R{invoicedAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="summary-label">Amount Paid</td>
                  <td className="summary-value">R{amountPaid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="summary-label">Balance Due:</td>
                  <td className="summary-value">R{balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Horizontal Line */}
        <div className="statement-divider"></div>

        {/* Transactions Table */}
        <div className="transactions-section">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transactions</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Payments</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{new Date(statement.generation_date).toLocaleDateString()}</td>
                <td>Opening Balance</td>
                <td></td>
                <td>R0</td>
                <td></td>
                <td>R0</td>
              </tr>
              {statement.invoices.map((invoice) => (
                <tr key={invoice.ikey}>
                  <td>{new Date(invoice.date).toLocaleDateString()}</td>
                  <td>Invoice</td>
                  <td>{invoice.task || invoice.invoice_num || `Invoice #${invoice.ikey}`}</td>
                  <td>R{invoice.amount.toFixed(2)}</td>
                  <td></td>
                  <td>
                    R{(statement.invoices
                      .slice(0, statement.invoices.indexOf(invoice) + 1)
                      .reduce((sum, inv) => sum + inv.amount, 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Balance Due Summary */}
        <div className="balance-due-summary">
          <div className="balance-due-label">Balance Due</div>
          <div className="balance-due-amount">R{balanceDue.toFixed(2)}</div>
        </div>

        {/* Age Analysis */}
        <div className="age-analysis-section">
          <div className="age-analysis-header" onClick={() => setIsAgeAnalysisOpen(!isAgeAnalysisOpen)}>
            <span>Age Analysis</span>
            <span className={`dropdown-arrow ${isAgeAnalysisOpen ? "open" : ""}`}>▼</span>
          </div>

          {isAgeAnalysisOpen && (
            <div className="age-analysis-content">
              <table className="age-analysis-table">
                <thead>
                  <tr>
                    <th>Current</th>
                    <th>30 Days</th>
                    <th>60 Days</th>
                    <th>90 Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>R{statement.aging.current.toFixed(2)}</td>
                    <td>R{statement.aging["30days"].toFixed(2)}</td>
                    <td>R{statement.aging["60days"].toFixed(2)}</td>
                    <td>R{statement.aging["90days"].toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="statementdownloadbtn1">
        <button className="back-btn" onClick={() => navigate("/statements-list")}>Back</button>
        {/* MODIFIED: Add indicator and spam prevention */}
        <button
          className={`download-btn ${isGenerating ? 'generating' : ''}`}
          onClick={handleDownloadPDF}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Download'}
        </button>
      </div>
    </div>
  );
};

export default ClientStatement;