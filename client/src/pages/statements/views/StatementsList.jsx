"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/StatementList.css";
import api from "../../../api"; // Import the axios instance

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

  if (loading) return <div>Loading statements...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!clientId)
    return <div>Please select a client from the previous page.</div>;

  return (
    <div className="">
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
          {statements.length === 0 ? (
            <tr>
              <td colSpan="3">No statements found for this client.</td>
            </tr>
          ) : (
            statements.map((statement) => (
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
    </div>
  );
};

export default StatementList;
