"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/Expenses1.css"

const ViewExpense = () => {
  const navigate = useNavigate()
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const response = await fetch("http://localhost:5000/trucks/fuel-expenses")

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Truck data:", data)
        setTrucks(data)
      } catch (err) {
        console.error("Error fetching truck data:", err)
        setError("Failed to load truck data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchTrucks()
  }, [])

  // Fix the handleViewClick function to properly pass the truck registration number
  const handleViewClick = (truck) => {
    navigate(`/ExpenseDetails/${truck.truckid}`, {
      state: {
        truckId: truck.truckid,
        truckRegNum: truck.truckregnum || "Unknown Truck",
      },
    })
  }

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      {loading ? (
        <p>Loading trucks...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <table className="expenses-table" style={{ width: "30%", marginLeft: "540px" }}>
          <thead>
            <tr>
              <th>Truck Registration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.length > 0 ? (
              trucks.map((truck, index) => (
                <tr key={index}>
                  <td>{truck.truckregnum || "Unknown"}</td>
                  <td>
                    <button className="view-button" onClick={() => handleViewClick(truck)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">No trucks found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ViewExpense

