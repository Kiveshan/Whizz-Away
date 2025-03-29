"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import "../css/Analytics.css"
import { useNavigate } from "react-router-dom"

export default function DirectorAnalytics() {
  // Replace period filter with month and year filters
  const [activeMonth, setActiveMonth] = useState("August")
  const [activeYear, setActiveYear] = useState("2023")
  const [activeFilter, setActiveFilter] = useState("fuel")
  const [chartData, setChartData] = useState([])
  const navigate = useNavigate()

  const fuelData = {
    "30": [
      { month: "April", value: 25, status: "good" },
      { month: "May", value: 45, status: "bad" },
      { month: "June", value: 30, status: "good" },
      { month: "July", value: 38, status: "warning" },
      { month: "August", value: 32, status: "good" },
    ],
    "60": [
      { month: "March", value: 28, status: "good" },
      { month: "April", value: 25, status: "good" },
      { month: "May", value: 45, status: "bad" },
      { month: "June", value: 30, status: "good" },
      { month: "July", value: 38, status: "warning" },
      { month: "August", value: 32, status: "good" },
    ],
    "90": [
      { month: "February", value: 35, status: "warning" },
      { month: "March", value: 28, status: "good" },
      { month: "April", value: 25, status: "good" },
      { month: "May", value: 45, status: "bad" },
      { month: "June", value: 30, status: "good" },
      { month: "July", value: 38, status: "warning" },
      { month: "August", value: 32, status: "good" },
    ],
  }

  const instructionsData = {
    "30": [
      { name: "Truck 1", value: 45 },
      { name: "Truck 2", value: 38 },
      { name: "Truck 3", value: 52 },
      { name: "Truck 4", value: 30 },
    ],
    "60": [
      { name: "Truck 1", value: 85 },
      { name: "Truck 2", value: 72 },
      { name: "Truck 3", value: 93 },
      { name: "Truck 4", value: 65 },
    ],
    "90": [
      { name: "Truck 1", value: 120 },
      { name: "Truck 2", value: 105 },
      { name: "Truck 3", value: 145 },
      { name: "Truck 4", value: 98 },
    ],
  }

  const subContractorsData = {
    "30": [
      { name: "ABCDE", value: 65 },
      { name: "FGHU", value: 85 },
      { name: "KLMNO", value: 75 },
      { name: "QRSTU", value: 55 },
      { name: "VWXYZ", value: 15 },
    ],
    "60": [
      { name: "ABCDE", value: 120 },
      { name: "FGHU", value: 150 },
      { name: "KLMNO", value: 135 },
      { name: "QRSTU", value: 95 },
      { name: "VWXYZ", value: 30 },
    ],
    "90": [
      { name: "ABCDE", value: 180 },
      { name: "FGHU", value: 220 },
      { name: "KLMNO", value: 195 },
      { name: "QRSTU", value: 145 },
      { name: "VWXYZ", value: 45 },
    ],
  }

  const profitTurnoverData = {
    "30": [
      { name: "Client 1", debtors: 45, payments: 40 },
      { name: "Client 2", debtors: 65, payments: 30 },
      { name: "Client 3", debtors: 55, payments: 50 },
      { name: "Client 4", debtors: 35, payments: 75 },
    ],
    "60": [
      { name: "Client 1", debtors: 85, payments: 75 },
      { name: "Client 2", debtors: 120, payments: 60 },
      { name: "Client 3", debtors: 95, payments: 90 },
      { name: "Client 4", debtors: 70, payments: 140 },
    ],
    "90": [
      { name: "Client 1", debtors: 130, payments: 110 },
      { name: "Client 2", debtors: 180, payments: 90 },
      { name: "Client 3", debtors: 150, payments: 135 },
      { name: "Client 4", debtors: 105, payments: 210 },
    ],
  }

  // Update chart data when filter, month, or year changes.
  // For this example, we default to using the "30" data set.
  useEffect(() => {
    let baseData
    switch (activeFilter) {
      case "fuel":
        baseData = fuelData["30"]
        // Filter fuel data by the selected month.
        baseData = baseData.filter(item => item.month === activeMonth)
        setChartData(baseData)
        break
      case "instructions":
        baseData = instructionsData["30"]
        setChartData(baseData)
        break
      case "subcontractors":
        baseData = subContractorsData["30"]
        setChartData(baseData)
        break
      case "profit":
        baseData = profitTurnoverData["30"]
        setChartData(baseData)
        break
      default:
        baseData = fuelData["30"]
        setChartData(baseData)
    }
  }, [activeFilter, activeMonth, activeYear])

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Render different charts based on active filter
  const renderChart = () => {
    switch (activeFilter) {
      case "fuel":
        return (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="value"
                  name="% of income spent on fuel"
                  fill="#4169e1"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.9}
                  isAnimationActive={true}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: "#4CAF50" }}></span>
                <span>Green: 0-35%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
                <span>Yellow: 36%-39%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
                <span>Red: 40%+</span>
              </div>
            </div>
          </div>
        )
      case "instructions":
        return (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Completed Instructions" fill="#4169e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      case "subcontractors":
        return (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="% Completed" fill="#4169e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-subtitle">Sub-Contractor Name</div>
          </div>
        )
      case "profit":
        return (
          <div className="chart-wrapper">
            <div className="chart-header">
              <div className="chart-header-item">
                <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                <span>Debtors Control</span>
              </div>
              <div className="chart-header-item">
                <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                <span>Payments</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="debtors" fill="#9C27B0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" fill="#E91E63" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      default:
        return null
    }
  }

  const handleBack = () => {
    navigate("/DirectorDashboard")
  }

  return (
    <div className="analytics-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      {/* Month and Year Filters */}
      <div className="date-filters">
        <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)}>
          {[
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
          ].map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <select 
  className="year-select"
  value={activeYear} 
  onChange={(e) => setActiveYear(e.target.value)}>
  {["2022", "2023", "2024"].map((year) => (
    <option key={year} value={year}>
      {year}
    </option>
  ))}
</select>

      </div>

      <div className="analytics-content">
        {/* Sidebar filters */}
        <div className="sidebar-filters">
          <button
            className={`filter-button ${activeFilter === "fuel" ? "active" : ""}`}
            onClick={() => setActiveFilter("fuel")}
          >
            % Fuel vs Income
          </button>
          <button
            className={`filter-button ${activeFilter === "instructions" ? "active" : ""}`}
            onClick={() => setActiveFilter("instructions")}
          >
            Completed Instructions Per Truck
          </button>
          <button
            className={`filter-button ${activeFilter === "subcontractors" ? "active" : ""}`}
            onClick={() => setActiveFilter("subcontractors")}
          >
            % Completed by Sub Contractors
          </button>
          <button
            className={`filter-button ${activeFilter === "profit" ? "active" : ""}`}
            onClick={() => setActiveFilter("profit")}
          >
            Profit Turnover
          </button>
        </div>

        {/* Chart area */}
        <div className="chart-area">
          <h2 className="chart-title">
            {activeFilter === "fuel" && "% of income spent on fuel"}
            {activeFilter === "instructions" && "Completed Instructions"}
            {activeFilter === "subcontractors" && "% Completed by Sub Contractors"}
            {activeFilter === "profit" && "Profit Turnover"}
          </h2>
          {renderChart()}
        </div>
      </div>
    </div>
  )
}
