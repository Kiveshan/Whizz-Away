"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/SubcontractorStatements.css";
import Pagination from "../../../../components/Pagination";

const SubcontractorStatements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subcontractorId, subcontractorName } = location.state || {};

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
  const [recordsPerPage] = useState(10);

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    if (!subcontractorId) {
      setError("No subcontractor selected");
      setLoading(false);
      return;
    }

    const fetchStatements = async () => {
      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Generate dummy statements based on filters
        const dummyStatements = [];
        const selectedYear = Number.parseInt(filters.year);
        const selectedMonth = Number.parseInt(filters.month);

        // Generate statements for the selected month/year
        if (filters.year && filters.month) {
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

          for (let i = 1; i <= 3; i++) {
            dummyStatements.push({
              statementId: `${subcontractorId}-${selectedYear}${selectedMonth
                .toString()
                .padStart(2, "0")}-${i.toString().padStart(3, "0")}`,
              month: monthNames[selectedMonth - 1],
              year: selectedYear,
              generationDate: new Date(selectedYear, selectedMonth - 1, i * 10),
              totalAmount: Math.floor(Math.random() * 50000) + 10000,
              status: i === 1 ? "Paid" : i === 2 ? "Pending" : "Overdue",
            });
          }
        }

        setStatements(dummyStatements);
      } catch (err) {
        console.error("Error fetching statements:", err);
        setError("Failed to fetch statements");
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();
  }, [subcontractorId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
    setCurrentPage(1);
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
      <div className="subcontractor-statements-wrapper">
        <div>Loading statements...</div>
      </div>
    );
  if (error)
    return (
      <div className="subcontractor-statements-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!subcontractorId)
    return (
      <div className="subcontractor-statements-wrapper">
        <div>Please select a subcontractor from the previous page.</div>
      </div>
    );

  return (
    <div className="subcontractor-statements-wrapper">
      <button
        onClick={() => navigate("/Creditors/SubcontractorList")}
        className="back-button"
      >
        Back to Subcontractors
      </button>

      <div className="page-title">
        <h2>Monthly Statements - {subcontractorName}</h2>
      </div>

      <div className="action-bar">
        <div className="filter-section">
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

      <table className="statements-table">
        <thead>
          <tr>
            <th>Statement ID</th>
            <th>Month/Year</th>
            <th>Date Generated</th>
            <th>Total Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentStatements.length === 0 ? (
            <tr>
              <td colSpan="6">No statements found for the selected period.</td>
            </tr>
          ) : (
            currentStatements.map((statement) => (
              <tr key={statement.statementId}>
                <td>{statement.statementId}</td>
                <td>
                  {statement.month} {statement.year}
                </td>
                <td>{statement.generationDate.toLocaleDateString()}</td>
                <td>R{statement.totalAmount.toLocaleString()}</td>
                <td>
                  <span
                    className={`status-badge ${statement.status.toLowerCase()}`}
                  >
                    {statement.status}
                  </span>
                </td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate("/Creditors/SubcontractorStatementDetails", {
                        state: {
                          statementId: statement.statementId,
                          subcontractorName: subcontractorName,
                          subcontractorId: subcontractorId,
                        },
                      })
                    }
                  >
                    View Details
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

export default SubcontractorStatements;
