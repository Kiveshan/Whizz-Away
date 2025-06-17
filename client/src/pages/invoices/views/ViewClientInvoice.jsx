"use client";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/ViewClientInvoice.css";

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data);
  }
};

const ViewClientInvoice = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth helper function to get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let isMounted = true;

    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch clients from the database with auth header
        const response = await api.get("/api/clients", {
          headers: getAuthHeader(),
        });

        if (!response.data) {
          throw new Error("No data received from server");
        }

        if (isMounted) {
          setClients(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (
          err.response &&
          (err.response.status === 401 || err.response.status === 403)
        ) {
          navigate("/");
          return;
        }
        console.error("Error fetching clients:", err);
        if (isMounted) {
          setError(`Failed to load clients: ${err.message}`);
          setLoading(false);
        }
      }
    };

    fetchClients();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleViewInvoices = useCallback(
    (client) => {
      // Navigate to invoices page with client information
      navigate("/invoices", {
        state: {
          clientId: client.m5clientkey,
          clientName: client.companyname,
          clientEmail: client.email,
          clientRepresentative: client.representative,
        },
      });
    },
    [navigate]
  );

  return (
    <div className="view-client-invoice-container">
      {/* Back Button */}
      <div className="client-payments-header">
        <button
          className="back-button"
          onClick={() => navigate("/DebtorsDashboard")}
        >
          Back
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <p>Loading clients...</p>
        ) : error ? (
          <p>{error}</p>
        ) : clients.length === 0 ? (
          <p>No clients found.</p>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Representative</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.m5clientkey}>
                  <td>{client.companyname}</td>
                  <td>{client.representative}</td>
                  <td>{client.email}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleViewInvoices(client)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ViewClientInvoice;
