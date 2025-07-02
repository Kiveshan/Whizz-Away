"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../css/ClientStatement.css";
import html2pdf from "html2pdf.js";
import TransactionsTableWrapper from "./TransactionsTableWrapper.jsx";
import api from "../../../api"; // Import the axios instance

const ClientStatement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { statementId } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAgeAnalysisOpen, setIsAgeAnalysisOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Add ref for PDF generation
  const statementRef = useRef(null);
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;
  console.log(roleId);

  useEffect(() => {
    if (!statementId) {
      setError("No statement selected");
      setLoading(false);
      return;
    }

    const fetchStatement = async () => {
      try {
        // Use axios instead of fetch
        const response = await api.get(`/api/statement/${statementId}`);

        if (response.data.success) {
          console.log("Statement data received:", response.data.data); // Debug log
          console.log("Invoices data:", response.data.data.invoices); // Debug log for invoices
          console.log("Payments data:", response.data.data.payments); // Debug log for payments
          setStatement(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch statement");
        }
      } catch (err) {
        console.error("Error fetching statement:", err);

        let errorMessage = "Failed to fetch statement";

        if (err.response) {
          const { status, data } = err.response;

          if (status === 401 || status === 403) {
            // Handle unauthorized or forbidden
            navigate("/");
            return;
          }

          errorMessage = data?.message || `HTTP error! Status: ${status}`;
        } else if (err.request) {
          errorMessage =
            "No response received from server. Please check your connection.";
        } else {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [statementId, navigate]);

  // Update the generatePDF function to better handle page breaks and avoid blank pages
  const generatePDF = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    // Use requestAnimationFrame for better browser compatibility
    requestAnimationFrame(() => {
      const element = statementRef.current;
      const filename = `Statement-${statement.statement_key}.pdf`;

      // Check if the table is small (few rows) to determine if we need page breaks
      const isSmallTable = statement.invoices.length <= 3;

      const opt = {
        margin: [20, 15, 20, 15],
        filename: filename,
        image: { type: "png", quality: 0.98 },
        html2canvas: {
          scale: 1.2, // Reduced scale for better fit
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.offsetHeight,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          // Only add page breaks for large tables
          after: isSmallTable ? [] : [".transactions-section"],
        },
      };

      // Add CSS to handle page breaks properly
      const style = document.createElement("style");
      style.innerHTML = `
      @media print {
        .statement-info-section { page-break-inside: avoid; }
        .transactions-section { page-break-inside: avoid; }
        .age-analysis-section { page-break-inside: avoid; }
        table { page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
        td { page-break-inside: avoid; }
        th { page-break-inside: avoid; }
        .transactions-table { font-size: 11px; }
        
        /* Remove forced page breaks for small tables */
        ${
          isSmallTable
            ? `
        .transactions-section {
          page-break-after: auto !important;
        }
        .age-analysis-section {
          page-break-before: auto !important;
        }
        `
            : ""
        }
      }
    `;
      document.head.appendChild(style);

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          document.head.removeChild(style); // Clean up the added style
          setIsGenerating(false);
        })
        .catch((error) => {
          document.head.removeChild(style); // Clean up the added style
          console.error("PDF generation error:", error);
          setIsGenerating(false);
        });
    });
  };

  if (loading)
    return (
      <div className="client-statement-wrapper">
        <div>Loading statement...</div>
      </div>
    );
  if (error)
    return (
      <div className="client-statement-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!statement)
    return (
      <div className="client-statement-wrapper">
        <div>Please select a statement from the list.</div>
      </div>
    );
  if (statement.invoices.length === 0 && statement.payments.length === 0)
    return (
      <div className="client-statement-wrapper">
        <div>No transactions for this statement period.</div>
      </div>
    );

  // Calculate totals (include payments)
  const invoicedAmount = statement.invoices.reduce(
    (sum, inv) => sum + inv.amount,
    0
  );
  const amountPaid = statement.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const openingBalance = statement.opening_balance; // Use the stored opening balance
  const balanceDue = openingBalance - amountPaid + invoicedAmount;

  // Helper function to format pickup + dropoff details
  const formatInvoiceDetails = (invoice) => {
    const pickup = invoice.pickup || "";
    const dropoff = invoice.dropoff || "";

    // Debug log to see what we're working with
    console.log("Invoice details:", { pickup, dropoff, invoice });

    if (pickup && dropoff) {
      return `${pickup} → ${dropoff}`;
    } else if (pickup) {
      return pickup;
    } else if (dropoff) {
      return `→ ${dropoff}`;
    } else {
      // Fallback to task or invoice number if pickup/dropoff are empty
      return invoice.task || invoice.invoice_num || `Invoice #${invoice.ikey}`;
    }
  };

  // Combine invoices and payments into a single transactions array
  const transactions = [
    ...statement.invoices.map((invoice) => ({
      type: "Invoice",
      date: new Date(invoice.date),
      details: formatInvoiceDetails(invoice), // Use the helper function
      reference: "", // Invoices don't have references
      amount: invoice.amount,
      payment: null,
    })),
    ...statement.payments.map((payment) => {
      console.log("Processing payment:", payment); // Debug log
      return {
        type: "Payment",
        date: new Date(payment.date),
        details: payment.invoice_num || "", // Use invoice number, empty if no match
        reference: payment.reference || "", // Payment reference from the database
        amount: null,
        payment: payment.amount,
      };
    }),
  ].sort((a, b) => a.date - b.date); // Sort by date

  // Debug log for transactions
  console.log("Final transactions array:", transactions);

  // Calculate running balance
  let runningBalance = openingBalance; // Start with the opening balance
  const transactionsWithBalance = transactions.map((tx) => {
    if (tx.type === "Invoice") {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.payment;
    }
    return { ...tx, balance: runningBalance };
  });

  // Determine if this is a small table that should fit on one page
  const isSmallTable = transactions.length <= 3; // Update to consider total transactions

  // Update the date formatting in the transactions table to ensure it fits in the column
  return (
    <div className="client-statement-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          {/* Header */}
          <div className="statement-header1">
            <h1>{statement.company_name}</h1>
          </div>

          {/* Statement Info and Client Info Section */}
          <div className="statement-info-section">
            {/* Client Info - Left Side */}
            <div className="client-info">
              <div className="to-label">To</div>
              <div className="client-name">
                {statement.client.representative}
              </div>
              <div className="client-email">{statement.client.email}</div>
              <div className="client-phone">{statement.client.phone}</div>
              <div
                className="client-address"
                style={{ maxWidth: "250px", overflowWrap: "break-word" }}
              >
                {statement.client.address}
              </div>
            </div>

            {/* Statement Title and Account Summary - Right Side */}
            <div className="statement-title">
              <h2>Statement of Accounts</h2>
              <div className="statement-date">
                {new Date(statement.generation_date).toLocaleDateString(
                  "en-GB"
                )}
              </div>

              <h3>Account Summary</h3>

              <table className="summary-table">
                <tbody>
                  <tr>
                    <td className="summary-label">Opening Balance</td>
                    <td className="summary-value">
                      R{openingBalance.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="summary-label">Invoiced Amount</td>
                    <td className="summary-value">
                      R{invoicedAmount.toFixed(2)}
                    </td>
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

          {/* Transactions Table - Now wrapped with TransactionsTableWrapper */}
          <div
            className={`transactions-section ${
              isSmallTable ? "small-table" : ""
            }`}
          >
            <TransactionsTableWrapper>
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>Date</th>
                    <th style={{ width: "15%" }}>Transactions</th>
                    <th style={{ width: "25%" }}>Details</th>
                    <th style={{ width: "15%" }}>Reference</th>
                    <th style={{ width: "12%" }}>Amount</th>
                    <th style={{ width: "12%" }}>Payments</th>
                    <th style={{ width: "12%" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {new Date(statement.generation_date).toLocaleDateString(
                        "en-GB"
                      )}
                    </td>
                    <td>Opening Balance</td>
                    <td></td>
                    <td></td>
                    <td>R0</td>
                    <td></td>
                    <td>R{openingBalance.toFixed(2)}</td>
                  </tr>
                  {transactionsWithBalance.map((tx, index) => (
                    <tr key={index}>
                      <td>{tx.date.toLocaleDateString("en-GB")}</td>
                      <td>{tx.type}</td>
                      <td>{tx.details}</td>
                      <td>{tx.reference || ""}</td>
                      <td>{tx.amount ? `R${tx.amount.toFixed(2)}` : ""}</td>
                      <td>{tx.payment ? `R${tx.payment.toFixed(2)}` : ""}</td>
                      <td>R{tx.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TransactionsTableWrapper>
          </div>

          {/* Balance Due Summary */}
          <div className="balance-due-summary">
            <div className="balance-due-label">Balance Due</div>
            <div className="balance-due-amount">R{balanceDue.toFixed(2)}</div>
          </div>

          {/* Age Analysis */}
          <div
            className={`age-analysis-section ${
              isSmallTable ? "small-table" : ""
            }`}
          >
            <div
              className="age-analysis-header"
              onClick={() => setIsAgeAnalysisOpen(!isAgeAnalysisOpen)}
            >
              <span>Age Analysis</span>
              <span
                className={`dropdown-arrow ${isAgeAnalysisOpen ? "open" : ""}`}
              >
                ▼
              </span>
            </div>

            {isAgeAnalysisOpen && (
              <div className="age-analysis-content">
                <table className="age-analysis-table">
                  <thead>
                    <tr>
                      <th>Current</th>
                      <th>30 Days</th>
                      <th>60 Days</th>
                      <th>90 Days + </th>
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
          <button
            className="back-btn"
            onClick={() => {
              if (roleId == 3) {
                navigate("/statements-list", {
                  state: { clientId: statement.client.id },
                });
              } else if (roleId == 4) {
                navigate("/DirectorClientDocuments", {
                  state: {
                    clientId: statement.client.id,
                    clientName: statement.client.name,
                  },
                });
              } else if (roleId == 1) {
                navigate("/client-documents", {
                  state: {
                    clientId: statement.client.id,
                    clientName: statement.client.name,
                  },
                });
              }
            }}
          >
            Back
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

export default ClientStatement;
