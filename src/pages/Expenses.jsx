"use client"
import { useNavigate } from "react-router-dom"
import "../css/Expenses1.css"

const Expenses = () => {
  const navigate = useNavigate()

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
  ]

  const handleBack = () => {
    navigate("/ManagerViewFuelExpence")
  }

  const handleView = (expense) => {
    console.log("Viewing expense:", expense)
  }

  const handleDownload = (expense) => {
    console.log("Downloading expense:", expense)
  }

  return (
    <div className="expenses-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>
      <div className="filter-section37">
      <div className="filter-group">
        <select className="dropdown">
          <option value="">Year</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>

        <select className="dropdown">
          <option value="">Month</option>
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
      </div>

      <table className="expenses-table">
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
          <button className="view-button" onClick={() => handleView(expense)}>
            View
          </button>
        </td>
        <td>
          <button className="download-button" onClick={() => handleDownload(expense)}>
            Download
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

    </div>
  )
}

export default Expenses

