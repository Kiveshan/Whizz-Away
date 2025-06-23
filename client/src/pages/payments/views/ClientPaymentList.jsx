"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import "../css/ClientPayments.css";

const ClientPaymentList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  const [clientPayments, setClientPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

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
          setCurrentPage(1); // Reset to first page when data changes
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

  const handleViewProof = (fileUrl, date, invoiceNum) => {
    if (fileUrl) {
      // Open file in new tab
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("No proof of payment uploaded");
    }
  };

  // Pagination calculations
  const totalRecords = clientPayments.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = clientPayments.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
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

      {/* Pagination Info */}
      <div className="pagination-info">
        Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of{" "}
        {totalRecords} payments
      </div>

      <table className="payment-table1">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Invoice</th>
            <th>Proof</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.length > 0 ? (
            currentRecords.map((payment, index) => (
              <tr key={payment.paykey || index}>
                <td>{new Date(payment.fileupload).toLocaleDateString()}</td>
                <td>{payment.amount}</td>
                <td>{payment.invoice_num || "N/A"}</td>
                <td>
                  <button
                    className="view-button"
                    onClick={() =>
                      handleViewProof(
                        payment.fileurl,
                        payment.fileupload,
                        payment.invoice_num
                      )
                    }
                    disabled={!payment.fileurl}
                  >
                    View Proof
                  </button>
                </td>
                <td>
                  <button
                    className="view-button"
                    onClick={() =>
                      navigate(
                        `/upload-proof/${encodeURIComponent(clientName)}/${
                          payment.paykey
                        }`,
                        {
                          state: { clientId, clientName },
                        }
                      )
                    }
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="p-3 text-center">
                No payments found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-controls">
            <button
              className="pagination-btn prev-btn"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>

            <div className="pagination-numbers">
              {getPageNumbers().map((pageNum, index) => (
                <span key={index}>
                  {pageNum === "..." ? (
                    <span className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      className={`pagination-number ${
                        currentPage === pageNum ? "active" : ""
                      }`}
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )}
                </span>
              ))}
            </div>

            <button
              className="pagination-btn next-btn"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>

          <div className="pagination-summary">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

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
