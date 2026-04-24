import React from "react";
import { useNavigate } from "react-router-dom";
import FeatureGatedCard from "../../../components/FeatureGatedCard";
import "../css/card.css";
import "../css/dashboard.css";

const dashboardData = [
  {
    title: "Instructions",
    image: "/images/monitor.jpeg",
    path: "/CompanyInstructionView",
    featureKey: "instructions",
  },
  {
    title: "Insights",
    image: "/images/analytics.jpg",
    path: "/analytics-reports",
    featureKey: "analytics",
  },
  {
    title: "Debtors",
    image: "/images/clientDocs.jpeg",
    path: "/debtors",
    featureKey: "invoice",
  },
  {
    title: "Wages",
    image: "/images/wages.jpeg",
    path: "/finance-clerk-wage",
    featureKey: "payroll",
  },
  {
    title: "Creditors",
    image: "/images/expenses.jpeg",
    path: "/DirectorCreditorsDash",
    featureKey: "creditors",
  },
  {
    title: "Manage",
    image: "/images/manage.jpg",
    path: "/manage",
    featureKey: "manage",
  },
  {
    title: "Analytics",
    image: "/images/analytics.jpg",
    path: "/DirectorAnalytics",
    featureKey: "analytics",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage" || path === "/analytics-reports") {
      localStorage.setItem("dashboardRoute", "/Dashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <FeatureGatedCard
            key={item.title}
            title={item.title}
            image={item.image}
            path={item.path}
            featureKey={item.featureKey}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3, 6).map((item) => (
          <FeatureGatedCard
            key={item.title}
            title={item.title}
            image={item.image}
            path={item.path}
            featureKey={item.featureKey}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;