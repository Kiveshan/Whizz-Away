"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InvoicesList.css"

const InvoicesList = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get client information from location state (if available)
  const clientInfo = location.state || {}
  const { clientId, clientName, clientEmail, clientRepresentative } = clientInfo

  // Add state for instructions, loading, and error
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    type: "import", // Default to import since it's active in the UI
    clientId: clientId || null, // Add clientId to filters
  })

  // Fetch instructions when component mounts or filters change
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true)

        // Build query parameters
        const params = new URLSearchParams()
        if (filters.year) params.append("year", filters.year)
        if (filters.month) params.append("month", filters.month)
        if (filters.type !== "All") params.append("type", filters.type)
        if (filters.clientId) params.append("clientId", filters.clientId)

        // Use a relative URL - the proxy will forward this to your API server
        const requestUrl = `/api/invoices/completed?${params.toString()}`
        console.log("Fetching from:", requestUrl)

        const response = await fetch(requestUrl)

        // Log the response status for debugging
        console.log("Response status:", response.status)

        if (!response.ok) {
          // Try to get the response text for better error debugging
          const text = await response.text()
          console.error("Error response text:", text)

          // Check if the response is HTML (which would indicate a proxy issue)
          if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
            throw new Error(
              `Received HTML instead of JSON. This may indicate a proxy configuration issue. Status: ${response.status}`,
            )
          } else {
            throw new Error(`HTTP error! Status: ${response.status}`)
          }
        }

        // Try to parse the response as JSON
        let data
        try {
          const text = await response.text()
          console.log("Raw response:", text.substring(0, 200)) // Log first 200 chars for debugging
          data = JSON.parse(text)
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          throw new Error(`Failed to parse response as JSON: ${parseError.message}`)
        }

        console.log("Received data:", data)
        setInstructions(data.data || [])
      } catch (err) {
        console.error("Error fetching instructions:", err)
        setError(`Failed to load instructions: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchInstructions()
  }, [filters]) // filters is the dependency

  // Handle year and month filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle type filter changes
  const handleTypeFilter = (type) => {
    setFilters((prev) => ({
      ...prev,
      type,
    }))
  }

  // Format date from ISO to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
  }

  // Determine the back button destination
  const handleBackClick = () => {
    // If we came from client selection, go back to that page
    if (clientId) {
      navigate("/ViewClientInvoice")
    } else {
      // Otherwise go to the default dashboard
      navigate("/FDashboard")
    }
  }

  return (
    <div className="app">
      {/* Main */}
      <main className="main">
        {/* Back Button */}
        <div className="">
          <button className="back-button" onClick={handleBackClick}>
            Back
          </button>
        </div>

        {/* Client Info Section - Only show if client info is available */}
        {/* Remove the client info section that displays client details */}
        {/* Delete or comment out this block:
        {clientName && (
          <div className="client-info-section">
            <h2 className="client-name">{clientName}</h2>
            <div className="client-details">
              <p>
                <strong>Representative:</strong> {clientRepresentative}
              </p>
              <p>
                <strong>Email:</strong> {clientEmail}
              </p>
            </div>
          </div>
        )} */}

        <div className="action-bar" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <div className="filter-section6">
            <div className="dropdown-container">
              <select className="dropdown" name="year" value={filters.year} onChange={handleFilterChange}>
                <option value="">Year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
              <select className="dropdown" name="month" value={filters.month} onChange={handleFilterChange}>
                <option value="">Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-group1">
            <button
              className={`filter-button ${filters.type === "import" ? "active" : ""}`}
              onClick={() => handleTypeFilter("import")}
            >
              Import
            </button>
            <button
              className={`filter-button ${filters.type === "export" ? "active" : ""}`}
              onClick={() => handleTypeFilter("export")}
            >
              Export
            </button>
            <button
              className={`filter-button outline ${filters.type === "All" ? "active" : ""}`}
              onClick={() => handleTypeFilter("All")}
            >
              All
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-container22">
          {loading ? (
            <div className="loading-message">Loading instructions...</div>
          ) : error ? (
            <div className="error-message">
              {error}
              <div style={{ marginTop: "10px", fontSize: "0.9em" }}>
                <p>Troubleshooting tips:</p>
                <ul style={{ textAlign: "left", paddingLeft: "20px" }}>
                  <li>Make sure your API server is running on port 5000</li>
                  <li>Check that your package.json has "proxy": "http://localhost:5000"</li>
                  <li>Verify that the API endpoint /api/invoices/completed exists on your server</li>
                </ul>
              </div>
            </div>
          ) : instructions.length === 0 ? (
            <div className="no-data-message">
              {clientName ? `No completed instructions found for ${clientName}.` : "No completed instructions found."}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Instruction No</th>
                  <th>Type</th>
                  <th>File No</th>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((instruction) => (
                  <tr key={instruction.m1key}>
                    <td>{instruction.instruction_no}</td>
                    <td>{instruction.shipment_type}</td>
                    <td>{instruction.file_no}</td>
                    <td>{formatDate(instruction.date)}</td>
                    <td>
                      <button
                        className="small-btn"
                        onClick={() => {
                          console.log(`Navigating to invoice view for ID: ${instruction.m1key}`)
                          navigate(`/invoice/${instruction.m1key}`, {
                            state: {
                              clientId,
                              clientName,
                              returnToClientView: !!clientId,
                            },
                          })
                        }}
                      >
                        View
                      </button>
                    </td>
                    <td>
                      <button
                        className="small-btn"
                        onClick={() => {
                          console.log(`Navigating to invoice download for ID: ${instruction.m1key}`)
                          navigate(`/invoice/${instruction.m1key}/download`, {
                            state: {
                              clientId,
                              clientName,
                              returnToClientView: !!clientId,
                            },
                          })
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

export default InvoicesList

