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
            });
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
    const vat = subtotal * 0.15;
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
      let currentY = margins.top;

      // Company Header
      doc.setFontSize(fonts.title);
      doc.setFont("helvetica", "bold");
      doc.text(companyInfo.name || "Company Name", margins.left, currentY);
      currentY += 5;

      // Company Details
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");
      const companyDetails = [
        companyInfo.address,
        companyInfo.city,
        `Phone: ${companyInfo.phone}`,
        `Email: ${companyInfo.email}`,
        `VAT Reg No: ${companyInfo.vat_reg_num}`,
      ].filter(Boolean);
      companyDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += 4;
      });
      currentY += 6;

      // Invoice Title and Number
      doc.setFontSize(fonts.header);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice", margins.left, currentY);
      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Invoice No: ${formData.invoice_number || "TBA"}`,
        pageWidth - margins.right,
        currentY,
        { align: "right" }
      );
      currentY += 6;

      // Client Details
      doc.setFontSize(fonts.small);
      const clientDetails = [
        clientInfo.name,
        clientInfo.address,
        clientInfo.city,
        `Telephone: ${clientInfo.telephone}`,
        `Email: ${clientInfo.email}`,
        `VAT Reg No: ${clientInfo.vat_reg_num}`,
        `Date: ${formatDate(formData.date)}`,
      ].filter(Boolean);
      clientDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += 4;
      });
      currentY += 6;

      // Service Details Table
      const serviceData = formData.items.map((item) => [
        item.category || "N/A",
        item.description || "N/A",
        formatDate(formData.date),
        formatCurrency(item.item_amount || 0),
      ]);
      autoTable(doc, {
        startY: currentY,
        head: [["Category", "Description", "Date", "Amount"]],
        body: serviceData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.5,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 25 },
          3: { cellWidth: 25, halign: "right" },
        },
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        margin: { left: margins.left, right: margins.right },
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
        ["VAT (15%)", formatCurrency(vat)],
        ["Total Amount", formatCurrency(total)],
      ];
      autoTable(doc, {
        startY: sectionStartY,
        head: [["Invoice Summary", ""]],
        body: summaryData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.5,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [34, 139, 34],
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
      doc.save(`addon-invoice-${formData.invoice_number || "new"}.pdf`);
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
            {isViewMode && formData.invoice_number && (
              <p className="invoice-number">
                Invoice #: {formData.invoice_number}
              </p>
            )}
            <p className="invoice-date">
              Date: {new Date().toLocaleDateString()}
            </p>
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
                  + Add Item
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
                    {formatCurrency(calculateTotals().vat)}
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
