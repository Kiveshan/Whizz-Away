"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import "../finance clerkpages/css/InstructionsList.css"

const Instructions = ({ setCurrentPage }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const clientId = location.state?.clientId

  useEffect(() => {
    if (clientId) {
      fetchInstructions()
    } else {
      setError("Client ID is missing. Please go back to the client list.")
      setLoading(false)
    }
  }, [clientId])

  const fetchInstructions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:5000/client-instructions-details/${clientId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      setInstructions(data)
      setLoading(false)
    } catch (err) {
      console.error("Error fetching instructions:", err)
      setError("Failed to load instructions. Please try again later.")
      setLoading(false)
    }
  }

  const getShipmentType = (type) => {
    console.log("getShipmentType received:", type)
    return type === 1 ? "Import" : type === 2 ? "Export" : "Unknown"
  }

  // Filter instructions based on both status and type filters
  const filteredInstructions = instructions.filter((item) => {
    // Normalize status by trimming spaces and converting to lowercase
    const normalizedStatus = item.status ? item.status.trim().toLowerCase() : "new"
    const normalizedFilterStatus = statusFilter.trim().toLowerCase()

    // Check if the item passes the status filter
    const passesStatusFilter = normalizedFilterStatus === "all" || normalizedStatus === normalizedFilterStatus

    // Check if the item passes the type filter
    const passesTypeFilter =
      typeFilter === "All" ||
      (typeFilter === "Import" && item.shippy === 1) ||
      (typeFilter === "Export" && item.shippy === 2)

    // Return true only if the item passes both filters
    return passesStatusFilter && passesTypeFilter
  })

  const handleStatusFilterClick = (filterType) => {
    setStatusFilter(filterType)
  }

  const handleTypeFilterClick = (filterType) => {
    setTypeFilter(filterType)
  }

  const handleViewAssignment = (item) => {
    navigate("/update-instructions", {
      state: {
        clientId: clientId,
        instructionId: item.m1key,
      },
    })
  }

  return (
    <div>
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ViewClientInstruction")}>
          Back
        </button>
      </div>

      <div className="content1">
        <div className="button-group">
          <div className="filter-buttons">
            <button
              className={`btn btn-blue ${typeFilter === "Import" ? "active" : ""}`}
              onClick={() => handleTypeFilterClick("Import")}
            >
              Import
            </button>
            <button
              className={`btn btn-blue ${typeFilter === "Export" ? "active" : ""}`}
              onClick={() => handleTypeFilterClick("Export")}
            >
              Export
            </button>
            <button
              className={`btn btn-blue ${statusFilter === "All" && typeFilter === "All" ? "active" : ""}`}
              onClick={() => {
                handleStatusFilterClick("All")
                handleTypeFilterClick("All")
              }}
            >
              All
            </button>
            <button
              className={`btn btn-blue ${statusFilter === "In Progress" ? "active" : ""}`}
              onClick={() => handleStatusFilterClick("In Progress")}
            >
              In-Progress
            </button>
            <button
              className={`btn btn-blue ${statusFilter === "Completed" ? "active" : ""}`}
              onClick={() => handleStatusFilterClick("Completed")}
            >
              Complete
            </button>
          </div>
        </div>
        <div className="tables-container">
          {loading ? (
            <p>Loading instructions...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <table className="t2">
              <thead>
                <tr>
                  <th>Instruction No</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>File No</th>
                  <th>Instruction</th>
                  <th>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstructions.length === 0 ? (
                  <tr>
                    <td colSpan="6">No instructions found</td>
                  </tr>
                ) : (
                  filteredInstructions.map((item) => (
                    <tr key={item.m1key}>
                      <td>{item.m1key}</td>
                      <td>{getShipmentType(item.shippy)}</td>
                      <td>{item.status || "New"}</td>
                      <td>{item.fileref || "N/A"}</td>
                      <td>
                        <button className="view-btn" onClick={() => navigate("")}>
                          View
                        </button>
                      </td>
                      <td>
                        <button className="view-btn" onClick={() => handleViewAssignment(item)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Instructions

