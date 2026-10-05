"use client";

import { useState, useEffect, useRef } from "react";
import "../css/Analytics.css";
import { useNavigate } from "react-router-dom";
import {
  getChartWidth,
  fetchClients,
  fetchSubcontractors,
  fetchTrucks,
  fetchFuelData,
  fetchTurnoverData,
  fetchAgingAnalysisData,
  fetchTurnoverVsDieselCost,
  fetchIncomeVsExpenses,
  fetchTurnoverPerTruck,
  fetchWagesVsExpenses,
  fetchSubcontractorTurnoverPerMonth,
  fetchSubcontractorVsTurnover,
  fetchTurnoverVsSubbieExpense,
  fetchTurnoverVsFuelPerTruck,
  fetchTruckIncomeVsExpense,
  fetchPaymentClients,
  fetchPaymentsReceivedPerMonth,
} from "../AnalyticsFunctions";
import CategoryBarChart, { VatToggle, collapseRows, useVatToggle } from "../CategoryBarChart";
import { CHARTS } from "../chartConfigs";

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

export default function DirectorAnalytics() {
  const currentDate = new Date();
  const [activeMonth, setActiveMonth] = useState(monthNames[currentDate.getMonth()]);
  const [activeYear, setActiveYear] = useState(currentDate.getFullYear().toString());
  const [activeFilter, setActiveFilter] = useState("fuel");
  const [chartData, setChartData] = useState([]);
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [paymentClients, setPaymentClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const roleId = JSON.parse(localStorage.getItem("user"))?.roleid;
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const chart = CHARTS[activeFilter];
  const [includeVat, setIncludeVat] = useVatToggle(activeFilter, chart?.defaultIncludeVat ?? true);

  useEffect(() => {
    fetchClients(setClients, setError);
    fetchSubcontractors(setSubcontractors, setError);
    fetchTrucks(setTrucks, setError);
  }, []);

  useEffect(() => {
    if (activeFilter === "paymentsReceivedPerMonth") {
      fetchPaymentClients(activeMonth, activeYear, setPaymentClients, setError);
    }
  }, [activeMonth, activeYear, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    const loaders = {
      fuel: () => fetchFuelData(activeMonth, activeYear, setIsLoading, setError),
      turnoverPerMonth: () =>
        fetchTurnoverData(activeMonth, activeYear, selectedClient, setIsLoading, setError),
      agingAnalysis: () =>
        fetchAgingAnalysisData(activeMonth, activeYear, selectedClient, setIsLoading, setError),
      turnoverVsDieselCost: () =>
        fetchTurnoverVsDieselCost(activeMonth, activeYear, setIsLoading, setError),
      subcontractorTurnoverPerMonth: () =>
        fetchSubcontractorTurnoverPerMonth(activeMonth, activeYear, setIsLoading, setError),
      subcontractorVsTurnover: () =>
        fetchSubcontractorVsTurnover(activeMonth, activeYear, selectedSubcontractor, setIsLoading, setError),
      turnoverPerTruck: () => fetchTurnoverPerTruck(activeMonth, activeYear, setIsLoading, setError),
      incomeVsExpense: () => fetchIncomeVsExpenses(activeMonth, activeYear, setIsLoading, setError),
      wagesVsExpenses: () => fetchWagesVsExpenses(activeMonth, activeYear, setIsLoading, setError),
      turnoverVsSubbieExpense: () =>
        fetchTurnoverVsSubbieExpense(activeMonth, activeYear, selectedSubcontractor, setIsLoading, setError),
      turnoverVsFuelPerTruck: () =>
        fetchTurnoverVsFuelPerTruck(activeMonth, activeYear, selectedTruck, setIsLoading, setError),
      truckIncomeVsExpense: () =>
        fetchTruckIncomeVsExpense(activeMonth, activeYear, selectedTruck, setIsLoading, setError),
      paymentsReceivedPerMonth: () =>
        fetchPaymentsReceivedPerMonth(activeMonth, activeYear, selectedClient, setIsLoading, setError),
    };

    const loadData = async () => {
      setChartData([]);
      setError(null);
      setIsLoading(true);
      try {
        const data = loaders[activeFilter] ? await loaders[activeFilter]() : [];
        if (isMounted) setChartData(data);
      } catch (err) {
        if (isMounted) setError(`Failed to load data: ${err.message}`);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeFilter, activeMonth, activeYear, selectedClient, selectedSubcontractor, selectedTruck]);

  // Disable vertical scrolling while this page is mounted
  useEffect(() => {
    try {
      document.body.classList.add("no-vertical-scroll");
      document.documentElement.classList.add("no-vertical-scroll");
    } catch (e) {
      // ignore if not in browser context
    }
    return () => {
      try {
        document.body.classList.remove("no-vertical-scroll");
        document.documentElement.classList.remove("no-vertical-scroll");
      } catch (e) {
        // ignore if not in browser context
      }
    };
  }, []);

  useEffect(() => {
    const computeWrapperHeight = () => {
      if (!wrapperRef.current) return;
      const top = wrapperRef.current.getBoundingClientRect().top;
      // Try to find your global footer element. Adjust this query if your footer has a known selector.
      const footerEl =
        document.querySelector("footer") || document.querySelector('[role="contentinfo"]');
      const footerHeight = footerEl ? footerEl.getBoundingClientRect().height : 0;

      const available = Math.max(0, window.innerHeight - top - footerHeight);
      wrapperRef.current.style.height = `${available}px`;
    };

    computeWrapperHeight();
    window.addEventListener("resize", computeWrapperHeight);
    return () => window.removeEventListener("resize", computeWrapperHeight);
  }, []);

  const renderChart = () => {
    if (!chart) return null;
    // Truck charts show one "Totals" row until a single truck is chosen.
    const rows =
      chart.totals && !selectedTruck && chartData.length
        ? collapseRows(chartData, chart.totals)
        : chartData;

    return (
      <div className="chart-wrapper">
        {isLoading ? (
          <div className="loading-indicator">Loading {chart.noun} data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !Array.isArray(rows) || rows.length === 0 ? (
          <div className="no-data-message">
            No {chart.noun} data available for {activeMonth} {activeYear}
          </div>
        ) : (
          <CategoryBarChart
            rows={rows}
            categories={chart.categories}
            includeVat={includeVat}
            width={getChartWidth(rows.length, activeFilter)}
            stackLabels={chart.stackLabels}
            net={chart.net}
            showShare={chart.showShare}
            statusColor={chart.statusColor}
            legendItems={chart.legendItems}
            summary={chart.summary}
            wrapLabels={chart.wrapLabels}
          />
        )}
      </div>
    );
  };

  const handleBack = () => {
    if (roleId === 1) {
      navigate("/analytics-reports");
    } else if (roleId === 4) {
      navigate("/analytics-reports");
    }
  };

  return (
    <div className="analytics-page-wrapper" ref={wrapperRef}>
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
          <select
            className="year-select"
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
          >
            {Array.from({ length: currentDate.getFullYear() - 2024 + 1 }, (_, idx) =>
              (2024 + idx).toString()
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {(activeFilter === "turnoverPerMonth" ||
            activeFilter === "agingAnalysis" ||
            activeFilter === "paymentsReceivedPerMonth") && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="client-select"
            >
              <option value="">Select Client</option>
              {(activeFilter === "paymentsReceivedPerMonth" ? paymentClients : clients).map(
                (client) => (
                  <option key={client.m5clientkey} value={client.m5clientkey}>
                    {client.client}
                  </option>
                )
              )}
            </select>
          )}
          {(activeFilter === "subcontractorVsTurnover" ||
            activeFilter === "turnoverVsSubbieExpense") && (
            <select
              value={selectedSubcontractor}
              onChange={(e) => setSelectedSubcontractor(e.target.value)}
              className="subcontractor-select"
            >
              <option value="">Select Subcontractor</option>
              {subcontractors.map((subcontractor) => (
                <option
                  key={subcontractor.subei_reg_num || subcontractor.userid}
                  value={subcontractor.subei_reg_num || subcontractor.userid}
                >
                  {subcontractor.companyname}
                </option>
              ))}
            </select>
          )}
          {(activeFilter === "turnoverVsFuelPerTruck" ||
            activeFilter === "truckIncomeVsExpense") && (
            <select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              className="truck-select"
            >
              <option value="">Totals</option>
              {trucks.map((truck) => (
                <option key={truck.m5truckskey} value={truck.m5truckskey}>
                  {truck.truckregnumber || `Truck ID ${truck.m5truckskey}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="analytics-content">
          <div className="sidebar-filters">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="filter-select"
            >
              <option value="fuel">Fuel Per Truck</option>
              <option value="turnoverPerMonth">Turnover per month vs Client</option>
              <option value="agingAnalysis">30, 60, 90, Current</option>
              <option value="subcontractorVsTurnover">Subbie VS Turnover</option>
              <option value="subcontractorTurnoverPerMonth">Turnover VS Total Subbie</option>
              <option value="wagesVsExpenses">Wages per month VS Expenses</option>
              <option value="turnoverVsDieselCost">Turnover vs Diesel Cost</option>
              <option value="turnoverPerTruck">Turnover Per Truck</option>
              <option value="incomeVsExpense">Income vs Expense Per Month</option>
              <option value="turnoverVsSubbieExpense">Turnover VS Subbie Expense</option>
              <option value="turnoverVsFuelPerTruck">Turnover Per Truck VS Diesel</option>
              <option value="truckIncomeVsExpense">Truck Income VS Truck Expenses</option>
              <option value="paymentsReceivedPerMonth">Payments Received per Month</option>
            </select>
          </div>

          <div className="chart-area">
            <div className="chart-title-row">
              <h2 className="chart-title">{chart?.title}</h2>
              {chart && <VatToggle includeVat={includeVat} onChange={setIncludeVat} />}
            </div>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
