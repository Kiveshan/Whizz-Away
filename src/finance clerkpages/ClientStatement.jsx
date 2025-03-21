"use client"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import "../finance clerkpages/css/ClientStatement.css"

const ClientStatement = () => {
  const navigate = useNavigate()
  const [isAgeAnalysisOpen, setIsAgeAnalysisOpen] = useState(true)

  return (
    <div className="statement-page">
      <div className="statement-paper">
        {/* Header */}
        <div className="statement-header">
          <h1>Transport and Logistics</h1>
        </div>

        {/* Statement Info and Client Info Section */}
        <div className="statement-info-section">
          {/* Client Info - Left Side */}
          <div className="client-info">
            <div className="to-label">To</div>
            <div className="client-name">Matthew Moore</div>
            <div className="client-email">sharris@yahoo.com</div>
            <div className="client-phone">(719) 814-3786</div>
            <div className="client-address">1020 West Street, Raleigh, NC 27601</div>
          </div>

          {/* Statement Title and Account Summary - Right Side */}
          <div className="statement-title">
            <h2>Statement of Accounts</h2>
            <div className="statement-date">01/02/2025-01/03/2025</div>

            <h3>Account Summary</h3>

            <table className="summary-table">
              <tbody>
                <tr>
                  <td className="summary-label">Opening Balance</td>
                  <td className="summary-value">R0</td>
                </tr>
                <tr>
                  <td className="summary-label">Invoiced Amount</td>
                  <td className="summary-value">R100 000</td>
                </tr>
                <tr>
                  <td className="summary-label">Amount Paid</td>
                  <td className="summary-value">R5 000</td>
                </tr>
                <tr>
                  <td className="summary-label">Balance Due:</td>
                  <td className="summary-value">R95 000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Horizontal Line */}
        <div className="statement-divider"></div>

        {/* Transactions Table */}
        <div className="transactions-section">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transactions</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Payments</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>15/04/2021</td>
                <td>Opening Balance</td>
                <td></td>
                <td>R0</td>
                <td></td>
                <td>R0</td>
              </tr>
              <tr>
                <td>24/10/2022</td>
                <td>Invoice</td>
                <td>Invoice due on 10/11/2025</td>
                <td>R50 000</td>
                <td></td>
                <td>R50 000</td>
              </tr>
              <tr>
                <td>15/12/2022</td>
                <td>Invoice</td>
                <td>Invoice due on 05/01/2025</td>
                <td>R50 000</td>
                <td></td>
                <td>R100 000</td>
              </tr>
              <tr>
                <td>14/01/2021</td>
                <td>Payment Received</td>
                <td>R5 000 payment for Invoice 02</td>
                <td></td>
                <td>R5 000</td>
                <td>R95 000</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Balance Due Summary */}
        <div className="balance-due-summary">
          <div className="balance-due-label">Balance Due</div>
          <div className="balance-due-amount">R95 000</div>
        </div>

        {/* Age Analysis */}
        <div className="age-analysis-section">
          <div className="age-analysis-header" onClick={() => setIsAgeAnalysisOpen(!isAgeAnalysisOpen)}>
            <span>Age Analysis</span>
            <span className={`dropdown-arrow ${isAgeAnalysisOpen ? "open" : ""}`}>▼</span>
          </div>

          {isAgeAnalysisOpen && (
            <div className="age-analysis-content">
              <table className="age-analysis-table">
                <thead>
                  <tr>
                    <th>Current</th>
                    <th>30 days</th>
                    <th>60 days</th>
                    <th>90 days</th>
                    <th>90+ days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>R95 000</td>
                    <td>R200 000</td>
                    <td>R200 000</td>
                    <td>R200 000</td>
                    <td>R23 750</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Back Button positioned at bottom left */}
      <div className="back-button-container">
        <button className="professional-back-button" onClick={() => navigate("/statements-list")}>
          Back
        </button>
      </div>
    </div>
  )
}

export default ClientStatement

