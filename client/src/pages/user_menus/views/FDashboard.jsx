"use client";

import { useNavigate } from "react-router-dom";
import FeatureGatedCard from "../../../components/FeatureGatedCard";

const dashboardData = [
  {
    title: "Instructions",
    image: "/images/pexels-photo-7947758.jpeg",
    path: "/ViewClientInstruction",
    featureKey: "instructions",
  },
  {
    title: "Debtors",
    image: "/images/Payment.jpg",
    path: "/DebtorsDashboard",
    featureKey: "invoice",
  },
];

const FDashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage") {
      localStorage.setItem("dashboardRoute", "/FDashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 2).map((item) => (
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
        {dashboardData.slice(2, 6).map((item) => (
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

export default FDashboard;
