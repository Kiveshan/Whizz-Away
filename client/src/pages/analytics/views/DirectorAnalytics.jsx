"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import "../css/Analytics.css";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the Axios instance

export default function DirectorAnalytics() {
  const getPreviousMonth = (month, year) => {
    const date = new Date(year, monthNames.indexOf(month), 1);
    date.setMonth(date.getMonth() - 1);
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

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
  ];

  const currentDate = new Date();
  const [activeMonth, setActiveMonth] = useState(
    monthNames[currentDate.getMonth()]
  );
  const [activeYear, setActiveYear] = useState(
    currentDate.getFullYear().toString()
  );
  const [activeFilter, setActiveFilter] = useState("fuel");
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const calculateTurnoverStatus = (turnover) => {
    if (turnover >= 10000) return "high";
    if (turnover >= 5000) return "medium";
    return "low";
  };

  const fetchFuelData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching fuel data for month: ${month}, year: ${year}`);
      const response = await api.get("/api/fuel-expenses", {
        params: { month, year },
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Fuel data received:", response.data.data);
        const fuelExpenses = response.data.data.map((expense) => {
          const cost = parseFloat(expense.total_cost);
          const status = calculateStatus(cost);
          console.log(
            `Truck ${expense.truckregnum}: Cost=${cost}, Status=${status}, Percentage=${expense.percentage}%`
          );
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
      console.error(
        "Error fetching fuel data:",
        err.response ? err.response.data : err.message
      );
      setError(`Failed to fetch fuel data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTurnoverData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching turnover data for month: ${month}, year: ${year}`);
      const response = await api.get("/api/turnover-per-month", {
        params: { month, year },
      });
      console.log("API response:", response.data);
      if (response.data.success) {
        const turnoverData = response.data.data.map((item) => {
          const turnover = parseFloat(item.turnover);
          console.log(
            `Client ${item.client}: Turnover=${turnover}, Percentage=${item.percentage}%`
          );
          return {
            client: item.client,
            turnover: turnover,
            month: item.month_name.trim(),
            year: item.year,
            percentage: item.percentage,
          };
        });
        console.log("Processed turnover data:", turnoverData);
        return turnoverData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover data:", err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgingAnalysisData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(
        `Fetching aging analysis data for month: ${month}, year: ${year}`
      );
      const response = await api.get("/api/aging-analysis", {
        params: { month, year },
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Aging analysis data received:", response.data.data);
        const agingData = response.data.data.map((item) => ({
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
      console.error(
        "Error fetching aging analysis data:",
        err.response ? err.response.data : err.message
      );
      setError(`Failed to fetch aging analysis data: ${err.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTurnoverVsDieselCost = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(
        `Fetching turnover vs diesel cost for month: ${month}, year: ${year}`
      );
      const response = await api.get("/api/turnover-vs-diesel-cost", {
        params: { month, year },
      });

      if (response.data.success) {
        const data = response.data.data.map((item) => {
          console.log(
            `Received percentages: turnoverPercentage=${item.turnoverPercentage
            } (${typeof item.turnoverPercentage}), dieselCostPercentage=${item.dieselCostPercentage
            } (${typeof item.dieselCostPercentage})`
          );
          return {
            month: item.month,
            year: item.year,
            totalTurnover: Number(item.totalTurnover) || 0,
            dieselCost: Number(item.dieselCost) || 0,
            turnoverPercentage: item.turnoverPercentage ?? 0,
            dieselCostPercentage: item.dieselCostPercentage ?? 0,
          };
        });

        console.log("Processed turnover vs diesel cost data:", data);

        setChartData(data);
        return data;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover vs diesel cost:", err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncomeVsExpenses = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(
        `Fetching income vs expenses for month: ${month}, year: ${year}`
      );
      const response = await api.get("/api/all-expenses", {
        params: { month, year },
      });
      console.log("API response:", response.data);
      if (response.data.success) {
        const data = {
          expenses: response.data.data.expenses,
          income: parseFloat(response.data.data.income),
          month: response.data.data.month,
          year: response.data.data.year,
        };
        console.log("Processed income vs expenses data:", data);
        return data;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching income vs expenses:", err);
      setError(err.message);
      return { expenses: [], income: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTurnoverPerTruck = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching turnover per truck for month: ${month}, year: ${year}`);
      const response = await api.get("/api/turnover-per-truck", {
        params: { month, year },
      });
      console.log("API response:", response.data);
      if (response.data.success) {
        const turnoverData = response.data.data.map((item) => {
          const turnover = parseFloat(item.total_turnover);
          const status = calculateTurnoverStatus(turnover);
          return {
            truckregnumber: item.truckregnumber,
            total_turnover: turnover,
            month: item.month_name.trim(),
            year: item.year,
            percentage: item.percentage,
            status, // Add status
          };
        });
        console.log("Processed turnover per truck data:", turnoverData);
        return turnoverData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching turnover per truck:", err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWagesPerMonthData = async (month, year) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(
        `Fetching wages per month data for month: ${month}, year: ${year}`
      );
      const response = await api.get("/api/wages-per-month", {
        params: { month, year },
      });
      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Wages per month data received:", response.data.data);
        const wagesData = response.data.data.map((item) => ({
          month: item.month,
          year: item.year,
          wages: parseFloat(item.wages) || 0,
        }));
        console.log("Processed wages per month data:", wagesData);
        return wagesData;
      } else {
        throw new Error(response.data.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error(
        "Error fetching wages per month data:",
        err.response ? err.response.data : err.message
      );
      setError(`Failed to fetch wages per month data: ${err.message}`);
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
    {
      month: "January",
      year: "2025",
      totalTurnover: 50000,
      subcontractorTurnover: 10000,
    },
    {
      month: "February",
      year: "2025",
      totalTurnover: 45000,
      subcontractorTurnover: 12000,
    },
    {
      month: "March",
      year: "2025",
      totalTurnover: 60000,
      subcontractorTurnover: 15000,
    },
    {
      month: "April",
      year: "2025",
      totalTurnover: 55000,
      subcontractorTurnover: 13000,
    },
    {
      month: "May",
      year: "2025",
      totalTurnover: 70000,
      subcontractorTurnover: 14000,
    },
    {
      month: "June",
      year: "2025",
      totalTurnover: 65000,
      subcontractorTurnover: 16000,
    },
    {
      month: "March",
      year: "2024",
      totalTurnover: 58000,
      subcontractorTurnover: 14000,
    },
  ];

  useEffect(() => {
    const loadData = async () => {
      setChartData([]);
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
          data = await fetchTurnoverVsDieselCost(activeMonth, activeYear);
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
          data = await fetchWagesPerMonthData(activeMonth, activeYear);
          break;
        case "turnoverPerTruck":
          data = await fetchTurnoverPerTruck(activeMonth, activeYear);
          break;
        case "incomeVsExpense":
          data = await fetchIncomeVsExpenses(activeMonth, activeYear);
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
            <p
              key={index}
              className="tooltip-value"
              style={{ color: entry.color }}
            >
              {activeFilter === "incomeVsExpense"
                ? `${label}: R${entry.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
                : `${entry.name}: R${entry.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
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
        case "good":
          return "#4CAF50";
        case "warning":
          return "#FFC107";
        case "bad":
          return "#F44336";
        default:
          return "#4169e1";
      }
    }
    console.log("Falling back to default color");
    return "#4169e1";
  };

  const CustomBarLabelForTurnover = (props) => {
    const { x, y, width, value, payload = {} } = props;
    const percentage = payload.turnoverPercentage ?? 0;
    console.log("CustomBarLabelForTurnover - payload:", payload);
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#4169e1"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        R{value?.toLocaleString?.()} ({percentage}%)
      </text>
    );
  };

  const CustomBarLabelForDieselCost = (props) => {
    const { x, y, width, value, payload = {} } = props;
    const percentage = payload.dieselCostPercentage ?? 0;
    console.log("CustomBarLabelForDieselCost- payload:", payload);
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#ff6347"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        R{value?.toLocaleString?.()} ({percentage}%)
      </text>
    );
  };

  const CustomBarLabelForFuelAndTurnover = (props) => {
    const { x, y, width, value, index, dataKey } = props;

    if (value === undefined || value === null) {
      console.log(
        "CustomBarLabelForFuelAndTurnover: Value is undefined or null, skipping label"
      );
      return null;
    }

    console.log(
      `CustomBarLabelForFuelAndTurnover: index=${index}, dataKey=${dataKey}, chartData=`,
      chartData
    );

    const percentage = chartData[index]?.percentage || 0;

    console.log(`Selected percentage: ${percentage}% for dataKey=${dataKey}`);

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
      console.log(
        "CustomBarLabelForDefault: Value is undefined or null, skipping label"
      );
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
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
                    <XAxis dataKey="truckId" />
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
                      <LabelList
                        dataKey="value"
                        content={CustomBarLabelForFuelAndTurnover}
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4CAF50" }}
                    ></span>
                    <span>Good: R0-R3,500</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#FFC107" }}
                    ></span>
                    <span>Warning: R3,501-R4,500</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#F44336" }}
                    ></span>
                    <span>High: R4,501+</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

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
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                >
                  <XAxis dataKey="client" />
                  <YAxis
                    label={{
                      value: "Turnover (R)",
                      angle: 0,
                      position: "top",
                      dy: -20,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="turnover"
                    name="Turnover"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="turnover"
                      content={CustomBarLabelForFuelAndTurnover}
                      position="top"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case "agingAnalysis":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading aging analysis data...
              </div>
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
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4169e1" }}
                    ></span>
                    <span>Current</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4CAF50" }}
                    ></span>
                    <span>30 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#FFC107" }}
                    ></span>
                    <span>60 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#F44336" }}
                    ></span>
                    <span>90 Days</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
                    <XAxis dataKey="client" />
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
                      dataKey="current"
                      name="Current"
                      fill="#4169e1"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="current"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="thirtyDays"
                      name="30 Days"
                      fill="#4CAF50"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="thirtyDays"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="sixtyDays"
                      name="60 Days"
                      fill="#FFC107"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="sixtyDays"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="ninetyDays"
                      name="90 Days"
                      fill="#F44336"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="ninetyDays"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      case "subcontractorTurnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {!Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No subcontractor turnover data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                >
                  <XAxis
                    dataKey="month"
                    tickFormatter={() => `${activeMonth} ${activeYear}`}
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
                  <Bar
                    dataKey="turnover"
                    name="Subcontractor Turnover"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="turnover"
                      content={CustomBarLabelForDefault}
                      position="top"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case "subcontractorVsTurnover":
        return (
          <div className="chart-wrapper">
            {!Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#9C27B0" }}
                    ></span>
                    <span>Total Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#E91E63" }}
                    ></span>
                    <span>Subcontractor Turnover</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
                    <XAxis
                      dataKey="month"
                      tickFormatter={() => `${activeMonth} ${activeYear}`}
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
                    <Legend />
                    <Bar
                      dataKey="totalTurnover"
                      name="Total Turnover"
                      fill="#9C27B0"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="totalTurnover"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="subcontractorTurnover"
                      name="Subcontractor Turnover"
                      fill="#E91E63"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="subcontractorTurnover"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

      case "wagesPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading wages data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No wages data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                >
                  <XAxis
                    dataKey="month"
                    tickFormatter={() => `${activeMonth} ${activeYear}`}
                  />
                  <YAxis
                    label={{
                      value: "Wages (R)",
                      angle: 0,
                      position: "top",
                      dy: -20,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="wages"
                    name="Wages"
                    fill="#4169e1"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="wages"
                      content={CustomBarLabelForDefault}
                      position="top"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case "turnoverVsDieselCost":
        console.log("turnoverVsDieselCost chartData:", chartData);
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading turnover vs diesel cost data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs diesel cost data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4169e1" }}
                    ></span>
                    <span>Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#ff6347" }}
                    ></span>
                    <span>Diesel Cost</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
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
                    <Legend />
                    <Bar
                      dataKey="totalTurnover"
                      name="Turnover"
                      fill="#4169e1"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="totalTurnover"
                        content={CustomBarLabelForTurnover}
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="dieselCost"
                      name="Diesel Cost"
                      fill="#ff6347"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="dieselCost"
                        content={CustomBarLabelForDieselCost}
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );

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
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
                    <XAxis dataKey="truckregnumber" />
                    <YAxis
                      label={{
                        value: "Turnover (R)",
                        angle: 0,
                        position: "top",
                        dy: -20,
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total_turnover"
                      name="Turnover"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.status === "high"
                              ? "#4CAF50"
                              : entry.status === "medium"
                                ? "#FFC107"
                                : "#F44336"
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="total_turnover"
                        content={CustomBarLabelForFuelAndTurnover}
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4CAF50" }}
                    ></span>
                    <span>High: R10,000+</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#FFC107" }}
                    ></span>
                    <span>Medium: R5,000-R9,999</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#F44336" }}
                    ></span>
                    <span>Low: R0-R4,999</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "incomeVsExpense":
        const totalExpenses = chartData.expenses
          ? chartData.expenses.reduce(
            (sum, item) => sum + parseFloat(item.total_cost || 0),
            0
          )
          : 0;
        const incomeVsExpenseData = [
          { name: "Income", value: chartData.income || 0, fill: "#4169e1" },
          { name: "Expenses", value: totalExpenses, fill: "#ff6347" },
        ];
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading income vs expenses data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : chartData.income === 0 &&
              (!chartData.expenses || chartData.expenses.length === 0) ? (
              <div className="no-data-message">
                No income vs expenses data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#4169e1" }}
                    ></span>
                    <span>Income</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: "#ff6347" }}
                    ></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={incomeVsExpenseData}
                    margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
                  >
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {incomeVsExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="value"
                        content={CustomBarLabelForDefault}
                        position="top"
                      />
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
    <div className="analytics-page-wrapper">
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
              className={`filter-button ${activeFilter === "fuel" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("fuel")}
            >
              Fuel Per Truck
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverPerMonth" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("turnoverPerMonth")}
            >
              Turnover Per Month
            </button>
            <button
              className={`filter-button ${activeFilter === "agingAnalysis" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("agingAnalysis")}
            >
              30, 60, 90, Current
            </button>
            <button
              className={`filter-button ${activeFilter === "subcontractorTurnoverPerMonth" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("subcontractorTurnoverPerMonth")}
            >
              Subcontractor Turnover Per Month
            </button>
            <button
              className={`filter-button ${activeFilter === "subcontractorVsTurnover" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("subcontractorVsTurnover")}
            >
              Subcontractor Turnover vs Turnover
            </button>
            <button
              className={`filter-button ${activeFilter === "wagesPerMonth" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("wagesPerMonth")}
            >
              Wages (Total) Per Month
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverVsDieselCost" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("turnoverVsDieselCost")}
            >
              Turnover vs Diesel Cost
            </button>
            <button
              className={`filter-button ${activeFilter === "turnoverPerTruck" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("turnoverPerTruck")}
            >
              Turnover Per Truck
            </button>
            <button
              className={`filter-button ${activeFilter === "incomeVsExpense" ? "active" : ""
                }`}
              onClick={() => setActiveFilter("incomeVsExpense")}
            >
              Income vs Expense Per Month
            </button>
          </div>

          <div className="chart-area">
            <h2 className="chart-title">
              {activeFilter === "turnoverPerMonth" &&
                `Turnover Per Month (${activeMonth} ${activeYear})`}
              {activeFilter === "turnoverVsDieselCost" &&
                `Turnover vs Diesel Cost (${activeMonth} ${activeYear})`}
              {activeFilter === "turnoverPerTruck" &&
                `Turnover Per Truck (${activeMonth} ${activeYear})`}
              {activeFilter === "agingAnalysis" &&
                `30, 60, 90, Current (${activeMonth} ${activeYear})`}
              {activeFilter === "fuel" &&
                `Fuel Expenses by Truck (${activeMonth} ${activeYear})`}
              {activeFilter === "subcontractorTurnoverPerMonth" &&
                `Subcontractor Turnover Per Month (${activeMonth} ${activeYear})`}
              {activeFilter === "subcontractorVsTurnover" &&
                `Subcontractor Turnover vs Turnover (${activeMonth} ${activeYear})`}
              {activeFilter === "wagesPerMonth" &&
                `Wages (Total) Per Month (${activeMonth} ${activeYear})`}
              {activeFilter === "incomeVsExpense" &&
                `Income vs Expense Per Month (${activeMonth} ${activeYear})`}
            </h2>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
