"use client";

import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const creditorsDashboardData = [
  { title: "Fuel", image: "/images/expenses.jpeg", path: "/FuelPage" },
  {
    title: "Subcontractors",
    image: "/images/subconstructor.jpg",
    path: "/Creditors/subcontractor",
  },
  { title: "Wages", image: "/images/wages.jpeg", path: "/finance-clerk-wage" },
  {
    title: "Other Expenses",
    image: "/images/OtherExpence.jpg",
    path: "/Creditors/CreditorsOther",
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
        {creditorsDashboardData.slice(0, 2).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {creditorsDashboardData.slice(2, 4).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => handleNavigation(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default CreditorsDashboard;
