"use client"
import { useNavigate } from "react-router-dom"
import Card from "../components/Card"

const dashboardData = [
  { title: "Instructions", image: "/images/pexels-photo-7947758.jpeg", path: "/ViewClientInstruction" },
  { title: "Debtors", image: "/images/Payment.jpg", path: "/DebtorsDashboard" },
  { title: "Creditors", image: "/images/expenses.jpeg", path: "/CreditorsDashboard" },
  // { title: "Invoices", image: "/images/payments.jpeg", path: "/ViewClientInvoice" },
  // { title: "Statements", image: "/images/clientDocs.jpeg", path: "/view-client-statements" },
  { title: "Wages", image: "/images/wages.jpeg", path: "/finance-clerk-wage" },
  // { title: "Expenses", image: "/images/expenses.jpeg", path: "/ViewExpense" },
]

const FDashboard = () => {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 2).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(2, 6).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
    </div>
  )
}

export default FDashboard

