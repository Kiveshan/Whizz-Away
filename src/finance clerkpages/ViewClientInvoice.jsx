"use client"
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/ViewClientInstruction.css"

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data)
  }
}

const ViewClientInvoice = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchClients = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch clients from the database
        const response = await fetch("/api/clients")

        if (!response.ok) {
          let errorMessage = `HTTP error! Status: ${response.status}`

          try {
            const errorText = await response.text()
            debug("Error response text:", errorText)

            if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
              errorMessage = "Received HTML instead of JSON. This may indicate a proxy configuration issue."
            } else {
              errorMessage += ` Details: ${errorText}`
            }
          } catch (textError) {
            console.error("Error getting response text:", textError)
          }

          throw new Error(errorMessage)
        }

        const data = await response.json()

        // Debug the response to see its structure
        debug("API Response:", data)

        if (isMounted) {
          // Handle different response formats
          // If data is an object with a rows property (like result.rows)
          if (data && data.rows) {
            setClients(data.rows)
          }
          // If data is already an array
          else if (Array.isArray(data)) {
            setClients(data)
          }
          // If data has a data property that is an array
          else if (data && data.data && Array.isArray(data.data)) {
            setClients(data.data)
          }
          // If we can't determine the format, set an empty array
          else {
            console.error("Unexpected data format:", data)
            setClients([])
            setError("Received data in an unexpected format. Check console for details.")
          }

          setLoading(false)
        }
      } catch (err) {
        console.error("Error fetching clients:", err)
        if (isMounted) {
          setError(`Failed to load clients: ${err.message}`)
          setLoading(false)
        }
      }
    }

    fetchClients()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [])

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
      })
    },
    [navigate],
  )

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
          <table className="t1">
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.m5clientkey} className="border-t">
                  <td className="p-3">{client.companyname}</td>
                  <td className="p-3">{client.representative}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">
                    <button className="view-butn" onClick={() => handleViewInvoices(client)}>
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
  )
}

export default ViewClientInvoice
