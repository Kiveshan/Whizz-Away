import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import "../css/Debtors.css";
import "../css/card.css";
const Debtors = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/Dashboard");
  };
  const handlePaymentClick = () => {
    navigate("/client-list-payments");
  };
  const handleStatementClick = () => {
    navigate("/FinancialDocumentsView");
  };

  const handleAddOnClick = () => {
    navigate("/view-client-list");
  };

  const handleAgeAnalysisClick = () => {
    navigate("/debtors-age-analysis");
  };

  return (
    <div className="debtors-container">
      <div className="header-actions">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
      </div>

      <div className="debtors-grid">
        <Card title="Payment Received" onClick={handlePaymentClick} />
        <Card title="Financial Documents" onClick={handleStatementClick} />
        <Card title="Add On's" onClick={handleAddOnClick} />
        <Card title="Age Analysis" onClick={handleAgeAnalysisClick} />
      </div>
    </div>
  );
};

export default Debtors;
