"use client";

import { useNavigate } from "react-router-dom";
import FeatureGatedCard from "../../../components/FeatureGatedCard";

const creditorsDashboardData = [
  {
    title: "Fuel",
    image: "/images/expenses.jpeg",
    path: "/FuelPage",
    featureKey: "manage",
  },
  {
    title: "Subcontractors",
    image: "/images/subconstructor.jpg",
    path: "/Creditors/SubcontractorList",
    featureKey: "manage",
  },
  {
    title: "Wages",
    image: "/images/wages.jpeg",
    path: "/finance-clerk-wage",
    featureKey: "payroll",
  },
  {
    title: "Other Expenses",
    image: "/images/OtherExpence.jpg",
    path: "/Creditors/CreditorsOther",
    featureKey: "manage",
  },
  {
    title: "Credit Note",
    image: "/images/crednote.jpg",
    path: "/CredClientList",
    featureKey: "invoice",
  },
];

const CreditorsDashboard = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === "/finance-clerk-wage") {
      localStorage.setItem("dashboardRoute", "/CreditorsDashboard");
    }
    navigate(path);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-row top-row">
        {creditorsDashboardData.slice(0, 3).map((item) => (
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
        {creditorsDashboardData.slice(3, 5).map((item) => (
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

export default CreditorsDashboard;
