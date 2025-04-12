"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import "../finance clerkpages/css/finance-clerk-wage.css"

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const driverName = location.state?.driverName || `Driver ${id}`

  // State for dropdown selections and data
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch driver instructions when component mounts or filters change
  useEffect(() => {
    const fetchDriverInstructions = async () => {
      setLoading(true)
      try {
        // Build query parameters for filtering
        const queryParams = new URLSearchParams()
        if (selectedMonth) queryParams.append("month", selectedMonth)
        if (selectedYear) queryParams.append("year", selectedYear)

        const response = await fetch(`http://localhost:5000/api/driver/${id}/instructions?${queryParams}`)

        if (!response.ok) {
          throw new Error("Failed to fetch driver instructions")
        }

        const data = await response.json()
        setInstructions(data)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching driver instructions:", err)
        setError("Failed to load instructions. Please try again later.")
        setLoading(false)
      }
    }

    fetchDriverInstructions()
  }, [id, selectedMonth, selectedYear])

  // Handle view legs details
  const handleViewLegs = (m1key) => {
    navigate(`/finance-clerk-leg-details/${m1key}`, {
      state: {
        driverId: id,
        driverName: driverName,
        instructionId: m1key,
      },
    })
  }

  // Handle view wage slip
  const handleViewWageSlip = (m1key) => {
    navigate(`/finance-clerk-wage-slip/${id}`, {
      state: {
        instructionId: m1key,
        driverName: driverName,
      },
    })
  }

  // Handle download wage slip
  const handleDownloadWageSlip = (m1key) => {
    // Implement download functionality
    console.log(`Downloading wage slip for instruction ${m1key}`)
    // This would typically call an API endpoint that returns a file
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate("/finance-clerk-wage")} className="back-button">
          Back
        </button>
        <h2 className="text-2xl font-semibold text-center">Wage Details for {driverName}</h2>
        <div></div> {/* Empty div for flex spacing */}
      </div>

      <div className="dropdown-container24 flex justify-center gap-4 mb-6">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="dropdown px-4 py-2 border rounded"
        >
          <option value="">All Months</option>
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

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="dropdown px-4 py-2 border rounded"
        >
          <option value="">All Years</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading instructions...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg overflow-hidden">
            <thead className="bg-blue-200">
              <tr>
                <th className="py-3 px-4 text-left">Instruction ID</th>
                <th className="py-3 px-4 text-left">Legs Count</th>
                <th className="py-3 px-4 text-left">Pickup Date</th>
                <th className="py-3 px-4 text-left">Client</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">View Legs</th>
                <th className="py-3 px-4 text-left">Wage Slip</th>
                <th className="py-3 px-4 text-left">Download</th>
              </tr>
            </thead>
            <tbody>
              {instructions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No instructions found for this driver
                  </td>
                </tr>
              ) : (
                instructions.map((instruction) => (
                  <tr key={instruction.m1key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{instruction.m1key}</td>
                    <td className="py-3 px-4">{instruction.leg_count}</td>
                    <td className="py-3 px-4">{new Date(instruction.pickupdate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{instruction.client_name}</td>
                    <td className="py-3 px-4">{instruction.status}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewLegs(instruction.m1key)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        View
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewWageSlip(instruction.m1key)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        View
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDownloadWageSlip(instruction.m1key)}
                        className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FinanceClerkWageDetails
