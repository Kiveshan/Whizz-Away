import { useNavigate } from "react-router-dom"
import Card from "../../components/Card"
import "../../pages/user_menus/css/card.css"
import "../../pages/user_menus/css/dashboard.css"

const MAIN_MODULES = [
  { title: "Instructions", image: "/images/Instructions.png", path: "/dashboard/lite/instructions" },
  { title: "Debtors",      image: "/images/Payment.jpg",      path: "/dashboard/lite/debtors" },
  { title: "Manage",       image: "/images/manage.jpg",       path: "/manage" },
]

export default function LiteDashboard() {
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    localStorage.setItem("dashboardRoute", "/dashboard/lite")
    navigate(path)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {MAIN_MODULES.map((m) => (
          <Card key={m.title} title={m.title} image={m.image} onClick={() => handleNavigate(m.path)} />
        ))}
      </div>
    </div>
  )
}
