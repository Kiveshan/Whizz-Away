"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/ViewClientInstruction.css"

const ViewClientInvoice = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        // Fetch clients from the database
        const response = await fetch("/api/clients")

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        setClients(data.data || [])
      } catch (err) {
        console.error("Error fetching clients:", err)
        setError(`Failed to load clients: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  const handleViewInvoices = (client) => {
    // Navigate to invoices page with client information
    navigate("/invoices", {
      state: {
        clientId: client.m5clientkey,
        clientName: client.companyname,
        clientEmail: client.email,
        clientRepresentative: client.representative,
      },
    })
  }

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/DebtorsDashboard")}>
          Back
        </button>
      </div>



      {/* Table */}
      <div className="clientinstructiontable">
        {loading ? (
          <div className="loading-message">Loading clients...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : clients.length === 0 ? (
          <div className="no-data-message">No clients found.</div>
        ) : (
          <table className="t1" style={{ width: "70%", marginLeft: "350px" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3">Invoices</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.m5clientkey} className="border-t">
                  <td className="p-3">{client.companyname}</td>
                  <td className="p-3">{client.representative}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">{client.invoice_count || 0}</td>
                  <td className="p-3">
                    <button className="view-butn" onClick={() => handleViewInvoices(client)}>
                      View Invoices
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ViewClientInvoice

