import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";

const dashboardData = [
  {
    title: "Invoices",
    image: "/images/payments.jpeg",
    path: "/ViewClientInvoice",
  },
  {
    title: "Add On's",
    image: "/images/Add-On's.jpg",
    path: "/view-client-list",
  },
  {
    title: "Statements",
    image: "/images/Statements.jpg",
    path: "/view-client-statements",
  },
];

const DebtorsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/FDashboard")}>
          Back
        </button>
      </div>
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row top-row">
        {dashboardData.slice(3, 6).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(6, 9).map((item) => (
          <Card
            key={item.title}
            title={item.title}
            image={item.image}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default DebtorsDashboard;
