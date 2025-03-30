"use client";
import { useNavigate } from "react-router-dom";
import "../finance clerkpages/css/Expenses1.css";

const ViewExpense = () => {
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
        <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      </div>

      <table className="expenses-table" style={{ width: "30%",marginLeft:"540px" }}>
        <thead>
          <tr>
            <th>Truck Registration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((truck, index) => (
            <tr key={index}>
              <td>{truck.regNo}</td>
              <td>
                <button className="view-button" onClick={() => navigate("/ExpenseDetails")}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ViewExpense;