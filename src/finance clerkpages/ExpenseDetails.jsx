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
      <div className="action-bar">
        <div className="filter-section7">
          <div className="dropdown-container">
            <select className="dropdown">
              <option>Year</option>
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
              <option>2022</option>
            </select>
            <select className="dropdown">
              <option>Month</option>
              <option>January</option>
              <option>February</option>
              <option>March</option>
              <option>April</option>
              <option>May</option>
              <option>June</option>
              <option>July</option>
              <option>August</option>
              <option>September</option>
              <option>October</option>
              <option>November</option>
              <option>December</option>
            </select>
          </div>
        </div>
      </div>
      <table className="expenses-table2">
      <thead>
        <tr>
          <th>Type of Expense</th>
          <th>Description</th>
          <th>Expense Cost</th>
          <th>Document by</th>
          <th>Date</th>
          <th>Display</th>
          <th>Petrol Slip</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense, index) => (
          <tr key={index}>
            <td>{expense.id}</td>
            <td>{expense.description}</td>
            <td>{expense.amount}</td>
            <td>{expense.documentBy}</td>
            <td>{expense.date}</td>
            <td>
              <button className="view-button">View</button>
            </td>
            <td>
              <button className="download-button">Download</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      <button className="add-btn"    onClick={() => navigate("/ExpenseSubmission")}
                  >
        Add Fuel Expense
      </button>
    </div>
  );
};

export default ExpenseDetails;
