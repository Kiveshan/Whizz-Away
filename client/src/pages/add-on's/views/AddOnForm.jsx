"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import api from "../../../api";
import "../css/AddOnForm.css";

const AddOnForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addonId } = useParams(); // Get addon ID from URL params to determine view/create mode
  const { clientId, clientName } = location.state || {};

  const isViewMode = !!addonId && addonId !== "create";

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

  if (!clientId) {
    return (
      <div className="addon-form-wrapper">
        <div>Please select a client from the previous page.</div>
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
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
          <h2>
            {isViewMode
              ? `Add-On Details for ${clientName}`
              : `Create Add-On for ${clientName}`}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="addon-form">
          {error && <div className="error-message">{error}</div>}

          {isViewMode && (
            <div className="form-group">
              <label htmlFor="invoice_number">Invoice Number</label>
              <input
                type="text"
                id="invoice_number"
                name="invoice_number"
                value={formData.invoice_number}
                className="form-input"
                readOnly
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="dropdown"
              required
              disabled={isViewMode} // Disable in view mode
            >
              <option value="">Select Category</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (R) *</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              className="form-input"
              required
              readOnly={isViewMode} // Read-only in view mode
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="form-input"
              required
              readOnly={isViewMode} // Read-only in view mode
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter detailed description of the add-on service..."
              className="form-textarea"
              rows="4"
              required
              readOnly={isViewMode} // Read-only in view mode
            />
          </div>

          <div className="form-actions">
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
                className="upload-button"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Add-On"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOnForm;
