"use client";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/Expenses1.css";

const ExpenseDetails = ({ selectedTruck, onBack, onAddExpense }) => {
  const navigate = useNavigate();
  const expenses = [
    {
      id: "Diesel",
      amount: "R 887",
      description: "",
      documentBy: "Driver 1",
      date: "08/28/2024",
      regNo: "123431",
    },
    {
      id: "Diesel",
      amount: "R 890",
      description: "",
      documentBy: "Driver 4",
      date: "05/03/2020",
      regNo: "456789",
    },
  ];

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
      <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
        {selectedTruck && <h2>Expenses for {selectedTruck}</h2>}
      </div>

      <div className="expenses-table">
        <div className="table-header">
          <div className="header-cell">Type of Expense</div>
          <div className="header-cell">Description</div>
          <div className="header-cell">Expense Cost</div>
          <div className="header-cell">Document by</div>
          <div className="header-cell">Date</div>
          <div className="header-cell">Registration No.</div>
          <div className="header-cell">Display</div>
          <div className="header-cell">Petrol Slip</div>
        </div>

        {expenses.map((expense, index) => (
          <div key={index} className="table-row">
            <div className="table-cell">{expense.id}</div>
            <div className="table-cell">{expense.description}</div>
            <div className="table-cell">{expense.amount}</div>
            <div className="table-cell">{expense.documentBy}</div>
            <div className="table-cell">{expense.date}</div>
            <div className="table-cell">{expense.regNo}</div>
            <div className="table-cell">
              <button className="view-button">View</button>
            </div>
            <div className="table-cell">
              <button className="download-button">Download</button>
            </div>
          </div>
        ))}
      </div>

      <button className="add-btn"    onClick={() => navigate("/ExpenseSubmission")}
                  >
        Add Fuel Expense
      </button>
    </div>
  );
};

export default ExpenseDetails;
