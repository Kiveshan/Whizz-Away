"use client"
import { useNavigate } from "react-router-dom"
import Card from "../../../components/Card"
import "../css/card.css"
import "../css/dashboard.css"

const categoryData = [
  {
    title: "Business Reports",
    image: "/images/reports.jpg",
    path: "/reports/business",
  },
  {
    title: "Maintenance & Audits",
    image: "/images/reports.jpg",
    path: "/reports/maintenance",
  },
]

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
  {
    title: "Incomplete Instructions",
    image: "/images/reports.jpg",
    path: "/incomplete-instructions",
  },
]

const sections = {
  business: { title: "Business Insights", items: insightsData },
  maintenance: { title: "Maintenance & Audits", items: maintenanceData },
}

// With no category, shows the two category cards; with a category, shows that
// category's reports.
const ReportsPage = ({ category }) => {
  const navigate = useNavigate()
  const section = sections[category]

  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleBack = () => {
    navigate(section ? "/reports" : "/analytics-reports")
  }

  const items = section ? section.items : categoryData

  return (
    <div className="dashboard">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      {section && <h2 className="dashboard-section-title">{section.title}</h2>}
      <div className="dashboard-row">
        {items.map((item) => (
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
