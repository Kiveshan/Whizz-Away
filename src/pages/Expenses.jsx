"use client"
import { useNavigate } from "react-router-dom"
import "../css/Expenses.css"

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
    navigate("/")
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
      <div className="filter-section">
      <div className="filter-group">
        <select className="filter-select">
          <option value="">Year</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>

        <select className="filter-dropdown">
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
              <button className="view-button" onClick={() => handleView(expense)}>
                View
              </button>
            </div>
            <div className="table-cell">
              <button className="download-button" onClick={() => handleDownload(expense)}>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Expenses

