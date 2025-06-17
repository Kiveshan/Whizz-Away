import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/Debtors.css";
import "../css/card.css";

const DirectorDebtors = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/DirectorDashboard");
  };
  const handlePaymentClick = () => {
    navigate("/director-client-list-payments");
  };
  const handleStatementClick = () => {
    navigate("/DirectorFinancialDocumentsView");
  };

  return (
    <div className="debtors-container">
      <div className="header-actions">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
      </div>

      <div className="debtors-grid">
        <div className="card" onClick={handlePaymentClick}>
          <div className="card-image-container">
            <img src="/images/Payment.jpg" alt="Payment" />
          </div>
          <div className="card-title">
            <h3>Payment Received</h3>
          </div>
        </div>
        <div className="card" onClick={handleStatementClick}>
          <div className="card-image-container">
            <img src="/images/Statements.jpg" alt="Statement" />
          </div>
          <div className="card-title">
            <h3>Financial Documents</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorDebtors;
