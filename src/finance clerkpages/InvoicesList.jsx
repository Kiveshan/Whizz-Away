"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InvoicesList.css"

// Utility function for formatting dates
const formatDate = (dateString) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
}

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data)
  }
}

const InvoicesList = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get client information from location state (if available)
  const clientInfo = location.state || {}
  const { clientId, clientName, clientEmail, clientRepresentative } = clientInfo

  // Add state for instructions, loading, and error
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Changed initial state to have empty values for year and month
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    type: "All", // Default to import since it's active in the UI
    clientId: clientId || null, // Add clientId to filters
  })

  // Skip initial render to prevent auto-filtering on page load
  const [isInitialRender, setIsInitialRender] = useState(true)

  // Fetch instructions when component mounts or filters change
  useEffect(() => {
    let isMounted = true

    // Skip the initial render to prevent auto-filtering on page load
    if (isInitialRender) {
      setIsInitialRender(false)
      return
    }

    const fetchInstructions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build query parameters
        const params = new URLSearchParams()
        if (filters.year) params.append("year", filters.year)
        if (filters.month) params.append("month", filters.month)
        if (filters.type !== "All") params.append("type", filters.type)
        if (filters.clientId) params.append("clientId", filters.clientId)

        // Use a relative URL - the proxy will forward this to your API server
        const requestUrl = `/api/invoices/completed?${params.toString()}`
        debug("Fetching from:", requestUrl)

        const response = await fetch(requestUrl)
        debug("Response status:", response.status)

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

        // Try to parse the response as JSON
        let data
        try {
          const text = await response.text()
          debug("Raw response:", text.substring(0, 200)) // Log first 200 chars for debugging
          data = JSON.parse(text)
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          throw new Error(`Failed to parse response as JSON: ${parseError.message}`)
        }

        debug("Received data:", data)

        if (isMounted) {
          setInstructions(data.data || [])
          setLoading(false)
        }
      } catch (err) {
        console.error("Error fetching instructions:", err)
        if (isMounted) {
          setError(`Failed to load instructions: ${err.message}`)
          setLoading(false)
        }
      }
    }

    // Only fetch if at least one filter is set (year, month, or clientId)
    if (filters.year || filters.month || filters.clientId) {
      fetchInstructions()
    } else {
      // If no filters are set, clear the instructions and show a message
      setInstructions([])
      setLoading(false)
    }

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [filters, isInitialRender]) // dependencies include isInitialRender

  // Handle year and month filter changes - use useCallback to memoize
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  // Handle type filter changes - use useCallback to memoize
  const handleTypeFilter = useCallback((type) => {
    setFilters((prev) => ({
      ...prev,
      type,
    }))
  }, [])

  // Determine the back button destination
  const handleBackClick = useCallback(() => {
    // If we came from client selection, go back to that page
    if (clientId) {
      navigate("/ViewClientInvoice")
    } else {
      // Otherwise go to the default dashboard
      navigate("/FDashboard")
    }
  }, [clientId, navigate])

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
              {clientName
                ? `Please select a filter to view invoices for ${clientName}.`
                : "Please select a filter to view invoices."}
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
                </tr>
              </thead>
              <tbody>
                {instructions.map((instruction) => (
                  <tr key={instruction.m1key}>
                    <td>{instruction.m1key}</td>
                    <td>{instruction.shipment_type}</td>
                    <td>{instruction.file_no}</td>
                    <td>{formatDate(instruction.date)}</td>
                    <td>
                      <button
                        className="small-btn"
                        onClick={() => {
                          debug(`Navigating to invoice view for ID: ${instruction.ikey}`)
                          navigate(`/invoice/${instruction.ikey}`, {
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

