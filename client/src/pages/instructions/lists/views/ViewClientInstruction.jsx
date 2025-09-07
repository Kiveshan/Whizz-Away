"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../../css/ViewClientInstruction.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"

const ViewClientInstruction = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalNewInstructions, setTotalNewInstructions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        setLoading(true)
        const response = await api.get("/api/instructions/client-instruction-stats")

        const data = response.data
        console.log("Client data received:", data) // Debug log

        // Ensure all clients have the required properties as numbers
        const processedData = data.map((client) => ({
          ...client,
          new_count: Number.parseInt(client.new_count) || 0,
          in_progress_count: Number.parseInt(client.in_progress_count) || 0,
          completed_count: Number.parseInt(client.completed_count) || 0,
        }))

        // Calculate total new instructions
        const totalNew = processedData.reduce((sum, client) => sum + client.new_count, 0)
        setTotalNewInstructions(totalNew)

        setClients(processedData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching client statistics:", error)
        const errorMessage =
          error.response?.data?.message || error.message || "Failed to load client data. Please try again later."
        setError(errorMessage)
        setLoading(false)
      }
    }

    fetchClientStats()
  }, [])

  // Bell icon component for header
  const BellIcon = ({ count }) => {
    const hasNewInstructions = count > 0

    const bellStyle = {
      width: "24px",
      height: "24px",
      fill: count > 0 ? "#ff0000" : "#00cc00", // Red if there are new instructions, green if zero
      position: "relative",
    }

    return (
      <div className={`view-client-instruction-bell-icon ${hasNewInstructions ? "shake" : ""}`}>
        <svg style={bellStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {count > 0 && <span className="view-client-instruction-bell-count">{count}</span>}
      </div>
    )
  }

  // Bell icon component for table rows
  const RowBellIcon = ({ count }) => {
    // Only show bell if count > 0
    if (count <= 0) return null

    const bellStyle = {
      width: "20px", // Slightly smaller than header bell
      height: "20px",
      fill: "#ff0000", // Red color
      display: "inline-block",
      position: "relative",
    }

    return (
      <div className="view-client-instruction-bell-icon shake">
        <svg style={bellStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        <span className="view-client-instruction-row-bell-count">{count}</span>
      </div>
    )
  }

  // Handle view instructions click - explicitly pass clientId and clientName
  const handleViewInstructions = (clientId, clientName) => {
    console.log("Navigating to instructions with clientId:", clientId, "and clientName:", clientName)
    navigate("/instructions", {
      state: {
        clientId: clientId,
        clientName: clientName,
      },
    })
  }

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentClients = clients.slice(indexOfFirstRecord, indexOfLastRecord)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  return (
    <div className="view-client-instruction-wrapper">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>

      <div className="view-client-instruction-table-container">
        {loading ? (
          <p className="view-client-instruction-loading">Loading client data...</p>
        ) : error ? (
          <p className="view-client-instruction-error">{error}</p>
        ) : (
          <div className="view-client-instruction-table-wrapper">
            <table className="view-client-instruction-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Representative</th>
                  <th>Email</th>
                  <th className="view-client-instruction-centered-cell">
                    <div className="view-client-instruction-bell-header">
                      New <BellIcon count={totalNewInstructions} />
                    </div>
                  </th>
                  <th className="view-client-instruction-centered-cell">In Progress</th>
                  <th className="view-client-instruction-centered-cell">Completed</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="view-client-instruction-no-data">
                      No client data available
                    </td>
                  </tr>
                ) : (
                  currentClients.map((client, index) => (
                    <tr key={index} className="border-t">
                      <td>{client.companyname}</td>
                      <td>{client.representative}</td>
                      <td>{client.email}</td>
                      <td className="view-client-instruction-centered-cell">
                        {client.new_count > 0 ? <RowBellIcon count={client.new_count} /> : "0"}
                      </td>
                      <td className="view-client-instruction-centered-cell">{client.in_progress_count}</td>
                      <td className="view-client-instruction-centered-cell">{client.completed_count}</td>
                      <td>
                        <button
                          className={`view-client-instruction-view-button ${client.new_count > 0 ? "bg-red-500" : ""}`}
                          onClick={() => handleViewInstructions(client.m5clientkey, client.companyname)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - Centered below the table */}
        {clients.length > recordsPerPage && (
          <div className="view-client-instruction-pagination-container">
            <Pagination
              currentPage={currentPage}
              totalRecords={clients.length}
              recordsPerPage={recordsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ViewClientInstruction
