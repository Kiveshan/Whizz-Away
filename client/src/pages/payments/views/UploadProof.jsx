"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Select from "react-select";
import api from "../../../api";
import "../css/ClientPayments.css";

const UploadProof = () => {
  const navigate = useNavigate();
  const { clientName, paymentId } = useParams();
  const location = useLocation();
  const { clientId } = location.state || {};

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isViewMode, setIsViewMode] = useState(!!paymentId);

  // Helper function to handle token expiration
  const handleTokenExpiration = (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      navigate("/");
      return true;
    }
    return false;
  };

  const roleId = JSON.parse(localStorage.getItem("user"))?.roleid;

  // Fetch invoices and add-ons for dropdown
  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setIsLoading(false);
      return;
    }

    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/payment_invoices/${clientId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          setItems(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch items");
        }
      } catch (err) {
        console.error("Error fetching items:", err);
        if (handleTokenExpiration(err)) {
          return;
        }
        setError(err.message || "An error occurred while fetching items");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [clientId, isViewMode]);

  // Fetch payment details for view mode
  useEffect(() => {
    if (paymentId && clientId) {
      const fetchPaymentDetails = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(
            `/api/payments/${clientId}/${paymentId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (response.data.success) {
            const {
              amount,
              fileupload,
              invoiceid,
              addon_id,
              invoice_num,
              line_items,
            } = response.data.data;
            setAmount(Number(amount ?? 0).toFixed(2));
            setPaymentDate(fileupload.split("T")[0]);
            if (Array.isArray(line_items) && line_items.length > 0) {
              setLineItems(
                line_items.map((item) => ({
                  ...item,
                }))
              );
            }
            if (invoiceid || addon_id) {
              const type = invoiceid ? "Invoice" : "Add-on";
              const id = invoiceid || addon_id;
              setSelectedItem({
                value: id,
                type,
                label: `${type}: ${invoice_num} (${new Date(
                  fileupload
                ).toLocaleDateString()})`,
              });
            }
          } else {
            throw new Error(
              response.data.message || "Failed to fetch payment details"
            );
          }
        } catch (err) {
          console.error("Error fetching payment details:", err);
          if (handleTokenExpiration(err)) {
            return;
          }
          setError(
            err.message || "An error occurred while fetching payment details"
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchPaymentDetails();
    }
  }, [paymentId, clientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientId) {
      setError("No client selected");
      return;
    }

    if (!paymentDate) {
      setError("Please select a payment date");
      return;
    }

    if (lineItems.length === 0) {
      setError("Please add at least one invoice or add-on to this payment");
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentData = {
        fileupload: paymentDate,
        line_items: lineItems.map((item) => ({
          type: item.type,
          id: item.id,
          amount_to_pay: Number(item.amount_to_pay),
          line_reference: item.line_reference || "",
        })),
      };

      const response = await api.post(
        `/api/payments/${clientId}/upload`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        if (roleId == 1) {
          navigate("/client-payments", {
            state: { clientId, clientName },
          });
        } else if (roleId == 4) {
          navigate("/DirectorClientPaymentList", {
            state: { clientId, clientName },
          });
        } else {
          navigate("/client-payments", {
            state: { clientId, clientName },
          });
        }
      } else {
        throw new Error(
          response.data.message || "Failed to save payment details"
        );
      }
    } catch (err) {
      console.error("Error saving payment details:", err);
      if (handleTokenExpiration(err)) {
        return;
      }
      setError(
        err.message || "An error occurred while saving the payment details"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (roleId == 1) {
      navigate("/client-payments", {
        state: { clientId, clientName },
      });
    } else if (roleId == 4) {
      navigate("/DirectorClientPaymentList", {
        state: { clientId, clientName },
      });
    } else {
      navigate("/client-payments", {
        state: { clientId, clientName },
      });
    }
  };

  const getSelectedItemDetails = () => {
    return selectedItem ? selectedItem.label : "";
  };

  // Add selected invoice/add-on as a line item with default amount_to_pay = amount_due
  const handleAddLineItem = (option) => {
    if (!option) return;
    setSelectedItem(option);

    const existing = lineItems.find(
      (item) => item.id === option.value && item.type === option.type
    );
    if (existing) {
      return;
    }

    const source = items.find(
      (item) => item.id === option.value && item.type === option.type
    );
    const amountDue = source?.amount_due ?? 0;
    const total = source?.total ?? null;
    const paidAmount = source?.paid_amount ?? null;

    setLineItems((prev) => [
      ...prev,
      {
        id: option.value,
        type: option.type,
        label: option.label,
        amount_due: amountDue,
        amount_to_pay: amountDue,
        total,
        paid_amount: paidAmount,
        line_reference: "",
      },
    ]);

    // Remove the selected item from the dropdown list and clear the selection
    setItems((prev) =>
      prev.filter(
        (item) => !(item.id === option.value && item.type === option.type)
      )
    );
    setSelectedItem(null);
  };

  const handleLineAmountChange = (index, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const numeric = Number(value);
      updated[index] = {
        ...updated[index],
        amount_to_pay: Number.isNaN(numeric) ? "" : numeric,
      };
      return updated;
    });
  };

  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineReferenceChange = (index, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        line_reference: value,
      };
      return updated;
    });
  };

  // Auto-calculate total amount from line items
  useEffect(() => {
    const totalAmount = lineItems.reduce((sum, item) => {
      const numeric = Number(item.amount_to_pay || 0);
      return sum + (Number.isNaN(numeric) ? 0 : numeric);
    }, 0);
    setAmount(totalAmount ? totalAmount.toFixed(2) : "");
  }, [lineItems]);

  // Custom styles for react-select
  const customStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: "40px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      boxShadow: "none",
      "&:hover": {
        border: "1px solid #aaa",
      },
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      maxHeight: "300px",
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: "300px",
      overflowY: "auto",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#007bff"
        : state.isFocused
        ? "#f8f9fa"
        : "white",
      color: state.isSelected ? "white" : "black",
      "&:hover": {
        backgroundColor: "#f8f9fa",
        color: "black",
      },
    }),
  };

  return (
    <div className="client-payment-dashboard-wrapper">
      <div className="upload-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="upload-content">
          <div className="upload-form">
            <h2>
              {isViewMode
                ? `View Payment for ${decodeURIComponent(clientName)}`
                : `Add Payment for ${decodeURIComponent(clientName)}`}
            </h2>

            {error && <div className="error-message">{error}</div>}

            {isLoading && <div>Loading...</div>}

            {!isLoading && (
              <>
                {/* Item Selection - Full Width (create mode only) */}
                {!isViewMode && (
                  <div className="form-row full-width">
                    <div className="amount-field" style={{ width: "100%" }}>
                      <label>Select Invoice or Add-on *</label>
                      <Select
                        options={items.map((item) => ({
                          value: item.id,
                          type: item.type,
                          label: `${item.type}: ${item.invoice_num} (${new Date(
                            item.date
                          ).toLocaleDateString()})`,
                        }))}
                        value={selectedItem}
                        onChange={handleAddLineItem}
                        placeholder="Select an invoice or add-on"
                        isSearchable
                        styles={customStyles}
                      />
                    </div>
                  </div>
                )}
                {/* Amount and Date - Side by Side */}
                <div className="form-row two-columns">
                  <div className="amount-field">
                    <label>Total Amount Paid</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      readOnly
                      disabled
                      placeholder="0.00"
                    />
                  </div>
                  <div className="amount-field">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      readOnly={isViewMode}
                      disabled={isViewMode}
                      required
                    />
                  </div>
                </div>

                {/* Line items table */}
                {lineItems.length > 0 && (
                  <div className="form-row full-width">
                    <div className="amount-field" style={{ width: "100%" }}>
                      <label>
                        Payment Allocation
                      </label>
                      <table className="client-payments-line-items-table">
                        <thead>
                          <tr>
                            <th>Item Type</th>
                            <th>Invoice/Add-on No.</th>
                            <th>Total</th>
                            <th>Paid To Date</th>
                            <th>Balance After Payment</th>
                            <th>This Payment</th>
                            <th>Payment Ref</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, index) => (
                            <tr key={`${item.type}-${item.id || index}`}>
                              <td>{item.type}</td>
                              <td>{item.label || item.invoice_num || item.id}</td>
                              <td>
                                {item.total != null
                                  ? Number(item.total).toFixed(2)
                                  : "-"}
                              </td>
                              <td>
                                {item.paid_amount != null
                                  ? Number(item.paid_amount).toFixed(2)
                                  : "-"}
                              </td>
                              <td>{Number(item.amount_due || 0).toFixed(2)}</td>
                              <td>
                                {isViewMode ? (
                                  <span>
                                    {Number(item.amount_to_pay).toFixed(2)}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.amount_to_pay}
                                    onChange={(e) =>
                                      handleLineAmountChange(index, e.target.value)
                                    }
                                    min={0}
                                    max={item.amount_due}
                                  />
                                )}
                              </td>
                              <td>
                                {isViewMode ? (
                                  <span>{item.line_reference}</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.line_reference || ""}
                                    onChange={(e) =>
                                      handleLineReferenceChange(index, e.target.value)
                                    }
                                    placeholder="Ref for this line"
                                  />
                                )}
                              </td>
                              <td>
                                {isViewMode ? (
                                  <span />
                                ) : (
                                  <button
                                    type="button"
                                    className="remove-line-item-button"
                                    onClick={() => handleRemoveLineItem(index)}
                                    style={{
                                      backgroundColor: "#e74c3c",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "4px 10px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Submit Button - Full Width (Upload Mode Only) */}
                {!isViewMode && (
                  <div className="form-row full-width">
                    <button
                      className="submit-button"
                      onClick={handleSubmit}
                      disabled={
                        !amount ||
                        !paymentDate ||
                        lineItems.length === 0 ||
                        isSubmitting
                      }
                    >
                      {isSubmitting ? "Saving..." : "Save Payment"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProof;
