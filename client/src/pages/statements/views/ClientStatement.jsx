"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../css/ClientStatement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
          console.log("Addons data:", response.data.data.addons); // Debug log for addons
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

  // Generate PDF using jsPDF for consistent formatting
  const generatePDF = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Theme similar to ClientInvoice
      const brand = {
        primary: [45, 55, 72],
        accent: [70, 130, 180],
        gray: [110, 120, 140],
      };
      const fonts = { title: 16, header: 12, normal: 10, small: 9, tiny: 8 };
      const margins = { left: 10, right: 10, top: 10 };
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = margins.top;

      // Header band
      doc.setFillColor(...brand.primary);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fonts.title);
      doc.text(statement.company_name || "", margins.left, 12);
      doc.setFontSize(fonts.header);
      doc.setFont('helvetica', 'normal');
      doc.text('STATEMENT OF ACCOUNT', pageWidth - margins.right, 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      currentY = 18 + 6;

      // Two-column From / To
      const colGap = 8;
      const colWidth = (pageWidth - margins.left - margins.right - colGap) / 2;
      doc.setFontSize(fonts.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brand.gray);
      doc.text('FROM', margins.left, currentY);
      doc.text('TO', margins.left + colWidth + colGap, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      currentY += 5;

      const leftDetails = [
        statement.company_name,
      ].filter(Boolean);

      const rightDetails = [
        statement.client.name,
        statement.client.email,
        statement.client.phone,
        statement.client.address,
      ].filter(Boolean);

      const maxLines = Math.max(leftDetails.length, rightDetails.length);
      for (let i = 0; i < maxLines; i++) {
        if (leftDetails[i]) doc.text(String(leftDetails[i]), margins.left, currentY);
        if (rightDetails[i]) doc.text(String(rightDetails[i]), margins.left + colWidth + colGap, currentY);
        currentY += 5;
      }
      currentY += 4;

      // Statement meta row
      doc.setFontSize(fonts.normal);
      const metaLeft = `Statement #: ${statement.statement_key}`;
      const metaRight = `Date: ${new Date(statement.generation_date).toLocaleDateString('en-GB')}`;
      doc.text(metaLeft, margins.left, currentY);
      doc.text(metaRight, pageWidth - margins.right, currentY, { align: 'right' });
      currentY += 8;

      // Account Summary table
      const openingBalance = statement.opening_balance;
      const invoicedAmount = statement.invoices.reduce((s, i) => s + i.amount, 0) + statement.addons.reduce((s, a) => s + a.amount, 0);
      const amountPaid = statement.payments.reduce((s, p) => s + p.amount, 0);
      const creditNotesAmount = (statement.credit_notes || []).reduce((s, c) => s + c.amount, 0);
      const totalAmountPaid = amountPaid + creditNotesAmount;
      const balanceDue = openingBalance - totalAmountPaid + invoicedAmount;

      autoTable(doc, {
        startY: currentY,
        head: [["Description", "Amount"]],
        body: [
          ["Opening Balance", `R${openingBalance.toFixed(2)}`],
          ["Invoiced Amount", `R${invoicedAmount.toFixed(2)}`],
          ["Amount Paid", `R${totalAmountPaid.toFixed(2)}`],
          ["Balance Due", `R${balanceDue.toFixed(2)}`],
        ],
        theme: "grid",
        styles: { fontSize: fonts.small, cellPadding: 1.6, lineWidth: 0.1, lineColor: brand.gray },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
        margin: { left: margins.left, right: margins.right },
      });
      currentY = doc.lastAutoTable.finalY + 6;

      // Transactions table
      const txRows = transactionsWithBalance.map(tx => ([
        tx.date.toLocaleDateString('en-GB'),
        tx.type,
        tx.details || "",
        tx.reference || "",
        tx.amount ? `R${tx.amount.toFixed(2)}` : "",
        tx.payment ? `R${tx.payment.toFixed(2)}` : "",
        `R${tx.balance.toFixed(2)}`,
      ]));

      autoTable(doc, {
        startY: currentY,
        head: [["Date", "Transaction", "Details", "Reference", "Amount", "Payment", "Balance"]],
        body: [
          [new Date(statement.generation_date).toLocaleDateString('en-GB'), "Opening Balance", "", "", "R0", "", `R${openingBalance.toFixed(2)}`],
          ...txRows,
        ],
        theme: "grid",
        styles: { fontSize: fonts.tiny, cellPadding: 1.2, lineWidth: 0.1, lineColor: brand.gray },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 22 },
          2: { cellWidth: 52 },
          3: { cellWidth: 28 },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 22, halign: 'right' },
        },
        margin: { left: margins.left, right: margins.right },
        rowPageBreak: 'auto',
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(str, pageWidth - margins.right, pageHeight - 6, { align: 'right' });
        },
      });

      currentY = doc.lastAutoTable.finalY + 6;

      // Age Analysis table
      autoTable(doc, {
        startY: currentY,
        head: [["Current", "30 Days", "60 Days", "90+ Days"]],
        body: [[
          `R${statement.aging.current.toFixed(2)}`,
          `R${statement.aging["30days"].toFixed(2)}`,
          `R${statement.aging["60days"].toFixed(2)}`,
          `R${statement.aging["90days"].toFixed(2)}`,
        ]],
        theme: "grid",
        styles: { fontSize: fonts.small, cellPadding: 1.6, lineWidth: 0.1, lineColor: brand.gray },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        margin: { left: margins.left, right: margins.right },
      });

      // Save
      const fileName = `Statement-${statement.statement_key}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
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
  if (
    statement.invoices.length === 0 &&
    statement.addons.length === 0 &&
    statement.payments.length === 0 &&
    statement.credit_notes?.length === 0
  )
    return (
      <div className="client-statement-wrapper">
        <div>No transactions for this statement period.</div>
      </div>
    );

  // Calculate totals (include payments and credit notes)
  const invoicedAmount =
    statement.invoices.reduce((sum, inv) => sum + inv.amount, 0) +
    statement.addons.reduce((sum, addon) => sum + addon.amount, 0);
  const amountPaid = statement.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const creditNotesAmount =
    statement.credit_notes?.reduce(
      (sum, creditNote) => sum + creditNote.amount,
      0
    ) || 0;
  const totalAmountPaid = amountPaid + creditNotesAmount;
  const openingBalance = statement.opening_balance; // Use the stored opening balance
  const balanceDue = openingBalance - totalAmountPaid + invoicedAmount;

  // Helper function to format invoice and addon details
  const formatDetails = (item, type) => {
    if (type === "Invoice") {
      const pickup = item.pickup || "";
      const dropoff = item.dropoff || "";
      console.log("Invoice details:", { pickup, dropoff, item }); // Debug log
      if (pickup && dropoff) {
        return `${pickup} → ${dropoff}`;
      } else if (pickup) {
        return pickup;
      } else if (dropoff) {
        return `→ ${dropoff}`;
      } else {
        return item.task || item.invoice_num || `Invoice #${item.ikey}`;
      }
    } else if (type === "Add-on") {
      console.log("Addon details:", { item }); // Debug log
      return item.description || item.invoice_num || `Add-on #${item.addon_id}`;
    } else if (type === "Credit Note") {
      console.log("Credit Note details:", { item }); // Debug log
      return item.description || `Credit Note #${item.credit_note_id}`;
    }
    return "";
  };

  // Combine invoices, addons, payments, and credit notes into a single transactions array
  const transactions = [
    ...statement.invoices.map((invoice) => ({
      type: "Invoice",
      date: new Date(invoice.date),
      details: formatDetails(invoice, "Invoice"),
      reference: "", // Invoices don't have references
      amount: invoice.amount,
      payment: null,
    })),
    ...statement.addons.map((addon) => ({
      type: "Add-on",
      date: new Date(addon.date),
      details: formatDetails(addon, "Add-on"),
      reference: "", // Add-ons don't have references
      amount: addon.amount,
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
    ...(statement.credit_notes || []).map((creditNote) => {
      console.log("Processing credit note:", creditNote); // Debug log
      return {
        type: "Credit Note",
        date: new Date(creditNote.date),
        details: formatDetails(creditNote, "Credit Note"),
        reference: creditNote.reference || "", // Credit note reference
        amount: null,
        payment: creditNote.amount, // Credit notes reduce the balance like payments
      };
    }),
  ].sort((a, b) => a.date - b.date); // Sort by date

  // Calculate running balance
  let runningBalance = openingBalance; // Start with the opening balance
  const transactionsWithBalance = transactions.map((tx) => {
    if (tx.type === "Invoice" || tx.type === "Add-on") {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.payment;
    }
    return { ...tx, balance: runningBalance };
  });

  // Determine if this is a small table that should fit on one page
  const isSmallTable = transactions.length <= 3; // Update to consider total transactions

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
                    <td className="summary-value">
                      R{totalAmountPaid.toFixed(2)}
                    </td>
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
