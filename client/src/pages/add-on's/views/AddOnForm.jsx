"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import "../css/AddOnForm.css";
import jsPDF from "jspdf";

const AddOnForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName, addonId } = location.state || {};

  const isViewMode = !!addonId;

  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0], // Today's date as default
    description: "",
    invoice_number: "", // Add invoice number for view mode
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fetchingData, setFetchingData] = useState(isViewMode); // Loading state for fetching existing data

  // Predefined categories
  const categories = [
    "Additional Services",
    "Extra Materials",
    "Rush Delivery",
    "Special Handling",
    "Overtime Work",
    "Equipment Rental",
    "Consultation",
    "Other",
  ];

  useEffect(() => {
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
              category: addon.category,
              amount: addon.amount.toString(),
              date: new Date(addon.date).toISOString().split("T")[0],
              description: addon.description,
              invoice_number: addon.invoice_number,
            });
          } else {
            throw new Error(
              response.data.message || "Failed to fetch add-on details"
            );
          }
        } catch (err) {
          console.error("Error fetching add-on:", err);

          // Handle token expiration
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
  }, [isViewMode, addonId, navigate]);

  const handleInputChange = (e) => {
    if (isViewMode) return;

    const { name, value } = e.target;

    // Special handling for amount field
    if (name === "amount") {
      // Only allow positive numbers with decimals
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

    // Clear any existing errors
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.category.trim()) {
      setError("Please select a category");
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

      // Handle token expiration
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
    navigate(`/addons/${encodeURIComponent(clientName)}`, {
      state: { clientId, clientName },
    });
  };

  const handlePrint = () => {
    const doc = new jsPDF();

    // Company Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Your Company Name", 20, 30);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("123 Business Street", 20, 40);
    doc.text("City, Province 12345", 20, 45);
    doc.text("Phone: (123) 456-7890", 20, 50);

    // Invoice Title and Details
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ADD-ON INVOICE", 140, 30);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (formData.invoice_number) {
      doc.text(`Invoice #: ${formData.invoice_number}`, 140, 40);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 45);

    // Client Information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(clientName, 20, 80);

    // Service Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Service Details:", 20, 100);

    doc.setFont("helvetica", "normal");
    doc.text(`Category: ${formData.category}`, 20, 110);
    doc.text(`Date: ${new Date(formData.date).toLocaleDateString()}`, 20, 120);
    doc.text(`Description: ${formData.description}`, 20, 130);

    // Financial Summary
    const amount = Number.parseFloat(formData.amount || 0);
    const vat = amount * 0.15;
    const total = amount + vat;

    doc.text(`Service Amount: R${amount.toFixed(2)}`, 20, 150);
    doc.text(`VAT (15%): R${vat.toFixed(2)}`, 20, 160);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: R${total.toFixed(2)}`, 20, 170);

    // Terms
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Terms & Conditions:", 20, 190);
    doc.text("Payment is due within 30 days of invoice date.", 20, 200);
    doc.text("Thank you for your business!", 20, 220);

    // Save the PDF
    doc.save(`addon-invoice-${formData.invoice_number || "new"}.pdf`);
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

  if (fetchingData) {
    return (
      <div className="addon-form-wrapper">
        <div className="addon-form-container">
          <div>Loading add-on details...</div>
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
          <div className="company-info">
            <h1 className="company-name">Your Company Name</h1>
            <p className="company-address">
              123 Business Street
              <br />
              City, Province 12345
              <br />
              Phone: (123) 456-7890
            </p>
          </div>
          <div className="invoice-details">
            <h2 className="invoice-title">
              {isViewMode ? "ADD-ON INVOICE" : "CREATE ADD-ON INVOICE"}
            </h2>
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
            <p className="client-name">{clientName}</p>
          </div>
          <div className="invoice-actions">
            <button onClick={handleBack} className="back-button">
              ← Back
            </button>
            {isViewMode && (
              <button onClick={handlePrint} className="print-button">
                🖨️ Print Invoice
              </button>
            )}
          </div>
        </div>

        <div className="invoice-form-section">
          <form onSubmit={handleSubmit} className="invoice-form">
            {error && <div className="error-message">{error}</div>}

            <div className="invoice-items-header">
              <h3>Add-On Service Details</h3>
            </div>

            <div className="invoice-items-table">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Service Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    disabled={isViewMode}
                  >
                    <option value="">Select Service Category</option>
                    {categories.map((cat, index) => (
                      <option key={index} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="date">Service Date *</label>
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
                <label htmlFor="description">Service Description *</label>
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
                  <span className="summary-label">Service Amount:</span>
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
                    R
                    {formData.amount
                      ? Number.parseFloat(formData.amount || 0).toLocaleString(
                          "en-ZA",
                          { minimumFractionDigits: 2 }
                        )
                      : "0.00"}
                  </span>
                </div>

                <div className="summary-row vat">
                  <span className="summary-label">VAT (15%):</span>
                  <span className="summary-amount">
                    R
                    {formData.amount
                      ? (
                          Number.parseFloat(formData.amount || 0) * 0.15
                        ).toLocaleString("en-ZA", {
                          minimumFractionDigits: 2,
                        })
                      : "0.00"}
                  </span>
                </div>

                <div className="summary-row total">
                  <span className="summary-label">Total Amount:</span>
                  <span className="summary-amount">
                    R
                    {formData.amount
                      ? (
                          Number.parseFloat(formData.amount || 0) * 1.15
                        ).toLocaleString("en-ZA", {
                          minimumFractionDigits: 2,
                        })
                      : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            <div className="invoice-actions-footer">
              <button
                type="button"
                onClick={handleBack}
                className="cancel-button"
                disabled={loading}
              >
                {isViewMode ? "Back to List" : "Cancel"}
              </button>
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

        <div className="invoice-footer">
          <div className="footer-notes">
            <h4>Terms & Conditions:</h4>
            <p>
              Payment is due within 30 days of invoice date. Late payments may
              incur additional charges.
            </p>
          </div>
          <div className="footer-contact">
            <p>Thank you for your business!</p>
            <p>
              For questions about this invoice, please contact us at
              billing@yourcompany.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOnForm;
