"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import "../css/ClientStatement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../../api"; // Import the axios instance
import { Workbook } from "exceljs";
import {
  requestStatementExport,
  uploadStatementDocument,
  fetchStatementExports,
  saveBlob,
  openStoredDocument,
  formatRand,
} from "../services/statementExportService.js";

// The last day of the month a statement covers. generation_date is the 1st of
// the FOLLOWING month, so dating the Payments/Insurance rows by it put them
// outside the statement's own period (01/08 on a July statement).
const periodEndDate = (statement) => {
  const d = new Date(statement.generation_date);
  d.setDate(d.getDate() - 1);
  return d;
};

// "April 2026" — the month the statement covers.
const periodLabelOf = (statement) =>
  statement.period
    ? new Date(`${statement.period.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(
        "en-GB",
        { month: "long", year: "numeric", timeZone: "UTC" }
      )
    : null;

// The issuing company's address and registration lines, for the masthead.
const companyLinesOf = (statement) =>
  [
    [statement.cluster_box, statement.address, statement.suburb]
      .filter(Boolean)
      .join(", "),
    [
      statement.vat_reg_num && `VAT Reg No ${statement.vat_reg_num}`,
      statement.phonenumber && `Tel ${statement.phonenumber}`,
    ]
      .filter(Boolean)
      .join("  ·  "),
  ].filter(Boolean);

// How a client pays: the same five fields, with the same labels, as the banking
// details on the invoice, so the two documents never give different
// instructions. Blank fields are left out rather than printed empty.
const paymentDetailsOf = (statement) =>
  [
    ["Account Name", statement.name_of_acc],
    ["Bank Name", statement.bank],
    ["Account Number", statement.account_num],
    ["Branch Code", statement.branch_code],
    ["SWIFT Code", statement.swift_code],
  ].filter(([, value]) => value);

const ClientStatement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { statementKey } = location.state || {};

  // Statements are derived, so the identifier is "<clientId>-YYYY-MM"
  // rather than the retired statements.statement_key serial.
  const statementId = statementKey;

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transactionsState, setTransactionsState] = useState([]); // editable details
  const [isEditMode, setIsEditMode] = useState(false);

  // Export snapshots: every document produced from this statement, frozen at the
  // moment it was produced.
  const [exportHistory, setExportHistory] = useState([]);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState(false);

  // A statement's ledger can run long, so the on-screen table is searchable and
  // paged. Neither affects the figures: the balances are computed over the full
  // ordered ledger before any of this is applied, and exports render from the
  // server payload rather than from this view.
  const [txQuery, setTxQuery] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPerPage, setTxPerPage] = useState(50);

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

  // When statement changes, seed editable transaction state
  useEffect(() => {
    if (!statement) return;

    const referenceCollator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const compareReferenceAsc = (a, b) =>
      referenceCollator.compare(String(a || ""), String(b || ""));

    const openingBalance = statement.opening_balance;

    // Totals for the statement month (server already filtered by month)
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
    const totalMonthPayments = amountPaid + creditNotesAmount;
    const insuranceCredit = Number.parseFloat(
      statement.insurance_amount || 0
    );

    // Build a single aggregated Payments row, then list all invoices/add-ons for the statement month
    const charges = [
      ...statement.invoices.map((invoice) => ({
        type: "Invoice",
        date: new Date(invoice.date),
        details: invoice.formatted_details || "",
        reference: invoice.invoice_num || "",
        amount: invoice.amount,
        payment: null,
      })),
      ...statement.addons.map((addon) => ({
        type: "Invoice",
        date: new Date(addon.date),
        details: addon.formatted_details || "",
        reference: addon.addon_num || addon.invoice_num || "",
        amount: addon.amount,
        payment: null,
      })),
    ].sort((a, b) => {
      const refDiff = compareReferenceAsc(a.reference, b.reference);
      if (refDiff !== 0) return refDiff;
      return a.date - b.date;
    });

    const insuranceRow =
      insuranceCredit > 0
        ? {
            type: "Insurance",
            date: periodEndDate(statement),
            details: "Monthly insurance credit",
            reference: "",
            amount: null,
            payment: insuranceCredit,
          }
        : null;

    const paymentsRow = {
      type: "Payments",
      date: periodEndDate(statement),
      details: totalMonthPayments > 0 ? "Payments & credit notes" : "",
      reference: "",
      amount: null,
      payment: totalMonthPayments,
    };

    const baseTransactions = [
      ...(insuranceRow ? [insuranceRow] : []),
      paymentsRow,
      ...charges,
    ];

    let running = openingBalance;
    // __i is the row's position in the FULL ordered ledger. Detail edits are
    // written back by this index, so it must survive searching and paging —
    // without it, editing row 2 of a filtered view would overwrite row 2 of the
    // whole statement.
    const withBalance = baseTransactions.map((tx, __i) => {
      if (tx.type === "Invoice" || tx.type === "Add-on") {
        running += tx.amount;
      } else if (tx.payment) {
        running -= tx.payment;
      }
      return { ...tx, balance: running, __i };
    });

    setTransactionsState(withBalance);
  }, [statement]);

  const refreshExports = useCallback(async () => {
    if (!statementId) return;
    try {
      setExportHistory(await fetchStatementExports({ statementId }));
    } catch (err) {
      console.error("Error fetching export history:", err);
    }
  }, [statementId]);

  useEffect(() => {
    refreshExports();
  }, [refreshExports]);

  // Helper to get display date as previous day
  const getDisplayDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    // subtract one day
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-GB");
  };

  // Builds the PDF and RETURNS it rather than saving, so the caller can both
  // hand it to the user and upload it against the export snapshot. Laid out
  // like the statement screen: masthead, balance callout, the sum that produces
  // it, age analysis, the ledger, then how to pay.
  const buildPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Same palette as the screen (ClientStatement.css, .cs-page).
      const C = {
        navy: [31, 78, 136],
        deep: [22, 55, 95],
        text: [74, 90, 114],
        muted: [90, 107, 129],
        border: [218, 228, 240],
        rule: [230, 237, 246],
        row: [238, 242, 248],
        tint: [246, 249, 253],
        callout: [207, 220, 236],
        op: [154, 171, 194],
        green: [6, 118, 71],
      };
      const PILL = {
        Opening: { bg: [238, 241, 245], fg: [71, 84, 103] },
        Invoice: { bg: [234, 241, 251], fg: C.navy },
        Payments: { bg: [231, 246, 238], fg: C.green },
        Insurance: { bg: [255, 244, 229], fg: [181, 71, 8] },
      };
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = 14;
      const W = pageW - 2 * M;
      const PT = 0.3528; // mm per point

      // Text helpers. write() returns the height it used so blocks can stack.
      const write = (text, x, y, opts = {}) => {
        const { size = 9, style = "normal", color = C.text, align = "left", maxWidth } = opts;
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = maxWidth ? doc.splitTextToSize(String(text), maxWidth) : [String(text)];
        doc.text(lines, x, y, { align });
        return lines.length * size * PT * 1.25;
      };
      // Small uppercase letter-spaced labels. jsPDF's own alignment ignores
      // charSpace, so the offset is computed here; the label shrinks to fit.
      const label = (text, x, y, opts = {}) => {
        const { color = C.muted, align = "left", maxWidth } = opts;
        let { size = 6.3, spacing = 0.3 } = opts;
        const t = String(text).toUpperCase();
        doc.setFont("helvetica", "bold");
        const widthAt = () => {
          doc.setFontSize(size);
          return doc.getTextWidth(t) + spacing * Math.max(0, t.length - 1);
        };
        while (maxWidth && widthAt() > maxWidth && size > 4.8) {
          spacing = Math.max(0, spacing - 0.05);
          size -= 0.2;
        }
        const w = widthAt();
        doc.setTextColor(...color);
        const startX = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
        doc.text(t, startX, y, { charSpace: spacing });
      };
      const hRule = (y, color = C.rule, width = 0.25, x1 = M, x2 = pageW - M) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(width);
        doc.line(x1, y, x2, y);
      };

      // Figures — the same arithmetic as the screen and the export snapshot.
      const client = statement.client || {};
      const statementDate = getDisplayDate(statement.generation_date);
      const periodLabel = periodLabelOf(statement) || statementDate;
      const openingBalance = statement.opening_balance;
      const invoicedAmount =
        statement.invoices.reduce((s, i) => s + i.amount, 0) +
        statement.addons.reduce((s, a) => s + a.amount, 0);
      const amountPaid = statement.payments.reduce((s, p) => s + p.amount, 0);
      const creditNotesAmount = (statement.credit_notes || []).reduce(
        (s, c) => s + c.amount,
        0
      );
      const insuranceCredit = Number.parseFloat(statement.insurance_amount || 0);
      const totalAmountPaid = amountPaid + creditNotesAmount;
      const balanceDue =
        openingBalance - (totalAmountPaid + insuranceCredit) + invoicedAmount;

      // ---- Masthead ---------------------------------------------------------
      let y = 20;
      write(statement.company_name || "", M, y, { size: 17, style: "bold", color: C.deep });
      let leftY = y + 5.5;
      companyLinesOf(statement).forEach((line) => {
        leftY += write(line, M, leftY, { size: 8, color: C.muted, maxWidth: W * 0.6 });
      });
      label("Statement of account", pageW - M, y - 6, { size: 6.8, color: C.navy, align: "right" });
      write(periodLabel, pageW - M, y + 0.5, { size: 13, style: "bold", color: C.deep, align: "right" });
      write(`Statement date ${statementDate}`, pageW - M, y + 5.5, { size: 8, color: C.muted, align: "right" });
      y = Math.max(leftY - 2, y + 8) + 2;
      hRule(y, C.navy, 0.8);

      // ---- Statement for + balance due -------------------------------------
      y += 8;
      const boxW = 66;
      const boxX = pageW - M - boxW;
      const boxY = y - 3;
      const boxH = 25;
      doc.setFillColor(...C.tint);
      doc.setDrawColor(...C.callout);
      doc.setLineWidth(0.25);
      doc.rect(boxX, boxY, boxW, boxH, "FD");
      doc.setFillColor(...C.navy);
      doc.rect(boxX, boxY, boxW, 0.9, "F");
      label("Balance due", boxX + 5, boxY + 7, { color: C.navy });
      write(formatRand(balanceDue), boxX + 5, boxY + 15.5, { size: 16, style: "bold", color: C.deep });
      write(`as at ${statementDate}`, boxX + 5, boxY + 21, { size: 7.5 });

      const billedW = W - boxW - 10;
      label("Statement for", M, y);
      let billedY = y + 6;
      if (client.name) {
        billedY += write(client.name, M, billedY, { size: 11.5, style: "bold", color: C.deep, maxWidth: billedW });
      }
      [
        client.representative && `Attn: ${client.representative}`,
        [client.address, client.suburb].filter(Boolean).join(", "),
        [client.email, client.phone].filter(Boolean).join("  ·  "),
      ]
        .filter(Boolean)
        .forEach((line) => {
          billedY += write(line, M, billedY, { size: 8.5, maxWidth: billedW });
        });
      y = Math.max(billedY, boxY + boxH) + 5;
      hRule(y);

      // ---- Opening + invoiced - paid = balance -----------------------------
      y += 5;
      const flow = [
        { name: "Opening balance", value: openingBalance },
        { op: "+" },
        { name: "Invoiced", value: invoicedAmount },
        { op: "-" },
        { name: "Payments & credit notes", value: totalAmountPaid },
        ...(insuranceCredit > 0
          ? [{ op: "-" }, { name: "Insurance credit", value: insuranceCredit }]
          : []),
        { op: "=" },
        { name: "Balance due", value: balanceDue, total: true },
      ];
      const opW = 6;
      const items = flow.filter((f) => !f.op).length;
      const itemW = (W - opW * (items - 1)) / items;
      const flowH = 14;
      let x = M;
      flow.forEach((f) => {
        if (f.op) {
          write(f.op, x + opW / 2, y + flowH / 2 + 1.5, { size: 11, style: "bold", color: C.op, align: "center" });
          x += opW;
          return;
        }
        doc.setFillColor(...(f.total ? C.tint : [255, 255, 255]));
        doc.setDrawColor(...(f.total ? C.callout : C.row));
        doc.setLineWidth(0.25);
        doc.rect(x, y, itemW, flowH, "FD");
        label(f.name, x + 3, y + 5, { color: f.total ? C.navy : C.muted, maxWidth: itemW - 6 });
        write(formatRand(f.value), x + 3, y + 10.8, { size: 9.5, style: "bold", color: C.deep });
        x += itemW;
      });
      y += flowH + 5;
      hRule(y);

      // ---- Age analysis ------------------------------------------------------
      y += 8;
      write("Age analysis", M, y, { size: 10, style: "bold", color: C.deep });
      y += 3.5;
      const buckets = [
        { key: "90days", name: "91+ days", tone: [180, 35, 24] },
        { key: "60days", name: "61-90 days", tone: [196, 50, 10] },
        { key: "30days", name: "31-60 days", tone: [181, 71, 8] },
        { key: "current", name: "Current", tone: C.navy },
      ];
      const owed = buckets.reduce((s, b) => s + Math.max(0, statement.aging[b.key] || 0), 0);
      const cellW = W / buckets.length;
      const agingH = 19;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.25);
      doc.rect(M, y, W, agingH, "S");
      buckets.forEach((b, i) => {
        const cx = M + i * cellW;
        if (i > 0) {
          doc.setDrawColor(...C.rule);
          doc.line(cx, y, cx, y + agingH);
        }
        const value = statement.aging[b.key] || 0;
        const share = owed > 0 ? Math.max(0, value) / owed : 0;
        label(b.name, cx + 4, y + 5);
        write(formatRand(value), cx + 4, y + 10.5, { size: 10, style: "bold", color: C.deep });
        const barW = cellW - 8;
        doc.setFillColor(...C.row);
        doc.rect(cx + 4, y + 13, barW, 1, "F");
        if (share > 0) {
          doc.setFillColor(...b.tone);
          doc.rect(cx + 4, y + 13, barW * share, 1, "F");
        }
        write(owed > 0 ? `${Math.round(share * 100)}% of balance` : "", cx + 4, y + 17, { size: 6.5, color: C.muted });
      });
      y += agingH + 9;

      // ---- Transactions ------------------------------------------------------
      write("Transactions", M, y, { size: 10, style: "bold", color: C.deep });
      y += 3;

      const sourceTransactions =
        transactionsState && transactionsState.length > 0
          ? transactionsState
          : transactionsWithBalance;
      const pdfDetails = (details) =>
        String(details || "")
          .replace(/→/g, "-") // the standard PDF fonts have no arrow glyph
          .replace(/\s*-\s*/g, " - ")
          .replace(/\s+/g, " ")
          .trim();

      const body = [
        [statementDate, "Opening", "Balance brought forward", "", "", "", formatRand(openingBalance)],
        ...sourceTransactions.map((tx) => [
          tx.date.toLocaleDateString("en-GB"),
          tx.type,
          pdfDetails(tx.details),
          tx.reference || "",
          tx.amount ? formatRand(tx.amount) : "",
          tx.payment ? formatRand(tx.payment) : "",
          formatRand(tx.balance),
        ]),
      ];

      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Details", "Reference", "Amount", "Payments", "Balance"]],
        body,
        foot: [[{ content: "Balance due", colSpan: 6 }, formatRand(balanceDue)]],
        showFoot: "lastPage",
        showHead: "everyPage",
        theme: "plain",
        margin: { left: M, right: M, top: 24, bottom: 18 },
        styles: {
          font: "helvetica",
          fontSize: 7.8,
          textColor: C.deep,
          cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: { fillColor: C.tint, textColor: C.deep, fontStyle: "bold", fontSize: 6.6 },
        footStyles: { fillColor: C.tint, textColor: C.deep, fontStyle: "bold", fontSize: 8.6 },
        columnStyles: {
          0: { cellWidth: 19 },
          1: { cellWidth: 20 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 22 },
          4: { cellWidth: 23, halign: "right" },
          5: { cellWidth: 23, halign: "right" },
          6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        },
        didParseCell: (d) => {
          if (d.section === "head") {
            d.cell.text = d.cell.text.map((t) => t.toUpperCase());
            if (d.column.index >= 4) d.cell.styles.halign = "right";
          }
          if (d.section === "body") {
            if (d.column.index === 1) {
              d.cell.styles.fontSize = 6.6;
              d.cell.styles.fontStyle = "bold";
              d.cell.styles.textColor = (PILL[d.cell.raw] || PILL.Opening).fg;
            }
            if (d.column.index === 5) d.cell.styles.textColor = C.green;
          }
          // Totals never wrap — "R13,764,362.0 / 7" is worse than a tight fit.
          if (d.section === "foot" && d.column.index === 6) {
            d.cell.styles.halign = "right";
            d.cell.styles.overflow = "visible";
          }
        },
        // Type pills sit behind the text, so they are drawn before it.
        willDrawCell: (d) => {
          if (d.section !== "body" || d.column.index !== 1 || !d.cell.raw) return;
          const pill = PILL[d.cell.raw] || PILL.Opening;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.6);
          const w = doc.getTextWidth(String(d.cell.raw)) + 3.4;
          const h = 4.2;
          doc.setFillColor(...pill.bg);
          doc.roundedRect(d.cell.x + d.cell.padding("left") - 1.7, d.cell.y + d.cell.height / 2 - h / 2, w, h, 2.1, 2.1, "F");
        },
        didDrawCell: (d) => {
          if (d.section === "foot") {
            hRule(d.cell.y, C.navy, 0.6, d.cell.x, d.cell.x + d.cell.width);
          } else {
            hRule(
              d.cell.y + d.cell.height,
              d.section === "head" ? C.border : C.row,
              d.section === "head" ? 0.3 : 0.2,
              d.cell.x,
              d.cell.x + d.cell.width
            );
          }
        },
      });

      // ---- How to pay --------------------------------------------------------
      const payment = paymentDetailsOf(statement);
      if (payment.length > 0) {
        const cols = 3;
        const rows = Math.ceil(payment.length / cols);
        const payH = 11 + rows * 9.5;
        y = doc.lastAutoTable.finalY + 7;
        // Room down to just above the footer rule (pageH - 12).
        if (y + payH > pageH - 14) {
          doc.addPage();
          y = 26;
        }
        doc.setFillColor(...C.tint);
        doc.setDrawColor(...C.callout);
        doc.setLineWidth(0.25);
        doc.rect(M, y, W, payH, "FD");
        doc.setFillColor(...C.navy);
        doc.rect(M, y, 0.9, payH, "F");
        write("How to pay", M + 6, y + 7, { size: 10, style: "bold", color: C.deep });
        const colW = (W - 12) / cols;
        payment.forEach(([name, value], i) => {
          const px = M + 6 + (i % cols) * colW;
          const py = y + 14 + Math.floor(i / cols) * 9.5;
          label(name, px, py);
          write(value, px, py + 4.5, { size: 9, style: "bold", color: C.deep, maxWidth: colW - 4 });
        });
      }

      // ---- Running header (pages 2+) and footer (every page) ----------------
      const pages = doc.getNumberOfPages();
      const footerLeft = [statement.company_name, statement.vat_reg_num && `VAT Reg No ${statement.vat_reg_num}`]
        .filter(Boolean)
        .join("  ·  ");
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        if (page > 1) {
          write(statement.company_name || "", M, 13, { size: 9, style: "bold", color: C.deep });
          write(
            [`Statement of account`, periodLabel, client.name].filter(Boolean).join("  ·  "),
            pageW - M,
            13,
            { size: 7.5, color: C.muted, align: "right" }
          );
          hRule(16, C.navy, 0.5);
        }
        hRule(pageH - 12);
        write(footerLeft, M, pageH - 7.5, { size: 7, color: C.muted });
        write(`Page ${page} of ${pages}`, pageW - M, pageH - 7.5, { size: 7, color: C.muted, align: "right" });
      }

      return {
        blob: doc.output("blob"),
        filename: `Statement-${statement.statement_key}.pdf`,
      };
    } catch (err) {
      console.error("PDF generation error:", err);
      // Surfaced by handleExport, which reports it and re-enables the buttons.
      throw err;
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
  const insuranceCredit = Number.parseFloat(statement.insurance_amount || 0);
  const totalCredits = totalAmountPaid + insuranceCredit;
  const openingBalance = statement.opening_balance; // Use the stored opening balance
  const balanceDue = openingBalance - totalCredits + invoicedAmount;

  // Helper: fix strings that arrive with spaces between every character
  const fixTokenSpacing = (s) => {
    if (!s) return s;
    const tokens = String(s).trim().split(/\s+/);
    const singleCount = tokens.filter((t) => t.length === 1).length;
    if (tokens.length === 0) return '';
    // Only rebuild if most tokens are single letters (likely corrupted spacing)
    if (singleCount < tokens.length * 0.6) {
      return tokens.join(' ');
    }
    const rebuilt = [];
    let buffer = '';
    for (const tok of tokens) {
      if (tok.length === 1) {
        buffer += tok;
      } else {
        if (buffer) {
          rebuilt.push(buffer);
          buffer = '';
        }
        rebuilt.push(tok);
      }
    }
    if (buffer) rebuilt.push(buffer);
    return rebuilt.join(' ');
  };

  // Helper function to format invoice and addon details
  const formatDetails = (item, type) => {
    if (type === "Invoice") {
      const pickup = fixTokenSpacing(item.pickup || "");
      const dropoff = fixTokenSpacing(item.dropoff || "");
      console.log("Invoice details:", { pickup, dropoff, item }); // Debug log
      if (pickup && dropoff) {
        return `${pickup} → ${dropoff}`.replace(/\s+/g, ' ').trim();
      } else if (pickup) {
        return pickup.replace(/\s+/g, ' ').trim();
      } else if (dropoff) {
        return `→ ${dropoff}`.replace(/\s+/g, ' ').trim();
      } else {
        return fixTokenSpacing(item.task || item.invoice_num || `Invoice #${item.ikey}`).replace(/\s+/g, ' ').trim();
      }
    } else if (type === "Add-on") {
      console.log("Addon details:", { item }); // Debug log
      return fixTokenSpacing(item.description || item.invoice_num || `Add-on #${item.addon_id}`).replace(/\s+/g, ' ').trim();
    } else if (type === "Credit Note") {
      console.log("Credit Note details:", { item }); // Debug log
      return fixTokenSpacing(item.description || `Credit Note #${item.credit_note_id}`).replace(/\s+/g, ' ').trim();
    }
    return "";
  };

  // Build transactions array for UI/PDF: single Payments row, then all invoices/add-ons for the statement month
  const referenceCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const compareReferenceAsc = (a, b) =>
    referenceCollator.compare(String(a || ""), String(b || ""));

  const charges = [
    ...statement.invoices.map((invoice) => ({
      type: "Invoice",
      date: new Date(invoice.date),
      details: formatDetails(invoice, "Invoice"),
      reference: invoice.invoice_num || "",
      amount: invoice.amount,
      payment: null,
    })),
    ...statement.addons.map((addon) => ({
      type: "Invoice",
      date: new Date(addon.date),
      details: formatDetails(addon, "Add-on"),
      reference: addon.addon_num || addon.invoice_num || "",
      amount: addon.amount,
      payment: null,
    })),
  ].sort((a, b) => {
    const refDiff = compareReferenceAsc(a.reference, b.reference);
    if (refDiff !== 0) return refDiff;
    return a.date - b.date;
  });

  const insuranceRow =
    insuranceCredit > 0
      ? {
          type: "Insurance",
          date: periodEndDate(statement),
          details: "Monthly insurance credit",
          reference: "",
          amount: null,
          payment: insuranceCredit,
        }
      : null;

  const paymentsRow = {
    type: "Payments",
    date: periodEndDate(statement),
    details: totalAmountPaid > 0 ? "Payments & credit notes" : "",
    reference: "",
    amount: null,
    payment: totalAmountPaid,
  };

  const transactions = [
    ...(insuranceRow ? [insuranceRow] : []),
    paymentsRow,
    ...charges,
  ];

  // Calculate running balance
  let runningBalance = openingBalance; // Start with the opening balance
  const transactionsWithBalance = transactions.map((tx) => {
    if (tx.type === "Invoice" || tx.type === "Add-on") {
      runningBalance += tx.amount;
    } else if (tx.payment) {
      runningBalance -= tx.payment;
    }
    return { ...tx, balance: runningBalance };
  });

  // Use editable state for UI transactions when available
  const uiTransactions =
    transactionsState && transactionsState.length > 0
      ? transactionsState
      : transactionsWithBalance;

  // `originalIndex` is tx.__i — the row's position in the full ledger, not in
  // the filtered/paged view being rendered.
  const handleDetailChange = (originalIndex, value) => {
    setTransactionsState((prev) => {
      const next = prev && prev.length > 0 ? [...prev] : [...transactionsWithBalance];
      if (!next[originalIndex]) return next;
      next[originalIndex] = { ...next[originalIndex], details: value };
      return next;
    });
  };

  // Search and paging apply to the rendered rows only. uiTransactions stays the
  // full ledger and is what the export sends, so a filtered screen can never
  // produce a truncated document.
  const txSearch = txQuery.trim().toLowerCase();
  const filteredTransactions = txSearch
    ? uiTransactions.filter((tx) =>
        [tx.type, tx.details, tx.reference]
          .join(" ")
          .toLowerCase()
          .includes(txSearch)
      )
    : uiTransactions;

  const txTotalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / txPerPage)
  );
  const txSafePage = Math.min(txPage, txTotalPages);
  const txStart = (txSafePage - 1) * txPerPage;
  const visibleTransactions = filteredTransactions.slice(
    txStart,
    txStart + txPerPage
  );

  // Excel mirror of the PDF. Same rows, same totals — the spreadsheet is a
  // second rendering of the frozen payload, not a different calculation.
  const buildExcel = async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Statement");
    sheet.columns = [
      { width: 14 }, { width: 14 }, { width: 42 },
      { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 },
    ];

    let row = 1;
    sheet.getCell(`A${row}`).value = statement.company_name || "";
    sheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row += 2;

    sheet.getCell(`A${row}`).value = "Client:";
    sheet.getCell(`B${row}`).value = statement.client?.name || "";
    row++;
    sheet.getCell(`A${row}`).value = "Statement date:";
    sheet.getCell(`B${row}`).value = getDisplayDate(statement.generation_date);
    row += 2;

    const header = sheet.getRow(row);
    header.values = ["Date", "Type", "Details", "Reference", "Amount", "Payment", "Balance"];
    header.font = { bold: true };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
    row++;

    sheet.getRow(row).values = ["", "", "Opening balance", "", "", "", openingBalance];
    sheet.getCell(`G${row}`).numFmt = '"R"#,##0.00';
    row++;

    uiTransactions.forEach((tx) => {
      const r = sheet.getRow(row);
      r.values = [
        tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "",
        tx.type || "",
        tx.details || "",
        tx.reference || "",
        tx.amount || null,
        tx.payment || null,
        tx.balance,
      ];
      ["E", "F", "G"].forEach((c) => {
        sheet.getCell(`${c}${row}`).numFmt = '"R"#,##0.00';
      });
      row++;
    });

    row++;
    const summary = [
      ["Opening balance", openingBalance],
      ["Invoiced", invoicedAmount],
      ["Payments & credit notes", totalAmountPaid],
      ["Insurance credit", insuranceCredit],
      ["Balance due", balanceDue],
    ];
    summary.forEach(([label, value], i) => {
      sheet.getCell(`F${row}`).value = label;
      sheet.getCell(`G${row}`).value = value;
      sheet.getCell(`G${row}`).numFmt = '"R"#,##0.00';
      if (i === summary.length - 1) {
        sheet.getCell(`F${row}`).font = { bold: true };
        sheet.getCell(`G${row}`).font = { bold: true };
      }
      row++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      blob: new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename: `Statement-${statement.statement_key}.xlsx`,
    };
  };

  /**
   * Downloading is what makes a statement real, so it is the moment we freeze
   * it. The server re-derives the figures, stores that snapshot, and returns the
   * payload; the document is rendered here and the file uploaded back against
   * the same snapshot.
   */
  const handleExport = async (format) => {
    if (isGenerating || !statement) return;
    setIsGenerating(true);
    setExportError(false);
    setExportMessage("");

    try {
      // The server re-derives the statement and refuses (409, nothing recorded)
      // if it no longer matches the content_hash this page loaded with — so a
      // document can never disagree with its own archived record.
      const result = await requestStatementExport({
        statementId,
        format,
        expectedContentHash: statement.content_hash,
        detailOverrides: uiTransactions.map((tx) => tx.details || ""),
      });

      if (!result.document_pending && result.export?.document_url) {
        openStoredDocument(result.export.document_url);
        setExportMessage(
          `Statement unchanged — re-issued the ${format} already on file.`
        );
        await refreshExports();
        return;
      }

      const { blob, filename } =
        format === "PDF" ? buildPdf() : await buildExcel();

      saveBlob(blob, filename);

      // The snapshot exists either way; a failed upload leaves it without a
      // stored document rather than losing the record of the export.
      try {
        await uploadStatementDocument(result.export.export_id, blob, filename);
        setExportMessage(`${format} downloaded and saved to export history.`);
      } catch (uploadErr) {
        console.error("Error archiving statement document:", uploadErr);
        setExportError(true);
        setExportMessage(
          `${format} downloaded, but archiving the copy failed. The export is recorded; the stored document is missing.`
        );
      }

      await refreshExports();
    } catch (err) {
      console.error("Error exporting statement:", err);
      setExportError(true);
      const data = err.response?.data;
      if (data?.code === "STATEMENT_CHANGED") {
        setExportMessage(
          `This statement has changed since the page was opened (balance due is now ${formatRand(
            data.totals?.balanceDue
          )}). Reload the page before downloading.`
        );
      } else {
        setExportMessage(data?.message || `Failed to export ${format}.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Header facts, shared by the masthead and the balance callout.
  const statementDate = getDisplayDate(statement.generation_date);
  const periodLabel = periodLabelOf(statement) || statementDate;
  const client = statement.client || {};
  const companyLines = companyLinesOf(statement);
  const paymentDetails = paymentDetailsOf(statement);

  // Age analysis in the same order as the PDF. Bars show each bucket's share of
  // what is owed; a client in credit (negative Current) simply draws no bar.
  const agingBuckets = [
    { key: "90days", label: "91+ days", tone: "overdue-3" },
    { key: "60days", label: "61–90 days", tone: "overdue-2" },
    { key: "30days", label: "31–60 days", tone: "overdue-1" },
    { key: "current", label: "Current", tone: "current" },
  ];
  const agingOwed = agingBuckets.reduce(
    (sum, b) => sum + Math.max(0, statement.aging[b.key] || 0),
    0
  );

  const TYPE_TONE = { Invoice: "invoice", Payments: "payment", Insurance: "credit" };

  return (
    <div className="client-statement-wrapper cs-page">
      <div className="cs-layout">
        <article className="cs-paper" ref={statementRef}>
          {/* Masthead: who it is from, and which month it covers */}
          <header className="cs-masthead">
            <div className="cs-from">
              <div className="cs-company">{statement.company_name}</div>
              {companyLines.map((line) => (
                <div className="cs-company-meta" key={line}>
                  {line}
                </div>
              ))}
            </div>
            <div className="cs-masthead-right">
              <div className="cs-kicker">Statement of account</div>
              <div className="cs-period">{periodLabel}</div>
              <div className="cs-masthead-date">Statement date {statementDate}</div>
            </div>
          </header>

          {/* Who it is for, and what they owe */}
          <section className="cs-head-grid">
            <div className="cs-billed">
              <div className="cs-field-label">Statement for</div>
              {client.name && <div className="cs-billed-party">{client.name}</div>}
              {client.representative && (
                <div className="cs-billed-detail">Attn: {client.representative}</div>
              )}
              {(client.address || client.suburb) && (
                <div className="cs-billed-detail">
                  {[client.address, client.suburb].filter(Boolean).join(", ")}
                </div>
              )}
              {(client.email || client.phone) && (
                <div className="cs-billed-detail cs-billed-contact">
                  {client.email && <span>{client.email}</span>}
                  {client.phone && <span>{client.phone}</span>}
                </div>
              )}
            </div>

            <div className="cs-total-callout">
              <div className="cs-callout-label">Balance due</div>
              <div className="cs-callout-value">{formatRand(balanceDue)}</div>
              <div className="cs-callout-meta">as at {statementDate}</div>
            </div>
          </section>

          {/* How the balance was arrived at, read left to right */}
          <section className="cs-flow" aria-label="Account summary">
            <div className="cs-flow-item">
              <div className="cs-field-label">Opening balance</div>
              <div className="cs-flow-value">{formatRand(openingBalance)}</div>
            </div>
            <div className="cs-flow-op" aria-hidden="true">+</div>
            <div className="cs-flow-item">
              <div className="cs-field-label">Invoiced</div>
              <div className="cs-flow-value">{formatRand(invoicedAmount)}</div>
            </div>
            <div className="cs-flow-op" aria-hidden="true">−</div>
            <div className="cs-flow-item">
              <div className="cs-field-label">Payments &amp; credit notes</div>
              <div className="cs-flow-value">{formatRand(totalAmountPaid)}</div>
            </div>
            {insuranceCredit > 0 && (
              <>
                <div className="cs-flow-op" aria-hidden="true">−</div>
                <div className="cs-flow-item">
                  <div className="cs-field-label">Insurance credit</div>
                  <div className="cs-flow-value">{formatRand(insuranceCredit)}</div>
                </div>
              </>
            )}
            <div className="cs-flow-op" aria-hidden="true">=</div>
            <div className="cs-flow-item cs-flow-total">
              <div className="cs-field-label">Balance due</div>
              <div className="cs-flow-value">{formatRand(balanceDue)}</div>
            </div>
          </section>

          {/* Age analysis */}
          <section className="cs-section">
            <h2 className="cs-section-title">Age analysis</h2>
            <div className="cs-aging">
              {agingBuckets.map((bucket) => {
                const value = statement.aging[bucket.key] || 0;
                const share = agingOwed > 0 ? Math.max(0, value) / agingOwed : 0;
                return (
                  <div className={`cs-aging-cell cs-tone-${bucket.tone}`} key={bucket.key}>
                    <div className="cs-field-label">{bucket.label}</div>
                    <div className="cs-aging-value">{formatRand(value)}</div>
                    <div className="cs-aging-bar" aria-hidden="true">
                      <span style={{ width: `${(share * 100).toFixed(1)}%` }} />
                    </div>
                    <div className="cs-aging-share">
                      {agingOwed > 0 ? `${Math.round(share * 100)}% of balance` : " "}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transactions */}
          <section className="cs-section">
            <div className="cs-ledger-head">
              <h2 className="cs-section-title">Transactions</h2>
              <button
                type="button"
                className={`cs-btn cs-btn-ghost ${isEditMode ? "is-active" : ""}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? "Done editing details" : "Edit details"}
              </button>
            </div>

            <div className="cs-toolbar">
              <input
                type="text"
                className="cs-input cs-search"
                placeholder="Search type, details or reference…"
                value={txQuery}
                onChange={(e) => {
                  setTxQuery(e.target.value);
                  setTxPage(1);
                }}
              />
              <select
                className="cs-input cs-rows"
                value={txPerPage}
                onChange={(e) => {
                  setTxPerPage(Number(e.target.value));
                  setTxPage(1);
                }}
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={100000}>All rows</option>
              </select>
              <span className="cs-range">
                {filteredTransactions.length === 0
                  ? "No transactions match this search"
                  : `Showing ${txStart + 1}–${Math.min(
                      txStart + txPerPage,
                      filteredTransactions.length
                    )} of ${filteredTransactions.length}`}
                {txSearch && uiTransactions.length !== filteredTransactions.length
                  ? ` (filtered from ${uiTransactions.length})`
                  : ""}
              </span>
            </div>

            <div className="cs-table-scroll">
              <table className="cs-table">
                <colgroup>
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                  <col />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Reference</th>
                    <th className="cs-num">Amount</th>
                    <th className="cs-num">Payments</th>
                    <th className="cs-num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="cs-row-opening">
                    <td>{statementDate}</td>
                    <td>
                      <span className="cs-pill cs-pill-neutral">Opening</span>
                    </td>
                    <td className="cs-muted">Balance brought forward</td>
                    <td></td>
                    <td className="cs-num"></td>
                    <td className="cs-num"></td>
                    <td className="cs-num cs-balance">{formatRand(openingBalance)}</td>
                  </tr>
                  {visibleTransactions.map((tx) => (
                    <tr key={tx.__i}>
                      <td>{tx.date.toLocaleDateString("en-GB")}</td>
                      <td>
                        <span className={`cs-pill cs-pill-${TYPE_TONE[tx.type] || "neutral"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td>
                        {isEditMode ? (
                          <input
                            type="text"
                            className="cs-input cs-detail-input"
                            value={tx.details || ""}
                            placeholder="Add details…"
                            onChange={(e) => handleDetailChange(tx.__i, e.target.value)}
                          />
                        ) : (
                          tx.details
                        )}
                      </td>
                      <td className="cs-ref">{tx.reference || ""}</td>
                      <td className="cs-num">{tx.amount ? formatRand(tx.amount) : ""}</td>
                      <td className="cs-num cs-credit">
                        {tx.payment ? formatRand(tx.payment) : ""}
                      </td>
                      <td className="cs-num cs-balance">{formatRand(tx.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Only where the ledger actually ends — under page 1 of 3, or a
                    search result, a closing total would sit beneath a running
                    balance it does not follow from. */}
                {txSafePage === txTotalPages && !txSearch && (
                  <tfoot>
                    <tr>
                      <td colSpan={6}>Balance due</td>
                      <td className="cs-num">{formatRand(balanceDue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {txTotalPages > 1 && (
              <div className="cs-pager">
                <button
                  className="cs-btn cs-btn-ghost"
                  onClick={() => setTxPage((page) => Math.max(1, page - 1))}
                  disabled={txSafePage === 1}
                >
                  Previous
                </button>
                <span className="cs-range">
                  Page {txSafePage} of {txTotalPages}
                </span>
                <button
                  className="cs-btn cs-btn-ghost"
                  onClick={() => setTxPage(Math.min(txTotalPages, txSafePage + 1))}
                  disabled={txSafePage === txTotalPages}
                >
                  Next
                </button>
              </div>
            )}
          </section>

          {paymentDetails.length > 0 && (
            <section className="cs-section">
              <div className="cs-pay">
                <h2 className="cs-section-title">How to pay</h2>
                <dl className="cs-pay-grid">
                  {paymentDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt className="cs-field-label">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}
        </article>

        {/* Downloads and what was actually sent to this client */}
        <aside className="cs-side">
          <div className="cs-card">
            <h2 className="cs-card-title">Download statement</h2>
            <p className="cs-note">
              Downloading archives exactly what is sent, so it can be re-issued
              later even if the figures change.
            </p>
            <div className="cs-actions">
              <button
                className="cs-btn cs-btn-primary"
                onClick={() => handleExport("PDF")}
                disabled={isGenerating}
              >
                {isGenerating ? "Working…" : "Download PDF"}
              </button>
              <button
                className="cs-btn cs-btn-secondary"
                onClick={() => handleExport("XLSX")}
                disabled={isGenerating}
              >
                {isGenerating ? "Working…" : "Download Excel"}
              </button>
            </div>
            {exportMessage && (
              <div
                className={`cs-message ${exportError ? "is-error" : "is-success"}`}
                role="status"
              >
                {exportMessage}
              </div>
            )}
          </div>

          {/* Amounts here are frozen and do not move when invoices or
              payments change later. */}
          <div className="cs-card">
            <h2 className="cs-card-title">Export history</h2>
            {exportHistory.length === 0 ? (
              <p className="cs-note">This statement has not been exported yet.</p>
            ) : (
              <ul className="cs-history">
                {exportHistory.map((row) => {
                  const drifted =
                    Math.abs(Number(row.balance_due) - balanceDue) > 0.005;
                  return (
                    <li className="cs-history-entry" key={row.export_id}>
                      <div className="cs-history-main">
                        <div className="cs-history-head">
                          <span className="cs-pill cs-pill-neutral">
                            {row.document_format || "—"}
                          </span>
                          <strong>{formatRand(row.balance_due)}</strong>
                        </div>
                        <div className="cs-history-sub">
                          {new Date(row.exported_at).toLocaleString("en-ZA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {row.exported_by_name ? ` · ${row.exported_by_name}` : ""}
                        </div>
                        {drifted && (
                          <div
                            className="cs-history-drift"
                            title="This is what was sent. The statement has changed since."
                          >
                            Differs from current balance
                          </div>
                        )}
                      </div>
                      {row.document_url ? (
                        <button
                          className="cs-btn cs-btn-link"
                          onClick={() => openStoredDocument(row.document_url)}
                        >
                          Open
                        </button>
                      ) : (
                        <span className="cs-history-missing">Not archived</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ClientStatement;
