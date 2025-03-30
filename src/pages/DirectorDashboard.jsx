import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import "../css/card.css";
import "../css/dashboard.css";
const dashboardData = [
  { title: "Instructions", image: "/images/monitor.jpeg", path: "/DirectorMonitorInstructionView" },
  { title: "Analytics", image: "/images/analytics.jpg", path: "/DirectorAnalytics" },
  { title: "Debtors", image: "/images/clientDocs.jpeg", path: "/DirectorDabtors" },
  { title: "Wages", image: "/images/wages.jpeg", path: "/DirectorDriverWageList" },
  { title: "Creditors", image: "/images/expenses.jpeg", path: "/DirectorCreditorsDash" },
                  
  { title: "Analytics", image: "/images/analytics.jpg", path: "/analytics" },
];

const DirectorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3, 5).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
    </div>
  );
};

export default DirectorDashboard;
