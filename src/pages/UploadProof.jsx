"use client"

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import "../css/ClientPayments.css";

const UploadProof = () => {
  const navigate = useNavigate();
  const { clientName, paymentId } = useParams(); // Extract paymentId from URL
  const location = useLocation();
  const { clientId } = location.state || {};

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For loading payment details
  const [error, setError] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false); // Track if in view mode

  // Retrieve roleId from localStorage
  const roleId = JSON.parse(localStorage.getItem('user'))?.roleid;

  // Fetch payment details if in view mode (paymentId exists)
  useEffect(() => {
    if (paymentId) {
      setIsViewMode(true);
      const fetchPaymentDetails = async () => {
        try {
          setIsLoading(true);
          const response = await axios.get(
            `http://localhost:5000/api/payments/${clientId}/${paymentId}`,
            {
              headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (response.data.success) {
            const { amount, fileupload } = response.data.data;
            setAmount(amount.toString());
            setPaymentDate(fileupload.split("T")[0]); // Format date for input (YYYY-MM-DD)
          } else {
            throw new Error(response.data.message || "Failed to fetch payment details");
          }
        } catch (err) {
          console.error("Error fetching payment details:", err.response || err);
          setError(err.message || "An error occurred while fetching payment details");
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

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `http://localhost:5000/api/payments/${clientId}/upload`,
        {
          amount: parseFloat(amount),
          fileupload: paymentDate,
        },
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Redirect based on roleId
        if (roleId == 1) {
          navigate("/client-payments", {
            state: { clientId, clientName },
          });
        } else if (roleId == 4) {
          navigate("/DirectorClientPaymentList", {
            state: { clientId, clientName },
          });
        } else {
          // Default fallback navigation
          navigate("/client-payments", {
            state: { clientId, clientName },
          });
        }
      } else {
        throw new Error(response.data.message || "Failed to upload payment details");
      }
    } catch (err) {
      console.error("Error uploading payment details:", err.response || err);
      setError(err.message || "An error occurred while uploading the payment details");
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
      // Default fallback navigation
      navigate("/client-payments", {
        state: { clientId, clientName },
      });
    }
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
          <h2>{isViewMode ? `View Payment for ${clientName}` : `Upload Payment for ${clientName}`}</h2>
          {error && <div className="error-message" style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
          {isLoading && <div>Loading payment details...</div>}
          {!isLoading && (
            <>
              <div className="amount-field">
                <label>Amount Paid</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  readOnly={isViewMode} // Make read-only in view mode
                  disabled={isViewMode} // Also disable to prevent interaction
                />
              </div>
              <div className="amount-field">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  readOnly={isViewMode} // Make read-only in view mode
                  disabled={isViewMode} // Also disable to prevent interaction
                />
              </div>
              {!isViewMode && ( // Hide submit button in view mode
                <button
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={!amount || !paymentDate || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Payment Details"}
                </button>
              )}
            </>
          )}
        </div>

        <div className="info-box"></div>
      </div>
    </div>
  );
};

export default UploadProof;