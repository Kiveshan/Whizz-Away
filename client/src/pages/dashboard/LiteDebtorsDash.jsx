import { useNavigate } from "react-router-dom"
import Card from "../../components/Card"
import "../../pages/user_menus/css/card.css"
import "../../pages/user_menus/css/dashboard.css"

const dashboardData = [
  { title: "Invoices",   image: "/images/Client Invoice.png",   path: "/invoices" },
  { title: "Statements", image: "/images/Client Statement.png", path: "/statements-list" },
]

export default function LiteDebtorsDash() {
  const navigate = useNavigate()

  const handleNavigation = (path) => {
    localStorage.setItem("dashboardRoute", "/dashboard/lite")
    navigate(path)
  }

  return (
    <div className="dashboard">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/dashboard/lite")}>
          Back
        </button>
      </div>
      <div className="dashboard-row top-row">
        {dashboardData.map((item) => (
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
