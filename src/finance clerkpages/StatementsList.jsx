import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../finance clerkpages/css/StatementList.css";

const StatementList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId } = location.state || {};

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ year: "", month: "" });

  // Auth helper function to get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchStatements = async () => {
      try {
        const url = new URL(`/api/statements/${clientId}`, window.location.origin);
        if (filters.year) url.searchParams.append("year", filters.year);
        if (filters.month) url.searchParams.append("month", filters.month);

        const response = await fetch(url, {
          headers: getAuthHeader()
        });
        
        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized or forbidden
          navigate("/login");
          return;
        }
        
        if (!response.ok) throw new Error("Failed to fetch statements");
        const data = await response.json();

        if (data.success) {
          setStatements(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch statements");
        }
      } catch (err) {
        console.error("Error fetching statements:", err);
        setError(err.message);
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
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) return <div>Loading statements...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!clientId) return <div>Please select a client from the previous page.</div>;

  return (
    <div className="">
      <button onClick={() => navigate("/view-client-statements")} className="back-button">
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
                <td>{new Date(statement.generation_date).toLocaleDateString()}</td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() => navigate("/client-statement", { state: { statementId: statement.statement_key } })}
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