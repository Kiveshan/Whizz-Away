import React from "react";
import { useNavigate } from "react-router-dom";
import FeatureGatedCard from "../../../components/FeatureGatedCard";

const dashboardData = [
  {
    title: "Invoices",
    image: "/images/payments.jpeg",
    path: "/ViewClientInvoice",
    featureKey: "invoice",
  },
  {
    title: "Add On's",
    image: "/images/Add-On's.jpg",
    path: "/view-client-list",
    featureKey: "addons",
  },
  {
    title: "Statements",
    image: "/images/Statements.jpg",
    path: "/view-client-statements",
    featureKey: "statements",
  },
  {
    title: "Age Analysis",
    image: "/images/Statements.jpg",
    path: "/debtors-age-analysis",
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
          <FeatureGatedCard
            key={item.title}
            title={item.title}
            image={item.image}
            path={item.path}
            featureKey={item.featureKey}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3).map((item) => (
          <FeatureGatedCard
            key={item.title}
            title={item.title}
            image={item.image}
            path={item.path}
            featureKey={item.featureKey}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default DebtorsDashboard;
