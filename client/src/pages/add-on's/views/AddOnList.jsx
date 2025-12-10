"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import Pagination from "../../../components/Pagination"; // Import the Pagination component
import "../css/AddOnList.css";

const AddOnList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Helper function to handle token expiration
  const handleTokenExpiration = (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
      return true;
    }
    return false;
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

  const minYear = 2025;
  const maxYear = currentDate.getFullYear() + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchAddOns = async () => {
      try {
        setLoading(true);
        const url = new URL(
          `/api/addons/client/${clientId}`,
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
          setAddOns(response.data.data);
          setCurrentPage(1);
        } else {
          throw new Error(response.data.message || "Failed to fetch add-ons");
        }
      } catch (err) {
        console.error("Error fetching add-ons:", err);
        if (handleTokenExpiration(err)) {
          return;
        }
        setError(err.message || "An error occurred while fetching add-ons");
      } finally {
        setLoading(false);
      }
    };

    fetchAddOns();
  }, [clientId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
  };

  const handleCreateAddOn = () => {
    navigate(`/add-on-form`, {
      state: { clientId, clientName },
    });
  };

  const handleBack = () => {
    navigate("/view-client-list");
  };

  const handleViewAddOn = (addonId) => {
    navigate(`/add-on-form`, {
      state: { clientId, clientName, addonId },
    });
  };

  if (loading)
    return (
      <div className="add-on-list-wrapper">
        <div>Loading add-ons...</div>
      </div>
    );
  if (error)
    return (
      <div className="add-on-list-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!clientId)
    return (
      <div className="add-on-list-wrapper">
        <div>Please select a client from the previous page.</div>
      </div>
    );

  return (
    <div className="add-on-list-wrapper">
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
                {yearOptions.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
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
              <th>Invoice Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {addOns
              .slice(
                (currentPage - 1) * recordsPerPage,
                currentPage * recordsPerPage
              )
              .map((addon, index) => (
                <tr key={addon.addon_id || index}>
                  <td>{new Date(addon.date).toLocaleDateString()}</td>
                  <td>R{addon.amount.toLocaleString()}</td>
                  <td>{addon.invoice_number}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleViewAddOn(addon.addon_id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            {addOns.length === 0 && (
              <tr>
                <td colSpan="4" className="p-3 text-center">
                  No add-ons found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {roleId == 3 && (
          <div
            className="upload-section"
            style={{ marginTop: "20px", textAlign: "center" }}
          >
            <button className="upload-button" onClick={handleCreateAddOn}>
              Create Add-On
            </button>
          </div>
        )}
        <Pagination
          totalRecords={addOns.length}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AddOnList;
