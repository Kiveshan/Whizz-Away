import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";

const dashboardData = [
  { title: "Fuel", image: "/images/Diesel.jpeg", path: "/ManagerViewFuelExpence" },
  { title: "Sub-Constructor", image: "/images/subconstructor.jpg", path: "" },
  { title: "Other", image: "/images/OtherExpence.jpg", path: "" },
];

const ManagerCreditorsDash = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
         {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/Dashboard")}>
          Back
        </button>
      </div>
      <div className="dashboard-row top-row">
        {dashboardData.slice(0, 3).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
      <div className="dashboard-row bottom-row">
        {dashboardData.slice(3, 6).map((item) => (
          <Card key={item.title} title={item.title} image={item.image} onClick={() => navigate(item.path)} />
        ))}
      </div>
    </div>
  );
};

export default ManagerCreditorsDash;
