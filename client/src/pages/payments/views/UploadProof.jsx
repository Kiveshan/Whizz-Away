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
  const [success, setSuccess] = useState(null);
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
          // Don't auto-select in view mode
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
            const { amount, fileupload, invoiceid, fileUrl } =
              response.data.data;
            setAmount(amount.toString());
            setPaymentDate(fileupload.split("T")[0]);
            setInvoiceId(invoiceid ? invoiceid.toString() : "");
            setFileUrl(fileUrl);
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

    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Please select a valid file type (JPEG, PNG, or PDF)");
        e.target.value = "";
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setError("File size must be less than 10MB");
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!clientId) {
      setError("No client selected");
      return;
    }

    if (!amount || isNaN(amount) || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
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
      formData.append("paymentDate", paymentDate);
      formData.append("invoiceId", invoiceId);

      if (file) {
        formData.append("proofFile", file);
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
        setSuccess("Payment proof uploaded successfully!");

        // Navigate back after a short delay
        setTimeout(() => {
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
        }, 2000);
      } else {
        throw new Error(
          response.data.message || "Failed to upload payment details"
        );
      }
    } catch (err) {
      console.error("Error uploading payment details:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred while uploading the payment details"
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

  const openFileViewer = (fileUrl, titleText) => {
    if (!fileUrl) {
      setError("No file URL available");
      return;
    }

    // Extract file extension from the URL (handle signed URLs)
    let fileExtension = "";
    try {
      const urlParts = fileUrl.split("?")[0]; // Remove query parameters
      fileExtension = urlParts.split(".").pop().toLowerCase();
    } catch (e) {
      console.error("Error extracting file extension:", e);
    }

    // For PDFs, open in new tab
    if (fileExtension === "pdf") {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // For images, show in modal
    if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
      const modal = document.createElement("div");
      modal.className = "proof-modal";
      modal.style.cssText = `
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
    `;

      const modalContent = document.createElement("div");
      modalContent.className = "proof-modal-content";
      modalContent.style.cssText = `
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 90%;
      position: relative;
      overflow: auto;
    `;

      const closeBtn = document.createElement("span");
      closeBtn.className = "proof-modal-close";
      closeBtn.innerHTML = "×";
      closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      color: #aaa;
    `;
      closeBtn.onclick = () => document.body.removeChild(modal);

      const title = document.createElement("h2");
      title.textContent = `Proof of Payment - ${titleText}`;
      title.style.marginBottom = "15px";

      const img = document.createElement("img");
      img.src = fileUrl;
      img.style.cssText = `
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    `;
      img.onerror = () => {
        img.style.display = "none";
        const errorMsg = document.createElement("p");
        errorMsg.textContent = "Error loading image";
        errorMsg.style.color = "red";
        modalContent.appendChild(errorMsg);
      };

      modalContent.appendChild(closeBtn);
      modalContent.appendChild(title);
      modalContent.appendChild(img);
      modal.appendChild(modalContent);

      document.body.appendChild(modal);

      // Close modal when clicking outside
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      };
      return;
    }

    // For other file types, try to open in new tab
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleViewProof = () => {
    if (fileUrl) {
      const selectedInvoice = invoices.find(
        (inv) => inv.ikey.toString() === invoiceId
      );
      const invoiceNum = selectedInvoice
        ? selectedInvoice.invoice_num
        : "Unknown";

      openFileViewer(
        fileUrl,
        `${decodeURIComponent(clientName)} - ${new Date(
          paymentDate
        ).toLocaleDateString()} - Invoice ${invoiceNum}`
      );
    } else {
      setError("No proof of payment available");
    }
  };

  if (!clientId) {
    return (
      <div className="upload-container">
        <div className="error-message">
          Please select a client from the previous page.
        </div>
      </div>
    );
  }

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
              : `Upload Proof of Payment for ${decodeURIComponent(clientName)}`}
          </h2>

          {error && (
            <div
              className="error-message"
              style={{
                color: "red",
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="success-message"
              style={{
                color: "green",
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#efe",
                border: "1px solid #cfc",
                borderRadius: "4px",
              }}
            >
              {success}
            </div>
          )}

          {isLoading && <div>Loading...</div>}

          {!isLoading && (
            <form onSubmit={handleSubmit}>
              <div className="amount-field">
                <label htmlFor="amount">Amount Paid *</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  readOnly={isViewMode}
                  disabled={isViewMode}
                  required={!isViewMode}
                />
              </div>

              <div className="amount-field">
                <label htmlFor="paymentDate">Payment Date *</label>
                <input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  readOnly={isViewMode}
                  disabled={isViewMode}
                  required={!isViewMode}
                />
              </div>

              <div className="amount-field">
                <label htmlFor="invoiceSelect">Select Invoice *</label>
                <select
                  id="invoiceSelect"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  disabled={isViewMode}
                  required={!isViewMode}
                >
                  <option value="">-- Select an invoice --</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.ikey} value={invoice.ikey}>
                      {invoice.invoice_num} -{" "}
                      {new Date(invoice.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="amount-field">
                <label htmlFor="proofFile">
                  Proof of Payment {!isViewMode && "*"}
                  <small
                    style={{
                      display: "block",
                      color: "#666",
                      fontSize: "0.9em",
                    }}
                  >
                    Accepted formats: JPEG, PNG, PDF (Max 10MB)
                  </small>
                </label>
                {!isViewMode && (
                  <input
                    id="proofFile"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    required={!isViewMode}
                  />
                )}
                {isViewMode && fileUrl && (
                  <button
                    type="button"
                    className="view-button"
                    onClick={handleViewProof}
                    style={{ marginTop: "10px" }}
                  >
                    View Proof of Payment
                  </button>
                )}
                {file && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "0.9em",
                      color: "#666",
                    }}
                  >
                    Selected file: {file.name} (
                    {(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {!isViewMode && (
                <button
                  type="submit"
                  className="submit-button"
                  disabled={
                    !amount ||
                    !paymentDate ||
                    !invoiceId ||
                    !file ||
                    isSubmitting
                  }
                  style={{
                    marginTop: "20px",
                    padding: "12px 24px",
                    backgroundColor: isSubmitting ? "#ccc" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Uploading..." : "Upload Proof of Payment"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProof;
