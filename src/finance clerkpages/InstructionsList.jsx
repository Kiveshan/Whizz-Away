"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/InstructionsList.css"
import API_CONFIG from "../utils/api-config"

// Bell icon component with shake animation using SVG - exactly like in CompanyInstructions.jsx
const BellIcon = () => {
  return (
    <span
      className="bell-icon-status"
      style={{
        display: "inline-block",
        marginRight: "5px",
        animation: "shake 0.5s infinite",
        verticalAlign: "middle",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ fill: "red" }}
      >
        <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" />
      </svg>
    </span>
  )
}

// Add the CSS animation for the shake effect - exactly like in CompanyInstructions.jsx
const addShakeAnimation = () => {
  const styleSheet = document.createElement("style")
  styleSheet.textContent = `
  @keyframes shake {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(5deg); }
    50% { transform: rotate(0deg); }
    75% { transform: rotate(-5deg); }
    100% { transform: rotate(0deg); }
  }
  
  .bell-icon-status {
    display: inline-block;
  }
`
  document.head.appendChild(styleSheet)
}

const Instructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract state from location
  const clientId = location.state?.clientId
  const clientName = location.state?.clientName

  // Initialize state with values from location state if available
  const [selectedMonth, setSelectedMonth] = useState(location.state?.selectedMonth || "")
  const [selectedYear, setSelectedYear] = useState(location.state?.selectedYear || "")
  const [activeFilter, setActiveFilter] = useState(location.state?.activeFilter || "All")

  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add the shake animation when component mounts - exactly like in CompanyInstructions.jsx
  useEffect(() => {
    addShakeAnimation()
  }, [])

  // Log when component mounts and what state it receives
  useEffect(() => {
    console.log("InstructionsList mounted with state:", location.state)
    console.log("clientId:", clientId)
    console.log("clientName:", clientName)
    console.log("selectedMonth:", selectedMonth)
    console.log("selectedYear:", selectedYear)
    console.log("activeFilter:", activeFilter)
  }, [location.state, clientId, clientName, selectedMonth, selectedYear, activeFilter])

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true)
        let url = `${API_CONFIG.BASE_URL}/api/instructions`

        // Add client filter if clientId is provided
        if (clientId) {
          console.log("Fetching instructions for clientId:", clientId)
          url += `?clientId=${clientId}`
        } else {
          console.log("No clientId provided, fetching all instructions")
        }

        console.log("Fetching from URL:", url)
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Instructions data received:", data.length, "records")
        setInstructions(data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching instructions:", error)
        setError("Failed to load instructions. Please try again later.")
        setLoading(false)
      }
    }

    // Log the clientId to verify it's being received correctly
    console.log("InstructionsList - clientId for fetching:", clientId)

    // Only fetch instructions if component is mounted
    fetchInstructions()
  }, [clientId]) // Make sure clientId is in the dependency array

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

    // Sort instructions with "New" status to the top, then by date (most recent first)
    filtered = filtered.sort((a, b) => {
      // First, sort by status (New instructions at the top)
      if (a.status === "New" && b.status !== "New") return -1
      if (a.status !== "New" && b.status === "New") return 1

      // Then, sort by date (most recent first)
      const dateA = new Date(a.startingdate || a.pickupdate)
      const dateB = new Date(b.startingdate || b.pickupdate)
      return dateB - dateA
    })

    return filtered
  }

  // Function to render status with bell for "New" status - exactly like in CompanyInstructions.jsx
  const renderStatus = (status) => {
    if (status === "New") {
      return (
        <>
          <BellIcon /> {status}
        </>
      )
    }
    return status
  }

  // Handle view instruction click - explicitly pass all state to FCcontrollerinstructions
  const handleViewInstruction = (instructionId) => {
    // Create state object with all necessary parameters
    const stateToPass = {
      instructionId,
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    }

    // Log the state being passed to FCcontrollerinstructions
    console.log("Navigating to FCcontrollerinstructions with state:", stateToPass)

    navigate("/FCcontrollerinstructions", { state: stateToPass })
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
            <button
              className={`btn btn-blue ${activeFilter === "import" ? "active" : ""}`}
              onClick={() => handleFilterClick("import")}
            >
              Import
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "export" ? "active" : ""}`}
              onClick={() => handleFilterClick("export")}
            >
              Export
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "All" ? "active" : ""}`}
              onClick={() => handleFilterClick("All")}
            >
              All
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "In progress" ? "active" : ""}`}
              onClick={() => handleFilterClick("In progress")}
            >
              In-Progress
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "Completed" ? "active" : ""}`}
              onClick={() => handleFilterClick("Completed")}
            >
              Complete
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "New" ? "active" : ""}`}
              onClick={() => handleFilterClick("New")}
            >
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
                      <td>{renderStatus(item.status)}</td>
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

