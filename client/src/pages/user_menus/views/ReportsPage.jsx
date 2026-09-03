"use client"
import { useNavigate } from "react-router-dom"
import Card from "../../../components/Card"
import "../css/card.css"
import "../css/dashboard.css"

const insightsData = [
  {
    title: "Wage Reports",
    image: "/images/reports.jpg",
    path: "/wage-reports",
  },
  {
    title: "Income & Expenditure",
    image: "/images/reports.jpg",
    path: "/profit-loss-reports",
  },
  {
    title: "Client Subbie Commission",
    image: "/images/reports.jpg",
    path: "/client-subbie-commission",
  },
  {
    title: "VAT Recon",
    image: "/images/reports.jpg",
    path: "/vat-recon-reports",
  },
]

const maintenanceData = [
  {
    title: "Driver Rate Audit",
    image: "/images/reports.jpg",
    path: "/driver-rate-audit",
  },
  {
    title: "Audit Log",
    image: "/images/reports.jpg",
    path: "/audit-log",
  },
]

const ReportsPage = () => {
  const navigate = useNavigate()

  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleBack = () => {
    // Navigate back to AnalyticsReportsPage
    navigate("/analytics-reports")
  }

  return (
    <div className="dashboard">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <h2 className="dashboard-section-title">Business Insights</h2>
      <div className="dashboard-row">
        {insightsData.map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>

      <h2 className="dashboard-section-title">Maintenance & Audits</h2>
      <div className="dashboard-row">
        {maintenanceData.map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
    </div>
  )
}

export default ReportsPage
