"use client"
import { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  // Get the userid from URL params
  const id = params.userid

  // Get the driver name from location state or use a fallback
  const driverName = location.state?.name || `Driver ${id}`

  // State for dropdown selections
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [driverInstructions, setDriverInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch instructions for this driver
    const fetchDriverInstructions = async () => {
      try {
        setLoading(true)
        console.log(`Fetching driver instructions for driver ID: ${id}`)

        let response
        let successfulEndpoint = ""

        // Try the first endpoint
        try {
          console.log("Trying endpoint: /api/driver-instructions/" + id)
          response = await fetch(`http://localhost:5000/api/driver-instructions/${id}`)

          if (response.ok) {
            console.log("SUCCESS: /api/driver-instructions/" + id + " endpoint worked!")
            successfulEndpoint = "/api/driver-instructions/" + id
          } else {
            // Try the second endpoint
            console.log("Trying endpoint: /instructions/driver/" + id)
            response = await fetch(`http://localhost:5000/instructions/driver/${id}`)

            if (response.ok) {
              console.log("SUCCESS: /instructions/driver/" + id + " endpoint worked!")
              successfulEndpoint = "/instructions/driver/" + id
            } else {
              // Try the third endpoint
              console.log("Trying endpoint: /legs/instruction/all/driver/" + id)
              response = await fetch(`http://localhost:5000/legs/instruction/all/driver/${id}`)

              if (response.ok) {
                console.log("SUCCESS: /legs/instruction/all/driver/" + id + " endpoint worked!")
                successfulEndpoint = "/legs/instruction/all/driver/" + id
              }
            }
          }

          if (!response.ok) {
            throw new Error(`All endpoints failed. Last status: ${response.status}`)
          }
        } catch (error) {
          console.error("All fetch attempts failed:", error)
          throw error
        }

        const data = await response.json()
        console.log(`Data successfully retrieved from endpoint: ${successfulEndpoint}`)
        console.log("Driver instructions data:", data)

        if (data.error) {
          throw new Error(data.error)
        }

        // Set the driver instructions data
        setDriverInstructions(Array.isArray(data) ? data : [])
        setLoading(false)
      } catch (error) {
        console.error("Error fetching driver instructions:", error)
        setError(`Failed to load driver instructions: ${error.message}`)
        setLoading(false)
      }
    }

    if (id) {
      fetchDriverInstructions()
    } else {
      console.error("No driver ID provided in URL params")
      setError("No driver ID provided in URL params")
      setLoading(false)
    }
  }, [id])

  // Filter instructions based on selected month and year
  const filteredInstructions = driverInstructions.filter((instruction) => {
    if (!selectedMonth && !selectedYear) return true

    // Try to use deadline first, fall back to pickupdate if deadline is not available
    const dateToUse = instruction.deadline || instruction.pickupdate
    if (!dateToUse) return true

    const instructionDate = new Date(dateToUse)
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

    const matchesMonth = !selectedMonth || monthNames[instructionDate.getMonth()] === selectedMonth
    const matchesYear = !selectedYear || instructionDate.getFullYear().toString() === selectedYear

    return matchesMonth && matchesYear
  })

  const handleViewLegs = (instructionId) => {
    navigate(`/FClerkLegDetails`, {
      state: {
        instructionId,
        driverId: id,
        driverName,
      },
    })
  }

  const handleViewWageSlip = (instructionId) => {
    navigate(`/finance-clerk-wage-slip/${id}`, {
      state: {
        instructionId,
        driverId: id,
        driverName,
      },
    })
  }

  const handleDownload = (instructionId) => {
    alert(`Downloading wage slip for Instruction ${instructionId}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "5px",
          marginBottom: "15px",
        }}
      >
        <button onClick={() => navigate("/finance-clerk-wage")} className="back-button">
          Back
        </button>
      </div>

      <div className="dropdown-container24">
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
      <h2
        style={{
          textAlign: "center",
          margin: "0 0 15px 0",
          fontWeight: "normal",
          fontSize: "24px",
          marginTop: "-35px",
        }}
      >
        Wage for {driverName}
      </h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Loading driver instructions...</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>{error}</div>
      ) : (
        <table
          style={{
            width: "1000px",
            margin: "0 auto",
            borderCollapse: "collapse",
            fontSize: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#87CEEB", padding: "12px 10px", textAlign: "left" }}>
              <th>Instruction ID</th>
              <th>Legs</th>
              <th>View Legs</th>
              <th>Date</th>
              <th>Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredInstructions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "15px" }}>
                  No instructions found for this driver
                </td>
              </tr>
            ) : (
              filteredInstructions.map((instruction) => (
                <tr
                  key={instruction.m1key}
                  style={{ backgroundColor: "white", padding: "12px 10px", borderBottom: "1px solid #eee" }}
                >
                  <td>{instruction.m1key}</td>
                  <td>{instruction.leg_count}</td>
                  <td>
                    <button className="downloadwage1" onClick={() => handleViewLegs(instruction.m1key)}>
                      View
                    </button>
                  </td>
                  <td>{formatDate(instruction.deadline || instruction.pickupdate)}</td>
                  <td>
                    <button
                      onClick={() => handleViewWageSlip(instruction.m1key)}
                      style={{
                        backgroundColor: "green",
                        color: "white",
                        border: "none",
                        padding: "8px 20px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "normal",
                      }}
                    >
                      View
                    </button>
                  </td>
                  <td>
                    <button className="downloadwage1" onClick={() => handleDownload(instruction.m1key)}>
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  )
}

export default FinanceClerkWageDetails
