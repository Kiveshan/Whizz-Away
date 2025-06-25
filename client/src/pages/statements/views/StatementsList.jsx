"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/StatementList.css";
import api from "../../../api"; // Import the axios instance
import Pagination from "..//../../components/Pagination"; // Import the Pagination component

const StatementList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId } = location.state || {};

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Set default filters to current year and month
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10); // You can make this configurable

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchStatements = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month) params.append("month", filters.month);

        // Use axios instead of fetch
        const requestUrl = `/api/statements/${clientId}?${params.toString()}`;
        const response = await api.get(requestUrl);

        if (response.data.success) {
          setStatements(response.data.data);
        } else {
          throw new Error(
            response.data.message || "Failed to fetch statements"
          );
        }
      } catch (err) {
        console.error("Error fetching statements:", err);

        let errorMessage = "Failed to fetch statements";

        if (err.response) {
          const { status, data } = err.response;

          if (status === 401 || status === 403) {
            navigate("/");
            return;
          }

          errorMessage = data?.message || `HTTP error! Status: ${status}`;
        } else if (err.request) {
          errorMessage =
            "No response received from server. Please check your connection.";
        } else {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();
  }, [clientId, filters, navigate]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

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

  // Calculate pagination data
  const totalRecords = statements.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentStatements = statements.slice(startIndex, endIndex);

  if (loading)
    return (
      <div className="statement-list-wrapper">
        <div>Loading statements...</div>
      </div>
    );
  if (error)
    return (
      <div className="statement-list-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!clientId)
    return (
      <div className="statement-list-wrapper">
        <div>Please select a client from the previous page.</div>
      </div>
    );

  return (
    <div className="statement-list-wrapper">
      <button
        onClick={() => navigate("/view-client-statements")}
        className="back-button"
      >
        Back
      </button>

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

      <table className="instruction-table1">
        <thead>
          <tr>
            <th>Statement No</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentStatements.length === 0 ? (
            <tr>
              <td colSpan="3">No statements found for this client.</td>
            </tr>
          ) : (
            currentStatements.map((statement) => (
              <tr key={statement.statement_key}>
                <td>{statement.statement_key}</td>
                <td>
                  {new Date(statement.generation_date).toLocaleDateString()}
                </td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate("/client-statement", {
                        state: { statementId: statement.statement_key },
                      })
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination Component */}
      {totalRecords > 0 && (
        <Pagination
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default StatementList;
