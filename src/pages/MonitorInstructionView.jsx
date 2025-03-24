import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/ViewClientStatements.css";

const clients = [
  {
    company: "Company ABC",
    representative: "Andrew Taylor",
    email: "taylorandrew@yahoo.com",
    balance: "R20 000",
    date: "28/06/2025",
  },
  {
    company: "Little Helpers LTD",
    representative: "Brian Hall",
    email: "brian_hall@yahoo.com",
    balance: "R50 000",
    date: "25/07/2025",
  },
];

const MonitorInstructionView = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  return (
    <div className="">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>

      {/* Dropdown Filters */}
      <div className="dropdown-container">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="dropdown"
        >
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

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="dropdown"
        >
          <option value="">Select Year</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* Table */}
      <div className="table3">
        <table className="t1">
          <thead className="bg-blue-300">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Representative</th>
              <th className="p-3">Email</th>
              <th className="p-3">Latest date</th>
              <th className="p-3">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, index) => (
              <tr key={index} className="border-t">
                <td className="p-3">{client.company}</td>
                <td className="p-3">{client.representative}</td>
                <td className="p-3">{client.email}</td>
                <td className="p-3">{client.date}</td>
                <td className="p-3">
                  <button className="view-butn" onClick={() => navigate("/monitor-instructions")}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonitorInstructionView;
