"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/ClientPayments.css";

const ClientPaymentList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  const [clientPayments, setClientPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Set default filters to current year and month
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchPayments = async () => {
      try {
        setLoading(true);
        const url = new URL(
          `/api/payments/${clientId}`,
          window.location.origin
        );
        if (filters.year) url.searchParams.append("year", filters.year);
        if (filters.month) url.searchParams.append("month", filters.month);

        const response = await api.get(url.toString(), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.data.success) {
          setClientPayments(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch payments");
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err.message || "An error occurred while fetching payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [clientId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
  };

  const handleUpload = () => {
    navigate(`/upload/${encodeURIComponent(clientName)}`, {
      state: { clientId, clientName },
    });
  };

  const handleBack = () => {
    navigate("/client-list-payments");
  };

  const handleViewProof = (fileUrl, date) => {
    if (fileUrl) {
      openImageViewer(
        fileUrl,
        `${clientName} - ${new Date(date).toLocaleDateString()}`
      );
    } else {
      alert("No proof of payment uploaded");
    }
  };

  const openImageViewer = (fileUrl, titleText) => {
    const modal = document.createElement("div");
    modal.className = "proof-modal";

    const modalContent = document.createElement("div");
    modalContent.className = "proof-modal-content";

    const closeBtn = document.createElement("span");
    closeBtn.className = "proof-modal-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => document.body.removeChild(modal);

    const title = document.createElement("h2");
    title.textContent = `Proof of Payment - ${titleText}`;

    const fileExtension = fileUrl.split(".").pop().toLowerCase();
    let contentElement;

    if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
      contentElement = document.createElement("img");
      contentElement.src = fileUrl;
      contentElement.className = "proof-image";
    } else if (fileExtension === "pdf") {
      contentElement = document.createElement("iframe");
      contentElement.src = fileUrl;
      contentElement.className = "proof-pdf";
      contentElement.style.width = "100%";
      contentElement.style.height = "500px";
    } else {
      contentElement = document.createElement("p");
      contentElement.textContent = "Unsupported file format";
    }

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(contentElement);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
  };

  if (loading) return <div>Loading payments...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!clientId)
    return <div>Please select a client from the previous page.</div>;

  return (
    <div className="client-payment-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="action-bar">
        <div className="filter-section46">
          <div className="dropdown-container">
            <select
              name="year"
              className="dropdown"
              value={filters.year}
              onChange={handleFilterChange}
            >
              <option>Year</option>
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
              <option>2022</option>
            </select>
            <select
              name="month"
              className="dropdown"
              value={filters.month}
              onChange={handleFilterChange}
            >
              <option>Month</option>
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <table className="payment-table1">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {clientPayments.length > 0 ? (
            clientPayments.map((payment, index) => (
              <tr key={index}>
                <td>{new Date(payment.fileupload).toLocaleDateString()}</td>
                <td>{payment.amount}</td>
                <td>
                  <button
                    className="view-button"
                    onClick={() =>
                      navigate(
                        `/upload-proof/${clientName}/${payment.paykey}`,
                        {
                          state: { clientId, clientName },
                        }
                      )
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="p-3 text-center">
                No payments found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div
        className="upload-section"
        style={{ marginTop: "20px", textAlign: "center" }}
      >
        <button className="upload-button" onClick={handleUpload}>
          Upload Payment
        </button>
      </div>
    </div>
  );
};

export default ClientPaymentList;
