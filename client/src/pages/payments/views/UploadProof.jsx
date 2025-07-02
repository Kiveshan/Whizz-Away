"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import api from "../../../api";
import "../css/ClientPayments.css";

const UploadProof = () => {
  const navigate = useNavigate();
  const { clientName, paymentId } = useParams();
  const location = useLocation();
  const { clientId } = location.state || {};

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [reference, setReference] = useState("");
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

  // Fetch invoices for dropdown
  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setIsLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/payment_invoices/${clientId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          setInvoices(response.data.data);
          if (!isViewMode && response.data.data.length > 0) {
            setInvoiceId(response.data.data[0].ikey.toString());
          }
        } else {
          throw new Error(response.data.message || "Failed to fetch invoices");
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
        // Check for token expiration
        if (handleTokenExpiration(err)) {
          return;
        }
        setError(err.message || "An error occurred while fetching invoices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
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
            const { amount, fileupload, invoiceid, reference } =
              response.data.data;
            setAmount(amount.toString());
            setPaymentDate(fileupload.split("T")[0]);
            setInvoiceId(invoiceid ? invoiceid.toString() : "");
            setReference(reference || "");
          } else {
            throw new Error(
              response.data.message || "Failed to fetch payment details"
            );
          }
        } catch (err) {
          console.error("Error fetching payment details:", err);
          // Check for token expiration
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

    if (!amount || isNaN(amount)) {
      setError("Please enter a valid amount");
      return;
    }

    if (!paymentDate) {
      setError("Please select a payment date");
      return;
    }

    if (!invoiceId) {
      setError("Please select an invoice");
      return;
    }

    if (!reference.trim()) {
      setError("Please enter a payment reference");
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentData = {
        amount: Number.parseFloat(amount),
        fileupload: paymentDate,
        invoiceid: invoiceId,
        reference: reference.trim(),
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
      // Check for token expiration
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

  const getSelectedInvoiceDetails = () => {
    const selectedInvoice = invoices.find(
      (inv) => inv.ikey.toString() === invoiceId
    );
    return selectedInvoice
      ? `${selectedInvoice.invoice_num} (${new Date(
          selectedInvoice.date
        ).toLocaleDateString()})`
      : "";
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
                {/* Invoice Selection - Full Width */}
                <div className="form-row full-width">
                  <div className="amount-field">
                    <label>Select Invoice *</label>
                    <select
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      disabled={isViewMode}
                      required
                    >
                      <option value="">Select an invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.ikey} value={invoice.ikey}>
                          {invoice.invoice_num} (
                          {new Date(invoice.date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                    {isViewMode && invoiceId && (
                      <div className="selected-info">
                        Selected: {getSelectedInvoiceDetails()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount and Date - Side by Side */}
                <div className="form-row two-columns">
                  <div className="amount-field">
                    <label>Amount Paid *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      readOnly={isViewMode}
                      disabled={isViewMode}
                      required
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

                {/* Reference Field - Full Width */}
                <div className="form-row full-width">
                  <div className="amount-field">
                    <label>Payment Reference *</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Enter payment reference (e.g., transaction ID, check number, etc.)"
                      readOnly={isViewMode}
                      disabled={isViewMode}
                      required
                      maxLength={255}
                    />
                    {!isViewMode && (
                      <div className="field-help">
                        Enter a reference for this payment such as transaction
                        ID, check number, or any other identifying information.
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button - Full Width (Upload Mode Only) */}
                {!isViewMode && (
                  <div className="form-row full-width">
                    <button
                      className="submit-button"
                      onClick={handleSubmit}
                      disabled={
                        !amount ||
                        !paymentDate ||
                        !invoiceId ||
                        !reference.trim() ||
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
