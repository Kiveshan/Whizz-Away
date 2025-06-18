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
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isViewMode, setIsViewMode] = useState(!!paymentId);

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
        const response = await api.get(`/api/invoices/${clientId}`, {
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
            const { amount, fileupload, invoiceid, fileurl } =
              response.data.data;
            setAmount(amount.toString());
            setPaymentDate(fileupload.split("T")[0]);
            setInvoiceId(invoiceid ? invoiceid.toString() : "");
            setFileUrl(fileurl);
          } else {
            throw new Error(
              response.data.message || "Failed to fetch payment details"
            );
          }
        } catch (err) {
          console.error("Error fetching payment details:", err);
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
  };

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

    if (!file && !isViewMode) {
      setError("Please upload a proof of payment file");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("amount", Number.parseFloat(amount));
      formData.append("fileupload", paymentDate);
      formData.append("invoiceid", invoiceId);
      if (file) {
        formData.append("file", file);
      }

      const response = await api.post(
        `/api/payments/${clientId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
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
          response.data.message || "Failed to upload payment details"
        );
      }
    } catch (err) {
      console.error("Error uploading payment details:", err);
      setError(
        err.message || "An error occurred while uploading the payment details"
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

  const handleViewProof = () => {
    if (fileUrl) {
      // Open file in new tab
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } else {
      setError("No proof of payment uploaded");
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
    <div className="upload-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="upload-content" style={{ marginTop: "20px" }}>
        <div className="upload-form">
          <h2>
            {isViewMode
              ? `View Payment for ${decodeURIComponent(clientName)}`
              : `Upload Payment Proof for ${decodeURIComponent(clientName)}`}
          </h2>
          {error && (
            <div
              className="error-message"
              style={{ color: "red", marginBottom: "10px" }}
            >
              {error}
            </div>
          )}
          {isLoading && <div>Loading...</div>}
          {!isLoading && (
            <>
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
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    Selected: {getSelectedInvoiceDetails()}
                  </div>
                )}
              </div>
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
              <div className="amount-field">
                <label>
                  Proof of Payment * {!isViewMode && "(JPG, PNG, PDF only)"}
                </label>
                {!isViewMode && (
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    required
                  />
                )}
                {isViewMode && fileUrl && (
                  <div>
                    <button
                      className="view-button"
                      onClick={handleViewProof}
                      style={{ marginTop: "10px" }}
                    >
                      View Proof of Payment (Opens in New Tab)
                    </button>
                  </div>
                )}
                {isViewMode && !fileUrl && (
                  <div style={{ color: "#666", fontStyle: "italic" }}>
                    No proof of payment file uploaded
                  </div>
                )}
              </div>
              {!isViewMode && (
                <button
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={
                    !amount ||
                    !paymentDate ||
                    !invoiceId ||
                    !file ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "Uploading..." : "Upload Payment Proof"}
                </button>
              )}
            </>
          )}
        </div>

        <div className="info-box">
          <h3>Upload Instructions</h3>
          <ul>
            <li>Select the invoice this payment is for</li>
            <li>Enter the exact amount paid</li>
            <li>Choose the date the payment was made</li>
            <li>Upload proof of payment (receipt, bank transfer, etc.)</li>
            <li>Accepted file formats: JPG, PNG, PDF</li>
            <li>Maximum file size: 10MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadProof;
