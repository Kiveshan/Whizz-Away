"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/Expenses1.css";

const ViewExpense = ({ onViewTruck }) => {
  const navigate = useNavigate();
  const trucks = [
    { regNo: "ND 30", monthlyExpense: "R 8870" },
    { regNo: "ND 35", monthlyExpense: "R 778" },
    { regNo: "ND 65", monthlyExpense: "R 890" },
    { regNo: "ND 57", monthlyExpense: "R 568" },
  ];

  return (
    <div className="expenses-container">
    <div className="client-payments-header">
      <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <select className="filter-select">
            <option value="">Current Month</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
        <div className="filter-group">
          <select className="filter-select">
            <option value="">Current Year</option>
            <option value="1">2025</option>
            <option value="2">2024</option>
            <option value="3">2023</option>
            <option value="4">2022</option>
            <option value="5">2021</option>
            <option value="6">2020</option>
            <option value="7">2019</option>
          </select>
        </div>
      </div>

      <div className="expenses-table">
        <div className="table-header">
          <div className="header-cell">Truck Reg</div>
          <div className="header-cell">Monthly Expense</div>
          <div className="header-cell">Expenses</div>
        </div>

        {trucks.map((truck, index) => (
          <div key={index} className="table-row">
            <div className="table-cell">{truck.regNo}</div>
            <div className="table-cell">{truck.monthlyExpense}</div>
            <div className="table-cell">
              <button className="view-button"    onClick={() => navigate("/ExpenseDetails")}
                  >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewExpense;
