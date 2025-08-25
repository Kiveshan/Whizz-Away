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
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    invoice_number: "",
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    city: "", // Maps to suburb from usertable
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
        // Fetch company information
        const companyResponse = await api.get("/api/companyinfo", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (companyResponse.data.success) {
          setCompanyInfo({
            name: companyResponse.data.data.name || "",
            address: companyResponse.data.data.address || "",
            city: companyResponse.data.data.city || "", // Maps to suburb
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

        // Fetch client information
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
              category: addon.category || "",
              amount: addon.amount.toString() || "",
              date: new Date(addon.date).toISOString().split("T")[0] || "",
              description: addon.description || "",
              invoice_number: addon.invoice_number || "",
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

  const handleInputChange = (e) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    if (name === "amount") {
      const numericValue = value.replace(/[^0-9.]/g, "");
      if (
        numericValue === "" ||
        (!isNaN(numericValue) && Number.parseFloat(numericValue) >= 0)
      ) {
        setFormData((prev) => ({
          ...prev,
          [name]: numericValue,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.category.trim()) {
      setError("Please enter a category");
      return false;
    }
    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return false;
    }
    if (!formData.date) {
      setError("Please select a date");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Please enter a description");
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
        category: formData.category.trim(),
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        description: formData.description.trim(),
      };
      const response = await api.post("/api/addons", submitData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/addons/${encodeURIComponent(clientName)}`, {
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

  const handlePrint = () => {
    setPdfLoading(true);
    try {
      const isCompactLayout = true;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const fonts = {
        title: 18,
        header: 14,
        normal: 11,
        small: 10,
        tiny: 9,
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
      currentY += 6;

      // Company Details
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");
      const companyDetails = [
        companyInfo.address,
        companyInfo.city, // Maps to suburb
        `Phone: ${companyInfo.phone}`,
        `Email: ${companyInfo.email}`,
        `VAT Reg No: ${companyInfo.vat_reg_num}`,
      ].filter(Boolean);
      companyDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += 5;
      });
      currentY += 8;

      // Invoice Title and Number
      doc.setFontSize(fonts.header);
      doc.setFont("helvetica", "bold");
      doc.text("Add-On Invoice", margins.left, currentY);
      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Invoice No: ${formData.invoice_number || "TBA"}`,
        pageWidth - margins.right,
        currentY,
        { align: "right" }
      );
      currentY += 12;

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
        currentY += 5;
      });
      currentY += 8;

      // Service Details Table
      const serviceData = [
        ["Category", formData.category || "N/A"],
        ["Description", formData.description || "N/A"],
        ["Date", formatDate(formData.date)],
      ];
      autoTable(doc, {
        startY: currentY,
        head: [],
        body: serviceData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.5,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
        },
        margin: { left: margins.left, right: margins.right },
      });
      currentY = doc.lastAutoTable.finalY + 5;

      // Financial Summary
      const amount = Number.parseFloat(formData.amount || 0);
      const vat = amount * 0.15;
      const total = amount + vat;
      const sectionStartY = currentY;

      // Banking Details (Left)
      const leftColumnWidth = (pageWidth - margins.left - margins.right) * 0.55;
      doc.setFontSize(fonts.normal);
      doc.setFont("helvetica", "bold");
      doc.text("Banking Details", margins.left, currentY);
      currentY += 6;
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
        currentY += 5;
      });

      // Invoice Summary (Right)
      const rightColumnStart = margins.left + leftColumnWidth + 5;
      const rightColumnWidth = (pageWidth - margins.left - margins.right) * 0.4;
      const summaryData = [
        ["Amount (excl. VAT)", formatCurrency(amount)],
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
      currentY = Math.max(bankingEndY, summaryEndY) + 8;

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
            <p>Telephone: {clientInfo.telephone}</p>
            <p>Email: {clientInfo.email}</p>
            <p>VAT Reg No: {clientInfo.vat_reg_num}</p>
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
                {pdfLoading ? "Generating PDF..." : "🖨️ Print Invoice"}
              </button>
            )}
          </div>
        </div>

        <div className="invoice-form-section">
          <form onSubmit={handleSubmit} className="invoice-form">
            {error && <div className="error-message">{error}</div>}

            <div className="invoice-items-header">
              <h3>Details</h3>
            </div>

            <div className="invoice-items-table">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Enter service category..."
                    className="form-input"
                    required
                    readOnly={isViewMode}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    readOnly={isViewMode}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter detailed description of the add-on service..."
                  className="form-textarea"
                  rows="4"
                  required
                  readOnly={isViewMode}
                />
              </div>

              <div className="invoice-summary">
                <div className="summary-row">
                  <span className="summary-label">Amount (excl. VAT):</span>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">R</span>
                    <input
                      type="text"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="amount-input"
                      required
                      readOnly={isViewMode}
                    />
                  </div>
                </div>

                <div className="summary-row subtotal">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-amount">
                    {formatCurrency(formData.amount || 0)}
                  </span>
                </div>

                <div className="summary-row vat">
                  <span className="summary-label">VAT (15%):</span>
                  <span className="summary-amount">
                    {formatCurrency((formData.amount || 0) * 0.15)}
                  </span>
                </div>

                <div className="summary-row total">
                  <span className="summary-label">Total Amount:</span>
                  <span className="summary-amount">
                    {formatCurrency((formData.amount || 0) * 1.15)}
                  </span>
                </div>
              </div>
            </div>

            <div className="invoice-actions-footer">
              {!isViewMode && (
                <button
                  type="submit"
                  className="create-invoice-button"
                  disabled={loading}
                >
                  {loading ? "Creating Invoice..." : "Create Add-On Invoice"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddOnForm;
