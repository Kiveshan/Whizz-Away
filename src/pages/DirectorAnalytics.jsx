"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts"
import "../css/Analytics.css"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function DirectorAnalytics() {
  const getPreviousMonth = (month, year) => {
    const date = new Date(year, monthNames.indexOf(month), 1);
    date.setMonth(date.getMonth() - 1);
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };


  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Set initial Month and Year to the current month and year
  const currentDate = new Date();
  const [activeMonth, setActiveMonth] = useState(monthNames[currentDate.getMonth()]);
  const [activeYear, setActiveYear] = useState(currentDate.getFullYear().toString());
  const [activeFilter, setActiveFilter] = useState("fuel");
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to fetch fuel data from the database
  const fetchFuelData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching fuel data for month: ${month}, year: ${year}`);
      const response = await axios.get('http://localhost:5000/api/fuel-expenses', {
        params: { month, year }
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Fuel data received:", response.data.data);
        const fuelExpenses = response.data.data.map(expense => {
          const cost = parseFloat(expense.total_cost);
          const status = calculateStatus(cost);
          console.log(`Truck ${expense.truckregnum}: Cost=${cost}, Status=${status}, Percentage=${expense.percentage}%`);
          return {
            truckId: expense.truckregnum,
            value: cost,
            month: expense.month_name.trim(),
            year: expense.year.toString(),
            status: status,
            percentage: expense.percentage,
          };
        });
        console.log("Processed fuel expenses:", fuelExpenses);
        return fuelExpenses;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching fuel data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch fuel data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch turnover data from the database
  const fetchTurnoverData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching turnover data for month: ${month}, year: ${year}`);
      const response = await axios.get('http://localhost:5000/api/turnover-per-month', {
        params: { month, year }
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Turnover data received:", response.data.data);
        const turnoverData = response.data.data.map(item => {
          const turnover = parseFloat(item.turnover);
          console.log(`Client ${item.client}: Turnover=${turnover}, Percentage=${item.percentage}%`);
          return {
            client: item.client,
            turnover: turnover,
            month: item.month_name.trim(),
            year: item.year.toString(),
            percentage: item.percentage
          };
        });
        console.log("Processed turnover data:", turnoverData);
        return turnoverData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch turnover data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch aging analysis data from the database
  const fetchAgingAnalysisData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching aging analysis data for month: ${month}, year: ${year}`);
      const response = await axios.get('http://localhost:5000/api/aging-analysis', {
        params: { month, year }
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Aging analysis data received:", response.data.data);
        const agingData = response.data.data.map(item => ({
          client: item.client,
          current: item.current,
          thirtyDays: item.thirtyDays,
          sixtyDays: item.sixtyDays,
          ninetyDays: item.ninetyDays,
          month: item.month,
          year: item.year,
        }));
        console.log("Processed aging analysis data:", agingData);
        return agingData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching aging analysis data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch aging analysis data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch turnover vs diesel cost data from the database
  const fetchTurnoverVsDieselCostData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching turnover vs diesel cost data for month: ${month}, year: ${year}`);
      const response = await axios.get('http://localhost:5000/api/turnover-vs-diesel-cost', {
        params: { month, year }
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Turnover vs diesel cost data received:", response.data.data);
        const data = response.data.data.map(item => {
          const totalTurnover = parseFloat(String(item.totalTurnover).replace(/[^0-9.-]+/g, "")) || 0;
          const dieselCost = parseFloat(String(item.dieselCost).replace(/[^0-9.-]+/g, "")) || 0;
          const total = totalTurnover + dieselCost;
          console.log(`Parsed values - totalTurnover: ${totalTurnover}, dieselCost: ${dieselCost}, total: ${total}`);

          const turnoverPercentage = total > 0 ? ((totalTurnover / total) * 100).toFixed(2) : 0;
          const dieselCostPercentage = total > 0 ? ((dieselCost / total) * 100).toFixed(2) : 0;

          const result = {
            month: item.month,
            year: item.year,
            totalTurnover: totalTurnover,
            dieselCost: dieselCost,
            turnoverPercentage: parseFloat(turnoverPercentage),
            dieselCostPercentage: parseFloat(dieselCostPercentage),
            percentage: undefined,
          };
          console.log("Processed item:", result);
          return result;
        });
        console.log("Processed turnover vs diesel cost data with percentages:", data);
        return data;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover vs diesel cost data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch turnover vs diesel cost data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch income vs expense data using all expenses from expenses_m2
  const fetchIncomeVsExpenseData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching income vs expense data for month: ${month}, year: ${year}`);

      // Fetch turnover (income)
      console.log("Fetching turnover data...");
      const turnoverResponse = await axios.get('http://localhost:5000/api/turnover-per-month', {
        params: { month, year }
      });
      if (!turnoverResponse.data.success) {
        throw new Error(turnoverResponse.data.message || "Failed to fetch turnover data");
      }
      const turnoverData = turnoverResponse.data.data;
      const totalTurnover = turnoverData.reduce((sum, item) => sum + (parseFloat(item.turnover) || 0), 0);
      console.log(`Total turnover (income): ${totalTurnover}`);

      // Fetch all expenses from expenses_m2
      console.log("Fetching all expenses...");
      const expensesResponse = await axios.get('http://localhost:5000/api/all-expenses', {
        params: { month, year }
      });
      if (!expensesResponse.data.success) {
        throw new Error(expensesResponse.data.message || "Failed to fetch expenses");
      }
      const expensesData = expensesResponse.data.data;
      const totalExpenses = expensesData.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
      console.log(`Total expenses: ${totalExpenses}`);

      // Calculate percentages
      const total = totalTurnover + totalExpenses;
      const incomePercentage = total > 0 ? ((totalTurnover / total) * 100).toFixed(2) : 0;
      const expensePercentage = total > 0 ? ((totalExpenses / total) * 100).toFixed(2) : 0;
      console.log(`Total: ${total}, Income Percentage: ${incomePercentage}%, Expense Percentage: ${expensePercentage}%`);

      const result = [{
        month,
        year,
        income: totalTurnover,
        expense: totalExpenses,
        incomePercentage: parseFloat(incomePercentage),
        expensePercentage: parseFloat(expensePercentage),
      }];
      console.log("Processed income vs expense data:", result);

      return result;
    } catch (err) {
      console.error("Error fetching income vs expense data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch income vs expense data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch turnover per truck from the database
  const fetchTurnoverPerTruckData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching turnover per truck data for month: ${month}, year: ${year}`);
      const response = await axios.get('http://localhost:5000/api/turnover-per-truck', {
        params: { month, year }
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Turnover per truck data received:", response.data.data);
        const turnoverData = response.data.data.map(item => {
          const turnover = parseFloat(item.total_turnover);
          console.log(`Truck ${item.truckregnumber}: Turnover=${turnover}, Percentage=${item.percentage}%`);
          return {
            truckId: item.truckregnumber,
            turnover: turnover,
            month: item.month_name.trim(),
            year: item.year.toString(),
            percentage: item.percentage,
          };
        });
        console.log("Processed turnover per truck data:", turnoverData);
        return turnoverData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover per truck data:", err.response ? err.response.data : err.message);
      setError(`Failed to fetch turnover per truck data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStatus = (cost) => {
    if (cost <= 3500) return "good";
    if (cost <= 4500) return "warning";
    return "bad";
  };

  // Placeholder data for other graphs
  const subcontractorTurnoverPerMonthData = [
    { month: "January", year: "2025", turnover: 10000 },
    { month: "February", year: "2025", turnover: 12000 },
    { month: "March", year: "2025", turnover: 15000 },
    { month: "April", year: "2025", turnover: 13000 },
    { month: "May", year: "2025", turnover: 14000 },
    { month: "June", year: "2025", turnover: 16000 },
    { month: "March", year: "2024", turnover: 14000 },
  ];

  const subcontractorVsTurnoverData = [
    { month: "January", year: "2025", totalTurnover: 50000, subcontractorTurnover: 10000 },
    { month: "February", year: "2025", totalTurnover: 45000, subcontractorTurnover: 12000 },
    { month: "March", year: "2025", totalTurnover: 60000, subcontractorTurnover: 15000 },
    { month: "April", year: "2025", totalTurnover: 55000, subcontractorTurnover: 13000 },
    { month: "May", year: "2025", totalTurnover: 70000, subcontractorTurnover: 14000 },
    { month: "June", year: "2025", totalTurnover: 65000, subcontractorTurnover: 16000 },
    { month: "March", year: "2024", totalTurnover: 58000, subcontractorTurnover: 14000 },
  ];

  const wagesPerMonthData = [
    { month: "January", year: "2025", wages: 20000 },
    { month: "February", year: "2025", wages: 22000 },
    { month: "March", year: "2025", wages: 21000 },
    { month: "April", year: "2025", wages: 23000 },
    { month: "May", year: "2025", wages: 24000 },
    { month: "June", year: "2025", wages: 25000 },
    { month: "March", year: "2024", wages: 20500 },
  ];

  useEffect(() => {
    const loadData = async () => {
      setChartData([]); // Reset chartData to avoid stale data
      let data = [];
      switch (activeFilter) {
        case "fuel":
          data = await fetchFuelData(activeMonth, activeYear);
          break;
        case "turnoverPerMonth":
          data = await fetchTurnoverData(activeMonth, activeYear);
          break;
        case "agingAnalysis":
          data = await fetchAgingAnalysisData(activeMonth, activeYear);
          break;
        case "turnoverVsDieselCost":
          data = await fetchTurnoverVsDieselCostData(activeMonth, activeYear);
          break;
        case "subcontractorTurnoverPerMonth":
          data = subcontractorTurnoverPerMonthData.filter(
            (item) => item.month === activeMonth && item.year === activeYear
          );
          break;
        case "subcontractorVsTurnover":
          data = subcontractorVsTurnoverData.filter(
            (item) => item.month === activeMonth && item.year === activeYear
          );
          break;
        case "wagesPerMonth":
          data = wagesPerMonthData.filter(
            (item) => item.month === activeMonth && item.year === activeYear
          );
          break;
        case "turnoverPerTruck":
          data = await fetchTurnoverPerTruckData(activeMonth, activeYear);
          break;
        case "incomeVsExpense":
          data = await fetchIncomeVsExpenseData(activeMonth, activeYear);
          break;
        default:
          data = [];
      }
      console.log("Setting chartData:", data);
      setChartData(data);
    };
    loadData();
  }, [activeFilter, activeMonth, activeYear]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: R {entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getBarFill = (entry) => {
    console.log("getBarFill entry:", entry);
    if (activeFilter === "fuel" && entry && entry.status) {
      console.log(`Applying color for status: ${entry.status}`);
      switch (entry.status) {
        case "good": return "#4CAF50";
        case "warning": return "#FFC107";
        case "bad": return "#F44336";
        default: return "#4169e1";
      }
    }
    console.log("Falling back to default color");
    return "#4169e1"; // Blue (fallback)
  };

  // Custom label for displaying amount (and percentage if applicable) on top of the bars
  const CustomBarLabelForFuelAndTurnover = (props) => {
    const { x, y, width, value, index } = props;

    if (value === undefined || value === null) {
      console.log("CustomBarLabelForFuelAndTurnover: Value is undefined or null, skipping label");
      return null;
    }

    const percentage = chartData[index]?.percentage || 0;
    const labelText = `R${value.toLocaleString()} (${percentage.toFixed(2)}%)`;

    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
      >
        {labelText}
      </text>
    );
  };

  const CustomBarLabelForDefault = (props) => {
    const { x, y, width, value } = props;

    if (value === undefined || value === null) {
      console.log("CustomBarLabelForDefault: Value is undefined or null, skipping label");
      return null;
    }

    const labelText = `R${value.toLocaleString()}`;

    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
      >
        {labelText}
      </text>
    );
  };

  const renderChart = () => {
    console.log("Rendering chart with chartData:", chartData);
    switch (activeFilter) {
      // Fuel Per Truck
      case "fuel":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading fuel data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No fuel data available for {activeMonth} ${activeYear}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="truckId" />
                    <YAxis label={{ value: 'Expense Amount (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Fuel Expense (Rands)"
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
        );

      // Turnover per month
      case "turnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No turnover data available for {activeMonth} ${activeYear}</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                  <XAxis dataKey="client" />
                  <YAxis label={{ value: 'Turnover (R)', angle: 0, position: 'top', dy: -20 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="turnover"
                    name="Turnover (Rands)"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList dataKey="turnover" content={CustomBarLabelForFuelAndTurnover} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      // 30, 60, 90, Current per month
      case "agingAnalysis":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading aging analysis data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No aging analysis data available for {activeMonth} ${activeYear}</div>
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
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="client" />
                    <YAxis label={{ value: 'Amount (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="current"
                      name="Current (Rands)"
                      fill="#4169e1"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="current" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                    <Bar
                      dataKey="thirtyDays"
                      name="30 Days (Rands)"
                      fill="#4CAF50"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="thirtyDays" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                    <Bar
                      dataKey="sixtyDays"
                      name="60 Days (Rands)"
                      fill="#FFC107"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="sixtyDays" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                    <Bar
                      dataKey="ninetyDays"
                      name="90 Days (Rands)"
                      fill="#F44336"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="ninetyDays" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      // Subcontractor turnover per month
      case "subcontractorTurnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {chartData.length === 0 ? (
              <div className="no-data-message">No subcontractor turnover data available for {activeMonth} ${activeYear}</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                  <XAxis dataKey="month" tickFormatter={() => `${activeMonth} ${activeYear}`} />
                  <YAxis label={{ value: 'Turnover (R)', angle: 0, position: 'top', dy: -20 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="turnover"
                    name="Subcontractor Turnover (Rands)"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList dataKey="turnover" content={CustomBarLabelForDefault} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      // Subcontractor turnover vs Turnover
      case "subcontractorVsTurnover":
        return (
          <div className="chart-wrapper">
            {chartData.length === 0 ? (
              <div className="no-data-message">No data available for {activeMonth} ${activeYear}</div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Total Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                    <span>Subcontractor Turnover</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="month" tickFormatter={() => `${activeMonth} ${activeYear}`} />
                    <YAxis label={{ value: 'Amount (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="totalTurnover"
                      name="Total Turnover (Rands)"
                      fill="#9C27B0"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="totalTurnover" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                    <Bar
                      dataKey="subcontractorTurnover"
                      name="Subcontractor Turnover (Rands)"
                      fill="#E91E63"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="subcontractorTurnover" content={CustomBarLabelForDefault} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      // Wages (total) per month
      case "wagesPerMonth":
        return (
          <div className="chart-wrapper">
            {chartData.length === 0 ? (
              <div className="no-data-message">No wages data available for {activeMonth} ${activeYear}</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                  <XAxis dataKey="month" tickFormatter={() => `${activeMonth} ${activeYear}`} />
                  <YAxis label={{ value: 'Wages (R)', angle: 0, position: 'top', dy: -20 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="wages"
                    name="Wages (Rands)"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList dataKey="wages" content={CustomBarLabelForDefault} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      // Turnover vs Diesel cost
      case "turnoverVsDieselCost":
        const CustomBarLabelForTurnoverVsDiesel = (props) => {
          const { x, y, width, value, index, dataKey } = props;

          if (value === undefined || value === null) {
            console.log("CustomBarLabelForTurnoverVsDiesel: Value is undefined or null, skipping label");
            return null;
          }

          console.log(`CustomBarLabelForTurnoverVsDiesel - index: ${index}, dataKey: ${dataKey}, chartData:`, chartData);
          console.log(`CustomBarLabelForTurnoverVsDiesel - chartData[${index}]:`, chartData[index]);

          const turnoverPercentage = chartData[index]?.turnoverPercentage ?? 0;
          const dieselCostPercentage = chartData[index]?.dieselCostPercentage ?? 0;
          console.log(`CustomBarLabelForTurnoverVsDiesel - turnoverPercentage: ${turnoverPercentage}, dieselCostPercentage: ${dieselCostPercentage}`);

          const percentage = dataKey === "totalTurnover" ? turnoverPercentage : dieselCostPercentage;
          console.log(`CustomBarLabelForTurnoverVsDiesel - Selected percentage for ${dataKey}: ${percentage}`);

          const labelText = `R${value.toLocaleString()} (${percentage.toFixed(2)}%)`;
          console.log(`CustomBarLabelForTurnoverVsDiesel - Rendering label: ${labelText}`);

          return (
            <text
              x={x + width / 2}
              y={y - 10}
              fill="#000"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
            >
              {labelText}
            </text>
          );
        };

        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover vs diesel cost data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No data available for {activeMonth} ${activeYear}</div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                    <span>Diesel Cost</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="month" tickFormatter={() => `${activeMonth} ${activeYear}`} />
                    <YAxis label={{ value: 'Amount (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="totalTurnover"
                      name="Turnover (Rands)"
                      fill="#9C27B0"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="totalTurnover" content={CustomBarLabelForTurnoverVsDiesel} position="top" />
                    </Bar>
                    <Bar
                      dataKey="dieselCost"
                      name="Diesel Cost (Rands)"
                      fill="#E91E63"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="dieselCost" content={CustomBarLabelForTurnoverVsDiesel} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      // Turnover per truck
      case "turnoverPerTruck":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover per truck data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No turnover data available for {activeMonth} ${activeYear}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="truckId" />
                    <YAxis label={{ value: 'Turnover (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="turnover"
                      name="Turnover (Rands)"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarFill(entry)} />
                      ))}
                      <LabelList dataKey="turnover" content={CustomBarLabelForFuelAndTurnover} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: "#4169e1" }}></span>
                    <span>Truck Turnover</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      // Income vs expense per month
      case "incomeVsExpense":
        const CustomBarLabelForIncomeVsExpense = (props) => {
          const { x, y, width, value, index, dataKey } = props;

          if (value === undefined || value === null) {
            console.log("CustomBarLabelForIncomeVsExpense: Value is undefined or null, skipping label");
            return null;
          }

          console.log(`CustomBarLabelForIncomeVsExpense - index: ${index}, dataKey: ${dataKey}, chartData:`, chartData);
          console.log(`CustomBarLabelForIncomeVsExpense - chartData[${index}]:`, chartData[index]);

          // Fallback: Calculate percentages directly to ensure correctness
          const income = chartData[index]?.income ?? 0;
          const expense = chartData[index]?.expense ?? 0;
          const total = income + expense;
          const incomePercentage = total > 0 ? ((income / total) * 100).toFixed(2) : 0;
          const expensePercentage = total > 0 ? ((expense / total) * 100).toFixed(2) : 0;
          console.log(`CustomBarLabelForIncomeVsExpense - Calculated: incomePercentage: ${incomePercentage}, expensePercentage: ${expensePercentage}`);

          // Use calculated percentages instead of precomputed ones
          const percentage = dataKey === "income" ? incomePercentage : expensePercentage;
          console.log(`CustomBarLabelForIncomeVsExpense - Selected percentage for ${dataKey}: ${percentage}`);

          const labelText = `R${value.toLocaleString()} (${percentage}%)`;
          console.log(`CustomBarLabelForIncomeVsExpense - Rendering label: ${labelText}`);

          return (
            <text
              x={x + width / 2}
              y={y - 10}
              fill="#000"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
            >
              {labelText}
            </text>
          );
        };

        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading income vs expense data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="no-data-message">No data available for {activeMonth} ${activeYear}</div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#9C27B0" }}></span>
                    <span>Income</span>
                  </div>
                  <div className="chart-header-item">
                    <span className="legend-color" style={{ backgroundColor: "#E91E63" }}></span>
                    <span>Expense</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }}>
                    <XAxis dataKey="month" tickFormatter={() => `${activeMonth} ${activeYear}`} />
                    <YAxis label={{ value: 'Amount (R)', angle: 0, position: 'top', dy: -20 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income (Rands)"
                      fill="#9C27B0"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="income" content={CustomBarLabelForIncomeVsExpense} position="top" />
                    </Bar>
                    <Bar
                      dataKey="expense"
                      name="Expense (Rands)"
                      fill="#E91E63"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList dataKey="expense" content={CustomBarLabelForIncomeVsExpense} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleBack = () => {
    navigate("/DirectorDashboard");
  };

  return (
    <div className="analytics-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="date-filters">
        <select
          value={activeMonth}
          onChange={(e) => setActiveMonth(e.target.value)}
        >
          {monthNames.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <select
          className="year-select"
          value={activeYear}
          onChange={(e) => setActiveYear(e.target.value)}
        >
          {["2022", "2023", "2024", "2025"].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
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
            Turnover Per Month
          </button>
          <button
            className={`filter-button ${activeFilter === "agingAnalysis" ? "active" : ""}`}
            onClick={() => setActiveFilter("agingAnalysis")}
          >
            30, 60, 90, Current
          </button>
          <button
            className={`filter-button ${activeFilter === "subcontractorTurnoverPerMonth" ? "active" : ""}`}
            onClick={() => setActiveFilter("subcontractorTurnoverPerMonth")}
          >
            Subcontractor Turnover Per Month
          </button>
          <button
            className={`filter-button ${activeFilter === "subcontractorVsTurnover" ? "active" : ""}`}
            onClick={() => setActiveFilter("subcontractorVsTurnover")}
          >
            Subcontractor Turnover vs Turnover
          </button>
          <button
            className={`filter-button ${activeFilter === "wagesPerMonth" ? "active" : ""}`}
            onClick={() => setActiveFilter("wagesPerMonth")}
          >
            Wages (Total) Per Month
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
        </div>

        <div className="chart-area">
          <h2 className="chart-title">
            {activeFilter === "turnoverPerMonth" && `Turnover Per Month (Previous Month: ${getPreviousMonth(activeMonth, activeYear)} for ${activeMonth} ${activeYear} Statement)`}
            {activeFilter === "turnoverVsDieselCost" && `Turnover vs Diesel Cost (Previous Month: ${getPreviousMonth(activeMonth, activeYear)} for ${activeMonth} ${activeYear} Statement)`}
            {activeFilter === "turnoverPerTruck" && `Turnover Per Truck (Previous Month: ${getPreviousMonth(activeMonth, activeYear)} for ${activeMonth} ${activeYear} Statement)`}
            {activeFilter === "agingAnalysis" && `30, 60, 90, Current (${activeMonth} ${activeYear})`}
            {activeFilter === "fuel" && `Fuel Expenses by Truck (${activeMonth} ${activeYear})`}
            {activeFilter === "subcontractorTurnoverPerMonth" && `Subcontractor Turnover Per Month (${activeMonth} ${activeYear})`}
            {activeFilter === "subcontractorVsTurnover" && `Subcontractor Turnover vs Turnover (${activeMonth} ${activeYear})`}
            {activeFilter === "wagesPerMonth" && `Wages (Total) Per Month (${activeMonth} ${activeYear})`}
            {activeFilter === "incomeVsExpense" && `Income vs Expense Per Month (${activeMonth} ${activeYear})`}
          </h2>
          {renderChart()}
        </div>
      </div>
    </div>
  );
}