"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/InstructionsList.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"

// Bell icon component with shake animation using SVG
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

// Add the CSS animation for the shake effect
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

const CompanyInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    clientId,
    clientName,
    selectedMonth: initialMonth,
    selectedYear: initialYear,
    activeFilter: initialFilter,
  } = location.state || {}

  // Debug log to check what state is being received
  console.log("CompanyInstructions received state:", {
    clientId,
    clientName,
    selectedMonth: initialMonth,
    selectedYear: initialYear,
    activeFilter: initialFilter,
  })

  // Get current month and year
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
    return monthNames[new Date().getMonth()]
  }

  const getCurrentYear = () => {
    return new Date().getFullYear().toString()
  }

  // Always default to current month and year regardless of passed values
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState(initialFilter || "All")

  // Pagination state - ADDED
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)

  // Add the shake animation when component mounts
  useEffect(() => {
    addShakeAnimation()
  }, [])

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        setLoading(true)
        console.log("Fetching instructions with clientId:", clientId) // Debug log

        // Fetch all instructions first
        const response = await api.get("/api/instructions")

        const data = response.data
        console.log("All instructions fetched:", data.length)

        // Apply client filtering in the component
        let filteredData = data

        if (clientId) {
          // Convert clientId to string for consistent comparison
          const clientIdStr = String(clientId)

          // Apply strict filtering
          filteredData = data.filter((item) => {
            // Convert all possible client ID fields to strings for comparison
            const itemClientId = String(item.client || item.clientid || item.m5clientkey || item.client_id || "")
            const matches = itemClientId === clientIdStr

            // Log each comparison for debugging
            if (matches) {
              console.log(`Found matching item: ${JSON.stringify(item)}`)
            }

            return matches
          })

          console.log(`Filtered to ${filteredData.length} instructions for clientId: ${clientId}`)
        }

        setInstructions(filteredData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching instructions:", error)
        const errorMessage = error.response?.data?.message || error.message || "Failed to load instructions"
        setError(`Failed to load instructions: ${errorMessage}`)
        setLoading(false)
      }
    }

    fetchInstructions()
  }, [clientId])

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    setCurrentPage(1) // Reset to first page when filter changes - ADDED
  }

  // Helper function to get status priority for sorting
  const getStatusPriority = (status) => {
    switch (status) {
      case "New":
        return 1
      case "In progress":
        return 2
      case "Completed":
        return 3
      default:
        return 4 // Any other status will come after the specified ones
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
        filtered = filtered.filter(
          (item) =>
            item.type_text === "import" ||
            item.type === "import" ||
            item.shipment_type === 1 ||
            item.shipment_type === "1",
        )
      } else if (activeFilter === "export") {
        filtered = filtered.filter(
          (item) =>
            item.type_text === "export" ||
            item.type === "export" ||
            item.shipment_type === 2 ||
            item.shipment_type === "2",
        )
      }
    }

    // Sort by status priority: New -> In progress -> Completed
    filtered.sort((a, b) => {
      const priorityA = getStatusPriority(a.status)
      const priorityB = getStatusPriority(b.status)
      return priorityA - priorityB
    })

    return filtered
  }

  // Get filtered instructions and apply pagination - ADDED
  const filteredInstructions = getFilteredInstructions()
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentInstructions = filteredInstructions.slice(indexOfFirstRecord, indexOfLastRecord)

  // Handle page change - ADDED
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  // Reset to first page when month or year changes - ADDED
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear])

  // Handle view instruction click
  const handleViewInstruction = (instructionId) => {
    navigate("/Viewcontrollerinstructions", {
      state: {
        instructionId,
        clientId,
        clientName,
        selectedMonth,
        selectedYear,
        activeFilter,
      },
    })
  }
  const handleViewAssignment = (instructionId) => {
    console.log(`Navigating to DirectorManagerViewAssignment with instructionId: ${instructionId}`)
    navigate("/DirectorManagerViewAssignment", {
      state: {
        instructionId,
        clientId,
        clientName,
        selectedMonth,
        selectedYear,
        activeFilter,
      },
    })
  }

  // Function to render status with bell for "New" status
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

  return (
    <div>
      {/* Centered month and year filters - MOVED ABOVE the company name */}
      <div className="dropdown-container74">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="dropdown">
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
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* Centered company name heading */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/CompanyInstructionView")}>
          Back
        </button>
        {clientName && (
          <span className="client-name">
            {clientName} <span style={{ display: "none" }}>{clientId ? `(Client ID: ${clientId})` : ""}</span>
          </span>
        )}
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
                  getFilteredInstructions()
                    .slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)
                    .map((item) => (
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
                          <button
                            className="view-btn"
                            onClick={() => handleViewAssignment(item.m1controllerkey || item.m1key)}
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
      </div>

      {/* Pagination Component - ADDED */}
      {getFilteredInstructions().length > 0 && (
        <Pagination
          totalRecords={getFilteredInstructions().length}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}

export default CompanyInstructions
