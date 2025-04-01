"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../css/ClientDocuments.css"

const MonitorInstructions = () => {
  const navigate = useNavigate()
  const [selectedRows, setSelectedRows] = useState([])
  const [filter, setFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  const instructions = [
    {
      id: 1,
      instructionNo: "Instruction 1",
      type: "Import",
      status: "Completed",
      assignment: "",
      fileNo: "F12345"
    },
    {
      id: 2,
      instructionNo: "Instruction 2",
      type: "Export",
      status: "Completed",
      assignment: "",
      fileNo: "F67890"
    },
    {
      id: 3,
      instructionNo: "Instruction 3",
      type: "Import",
      status: "In-progress",
      assignment: "",
      fileNo: "F11223"
    },
  ]

  const handleBack = () => {
    navigate("/")
  }

  const handleFilterChange = (type) => {
    setFilter(type)
  }

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status)
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
  }

  const filteredInstructions = instructions.filter(instruction => 
    (filter === "All" || instruction.type === filter) && 
    (statusFilter === "All" || instruction.status === statusFilter) &&
    (searchQuery === "" || 
      instruction.instructionNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
      instruction.fileNo.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleView = (id) => {
    console.log("Viewing instruction:", id)
  }

  return (
    <div className="monitor-instructions-container">
      <div className="user-profile">
        <button className="back-button" onClick={handleBack}>Back</button>
      </div>

      <div className="action-bar">
        <div className="filter-section9">
          <div className="filter-group">
            <select className="dropdown">
              <option>Year</option>
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
              <option>2022</option>
            </select>
            <select className="dropdown">
              <option>Month</option>
              <option>January</option>
              <option>February</option>
              <option>March</option>
              <option>April</option>
              <option>May</option>
              <option>June</option>
              <option>July</option>
              <option>August</option>
              <option>September</option>
              <option>October</option>
              <option>November</option>
              <option>December</option>
            </select>
          </div>
        </div>
      </div>
      <div className="filter-section9">
        <div className="filter-group">
          <button className={`filter-button ${filter === "Import" ? "active" : ""}`} onClick={() => handleFilterChange("Import")}>
            Import
          </button>
          <button className={`filter-button ${filter === "Export" ? "active" : ""}`} onClick={() => handleFilterChange("Export")}>
            Export
          </button>
          <button className={`filter-button ${filter === "All" ? "active" : ""}`} onClick={() => handleFilterChange("All")}>
            All
          </button>
        </div>
        <div className="filter-group">
          {/* <button className={`filter-button ${statusFilter === "In-progress" ? "active" : ""}`} onClick={() => handleStatusFilterChange("In-progress")}>
            In-progress
          </button>
          <button className={`filter-button ${statusFilter === "Completed" ? "active" : ""}`} onClick={() => handleStatusFilterChange("Completed")}>
            Completed
          </button> */}
        </div>
      </div>
      <div className="search-bar">
      </div>
      <div className="instructions-table">
        <table>
          <thead>
            <tr>
              <th>Instruction No.</th>
              <th>File No.</th>
              <th>Type</th>
              <th>Invoice</th>
              <th>Statement</th>
            </tr>
          </thead>
          <tbody>
            {filteredInstructions.map((instruction) => (
              <tr key={instruction.id}>
                <td>{instruction.instructionNo}</td>
                <td>{instruction.fileNo}</td>
                <td>{instruction.type}</td>
                <td>
                  <button className="view-button" onClick={() => handleView(instruction.id)}>View</button>
                </td>
                <td>
                  <button className="view-button" onClick={() => handleView(instruction.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MonitorInstructions
