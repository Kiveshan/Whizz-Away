"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/ViewClientStatements.css"

const ViewClientStatement = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Auth helper function to get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients", {
          headers: getAuthHeader()
        })
        
        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized or forbidden
          navigate("/");
          return;
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch clients")
        }
        const data = await response.json()

        // The server returns the array directly, not wrapped in a success/data object
        // Map the API response to match the component's expected structure
        const mappedClients = data.map((client) => ({
          company: client.companyname,
          representative: client.representative,
          email: client.email,
          id: client.m5clientkey, // Store the ID for later use
        }))

        setClients(mappedClients)
      } catch (err) {
        console.error("Error fetching clients:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [navigate])

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/DebtorsDashboard")}>
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <p>Loading clients...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="clientstatementtable">
          <table className="t1" style={{ width: "70%", marginLeft: "350px" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3">{client.company}</td>
                  <td className="p-3">{client.representative}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">
                    <button
                      className="view-butn"
                      onClick={() => navigate("/statements-list", { state: { clientId: client.id } })}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ViewClientStatement