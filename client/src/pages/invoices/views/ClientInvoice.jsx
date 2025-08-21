"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../css/InvoiceTemplate.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../../api";

// Utility function for formatting dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

// Utility function for formatting currency
const formatCurrency = (amount) => {
  if (!amount) return "R 0.00";
  return `R ${Number(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data);
  }
};

const ClientInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Extract ID from URL or location state
  const id = params.id || (location.state && location.state.id);

  // Get client information if available
  const clientInfo = location.state || {};
  const { clientId, clientName, returnToClientView } = clientInfo;

  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    dropoff: "",
    amount: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const invoiceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInvoiceData = async () => {
      try {
        if (!id) {
          if (isMounted) {
            setError("No invoice ID provided");
            setLoading(false);
          }
          return;
        }

        const requestUrl = `/api/invoices/${id}`;
        debug("Fetching invoice data from:", requestUrl);

        const response = await api.get(requestUrl);

        debug("Response status:", response.status);
        debug("Received invoice data:", response.data);

        if (response.data.data && response.data.data.containers) {
          response.data.data.containers = response.data.data.containers.map(
            (container) => ({
              container_number:
                container.container_number || container.containernum || "",
              weight: container.weight || null,
            })
          );
        }

        if (isMounted) {
          setInvoiceData(response.data.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching invoice data:", err);

        if (isMounted) {
          let errorMessage = "Failed to load invoice data";

          if (err.response) {
            const { status, data } = err.response;

            if (status === 401 || status === 403) {
              navigate("/");
              return;
            }

            if (
              typeof data === "string" &&
              (data.trim().startsWith("<!DOCTYPE") ||
                data.trim().startsWith("<html"))
            ) {
              errorMessage =
                "Received HTML instead of JSON. This may indicate a proxy configuration issue.";
            } else {
              errorMessage = `HTTP error! Status: ${status}. ${
                data?.message || data || ""
              }`;
            }
          } else if (err.request) {
            errorMessage =
              "No response received from server. Please check your connection.";
          } else {
            errorMessage = err.message;
          }

          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    fetchInvoiceData();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const calculateVAT = (amount) => {
    if (invoiceData?.invoice?.vat_amount !== undefined) {
      return Number(invoiceData.invoice.vat_amount);
    }

    if (invoiceData?.vat !== undefined && invoiceData?.vat !== null && amount) {
      const vatRate = Number(invoiceData.vat) / 100;
      return amount * vatRate;
    }

    return 0;
  };

  const generatePDF = () => {
    setPdfLoading(true);

    try {
      const containers = invoiceData.containers || [];
      const containerCount = containers.length;
      const isCompactLayout = true;

      // Create new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set up fonts and sizes based on layout
      const fonts = isCompactLayout
        ? {
            title: 18,
            header: 14,
            normal: 11,
            small: 10,
            tiny: 9,
          }
        : {
            title: 20,
            header: 16,
            normal: 12,
            small: 11,
            tiny: 10,
          };

      // Reduced margins for maximum space utilization
      const margins = {
        left: isCompactLayout ? 10 : 15,
        right: isCompactLayout ? 10 : 15,
        top: isCompactLayout ? 10 : 15,
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margins.top;

      // Company Header
      doc.setFontSize(fonts.title);
      doc.setFont("helvetica", "bold");
      doc.text(invoiceData.companyname || "", margins.left, currentY);
      currentY += isCompactLayout ? 6 : 8;

      // Company Details
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");
      const companyDetails = [
        invoiceData.cluster_box,
        invoiceData.address,
        invoiceData.suburb,
        `VAT Reg No: ${invoiceData.vat_reg_num}`,
        `Cellphone: ${invoiceData.phonenumber}`,
      ].filter(Boolean);

      companyDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += isCompactLayout ? 5 : 6;
      });

      currentY += isCompactLayout ? 8 : 10;

      // Invoice Title and Document Number (side by side)
      doc.setFontSize(fonts.header);
      doc.setFont("helvetica", "bold");
      doc.text("Tax Invoice", margins.left, currentY);

      // Document number on the right side
      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Document No: ${invoiceData.doc_num}`,
        pageWidth - margins.right,
        currentY,
        { align: "right" }
      );
      currentY += isCompactLayout ? 12 : 15;

      // Client Details
      doc.setFontSize(fonts.small);
      const clientDetails = [
        invoiceData.client_name,
        invoiceData.client_address,
        invoiceData.client_suburb,
        `Telephone: ${invoiceData.client_telephone}`,
        `Date: ${formatDate(invoiceData.date)}`,
        `Email: ${invoiceData.client_email}`,
        `VAT Reg No: ${invoiceData.client_vat}`,
      ].filter(Boolean);

      clientDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += isCompactLayout ? 5 : 6;
      });

      currentY += isCompactLayout ? 8 : 10;

      // Destination Table
      const destinationRoute = `${invoiceData.pickup || ""} to ${
        `${document.getElementById("dropoff").innerHTML}` || ""
      }`;
      const destinationData = [["Destination", destinationRoute]];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: destinationData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: isCompactLayout ? 1.5 : 2.5,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
        },
        margin: { left: margins.left, right: margins.right },
      });

      currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 5 : 7);

      // Invoice Details Table
      const invoiceDetailsData = [
        ["Booking Ref", invoiceData.booking_ref || ""],
        ["File Number", invoiceData.file_no || ""],
        ["Description", invoiceData.description || ""],
        ["Vessel/Ref", invoiceData.vessel_name || ""],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: invoiceDetailsData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: isCompactLayout ? 1.5 : 2.5,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
        },
        margin: { left: margins.left, right: margins.right },
      });

      currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 5 : 7);

      // Container Table
      const hasWeights = containers.some(
        (container) => container.weight && container.weight !== "N/A"
      );
      const containerHeaders = hasWeights
        ? ["Container Number", "Weight"]
        : ["Container Number"];

      const containerData =
        containers.length > 0
          ? containers.map((container) => {
              const row = [container.container_number || "N/A"];
              if (
                hasWeights &&
                container.weight &&
                container.weight !== "N/A"
              ) {
                row.push(container.weight);
              }
              return row;
            })
          : [["No container information"]];

      autoTable(doc, {
        startY: currentY,
        head: [containerHeaders],
        body: containerData,
        theme: "grid",
        styles: {
          fontSize: isCompactLayout ? fonts.tiny : fonts.small,
          cellPadding: isCompactLayout ? 1.5 : 2.5,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [70, 130, 180],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        margin: { left: margins.left, right: margins.right },
      });

      currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 8 : 10);

      // Calculate invoice values
      const amount = invoiceData.invoice?.amount || invoiceData.total_cost || 0;
      const vat = calculateVAT(amount);
      const total = invoiceData.invoice?.total_amount || amount + vat;

      // Store the Y position for the side-by-side layout
      const sectionStartY = currentY;

      // Banking Details on the LEFT side
      const leftColumnWidth = (pageWidth - margins.left - margins.right) * 0.55; // 55% of available width

      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "bold");
      doc.text("Banking Details", margins.left, currentY);
      currentY += isCompactLayout ? 6 : 8;

      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");

      const bankingDetails = [
        `Account Name: ${invoiceData.name_of_acc || ""}`,
        `Bank Name: ${invoiceData.bank || ""}`,
        `Account Number: ${invoiceData.account_num || ""}`,
        `Branch Code: ${invoiceData.branch_code || ""}`,
        `SWIFT Code: ${invoiceData.swift_code || ""}`,
        `Reference: ${invoiceData.invoice_num || ""}`,
      ];

      bankingDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += isCompactLayout ? 5 : 6;
      });

      // Invoice Summary Table on the RIGHT side
      const rightColumnStart = margins.left + leftColumnWidth + 5; // 5mm gap
      const rightColumnWidth = (pageWidth - margins.left - margins.right) * 0.4; // 40% of available width

      const summaryData = [["Amount (excl. VAT)", formatCurrency(amount)]];

      if (vat > 0) {
        summaryData.push([`VAT (${invoiceData.vat}%)`, formatCurrency(vat)]);
      }

      summaryData.push(["Total Amount", formatCurrency(total)]);

      autoTable(doc, {
        startY: sectionStartY,
        head: [["Invoice Summary", ""]],
        body: summaryData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: isCompactLayout ? 1.5 : 2.5,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: {
          0: { fontStyle: "normal" },
          1: { fontStyle: "normal" },
        },
        columnStyles: {
          0: { cellWidth: rightColumnWidth * 0.6 },
          1: { cellWidth: rightColumnWidth * 0.4, halign: "right" },
        },
        didParseCell: (data) => {
          if (data.row.index === summaryData.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [220, 220, 220];
          }
        },
        margin: { left: rightColumnStart, right: margins.right },
      });

      // Calculate the final Y position (whichever section is lower)
      const bankingEndY = currentY;
      const summaryEndY = doc.lastAutoTable.finalY;
      currentY =
        Math.max(bankingEndY, summaryEndY) + (isCompactLayout ? 8 : 10);

      // Payment note and thank you message
      doc.setFontSize(fonts.tiny);
      doc.text(
        "Please ensure the invoice number is referenced when making payment.",
        margins.left,
        currentY
      );
      currentY += isCompactLayout ? 4 : 5;

      doc.setFontSize(fonts.small);
      doc.text(
        `Thank you for choosing ${invoiceData.companyname}.`,
        margins.left,
        currentY
      );

      // Save the PDF
      const filename = `Invoice-${invoiceData.invoice_num}.pdf`;
      doc.save(filename);

      setPdfLoading(false);
    } catch (error) {
      console.error("PDF generation error:", error);
      setPdfLoading(false);
    }
  };

  const handleEditClick = () => {
    if (invoiceData) {
      setEditData({
        dropoff: invoiceData.dropoff || "",
        amount: (
          invoiceData.invoice?.amount ||
          invoiceData.total_cost ||
          0
        ).toString(),
      });
      setIsEditMode(true);
      setSaveError(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditData({ dropoff: "", amount: "" });
    setSaveError(null);
  };

  const handleInputChange = (field, value) => {
    if (field === "amount") {
      // Remove any non-numeric characters except decimal point
      const numericValue = value.replace(/[^0-9.]/g, "");

      // Ensure only one decimal point
      const parts = numericValue.split(".");
      if (parts.length > 2) {
        return; // Don't update if more than one decimal point
      }

      // Prevent negative values
      if (Number.parseFloat(numericValue) < 0) {
        return;
      }

      setEditData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      setEditData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveClick = () => {
    // Validate amount
    const amount = Number.parseFloat(editData.amount);
    if (isNaN(amount) || amount < 0) {
      setSaveError("Amount must be a valid positive number");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setSaveLoading(true);
    setSaveError(null);
    setShowConfirmDialog(false);

    try {
      const updateData = {
        m1key: invoiceData.m1key,
        dropoff: editData.dropoff.trim(),
        rate: Number.parseFloat(editData.amount),
      };

      console.log("Sending update request:", updateData);

      const response = await api.put(
        "/api/invoice/update-instruction",
        updateData
      );

      console.log("Update response:", response.data);

      if (response.data.success) {
        // Update local state with new data
        setInvoiceData((prev) => ({
          ...prev,
          dropoff: editData.dropoff.trim(),
          total_cost: Number.parseFloat(editData.amount),
          invoice: {
            ...prev.invoice,
            amount: Number.parseFloat(editData.amount),
          },
        }));

        setIsEditMode(false);
        setEditData({ dropoff: "", amount: "" });
      } else {
        setSaveError(response.data.message || "Failed to update instruction");
      }
    } catch (err) {
      console.error("Error updating instruction:", err);
      setSaveError(
        err.response?.data?.message ||
          "Failed to update instruction. Please try again."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="client-invoice-wrapper">
        <div className="invoice-page">
          <div className="loading-error">Loading invoice data...</div>
          <div className="invoicedownloadbtn1">
            <button className="back-btn" onClick={() => navigate("/invoices")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-invoice-wrapper">
        <div className="invoice-page">
          <div className="loading-error">{error}</div>
          <div className="invoicedownloadbtn1">
            <button className="back-btn" onClick={() => navigate("/invoices")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="client-invoice-wrapper">
        <div className="invoice-page">
          <div className="loading-error">No invoice data found.</div>
          <div className="invoicedownloadbtn1">
            <button className="back-btn" onClick={() => navigate("/invoices")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const amount = invoiceData.invoice?.amount || invoiceData.total_cost || 0;
  const vat = calculateVAT(amount);
  const total = invoiceData.invoice?.total_amount || amount + vat;
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  const containers = invoiceData.containers || [];

  return (
    <div className="client-invoice-wrapper">
      <div className="invoice-page">
        <div className="invoice-paper" ref={invoiceRef}>
          {/* Transport and Logistics section */}
          <div className="transport-section">
            <div className="section-title">{invoiceData.companyname}</div>
          </div>

          {/* Middle section with company details */}
          <div className="middle-section">
            <div className="company-info">
              {invoiceData.cluster_box}
              <br />
              {invoiceData.address}
              <br />
              {invoiceData.suburb}
              <br />
              VAT Reg No: {invoiceData.vat_reg_num}
              <br />
              Cellphone: {invoiceData.phonenumber}
            </div>
          </div>

          {/* Invoice Title section */}
          <div className="invoice-title-section">
            <div className="invoice-title">Tax Invoice</div>
            <div className="document-number">
              Document No: {invoiceData.doc_num}
            </div>
          </div>

          {/* Sender Details */}
          <div className="sender-details">
            <div>{invoiceData.client_name}</div>
            <div>{invoiceData.client_address}</div>
            <div>{invoiceData.client_suburb}</div>
            <div>Telephone: {invoiceData.client_telephone}</div>
            <div>Date: {formatDate(invoiceData.date)}</div>
            <div>Email: {invoiceData.client_email}</div>
            <div>VAT Reg No: {invoiceData.client_vat}</div>
          </div>

          {/* Vessel/Ref and Destination */}
          <div className="vessel-destination">
            <div className="vessel">Starting : {invoiceData.pickup}</div>
            <div className="destination" id="destination">
              Destination :
              {isEditMode ? (
                <input
                  type="text"
                  value={editData.dropoff}
                  onChange={(e) => handleInputChange("dropoff", e.target.value)}
                  className="edit-input dropoff-input"
                  placeholder="Enter destination"
                />
              ) : (
                <div className="dropoff" id="dropoff">
                  {invoiceData.dropoff}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details">
            <table className="details-table">
              <tbody>
                <tr>
                  <td className="label">Booking Ref</td>
                  <td className="value">{invoiceData.booking_ref}</td>
                </tr>
                <tr>
                  <td className="label">File Number</td>
                  <td className="value">{invoiceData.file_no}</td>
                </tr>
                <tr>
                  <td className="label">Description</td>
                  <td className="value">{invoiceData.description}</td>
                </tr>
                <tr>
                  <td className="label">Vessel/Ref</td>
                  <td className="value">{invoiceData.vessel_name}</td>
                </tr>
              </tbody>
            </table>

            {/* Container Details */}
            <div className="container-section">
              <table className="container-table5">
                <thead>
                  <tr>
                    <th className="container-number-header">
                      Container Number
                    </th>
                    {containers.some(
                      (container) =>
                        container.weight && container.weight !== "N/A"
                    ) && <th className="weight-header">Weight</th>}
                  </tr>
                </thead>
                <tbody>
                  {containers.length > 0 ? (
                    containers.map((container, index) => {
                      return (
                        <tr key={index}>
                          <td className="container-number">
                            {container.container_number ||
                              `Container ${index + 1}`}
                          </td>
                          {container.weight && container.weight !== "N/A" && (
                            <td className="weight">{container.weight}</td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="container-number">
                        No container information
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Summary Table */}
              <div className="summary-section">
                <table className="container-table5">
                  <thead>
                    <tr>
                      <th className="summary-header" colSpan="2">
                        Invoice Summary
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="summary-label">Amount (excl. VAT)</td>
                      <td className="summary-value">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={editData.amount}
                            onChange={(e) =>
                              handleInputChange("amount", e.target.value)
                            }
                            className="edit-input amount-input"
                            placeholder="0.00"
                          />
                        ) : (
                          formatCurrency(amount)
                        )}
                      </td>
                    </tr>
                    {vat > 0 && (
                      <tr>
                        <td className="summary-label">
                          VAT ({invoiceData.vat}%)
                        </td>
                        <td className="summary-value">{formatCurrency(vat)}</td>
                      </tr>
                    )}
                    <tr className="summary-total-row">
                      <td className="summary-total-label">Total Amount</td>
                      <td className="summary-total-value">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="banking-details">
            <div>Account Name: {invoiceData.name_of_acc}</div>
            <div>Bank Name: {invoiceData.bank}</div>
            <div>Account Number: {invoiceData.account_num}</div>
            <div>Branch Code: {invoiceData.branch_code}</div>
            <div>SWIFT Code: {invoiceData.swift_code}</div>
            <div>Reference: {invoiceData.invoice_num}</div>
            <div className="payment-note">
              Please ensure the invoice number is referenced when making
              payment.
            </div>
            <div className="thank-you">
              Thank you for choosing {invoiceData.companyname}.
            </div>
          </div>
        </div>

        {showConfirmDialog && (
          <div className="confirmation-dialog-overlay">
            <div className="confirmation-dialog">
              <h3>Confirm Changes</h3>
              <p>Are you sure you want to save these changes?</p>
              <div className="dialog-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={saveLoading}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleConfirmSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="invoicedownloadbtn1">
          {isEditMode ? (
            <div className="edit-controls">
              {saveError && <div className="error-message">{saveError}</div>}
              <button
                className="cancel-edit-btn"
                onClick={handleCancelEdit}
                disabled={saveLoading}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleSaveClick}
                disabled={saveLoading}
              >
                {saveLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <>
              {roleId == 3 && (
                <button className="edit-btn" onClick={handleEditClick}>
                  Edit
                </button>
              )}
              <button
                className="back-btn"
                onClick={() => {
                  if (roleId == 3) {
                    navigate("/invoices", {
                      state: {
                        clientId,
                        clientName,
                      },
                    });
                  } else if (roleId == 4) {
                    navigate("/DirectorClientDocuments", {
                      state: {
                        clientId: invoiceData.m5clientkey,
                        clientName: invoiceData.client_name,
                      },
                    });
                  } else if (roleId == 1) {
                    navigate("/client-documents", {
                      state: {
                        clientId: invoiceData.m5clientkey,
                        clientName: invoiceData.client_name,
                      },
                    });
                  }
                }}
              >
                Back
              </button>
              <button
                className="download-btn"
                onClick={generatePDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? "Generating PDF..." : "Download PDF"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInvoice;
