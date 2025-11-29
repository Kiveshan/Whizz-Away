"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import "../css/AddOnForm.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AddOnForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName, addonId } = location.state || {};

  const isViewMode = !!addonId;

  const [formData, setFormData] = useState({
    items: [{ category: "", description: "", item_amount: "" }],
    date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    group_id: "",
    vat_applied: true, // New field for VAT toggle
    booking_ref: "",
    client_ref: "",
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch_code: "",
    swift_code: "",
  });

  const [clientInfo, setClientInfo] = useState({
    name: clientName || "",
    address: "",
    city: "",
    telephone: "",
    email: "",
    vat_reg_num: "",
  });

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fetchingData, setFetchingData] = useState(isViewMode);
  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [isEditingInvoiceNum, setIsEditingInvoiceNum] = useState(false);
  const [invoiceNumInput, setInvoiceNumInput] = useState("");
  const [savingInvoiceNum, setSavingInvoiceNum] = useState(false);
  const [saveInvoiceError, setSaveInvoiceError] = useState(null);

  useEffect(() => {
    const fetchCompanyAndClientInfo = async () => {
      try {
        setFetchingInfo(true);
        const companyResponse = await api.get("/api/companyinfo", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (companyResponse.data.success) {
          setCompanyInfo({
            name: companyResponse.data.data.name || "",
            address: companyResponse.data.data.address || "",
            city: companyResponse.data.data.city || "",
            phone: companyResponse.data.data.phone || "",
            email: companyResponse.data.data.email || "",
            vat_reg_num: companyResponse.data.data.vat_reg_num || "",
            account_num: companyResponse.data.data.account_num || "",
            name_of_acc: companyResponse.data.data.name_of_acc || "",
            bank: companyResponse.data.data.bank || "",
            branch_code: companyResponse.data.data.branch_code || "",
            swift_code: companyResponse.data.data.swift_code || "",
          });
        } else {
          throw new Error(
            companyResponse.data.message || "Failed to fetch company details"
          );
        }

        if (clientId) {
          const clientResponse = await api.get(
            `/api/add-on/client/${clientId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (clientResponse.data.success) {
            setClientInfo({
              name: clientName || clientResponse.data.data.name || "",
              address: clientResponse.data.data.address || "",
              city: clientResponse.data.data.city || "",
              telephone: clientResponse.data.data.telephone || "",
              email: clientResponse.data.data.email || "",
              vat_reg_num: clientResponse.data.data.vat_reg_num || "",
            });
          } else {
            throw new Error(
              clientResponse.data.message || "Failed to fetch client details"
            );
          }
        }
      } catch (err) {
        console.error("Error fetching info:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/");
          return;
        }
        setError(
          err.response?.data?.message ||
            err.message ||
            "An error occurred while fetching company or client details"
        );
      } finally {
        setFetchingInfo(false);
      }
    };

    fetchCompanyAndClientInfo();

    if (isViewMode && addonId) {
      const fetchAddonData = async () => {
        try {
          setFetchingData(true);
          const response = await api.get(`/api/addons/${addonId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (response.data.success) {
            const addon = response.data.data;
            setFormData({
              items: addon.items || [
                { category: "", description: "", item_amount: "" },
              ],
              date: new Date(addon.date).toISOString().split("T")[0] || "",
              invoice_number: addon.invoice_number || "",
              group_id: addon.group_id || "",
              vat_applied:
                addon.vat_applied !== undefined ? addon.vat_applied : true,
              booking_ref: addon.booking_ref || "",
              client_ref: addon.client_ref || "",
            });
            setInvoiceNumInput(addon.invoice_number || "");
          } else {
            throw new Error(
              response.data.message || "Failed to fetch add-on details"
            );
          }
        } catch (err) {
          console.error("Error fetching add-on:", err);
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/");
            return;
          }
          setError(
            err.response?.data?.message ||
              err.message ||
              "An error occurred while fetching add-on details"
          );
        } finally {
          setFetchingData(false);
        }
      };
      fetchAddonData();
    }
  }, [isViewMode, addonId, clientId, clientName, navigate]);

  const handleStartEditInvoiceNum = () => {
    setSaveInvoiceError(null);
    setInvoiceNumInput(formData.invoice_number || "");
    setIsEditingInvoiceNum(true);
  };

  const handleCancelEditInvoiceNum = () => {
    setIsEditingInvoiceNum(false);
    setInvoiceNumInput(formData.invoice_number || "");
    setSaveInvoiceError(null);
  };

  const handleSaveInvoiceNum = async () => {
    if (!isViewMode || !addonId) return;
    if (!invoiceNumInput || invoiceNumInput.trim().length === 0) {
      setSaveInvoiceError("Invoice number is required");
      return;
    }
    // Frontend-only: update local state so the PDF reflects the typed number
    setSaveInvoiceError(null);
    setFormData((prev) => ({ ...prev, invoice_number: invoiceNumInput.trim() }));
    setIsEditingInvoiceNum(false);
  };

  const handleInputChange = (index, e) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    const newItems = [...formData.items];
    if (name === "item_amount") {
      const numericValue = value.replace(/[^0-9.]/g, "");
      if (
        numericValue === "" ||
        (!isNaN(numericValue) && Number.parseFloat(numericValue) >= 0)
      ) {
        newItems[index] = { ...newItems[index], [name]: numericValue };
      }
    } else {
      newItems[index] = { ...newItems[index], [name]: value };
    }
    setFormData((prev) => ({ ...prev, items: newItems }));
    if (error) setError(null);
  };

  const handleVatToggle = () => {
    if (isViewMode) return;
    setFormData((prev) => ({ ...prev, vat_applied: !prev.vat_applied }));
    if (error) setError(null);
  };

  const addItem = () => {
    if (isViewMode) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { category: "", description: "", item_amount: "" },
      ],
    }));
  };

  const removeItem = (index) => {
    if (isViewMode || formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const validateForm = () => {
    if (formData.items.length === 0) {
      setError("At least one item is required");
      return false;
    }
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.category.trim()) {
        setError(`Please enter a category for item ${i + 1}`);
        return false;
      }
      if (!item.description.trim()) {
        setError(`Please enter a description for item ${i + 1}`);
        return false;
      }
      if (!item.item_amount || Number.parseFloat(item.item_amount) <= 0) {
        setError(
          `Please enter a valid amount greater than 0 for item ${i + 1}`
        );
        return false;
      }
    }
    if (!formData.date) {
      setError("Please select a date");
      return false;
    }
    if (!formData.booking_ref || formData.booking_ref.trim().length === 0) {
      setError("Booking Ref is required");
      return false;
    }
    if (!formData.client_ref || formData.client_ref.trim().length === 0) {
      setError("Client Ref is required");
      return false;
    }
    if (formData.booking_ref.length > 50 || formData.client_ref.length > 50) {
      setError("Booking Ref and Client Ref must be at most 50 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const submitData = {
        client_id: clientId,
        items: formData.items.map((item) => ({
          category: item.category.trim(),
          description: item.description.trim(),
          item_amount: Number.parseFloat(item.item_amount),
        })),
        date: formData.date,
        vat_applied: formData.vat_applied,
        booking_ref: formData.booking_ref.trim(),
        client_ref: formData.client_ref.trim(),
      };
      const response = await api.post("/api/addons", submitData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (response.data.success) {
        setFormData((prev) => ({
          ...prev,
          invoice_number: response.data.data.invoice_number,
          group_id: response.data.data.group_id,
        }));
        setSuccess(true);
        setTimeout(() => {
          navigate(`/view-add-on-list`, {
            state: { clientId, clientName },
          });
        }, 2000);
      } else {
        throw new Error(response.data.message || "Failed to create add-on");
      }
    } catch (err) {
      console.error("Error creating add-on:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred while creating the add-on"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/view-add-on-list`, {
      state: { clientId, clientName },
    });
  };

  const formatCurrency = (amount) => {
    return `R${Number.parseFloat(amount).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-ZA");
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + Number.parseFloat(item.item_amount || 0),
      0
    );
    const vat = formData.vat_applied ? subtotal * 0.15 : 0;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handlePrint = () => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      // Brand and typography
      const brand = {
        primary: [45, 55, 72], // dark slate
        accent: [70, 130, 180], // steel blue
        gray: [110, 120, 140],
      };

      const fonts = {
        title: 16,
        header: 12,
        normal: 10,
        small: 9,
        tiny: 8,
      };

      const margins = {
        left: 10,
        right: 10,
        top: 10,
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = margins.top;

      // Header band
      doc.setFillColor(...brand.primary);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fonts.title);
      doc.text(companyInfo.name || "Company Name", margins.left, 12);
      doc.setFontSize(fonts.header);
      doc.setFont('helvetica', 'normal');
      doc.text('INVOICE', pageWidth - margins.right, 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      currentY = 18 + 6;

      // Two-column FROM / BILL TO
      const colGap = 8;
      const colWidth = (pageWidth - margins.left - margins.right - colGap) / 2;
      doc.setFontSize(fonts.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brand.gray);
      doc.text('FROM', margins.left, currentY);
      doc.text('BILL TO', margins.left + colWidth + colGap, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      currentY += 5;

      const leftDetails = [
        companyInfo.address,
        companyInfo.city,
        `Phone: ${companyInfo.phone || ''}`,
        `Email: ${companyInfo.email || ''}`,
        `VAT Reg No: ${companyInfo.vat_reg_num || ''}`,
      ].filter(Boolean);

      const rightDetails = [
        clientInfo.name,
        clientInfo.address,
        clientInfo.city,
        `Telephone: ${clientInfo.telephone || ''}`,
        `Email: ${clientInfo.email || ''}`,
        `VAT Reg No: ${clientInfo.vat_reg_num || ''}`,
      ].filter(Boolean);

      const maxLines = Math.max(leftDetails.length, rightDetails.length);
      for (let i = 0; i < maxLines; i++) {
        if (leftDetails[i]) doc.text(String(leftDetails[i]), margins.left, currentY);
        if (rightDetails[i]) doc.text(String(rightDetails[i]), margins.left + colWidth + colGap, currentY);
        currentY += 5;
      }
      currentY += 4;

      // Invoice meta row (Invoice No and Date)
      doc.setFontSize(fonts.normal);
      const invMetaLeft = `Invoice No: ${formData.invoice_number || 'TBA'}`;
      const invMetaRight = `Date: ${formatDate(formData.date)}`;
      doc.text(invMetaLeft, margins.left, currentY);
      doc.text(invMetaRight, pageWidth - margins.right, currentY, { align: 'right' });
      currentY += 8;

      // References section (Booking Ref / Client Ref)
      if (formData.booking_ref || formData.client_ref) {
        autoTable(doc, {
          startY: currentY,
          head: [["References", ""]],
          body: [
            ["Booking Ref", formData.booking_ref || "—"],
            ["Client Ref", formData.client_ref || "—"],
          ],
          theme: "grid",
          styles: { fontSize: fonts.small, cellPadding: 1.2, lineWidth: 0.1, lineColor: brand.gray },
          headStyles: { fillColor: brand.accent, textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: (pageWidth - margins.left - margins.right - 40), halign: 'left' } },
          margin: { left: margins.left, right: margins.right },
        });
        currentY = doc.lastAutoTable.finalY + 6;
      }

      // Service Details Table
      const serviceData = formData.items.map((item) => [
        formatDate(formData.date),
        item.category || "N/A",
        item.description || "N/A",
        formatCurrency(item.item_amount || 0),
      ]);
      autoTable(doc, {
        startY: currentY,
        head: [["Date", "Category", "Description", "Amount"]],
        body: serviceData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.2,
          lineWidth: 0.1,
          overflow: 'ellipsize',
          lineColor: brand.gray,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 28, halign: "right" },
        },
        headStyles: {
          fillColor: brand.accent,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        margin: { left: margins.left, right: margins.right },
        rowPageBreak: 'avoid',
        didParseCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.minCellHeight = 6;
          } else {
            data.cell.styles.minCellHeight = 5.5;
          }
        },
        didDrawPage: () => {
          // Footer with page numbers
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(str, pageWidth - margins.right, pageHeight - 6, { align: 'right' });
        },
      });
      currentY = doc.lastAutoTable.finalY + 5;

      // Financial Summary
      const { subtotal, vat, total } = calculateTotals();
      const sectionStartY = currentY;

      // Banking Details (Left)
      const leftColumnWidth = (pageWidth - margins.left - margins.right) * 0.55;
      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "bold");
      doc.text("Banking Details", margins.left, currentY);
      currentY += 5;
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");
      const bankingDetails = [
        `Account Name: ${companyInfo.name_of_acc || "N/A"}`,
        `Bank Name: ${companyInfo.bank || "N/A"}`,
        `Account Number: ${companyInfo.account_num || "N/A"}`,
        `Branch Code: ${companyInfo.branch_code || "N/A"}`,
        `SWIFT Code: ${companyInfo.swift_code || "N/A"}`,
        `Reference: ${formData.invoice_number || "TBA"}`,
      ].filter(Boolean);
      bankingDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += 4;
      });

      // Invoice Summary (Right)
      const rightColumnStart = margins.left + leftColumnWidth + 5;
      const rightColumnWidth = (pageWidth - margins.left - margins.right) * 0.4;
      const summaryData = [
        ["Subtotal (excl. VAT)", formatCurrency(subtotal)],
        ...(formData.vat_applied
          ? [["VAT (15%)", formatCurrency(vat)]]
          : [["VAT", "Not Applied"]]),
        ["Total Amount", formatCurrency(total)],
      ];
      autoTable(doc, {
        startY: sectionStartY,
        head: [["Invoice Summary", ""]],
        body: summaryData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.2,
          lineWidth: 0.1,
          lineColor: brand.gray,
        },
        headStyles: {
          fillColor: brand.accent,
          textColor: [255, 255, 255],
          fontStyle: "bold",
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

      // Finalize Y position
      const bankingEndY = currentY;
      const summaryEndY = doc.lastAutoTable.finalY;
      currentY = Math.max(bankingEndY, summaryEndY) + 6;

      // Footer Notes
      doc.setFontSize(fonts.tiny);
      doc.text(
        "Please ensure the invoice number is referenced when making payment.",
        margins.left,
        currentY
      );
      currentY += 4;
      doc.setFontSize(fonts.small);
      doc.text(
        `Thank you for choosing ${companyInfo.name || "our company"}.`,
        margins.left,
        currentY
      );

      // Save PDF
      const fileName = `addon-invoice-${formData.invoice_number || "new"}-${formatDate(formData.date)}.pdf`;
      doc.save(fileName);
      setPdfLoading(false);
    } catch (error) {
      console.error("PDF generation error:", error);
      setPdfLoading(false);
    }
  };

  if (!clientId) {
    return (
      <div className="addon-form-wrapper">
        <div className="addon-form-container">
          <div>Please select a client from the previous page.</div>
        </div>
      </div>
    );
  }

  if (fetchingData || fetchingInfo) {
    return (
      <div className="addon-form-wrapper">
        <div className="addon-form-container">
          <div>Loading data...</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="addon-form-wrapper">
        <div className="addon-form-container">
          <div className="success-message">
            <h2>Add-On Created Successfully!</h2>
            <p>Redirecting to add-on list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="addon-form-wrapper">
      <div className="addon-form-container">
        <div className="invoice-header">
          <div className="company-details">
            <h2>{companyInfo.name || "Company Name"}</h2>
            <p>{companyInfo.address}</p>
            <p>{companyInfo.city}</p>
            <p>Phone: {companyInfo.phone}</p>
            <p>VAT Reg No: {companyInfo.vat_reg_num}</p>
          </div>
          <div className="invoice-details">
            {isViewMode && (
              <div className="invoice-number" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {!isEditingInvoiceNum ? (
                  <>
                    <span>Invoice #:</span>
                    <strong>{formData.invoice_number || "—"}</strong>
                    <button
                      type="button"
                      className="print-button"
                      onClick={handleStartEditInvoiceNum}
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={invoiceNumInput}
                      onChange={(e) => setInvoiceNumInput(e.target.value)}
                      className="form-input"
                      placeholder="Enter invoice number"
                      style={{ width: "200px" }}
                    />
                    <button
                      type="button"
                      className="print-button"
                      onClick={handleSaveInvoiceNum}
                      disabled={savingInvoiceNum}
                    >
                      {savingInvoiceNum ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="back-button"
                      onClick={handleCancelEditInvoiceNum}
                      disabled={savingInvoiceNum}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
            {saveInvoiceError && (
              <div className="error-message" style={{ marginTop: "6px" }}>{saveInvoiceError}</div>
            )}
          </div>
        </div>

        <div className="client-section">
          <div className="bill-to">
            <h3>Bill To:</h3>
            <p>{clientInfo.name}</p>
            <p>{clientInfo.address}</p>
            <p>{clientInfo.city}</p>
            <p>Tel: {clientInfo.telephone}</p>
            <p>Email: {clientInfo.email}</p>
            <p>VAT Reg No: {clientInfo.vat_reg_num}</p>
          </div>
          <div className="client-actions">
            <div className="form-group date-group">
              <label htmlFor="date">Invoice Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="form-input"
                required
                readOnly={isViewMode}
              />
            </div>
            <div className="form-group">
              <label htmlFor="booking_ref">Booking Ref</label>
              <input
                type="text"
                id="booking_ref"
                name="booking_ref"
                value={formData.booking_ref}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, booking_ref: e.target.value }))
                }
                className="form-input"
                maxLength={50}
                required
                readOnly={isViewMode}
              />
            </div>
            <div className="form-group">
              <label htmlFor="client_ref">Client Ref</label>
              <input
                type="text"
                id="client_ref"
                name="client_ref"
                value={formData.client_ref}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, client_ref: e.target.value }))
                }
                className="form-input"
                maxLength={50}
                required
                readOnly={isViewMode}
              />
            </div>
            <div className="invoice-actions">
              <button onClick={handleBack} className="back-button">
                ← Back
              </button>
              {isViewMode && (
                <button
                  onClick={handlePrint}
                  className="print-button"
                  disabled={pdfLoading}
                >
                  {pdfLoading ? "Generating PDF..." : "🖨️ Print"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="invoice-form-section">
          <form onSubmit={handleSubmit} className="invoice-form">
            {error && <div className="error-message">{error}</div>}

            <div className="invoice-items-header">
              <h3>Invoice Details</h3>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addItem}
                  className="add-item-button"
                >
                  Add
                </button>
              )}
            </div>

            <div className="invoice-items-table">
              {formData.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`category-${index}`}>Category</label>
                      <input
                        type="text"
                        id={`category-${index}`}
                        name="category"
                        value={item.category}
                        onChange={(e) => handleInputChange(index, e)}
                        placeholder="Category"
                        className="form-input"
                        required
                        readOnly={isViewMode}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`description-${index}`}>
                        Description
                      </label>
                      <textarea
                        id={`description-${index}`}
                        name="description"
                        value={item.description}
                        onChange={(e) => handleInputChange(index, e)}
                        placeholder="Description"
                        className="form-textarea"
                        rows="1"
                        required
                        readOnly={isViewMode}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`item_amount-${index}`}>Amount</label>
                      <div className="amount-input-wrapper">
                        <span className="currency-symbol">R</span>
                        <input
                          type="text"
                          id={`item_amount-${index}`}
                          name="item_amount"
                          value={item.item_amount}
                          onChange={(e) => handleInputChange(index, e)}
                          placeholder="0.00"
                          className="amount-input"
                          required
                          readOnly={isViewMode}
                        />
                      </div>
                    </div>
                  </div>

                  {!isViewMode && formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="remove-item-button"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <div className="vat-toggle">
                <label className="vat-toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.vat_applied}
                    onChange={handleVatToggle}
                    disabled={isViewMode}
                  />
                  <span className="vat-toggle-slider"></span>
                  Add VAT (15%)
                </label>
              </div>

              <div className="invoice-summary">
                <div className="summary-row subtotal">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-amount">
                    {formatCurrency(calculateTotals().subtotal)}
                  </span>
                </div>

                <div className="summary-row vat">
                  <span className="summary-label">VAT (15%):</span>
                  <span className="summary-amount">
                    {formData.vat_applied
                      ? formatCurrency(calculateTotals().vat)
                      : "Not Applied"}
                  </span>
                </div>

                <div className="summary-row total">
                  <span className="summary-label">Total:</span>
                  <span className="summary-amount">
                    {formatCurrency(calculateTotals().total)}
                  </span>
                </div>
              </div>
            </div>

            {!isViewMode && (
              <div className="invoice-actions-footer">
                <button
                  type="submit"
                  className="create-invoice-button"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddOnForm;
