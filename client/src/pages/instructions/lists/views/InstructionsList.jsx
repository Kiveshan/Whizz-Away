"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/InstructionsList.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"

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

// Helper function to get current month name
const getCurrentMonthName = () => {
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
  const currentMonth = new Date().getMonth() // 0-11
  return monthNames[currentMonth]
}

// Helper function to get current year as string
const getCurrentYear = () => {
  return new Date().getFullYear().toString()
}

const Instructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract state from location
  const clientId = location.state?.clientId
  const clientName = location.state?.clientName

  // Initialize state with current month and year
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [activeFilter, setActiveFilter] = useState(location.state?.activeFilter || "All")

  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)

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

  const fetchInstructions = async () => {
    try {
      setLoading(true)
      let url = "/api/instructions/instructions"

      // Add client filter if clientId is provided
      if (clientId) {
        console.log("Fetching instructions for clientId:", clientId)
        url += `?clientId=${clientId}`
      } else {
        console.log("No clientId provided, fetching all instructions")
      }

      console.log("Fetching from URL:", url)
      const response = await api.get(url)

      const data = response.data
      console.log("Instructions data received:", data.length, "records")
      setInstructions(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching instructions:", error)
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to load instructions. Please try again later."
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Log the clientId to verify it's being received correctly
  console.log("InstructionsList - clientId for fetching:", clientId)

  // Only fetch instructions if component is mounted
  useEffect(() => {
    fetchInstructions()
  }, [clientId]) // Make sure clientId is in the dependency array

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  // Helper function to determine status priority for sorting
  const getStatusPriority = (status) => {
    switch (status) {
      case "New":
        return 1 // Highest priority
      case "In progress":
        return 3
      case "Completed":
        return 4
      default:
        return 5 // Lowest priority
    }
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
      } else if (activeFilter === "cross-haul") {
        filtered = filtered.filter(
          (item) =>
            item.type_text === "cross-haul" ||
            item.type === "cross-haul" ||
            item.shipment_type === 3 ||
            item.shipment_type === "3"
        )
      } else if (activeFilter === "cross-haul-break-bulk") {
        filtered = filtered.filter(
          (item) =>
            item.type_text === "cross-haul-break-bulk" ||
            item.type === "cross-haul-break-bulk" ||
            item.shipment_type === 4 ||
            item.shipment_type === "4"
        )
      }
    }

    // Sort by status priority first, then by instruction number (descending)
    filtered.sort((a, b) => {
      // Primary sort: Status priority
      const priorityA = getStatusPriority(a.status)
      const priorityB = getStatusPriority(b.status)

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // Secondary sort: Instruction number (descending)
      const instructionA = Number.parseInt(a.m1controllerkey || a.m1key || 0)
      const instructionB = Number.parseInt(b.m1controllerkey || b.m1key || 0)
      return instructionB - instructionA // Descending order
    })

    return filtered
  }

  // Pagination logic
  const filteredInstructions = getFilteredInstructions()
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentInstructions = filteredInstructions.slice(indexOfFirstRecord, indexOfLastRecord)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear, activeFilter])

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
  // Added this new function
  const handleViewAssignment = (instructionId) => {
    // Create state object with all necessary parameters
    const stateToPass = {
      instructionId,
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    }

    // Log the state being passed to update-instructions
    console.log("Navigating to update-instructions with state:", stateToPass)

    navigate("/update-instructions", { state: stateToPass })
  }
  return (
    <div>
      {/* Centered month and year filters - now positioned ABOVE the company name */}
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

      {/* Centered company name heading */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ViewClientInstruction")}>
          Back
        </button>
        {clientName && <span className="client-name">{clientName}</span>}
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
              className={`btn btn-blue ${activeFilter === "cross-haul" ? "active" : ""}`}
              onClick={() => handleFilterClick("cross-haul")}
            >
              Cross-Haul
            </button>
            <button
              className={`btn btn-blue ${activeFilter === "cross-haul-break-bulk" ? "active" : ""}`}
              onClick={() => handleFilterClick("cross-haul-break-bulk")}
            >
              Cross-Haul (Break Bulk)
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
                  <th>Creation Date</th>
                  <th>Instruction</th>
                  <th>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {currentInstructions.length === 0 ? (
                  <tr>
                    <td colSpan="7">No instructions found</td>
                  </tr>
                ) : (
                  currentInstructions.map((item) => (
                    <tr key={item.m1controllerkey || item.m1key}>
                      <td>Instruction {item.m1controllerkey || item.m1key}</td>
                      <td>{item.fileno}</td>
                      <td>
                        {item.type_text ||
                          (item.shipment_type === 1 || item.shipment_type === "1"
                            ? "import"
                            : item.shipment_type === 2 || item.shipment_type === "2"
                              ? "export"
                              : item.shipment_type === 3 || item.shipment_type === "3"
                                ? "cross-haul"
                                : item.shipment_type === 4 || item.shipment_type === "4"
                                  ? "cross-haul (break bulk)"
                                  : item.type)}
                      </td>
                      <td>{renderStatus(item.status)}</td>
                      <td>{new Date(item.startingdate || item.pickupdate).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => handleViewInstruction(item.m1key)} //item.m1controllerkey
                        >
                          View
                        </button>
                      </td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => {
                            // Create state object with all necessary parameters
                            const stateToPass = {
                              instructionId: item.m1key || item.m1controllerkey,
                              clientId,
                              clientName,
                              selectedMonth,
                              selectedYear,
                              activeFilter,
                              selectedLegIndex: 0,
                            }

                            // Log the state being passed to update-instructions
                            console.log("Navigating to update-instructions with state:", stateToPass)

                            // Use replace: true to ensure a clean navigation
                            navigate("/update-instructions", {
                              state: stateToPass,
                              replace: true,
                            })
                          }}
                        >
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

        {/* Pagination - Added below the tables-container */}
        {filteredInstructions.length > recordsPerPage && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
            <Pagination
              currentPage={currentPage}
              totalRecords={filteredInstructions.length}
              recordsPerPage={recordsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Instructions
