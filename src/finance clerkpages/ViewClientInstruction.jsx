"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/ViewClientStatements.css"
import API_CONFIG from "../utils/api-config"

const ViewClientInstruction = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalNewInstructions, setTotalNewInstructions] = useState(0)

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/client-instruction-stats`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
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
        setError("Failed to load client data. Please try again later.")
        setLoading(false)
      }
    }

    fetchClientStats()
  }, [])

  // Style for centered cells
  const centeredCellStyle = {
    textAlign: "center",
  }

  // Style for new count > 0
  const newCountStyle = (count) => {
    if (count > 0) {
      return {
        color: "fuchsia", // Bright fuchsia color
        fontWeight: "900", // Maximum boldness
        fontSize: "0.95em", // Smaller size
        textAlign: "center",
      }
    }
    return centeredCellStyle
  }

  // Bell icon styles
  const bellContainerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  }

  // Bell animation keyframes
  const bellKeyframes = `
    @keyframes bellShake {
      0% { transform: rotate(0); }
      15% { transform: rotate(5deg); }
      30% { transform: rotate(-5deg); }
      45% { transform: rotate(4deg); }
      60% { transform: rotate(-4deg); }
      75% { transform: rotate(2deg); }
      85% { transform: rotate(-2deg); }
      92% { transform: rotate(1deg); }
      100% { transform: rotate(0); }
    }
  `

  // Bell icon component
  const BellIcon = ({ count }) => {
    const hasNewInstructions = count > 0
    
    const bellStyle = {
      width: "24px",
      height: "24px",
      fill: "#ff0000", // Always red
      animation: hasNewInstructions ? "bellShake 2s infinite" : "none",
      position: "relative",
    }
    
    const countStyle = {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "black",
    }
    
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <style>{bellKeyframes}</style>
        {/* Solid bell SVG */}
        <svg style={bellStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {count > 0 && <span style={countStyle}>{count}</span>}
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

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>

      {/* Table */}
      <div className="table3" style={{ display: "flex", justifyContent: "center" }}>
        {loading ? (
          <p>Loading client data...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <table className="t1" style={{ marginLeft: "auto", marginRight: "auto" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3" style={centeredCellStyle}>
                  <div style={bellContainerStyle}>
                    New <BellIcon count={totalNewInstructions} />
                  </div>
                </th>
                <th className="p-3" style={centeredCellStyle}>
                  In Progress
                </th>
                <th className="p-3" style={centeredCellStyle}>
                  Completed
                </th>
                <th className="p-3">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-3">
                    No client data available
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{client.companyname}</td>
                    <td className="p-3">{client.representative}</td>
                    <td className="p-3">{client.email}</td>
                    <td className="p-3" style={newCountStyle(client.new_count)}>
                      {client.new_count}
                    </td>
                    <td className="p-3" style={centeredCellStyle}>
                      {client.in_progress_count}
                    </td>
                    <td className="p-3" style={centeredCellStyle}>
                      {client.completed_count}
                    </td>
                    <td className="p-3">
                      <button
                        className={`view-butn ${client.new_count > 0 ? "bg-red-500" : ""}`}
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
        )}
      </div>
    </div>
  )
}

export default ViewClientInstruction

