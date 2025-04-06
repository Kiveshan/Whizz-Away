"use client"

import { useState, useEffect } from "react"
import "../css/CompanyManagement.css"

function CompanyManagement() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      // Assuming an endpoint exists to fetch companies
      const response = await fetch("http://localhost:5000/admin/companies", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }

      const data = await response.json()
      setCompanies(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "disabled" : "active"

      const response = await fetch(`http://localhost:5000/admin/toggle-company-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          companyid: companyId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update company status")
      }

      // Update the local state to reflect the change
      setCompanies(companies.map((company) => (company.id === companyId ? { ...company, status: newStatus } : company)))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Loading companies...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="company-management">
      <h2>Company Management</h2>

      {companies.length === 0 ? (
        <div className="no-companies">No companies found</div>
      ) : (
        <table className="companies-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className={company.status === "disabled" ? "disabled-row" : ""}>
                <td>{company.id}</td>
                <td>{company.name}</td>
                <td>{company.contact_person}</td>
                <td>{company.email}</td>
                <td>
                  <span className={`status-badge ${company.status}`}>
                    {company.status === "active" ? "Active" : "Disabled"}
                  </span>
                </td>
                <td>
                  <button
                    className={company.status === "active" ? "disable-button" : "enable-button"}
                    onClick={() => toggleCompanyStatus(company.id, company.status)}
                  >
                    {company.status === "active" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default CompanyManagement

