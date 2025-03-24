import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/InstructionsList.css";

const Instructions = ({ setCurrentPage }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  return (
    <div>
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ViewClientInstruction")}>
          Back
        </button>
      </div>

      {/* Dropdown Filters */}
      <div className="dropdown-container">
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

      <div className="content1">
        <div className="button-group">
          <div className="filter-buttons">
            <button className="btn btn-blue">Import</button>
            <button className="btn btn-blue">Export</button>
            <button className="btn btn-blue">All</button>
            <button className="btn btn-blue">In-Progress</button>
            <button className="btn btn-blue">Complete</button>
          </div>
        </div>

        <div className="tables-container">
          <table className="t2">
            <thead>
              <tr>
                <th>Instruction No</th>
                <th>Type</th>
                <th>Status</th>
                <th>File No</th>
                <th>Instruction</th>
                <th>Assignment</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 1, type: "Import", status: "New", fileNo: "77002" },
                { id: 2, type: "Export", status: "New", fileNo: "10014" },
                { id: 3, type: "Import", status: "In-Progress", fileNo: "93301" },
              ].map((item) => (
                <tr key={item.id}>
                  <td>Instruction {item.id}</td>
                  <td>{item.type}</td>
                  <td>{item.status}</td>
                  <td>{item.fileNo}</td>
                  <td>
                    <button className="view-btn" onClick={() => navigate("")}>View</button>
                  </td>
                  <td>
                    <button className="view-btn" onClick={() => navigate("/update-instructions")}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
