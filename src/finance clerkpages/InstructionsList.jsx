"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InstructionsList.css"
import API_CONFIG from "../utils/api-config"

const Instructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId, clientName } = location.state || {}

  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState("All")

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true)
        let url = `${API_CONFIG.BASE_URL}/api/instructions`

        // Add client filter if clientId is provided
        if (clientId) {
          url += `?clientId=${clientId}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Instructions data:", data) // Debug log
        setInstructions(data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching instructions:", error)
        setError("Failed to load instructions. Please try again later.")
        setLoading(false)
      }
    }

    fetchInstructions()
  }, [clientId])

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
  }

  const getFilteredInstructions = () => {
    let filtered = [...instructions]

    // Filter by month and year if selected
    if (selectedMonth) {
      filtered = filtered.filter((item) => {
        const date = new Date(item.startingdate || item.pickupdate)
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
        ]
        return monthNames[date.getMonth()] === selectedMonth
      })
    }

    if (selectedYear) {
      filtered = filtered.filter((item) => {
        const date = new Date(item.startingdate || item.pickupdate)
        return date.getFullYear().toString() === selectedYear
      })
    }

    // Filter by status or type
    if (activeFilter !== "All") {
      if (["New", "In progress", "Completed"].includes(activeFilter)) {
        filtered = filtered.filter((item) => item.status === activeFilter)
      } else if (activeFilter === "import") {
        filtered = filtered.filter((item) => item.type_text === "import" || item.type === "import")
      } else if (activeFilter === "export") {
        filtered = filtered.filter((item) => item.type_text === "export" || item.type === "export")
      }
    }

    return filtered
  }

  // Handle view instruction click
  const handleViewInstruction = (instructionId) => {
    navigate("/FCcontrollerinstructions", {
      state: { instructionId },
    })
  }

  return (
    <div>
      {/* Centered company name heading */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ViewClientInstruction")}>
          Back
        </button>
        {clientName && <span className="client-name">{clientName}</span>}
      </div>

      {/* Centered month and year filters */}
      <div className="dropdown-container74">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="dropdown">
          <option value="">Select Month</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
        </select>

        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="dropdown">
          <option value="">Select Year</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      <div className="content1">
        <div className="button-group">
          <div className="filter-buttons">
            <button className="btn btn-blue" onClick={() => handleFilterClick("import")}>
              Import
            </button>
            <button className="btn btn-blue" onClick={() => handleFilterClick("export")}>
              Export
            </button>
            <button className="btn btn-blue" onClick={() => handleFilterClick("All")}>
              All
            </button>
            <button className="btn btn-blue" onClick={() => handleFilterClick("In progress")}>
              In-Progress
            </button>
            <button className="btn btn-blue" onClick={() => handleFilterClick("Completed")}>
              Complete
            </button>
            <button className="btn btn-blue" onClick={() => handleFilterClick("New")}>
              New
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
                  <th>File No</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Starting Date</th>
                  <th>Instruction</th>
                  <th>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredInstructions().length === 0 ? (
                  <tr>
                    <td colSpan="7">No instructions found</td>
                  </tr>
                ) : (
                  getFilteredInstructions().map((item) => (
                    <tr key={item.m1controllerkey || item.m1key}>
                      <td>Instruction {item.m1controllerkey || item.m1key}</td>
                      <td>{item.fileno}</td>
                      <td>
                        {item.type_text ||
                          (item.shipment_type === 1 || item.shipment_type === "1"
                            ? "import"
                            : item.shipment_type === 2 || item.shipment_type === "2"
                              ? "export"
                              : item.type)}
                      </td>
                      <td>{item.status}</td>
                      <td>{new Date(item.startingdate || item.pickupdate).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => handleViewInstruction(item.m1controllerkey || item.m1key)}
                        >
                          View
                        </button>
                      </td>
                      <td>
                        <button className="view-btn" onClick={() => navigate("/update-instructions")}>
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

