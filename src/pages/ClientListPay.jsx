"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../finance clerkpages/css/ViewClientInstruction.css"

const ClientListPay = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        const response = await axios.get("http://localhost:5000/api/clients")

        // Handle both response formats - either an object with success/data or direct array
        const clientsData = response.data.data || response.data

        // Ensure we have an array before setting state
        if (Array.isArray(clientsData)) {
          setClients(clientsData)
        } else {
          console.error("Unexpected response format:", response.data)
          setError("Received invalid data format from server")
        }
      } catch (err) {
        console.error("Error fetching clients:", err)
        setError("An error occurred while fetching clients")
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/debtors")}>
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <div className="loading-message">Loading clients...</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Table */}
      {!loading && !error && (
        <div className="clientinstructiontable">
          <table className="t1" style={{ width: "70%", marginLeft: "350px" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length > 0 ? (
                clients.map((client, index) => (
                  <tr key={client.m5clientkey || index} className="border-t">
                    <td className="p-3">{client.companyname}</td>
                    <td className="p-3">{client.representative}</td>
                    <td className="p-3">{client.email}</td>
                    <td className="p-3">
                      <button
                        className="view-butn"
                        onClick={() =>
                          navigate("/client-payments", {
                            state: {
                              clientId: client.m5clientkey,
                              clientName: client.companyname,
                            },
                          })
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-3 text-center">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ClientListPay
