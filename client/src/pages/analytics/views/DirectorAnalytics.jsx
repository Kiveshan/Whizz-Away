"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts"
import "../css/Analytics.css"
import { useNavigate } from "react-router-dom"
import api from "../../../api"

export default function DirectorAnalytics() {
  const getPreviousMonth = (month, year) => {
    const date = new Date(year, monthNames.indexOf(month), 1)
    date.setMonth(date.getMonth() - 1)
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

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

  const currentDate = new Date()
  const [activeMonth, setActiveMonth] = useState(monthNames[currentDate.getMonth()])
  const [activeYear, setActiveYear] = useState(currentDate.getFullYear().toString())
  const [activeFilter, setActiveFilter] = useState("fuel")
  const [chartData, setChartData] = useState([])
  const [clients, setClients] = useState([])
  const [subcontractors, setSubcontractors] = useState([])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const roleId = JSON.parse(localStorage.getItem("user"))?.roleid
  const navigate = useNavigate()

  const calculateTurnoverStatus = (turnover) => {
    if (turnover >= 10000) return "high"
    if (turnover >= 5000) return "medium"
    return "low"
  }

  const calculateStatus = (cost) => {
    if (cost <= 3500) return "good"
    if (cost <= 4500) return "warning"
    return "bad"
  }

  const getChartWidth = (dataLength) => {
    if (activeFilter === "turnoverPerMonth" || 
        activeFilter === "agingAnalysis" || 
        activeFilter === "subcontractorVsTurnover" || 
        activeFilter === "subcontractorTurnoverPerMonth" || 
        activeFilter === "wagesVsExpenses" || 
        activeFilter === "incomeVsExpense" || 
        activeFilter === "turnoverVsSubbieExpense") {
      return 1000;
    }
    const minWidth = 1000
    const barWidth = 180
    return Math.max(minWidth, dataLength * barWidth)
  }

  const formatClientName = (name) => {
    if (typeof name !== "string") return ""
    const words = name.split(/[\s&,.-]+/).filter((word) => word.length > 0)
    if (words.length <= 1 || name.length <= 8) {
      return name
    }
    return words.join("\n")
  }

  const CustomAxisTick = (props) => {
    const { x, y, payload } = props
    const lines = formatClientName(payload.value).split("\n")
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line, index) => (
          <text key={index} x={0} y={index * 12 + 10} dy={0} textAnchor="middle" fill="#333" fontSize="11">
            {line}
          </text>
        ))}
      </g>
    )
  }

  const fetchClients = async () => {
    try {
      const response = await api.get("/api/get-clients")
      if (response.data.success) {
        setClients(response.data.data)
      } else {
        setError("Failed to fetch clients")
      }
    } catch (err) {
      setError(`Failed to fetch clients: ${err.message}`)
    }
  }

  const fetchSubcontractors = async () => {
    try {
      const response = await api.get("/get-subcontractors")
      if (response.data.success) {
        setSubcontractors(response.data.data)
      } else {
        setError("Failed to fetch subcontractors")
      }
    } catch (err) {
      setError(`Failed to fetch subcontractors: ${err.message}`)
    }
  }

  const fetchFuelData = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching fuel data for month: ${month}, year: ${year}`)
      const response = await api.get("/api/fuel-expenses", {
        params: { month, year, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        console.log("Fuel data received:", response.data.data)
        const fuelExpenses = response.data.data.map((expense) => {
          const cost = Number.parseFloat(expense.total_cost)
          const status = calculateStatus(cost)
          console.log(`Truck ${expense.truckregnum}: Cost=${cost}, Status=${status}, Percentage=${expense.percentage}%`)
          return {
            truckId: expense.truckregnum,
            value: cost,
            month: expense.month_name.trim(),
            year: expense.year.toString(),
            status: status,
            percentage: expense.percentage,
          }
        })
        console.log("Processed fuel expenses:", fuelExpenses)
        return fuelExpenses
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching fuel data:", err.response ? err.response.data : err.message)
      setError(`Failed to fetch fuel data: ${err.message}`)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTurnoverData = async (month, year, clientId = "") => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching turnover data for month: ${month}, year: ${year}, clientId: ${clientId}`)
      const response = await api.get("/api/turnover-per-month", {
        params: { month, year, clientId: clientId || undefined, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        let turnoverData = response.data.data.map((item) => {
          const turnover = Number.parseFloat(item.turnover)
          console.log(`Client ${item.client}: Turnover=${turnover}, Percentage=${item.percentage}%`)
          return {
            name: item.client,
            turnover: turnover,
            month: item.month_name.trim(),
            year: item.year,
            percentage: item.percentage,
          }
        })
        console.log("Processed turnover data before sorting:", turnoverData)
        
        // Sort data: Total Turnover first, selected client last, others in between (alphabetically)
        turnoverData = turnoverData.sort((a, b) => {
          if (a.name === "Total Turnover") return -1
          if (b.name === "Total Turnover") return 1
          if (clientId && a.name === clients.find(c => c.m5clientkey === clientId)?.client) return 1
          if (clientId && b.name === clients.find(c => c.m5clientkey === clientId)?.client) return -1
          return a.name.localeCompare(b.name)
        })
        
        console.log("Processed turnover data after sorting:", turnoverData)
        return turnoverData
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching turnover data:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgingAnalysisData = async (month, year, clientId = "") => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching aging analysis data for month: ${month}, year: ${year}, clientId: ${clientId}`)
      const response = await api.get("/api/aging-analysis", {
        params: { month, year, clientId: clientId || undefined, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        console.log("Aging analysis data received:", response.data.data)
        const agingData = response.data.data.map((item) => ({
          name: item.client || "Total Aging",
          current: Number(item.current) || 0,
          thirtyDays: Number(item.thirtyDays) || 0,
          sixtyDays: Number(item.sixtyDays) || 0,
          ninetyDays: Number(item.ninetyDays) || 0,
          month: item.month,
          year: item.year,
        }))
        console.log("Processed aging analysis data:", agingData)
        return agingData
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching aging analysis data:", err.response ? err.response.data : err.message)
      setError(`Failed to fetch aging analysis data: ${err.message}`)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTurnoverVsDieselCost = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      const numericMonth = monthNames.indexOf(month) + 1 // Convert month name to numeric (1-12)
      console.log(`Fetching turnover vs diesel cost for month: ${month} (numeric: ${numericMonth}), year: ${year}`)
      const response = await api.get("/api/turnover-vs-diesel-cost", {
        params: { month: numericMonth, year, _t: new Date().getTime() },
      })
      if (response.data.success) {
        const data = response.data.data.map((item) => {
          console.log(
            `Received percentages: turnoverPercentage=${item.turnoverPercentage
            } (${typeof item.turnoverPercentage}), dieselCostPercentage=${item.dieselCostPercentage
            } (${typeof item.dieselCostPercentage})`,
          )
          return {
            month: item.month,
            year: item.year,
            totalTurnover: Number(item.totalTurnover) || 0,
            dieselCost: Number(item.dieselCost) || 0,
            turnoverPercentage: item.turnoverPercentage ?? 0,
            dieselCostPercentage: item.dieselCostPercentage ?? 0,
          }
        })
        console.log("Processed turnover vs diesel cost data:", data)
        return data
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching turnover vs diesel cost:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchIncomeVsExpenses = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching income vs expenses for month: ${month}, year: ${year}`)
      const response = await api.get("/api/all-expenses", {
        params: { month, year, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const totalExpenses = Number.parseFloat(response.data.data.expenses.reduce((sum, item) => sum + Number.parseFloat(item.total_cost || 0), 0)) || 0;
        const income = Number.parseFloat(response.data.data.income) || 0;
        const total = income + totalExpenses;
        const incomePercentage = total > 0 ? (income / total) * 100 : 0;
        const expensesPercentage = total > 0 ? (totalExpenses / total) * 100 : 0;
        const data = [
          {
            name: "Income",
            value: income,
            type: "income",
            percentage: incomePercentage.toFixed(2),
            month: response.data.data.month,
            year: response.data.data.year,
          },
          {
            name: "Expenses",
            value: totalExpenses,
            type: "expenses",
            percentage: expensesPercentage.toFixed(2),
            month: response.data.data.month,
            year: response.data.data.year,
          }
        ];
        console.log("Processed income vs expenses data:", data)
        return data
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching income vs expenses:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTurnoverPerTruck = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching turnover per truck for month: ${month}, year: ${year}`)
      const response = await api.get("/api/turnover-per-truck", {
        params: { month, year, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const turnoverData = response.data.data.map((item) => {
          const turnover = Number.parseFloat(item.total_turnover)
          const status = calculateTurnoverStatus(turnover)
          return {
            truckregnumber: item.truckregnumber,
            total_turnover: turnover,
            month: item.month_name.trim(),
            year: item.year,
            percentage: item.percentage,
            status,
          }
        })
        console.log("Processed turnover per truck data:", turnoverData)
        return turnoverData
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching turnover per truck:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWagesVsExpenses = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching wages vs expenses for month: ${month}, year: ${year}`)
      const response = await api.get("/api/wages-vs-expenses", {
        params: { month, year, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const data = response.data.data.map((item) => {
          console.log(
            `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
          )
          return {
            name: item.name,
            value: Number(item.value) || 0,
            type: item.type,
            percentage: Number(item.percentage) || 0,
            month: item.month,
            year: item.year,
          }
        })
        console.log("Processed wages vs expenses data:", data)
        return data
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching wages vs expenses:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubcontractorTurnoverPerMonth = async (month, year) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching turnover vs total subcontractor for month: ${month}, year: ${year}`)
      const response = await api.get("/api/subcontractor-turnover-per-month", {
        params: { month, year, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const turnoverData = response.data.data.map((item) => {
          const value = Number.parseFloat(item.value)
          console.log(`Name ${item.name}: Value=${value}, Type=${item.type}, Percentage=${item.percentage}%`)
          return {
            name: item.name,
            value: value,
            type: item.type,
            percentage: Number(item.percentage) || 0,
            month: item.month.trim(),
            year: item.year,
          }
        })
        console.log("Processed turnover vs total subcontractor data:", turnoverData)
        return turnoverData
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching turnover vs total subcontractor data:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubcontractorVsTurnover = async (month, year, subcontractorId = "") => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching subcontractor vs turnover for month: ${month}, year: ${year}, subcontractorId: ${subcontractorId}`)
      const response = await api.get("/api/subcontractor-vs-turnover", {
        params: { month, year, subcontractorId: subcontractorId || undefined, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const data = response.data.data.map((item) => {
          console.log(
            `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
          )
          return {
            name: item.name,
            value: Number(item.value) || 0,
            type: item.type,
            percentage: Number(item.percentage) || 0,
            month: item.month,
            year: item.year,
          }
        })
        console.log("Processed subcontractor vs turnover data:", data)
        return data
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching subcontractor vs turnover:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTurnoverVsSubbieExpense = async (month, year, subcontractorId = "") => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Fetching turnover vs subbie expense for month: ${month}, year: ${year}, subcontractorId: ${subcontractorId}`)
      const response = await api.get("/api/turnover-vs-subbie-expense", {
        params: { month, year, subcontractorId: subcontractorId || undefined, _t: new Date().getTime() },
      })
      console.log("API response:", response.data)
      if (response.data.success) {
        const data = response.data.data.map((item) => {
          console.log(
            `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
          )
          return {
            name: item.name,
            value: Number(item.value) || 0,
            type: item.type,
            percentage: Number(item.percentage) || 0,
            month: item.month,
            year: item.year,
          }
        })
        console.log("Processed turnover vs subbie expense data:", data)
        return data
      } else {
        throw new Error(response.data.message || "Failed to fetch data")
      }
    } catch (err) {
      console.error("Error fetching turnover vs subbie expense:", err)
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchSubcontractors()
  }, [])

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      // Clear chartData immediately when filter changes
      setChartData([]);
      setError(null);
      setIsLoading(true);
      
      let data = [];
      try {
        switch (activeFilter) {
          case "fuel":
            data = await fetchFuelData(activeMonth, activeYear);
            break;
          case "turnoverPerMonth":
            data = await fetchTurnoverData(activeMonth, activeYear, selectedClient);
            break;
          case "agingAnalysis":
            data = await fetchAgingAnalysisData(activeMonth, activeYear, selectedClient);
            break;
          case "turnoverVsDieselCost":
            data = await fetchTurnoverVsDieselCost(activeMonth, activeYear);
            break;
          case "subcontractorTurnoverPerMonth":
            data = await fetchSubcontractorTurnoverPerMonth(activeMonth, activeYear);
            break;
          case "subcontractorVsTurnover":
            data = await fetchSubcontractorVsTurnover(activeMonth, activeYear, selectedSubcontractor);
            break;
          case "turnoverPerTruck":
            data = await fetchTurnoverPerTruck(activeMonth, activeYear);
            break;
          case "incomeVsExpense":
            data = await fetchIncomeVsExpenses(activeMonth, activeYear);
            break;
          case "wagesVsExpenses":
            data = await fetchWagesVsExpenses(activeMonth, activeYear);
            break;
          case "turnoverVsSubbieExpense":
            data = await fetchTurnoverVsSubbieExpense(activeMonth, activeYear, selectedSubcontractor);
            break;
          default:
            data = [];
        }
        if (isMounted) {
          console.log("Setting chartData:", data);
          setChartData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to load data: ${err.message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeFilter, activeMonth, activeYear, selectedClient, selectedSubcontractor]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {`${entry.name}: R${entry.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getBarFill = (entry) => {
    console.log("getBarFill entry:", entry)
    if (activeFilter === "fuel" && entry && entry.status) {
      console.log(`Applying color for status: ${entry.status}`)
      switch (entry.status) {
        case "good":
          return "#4CAF50"
        case "warning":
          return "#FFC107"
        case "bad":
          return "#F44336"
        default:
          return "#4169e1"
      }
    } else if (activeFilter === "turnoverPerTruck" && entry && entry.status) {
      console.log(`Applying color for turnover status: ${entry.status}`)
      switch (entry.status) {
        case "high":
          return "#4CAF50"
        case "medium":
          return "#FFC107"
        case "low":
          return "#F44336"
        default:
          return "#4169e1"
      }
    } else if ((activeFilter === "subcontractorVsTurnover" || 
                activeFilter === "subcontractorTurnoverPerMonth" || 
                activeFilter === "wagesVsExpenses" || 
                activeFilter === "incomeVsExpense" || 
                activeFilter === "turnoverVsSubbieExpense") && entry && entry.type) {
      return entry.type === "total" ? "#9C27B0" : 
             entry.type === "subcontractor" ? "#E91E63" : 
             entry.type === "income" ? "#4169e1" : 
             entry.type === "expenses" ? "#ff6347" : "#4169e1"
    }
    console.log("Falling back to default color")
    return "#4169e1"
  }

  const CustomBarLabelForTurnover = (props) => {
    const { x, y, width, value, payload = {} } = props
    const percentage = payload.percentage ?? 0
    console.log("CustomBarLabelForTurnover - payload:", payload)
    return (
      <text x={x + width / 2} y={y - 10} 
            fill="#000" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize={12}>
        R{value?.toLocaleString?.()} ({percentage}%)
      </text>
    )
  }

  const CustomBarLabelForDieselCost = (props) => {
    const { x, y, width, value, payload = {} } = props
    console.log("CustomBarLabelForDieselCost - payload:", payload)
    const percentage = payload.dieselCostPercentage ?? 0
    return (
      <text x={x + width / 2} y={y - 10} fill="#000" textAnchor="middle" dominantBaseline="middle" fontSize={12}>
        R{value?.toLocaleString?.()} ({percentage}%)
      </text>
    )
  }

  const CustomBarLabelForFuelAndTurnover = (props) => {
    const { x, y, width, value, index, dataKey } = props
    if (value === undefined || value === null) {
      console.log("CustomBarLabelForFuelAndTurnover: Value is undefined or null, skipping label")
      return null
    }
    console.log(`CustomBarLabelForFuelAndTurnover: index=${index}, dataKey=${dataKey}, chartData=`, chartData)
    const percentage = chartData[index]?.percentage || 0
    console.log(`Selected percentage: ${percentage}% for dataKey=${dataKey}`)
    const labelText = `R${value.toLocaleString()} (${percentage.toFixed(2)}%)`
    return (
      <text x={x + width / 2} y={y - 10} fill="#000" textAnchor="middle" dominantBaseline="middle" fontSize="12">
        {labelText}
      </text>
    )
  }

  const CustomBarLabelForDefault = (props) => {
    const { x, y, width, value } = props
    if (value === undefined || value === null) {
      console.log("CustomBarLabelForDefault: Value is undefined or null, skipping label")
      return null
    }
    const labelText = `R${value.toLocaleString()}`
    return (
      <text x={x + width / 2} y={y - 10} fill="#000" textAnchor="middle" dominantBaseline="middle" fontSize={12}>
        {labelText}
      </text>
    )
  }

  const renderChart = () => {
    console.log("Rendering chart with chartData:", chartData)
    const chartWidth = getChartWidth(chartData.length)

    switch (activeFilter) {
      case "fuel":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading fuel data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No fuel data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 120 }}>
                      <XAxis
                        dataKey="truckId"
                        angle={0}
                        textAnchor="middle"
                        height={150}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: "Expense Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Fuel Expense"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.9}
                        isAnimationActive={true}
                        animationDuration={500}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForFuelAndTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#4CAF50" }}></span>
                    <span>Good: R0-R3,500</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
                    <span>Warning: R3,501-R4,500</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
                    <span>High: R4,501+</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case "turnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.length > 1 && (
                    <div className="chart-header-item">
                      <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                      <span>Selected Client</span>
                    </div>
                  )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Turnover (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="turnover" name="Turnover" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === "Total Turnover" ? "#9C27B0" : "#4169e1"} />
                        ))}
                        <LabelList dataKey="turnover" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "agingAnalysis":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading aging analysis data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No aging analysis data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                    <span>Current</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#4CAF50" }}></span>
                    <span>30 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
                    <span>60 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
                    <span>90 Days</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 100 }}>
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        height={120}
                        interval={0}
                        tick={<CustomAxisTick />}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="current" name="Current" fill="#4169e1" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="current" content={CustomBarLabelForDefault} position="top" />
                      </Bar>
                      <Bar dataKey="thirtyDays" name="30 Days" fill="#4CAF50" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="thirtyDays" content={CustomBarLabelForDefault} position="top" />
                      </Bar>
                      <Bar dataKey="sixtyDays" name="60 Days" fill="#FFC107" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="sixtyDays" content={CustomBarLabelForDefault} position="top" />
                      </Bar>
                      <Bar dataKey="ninetyDays" name="90 Days" fill="#F44336" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="ninetyDays" content={CustomBarLabelForDefault} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "subcontractorTurnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading Turnover VS Total Subbie data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs total subcontractor data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Total Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                    <span>Total Subcontractor Turnover</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "subcontractorVsTurnover":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading Subbie VS Turnover data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.some((entry) => entry.type === "subcontractor") && (
                    <div className="chart-header-item">
                      <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                      <span>Selected Subcontractor</span>
                    </div>
                  )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "turnoverVsSubbieExpense":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading Turnover VS Subbie Expense data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs subbie expense data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.some((entry) => entry.type === "subcontractor") && (
                    <div className="chart-header-item">
                      <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                      <span>Selected Subcontractor</span>
                    </div>
                  )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "turnoverVsDieselCost":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover vs diesel cost data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs diesel cost data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                    <span>Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#ff6347" }}></span>
                    <span>Diesel Cost</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="month" />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="totalTurnover" name="Turnover" fill="#4169e1" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="totalTurnover" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                      <Bar dataKey="dieselCost" name="Diesel Cost" fill="#ff6347" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="dieselCost" content={CustomBarLabelForDieselCost} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "turnoverPerTruck":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover per truck data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover per truck data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 120 }}>
                      <XAxis
                        dataKey="truckregnumber"
                        angle={0}
                        textAnchor="middle"
                        height={150}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: "Turnover (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total_turnover" name="Turnover" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === "high" ? "#4CAF50" : entry.status === "medium" ? "#FFC107" : "#F44336"}
                          />
                        ))}
                        <LabelList dataKey="total_turnover" content={CustomBarLabelForFuelAndTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#4CAF50" }}></span>
                    <span>High: R10,000+</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#FFC107" }}></span>
                    <span>Medium: R5,000-R9,999</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#F44336" }}></span>
                    <span>Low: R0-R4,999</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case "incomeVsExpense":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading income vs expenses data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No income vs expenses data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                    <span>Income</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#ff6347" }}></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      case "wagesVsExpenses":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading wages vs expenses data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No wages vs expenses data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                    <span>Wages</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#ff6347" }}></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 120 }}>
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={<CustomAxisTick />}
                        height={150}
                        tickMargin={10}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Amount"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.9}
                        isAnimationActive={true}
                        animationDuration={500}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                        ))}
                        <LabelList dataKey="value" content={CustomBarLabelForTurnover} position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const handleBack = () => {
    if (roleId == 1) {
      navigate("/Dashboard")
    } else if (roleId == 4) {
      navigate("/DirectorDashboard")
    }
  }

  return (
    <div className="analytics-page-wrapper">
      <div className="analytics-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="date-filters">
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)}>
            {monthNames.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select className="year-select" value={activeYear} onChange={(e) => setActiveYear(e.target.value)}>
            {["2022", "2023", "2024", "2025"].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {(activeFilter === "turnoverPerMonth" || activeFilter === "agingAnalysis") && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="client-select"
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.m5clientkey} value={client.m5clientkey}>
                  {client.client}
                </option>
              ))}
            </select>
          )}
          {(activeFilter === "subcontractorVsTurnover" || activeFilter === "turnoverVsSubbieExpense") && (
            <select
              value={selectedSubcontractor}
              onChange={(e) => setSelectedSubcontractor(e.target.value)}
              className="subcontractor-select"
            >
              <option value="">Select Subcontractor</option>
              {subcontractors.map((subcontractor) => (
                <option key={subcontractor.userid} value={subcontractor.userid}>
                  {subcontractor.companyname}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="analytics-content">
          <div className="sidebar-filters">
            <button
              className={`filter-button ${activeFilter === "fuel" ? "active" : ""}`}
              onClick={() => setActiveFilter("fuel")}
            >
              Fuel Per Truck
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverPerMonth" ? "active" : ""}`}
              onClick={() => setActiveFilter("turnoverPerMonth")}
            >
              Turnover per month vs Client
            </button>
            <button
              className={`filter-button ${activeFilter === "agingAnalysis" ? "active" : ""}`}
              onClick={() => setActiveFilter("agingAnalysis")}
            >
              30, 60, 90, Current
            </button>
            <button
              className={`filter-button ${activeFilter === "subcontractorVsTurnover" ? "active" : ""}`}
              onClick={() => setActiveFilter("subcontractorVsTurnover")}
            >
              Subbie VS Turnover
            </button>
            <button
              className={`filter-button ${activeFilter === "subcontractorTurnoverPerMonth" ? "active" : ""}`}
              onClick={() => setActiveFilter("subcontractorTurnoverPerMonth")}
            >
              Turnover VS Total Subbie
            </button>
            <button
              className={`filter-button ${activeFilter === "wagesVsExpenses" ? "active" : ""}`}
              onClick={() => setActiveFilter("wagesVsExpenses")}
            >
              Wages per month VS Expenses
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverVsDieselCost" ? "active" : ""}`}
              onClick={() => setActiveFilter("turnoverVsDieselCost")}
            >
              Turnover vs Diesel Cost
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverPerTruck" ? "active" : ""}`}
              onClick={() => setActiveFilter("turnoverPerTruck")}
            >
              Turnover Per Truck
            </button>
            <button
              className={`filter-button ${activeFilter === "incomeVsExpense" ? "active" : ""}`}
              onClick={() => setActiveFilter("incomeVsExpense")}
            >
              Income vs Expense Per Month
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverVsSubbieExpense" ? "active" : ""}`}
              onClick={() => setActiveFilter("turnoverVsSubbieExpense")}
            >
              Turnover VS Subbie Expense
            </button>
          </div>

          <div className="chart-area">
            <h2 className="chart-title">
              {activeFilter === "fuel" && "Fuel Per Truck"}
              {activeFilter === "turnoverPerMonth" && "Turnover per month vs Client"}
              {activeFilter === "agingAnalysis" && "30, 60, 90, Current"}
              {activeFilter === "subcontractorTurnoverPerMonth" && "Turnover VS Total Subbie"}
              {activeFilter === "subcontractorVsTurnover" && "Subbie VS Turnover"}
              {activeFilter === "wagesVsExpenses" && "Wages per month VS Expenses"}
              {activeFilter === "turnoverVsDieselCost" && "Turnover vs Diesel Cost"}
              {activeFilter === "turnoverPerTruck" && "Turnover Per Truck"}
              {activeFilter === "incomeVsExpense" && "Income vs Expense Per Month"}
              {activeFilter === "turnoverVsSubbieExpense" && "Turnover VS Subbie Expense"}
            </h2>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  )
}