"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const FinanceClerkWage = () => {
  const [drivers, setDrivers] = useState([])
  const [userRole, setUserRole] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch drivers data
    fetch("http://localhost:5000/employees/drivers")
      .then((response) => response.json())
      .then((data) => {
        setDrivers(data)
        console.log(data)
      })
      .catch((error) => console.error("Error fetching drivers:", error))
    
    // Get user role from localStorage if available
    const roleId = localStorage.getItem("userRoleId")
    setUserRole(roleId ? parseInt(roleId) : null)
  }, [])

  const handleViewClick = (driver) => {
    navigate(`/finance-clerk-wage-details/${driver.userid}`, {
      state: {
        name: `${driver.name} ${driver.surname}`,
        // Pass the dashboard route to the details page
        returnDashboard: getDashboardRouteByRole(),
      },
    })
  }

  // Function to determine the correct dashboard based on role
  const getDashboardRouteByRole = () => {
    // Use the stored dashboard route if available
    const storedDashboard = localStorage.getItem("dashboardRoute")
    if (storedDashboard) return storedDashboard
    
    // Fallback to role-based routing if no stored route
    switch (userRole) {
      case 1:
        return "/Dashboard" // Business Manager
      case 3:
        return "/FDashboard" // Finance Clerk
      case 4:
        return "/DirectorDashboard" // Director
      default:
        return "/FDashboard" // Default to Finance Dashboard
    }
  }

  const handleBackClick = () => {
    // Navigate to the appropriate dashboard based on role
    navigate(getDashboardRouteByRole())
  }

  return (
    <div className="wage-container">
      <div className="button-container">
        <button onClick={handleBackClick} className="back-button">
          Back
        </button>
      </div>

      <div className="wage-table-container">
        <table className="wage-table1">
          <thead>
            <tr>
              <th>Driver Name</th>
              <th>Wage</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.userid}>
                <td>
                  {driver.name} {driver.surname}
                </td>
                <td>
                  <button onClick={() => handleViewClick(driver)} className="view-btn">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FinanceClerkWage