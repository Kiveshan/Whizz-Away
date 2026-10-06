"use client";

import { useState, useEffect, useRef } from "react";
import "../css/Analytics.css";
import { useNavigate } from "react-router-dom";
import {
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
import CategoryBarChart, {
  buildPoints,
  collapseRows,
  stacksOf,
  useVatToggle,
} from "../CategoryBarChart";
import {
  ChartLegend,
  DataTable,
  KpiTiles,
  ReportNav,
  SegmentedControl,
  tileContext,
} from "../AnalyticsWidgets";
import { CHARTS, REPORT_GROUPS } from "../chartConfigs";

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

const VAT_OPTIONS = [
  { value: true, label: "Incl. VAT" },
  { value: false, label: "Excl. VAT" },
];
const VIEW_OPTIONS = [
  { value: "chart", label: "Chart" },
  { value: "table", label: "Table" },
];

export default function DirectorAnalytics() {
  const currentDate = new Date();
  const [activeMonth, setActiveMonth] = useState(monthNames[currentDate.getMonth()]);
  const [activeYear, setActiveYear] = useState(currentDate.getFullYear().toString());
  const [activeFilter, setActiveFilter] = useState("fuel");
  const [chartData, setChartData] = useState([]);
  // Which report (and truck) the loaded data belongs to, so a refetch can keep
  // showing the current chart (dimmed) instead of flashing empty — and so the
  // "All trucks" grouping follows the data on screen, not the dropdown, which
  // changes before the new data arrives.
  const [dataScope, setDataScope] = useState({ filter: null, truck: "" });
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [paymentClients, setPaymentClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("chart");
  const roleId = JSON.parse(localStorage.getItem("user"))?.roleid;
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const chart = CHARTS[activeFilter];
  const [includeVat, setIncludeVat] = useVatToggle(activeFilter);

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
    // Loading and errors are tracked here, per request, so a slow response for
    // a report the user has already left can't overwrite the current one.
    const noop = () => {};
    const reportError = (message) => {
      if (isMounted && message) setError(message);
    };
    const loaders = {
      fuel: () => fetchFuelData(activeMonth, activeYear, noop, reportError),
      turnoverPerMonth: () =>
        fetchTurnoverData(activeMonth, activeYear, selectedClient, noop, reportError),
      agingAnalysis: () =>
        fetchAgingAnalysisData(activeMonth, activeYear, selectedClient, noop, reportError),
      turnoverVsDieselCost: () =>
        fetchTurnoverVsDieselCost(activeMonth, activeYear, noop, reportError),
      subcontractorTurnoverPerMonth: () =>
        fetchSubcontractorTurnoverPerMonth(activeMonth, activeYear, noop, reportError),
      subcontractorVsTurnover: () =>
        fetchSubcontractorVsTurnover(activeMonth, activeYear, selectedSubcontractor, noop, reportError),
      turnoverPerTruck: () => fetchTurnoverPerTruck(activeMonth, activeYear, noop, reportError),
      incomeVsExpense: () => fetchIncomeVsExpenses(activeMonth, activeYear, noop, reportError),
      wagesVsExpenses: () => fetchWagesVsExpenses(activeMonth, activeYear, noop, reportError),
      turnoverVsSubbieExpense: () =>
        fetchTurnoverVsSubbieExpense(activeMonth, activeYear, selectedSubcontractor, noop, reportError),
      turnoverVsFuelPerTruck: () =>
        fetchTurnoverVsFuelPerTruck(activeMonth, activeYear, selectedTruck, noop, reportError),
      truckIncomeVsExpense: () =>
        fetchTruckIncomeVsExpense(activeMonth, activeYear, selectedTruck, noop, reportError),
      paymentsReceivedPerMonth: () =>
        fetchPaymentsReceivedPerMonth(activeMonth, activeYear, selectedClient, noop, reportError),
    };

    const loadData = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const data = loaders[activeFilter] ? await loaders[activeFilter]() : [];
        if (isMounted) {
          setChartData(data);
          setDataScope({ filter: activeFilter, truck: selectedTruck });
        }
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

  const handleBack = () => {
    if (roleId === 1) {
      navigate("/analytics-reports");
    } else if (roleId === 4) {
      navigate("/analytics-reports");
    }
  };

  // Rows for the current report: truck charts show one "All trucks" row until a
  // single truck is chosen; rankings are ordered largest first.
  const rows = (() => {
    if (!chart || dataScope.filter !== activeFilter) return [];
    if (chart.totals && !dataScope.truck && chartData.length) {
      return collapseRows(chartData, chart.totals);
    }
    return chartData;
  })();
  const points = (() => {
    if (!chart) return [];
    const built = buildPoints(rows, chart.categories, includeVat);
    if (!chart.horizontal) return built;
    const stacks = stacksOf(chart.categories);
    const total = (p) => stacks.reduce((sum, s) => sum + p[`__total_${s}`], 0);
    return [...built].sort((a, b) => total(b) - total(a));
  })();
  const hasFrame = points.length > 0;
  const tiles = chart?.tiles && hasFrame ? chart.tiles(tileContext(points, chart.categories)) : [];

  const renderBody = () => {
    if (!hasFrame) {
      if (isLoading) {
        return (
          <div className="az-state" role="status">
            <span className="az-spinner" aria-hidden="true" />
            Loading {chart.noun} data…
          </div>
        );
      }
      if (error) {
        return (
          <div className="az-state is-error" role="alert">
            <p className="az-state-title">Couldn't load this report</p>
            <p>{error}</p>
          </div>
        );
      }
      return (
        <div className="az-state">
          <p className="az-state-title">
            No {chart.noun} data for {activeMonth} {activeYear}
          </p>
          <p>Try another month, or change the filters above.</p>
        </div>
      );
    }

    return (
      <div className={`az-content${isLoading ? " is-refreshing" : ""}`} aria-busy={isLoading}>
        {error && (
          <p className="az-inline-error" role="alert">
            {error}
          </p>
        )}
        <KpiTiles tiles={tiles} />
        {view === "chart" ? (
          <>
            {/* Rankings are single-colour bars, so they need no legend */}
            {!chart.horizontal && (
              <ChartLegend
                categories={chart.categories}
                stackLabels={chart.stackLabels}
                legendItems={chart.legendItems}
              />
            )}
            <div className={`az-plot${chart.horizontal ? " is-horizontal" : ""}`}>
              <CategoryBarChart
                points={points}
                categories={chart.categories}
                includeVat={includeVat}
                stackLabels={chart.stackLabels}
                net={chart.net}
                horizontal={chart.horizontal}
                ranking={chart.ranking}
                showShare={chart.showShare}
                statusLabel={chart.statusLabel}
              />
            </div>
          </>
        ) : (
          <DataTable
            points={points}
            categories={chart.categories}
            stackLabels={chart.stackLabels}
            net={chart.net}
            includeVat={includeVat}
            totalsRow={!!chart.horizontal}
            showShare={chart.showShare}
            statusLabel={chart.statusLabel}
          />
        )}
      </div>
    );
  };

  const years = Array.from({ length: currentDate.getFullYear() - 2024 + 1 }, (_, idx) =>
    (2024 + idx).toString()
  );

  return (
    <div className="analytics-page-wrapper" ref={wrapperRef}>
      <div className="analytics-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="az-layout">
          <aside className="az-sidebar">
            <ReportNav
              groups={REPORT_GROUPS}
              charts={CHARTS}
              active={activeFilter}
              onChange={setActiveFilter}
            />
          </aside>

          <section className="az-main">
            <div className="az-toolbar">
              <label className="az-field">
                <span>Month</span>
                <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)}>
                  {monthNames.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>
              <label className="az-field az-field-narrow">
                <span>Year</span>
                <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)}>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              {(chart?.filter === "client" || chart?.filter === "paymentClient") && (
                <label className="az-field az-field-wide">
                  <span>Client</span>
                  <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                    <option value="">All clients</option>
                    {(chart.filter === "paymentClient" ? paymentClients : clients).map((client) => (
                      <option key={client.m5clientkey} value={client.m5clientkey}>
                        {client.client}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {chart?.filter === "subcontractor" && (
                <label className="az-field az-field-wide">
                  <span>Subcontractor</span>
                  <select
                    value={selectedSubcontractor}
                    onChange={(e) => setSelectedSubcontractor(e.target.value)}
                  >
                    <option value="">Select subcontractor</option>
                    {subcontractors.map((subcontractor) => (
                      <option
                        key={subcontractor.subei_reg_num || subcontractor.userid}
                        value={subcontractor.subei_reg_num || subcontractor.userid}
                      >
                        {subcontractor.companyname}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {chart?.filter === "truck" && (
                <label className="az-field az-field-wide">
                  <span>Truck</span>
                  <select value={selectedTruck} onChange={(e) => setSelectedTruck(e.target.value)}>
                    <option value="">All trucks</option>
                    {trucks.map((truck) => (
                      <option key={truck.m5truckskey} value={truck.m5truckskey}>
                        {truck.truckregnumber || `Truck ID ${truck.m5truckskey}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {chart && (
              <article className={`az-card${isLoading && hasFrame ? " is-loading" : ""}`}>
                <span className="az-progress" aria-hidden="true" />
                <header className="az-card-head">
                  <div className="az-card-heading">
                    <h2 className="az-card-title">{chart.title}</h2>
                    <p className="az-card-desc">{chart.description}</p>
                  </div>
                  <div className="az-card-actions">
                    <SegmentedControl
                      label="View"
                      options={VIEW_OPTIONS}
                      value={view}
                      onChange={setView}
                    />
                    <SegmentedControl
                      label="VAT"
                      options={VAT_OPTIONS}
                      value={includeVat}
                      onChange={setIncludeVat}
                    />
                  </div>
                </header>
                <div className="az-card-body" key={activeFilter}>
                  {renderBody()}
                </div>
              </article>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
