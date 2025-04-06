"use client"

import { useState } from "react"
import UserApprovalList from "./UserApprovalList"
import CompanyManagement from "./CompanyManagement"
import "../css/AdminDashboard.css"
// Import the TestConnection component
import TestConnection from "./TestConnection"

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users")
  // Add a state to control showing the test connection
  const [showConnectionTest, setShowConnectionTest] = useState(false)

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        {/* <h1>System Administration</h1> */}
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            User Approval
          </button>
          <button
            className={`tab-button ${activeTab === "companies" ? "active" : ""}`}
            onClick={() => setActiveTab("companies")}
          >
            Company Management
          </button>
        </div>
        {/* Add this button after the admin-tabs div */}
        <div className="admin-debug">
          <button className="debug-button" onClick={() => setShowConnectionTest(!showConnectionTest)}>
            {showConnectionTest ? "Hide" : "Show"} Connection Test
          </button>
        </div>
      </div>

      {/* Add this before the admin-content div */}
      {showConnectionTest && <TestConnection />}

      <div className="admin-content">
        {activeTab === "users" && <UserApprovalList />}
        {activeTab === "companies" && <CompanyManagement />}
      </div>
    </div>
  )
}

export default AdminDashboard

