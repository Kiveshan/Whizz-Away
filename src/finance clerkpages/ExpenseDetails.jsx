"use client"
import { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import "../finance clerkpages/css/Expenses1.css"

const ExpenseDetails = () => {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()

  const truckId = params.truckId

  // Get truck registration from location state or use default
  const truckRegNum = location.state?.truckRegNum || "Unknown Truck"

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [year, setYear] = useState("all")
  const [month, setMonth] = useState("all")

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!truckId) {
        setError("No truck ID provided")
        setLoading(false)
        return
      }

      try {
        console.log(`Fetching expenses for truck ID: ${truckId}`)
        const response = await fetch(`http://localhost:5000/expenses/truck/${truckId}`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Expense data:", data)

        // Filter by year and month if selected
        let filteredData = data

        if (year !== "all") {
          filteredData = filteredData.filter((expense) => {
            const expenseDate = new Date(expense.slipuploaddate)
            return expenseDate.getFullYear() === Number.parseInt(year)
          })
        }

        if (month !== "all") {
          filteredData = filteredData.filter((expense) => {
            const expenseDate = new Date(expense.slipuploaddate)
            return expenseDate.getMonth() + 1 === Number.parseInt(month)
          })
        }

        setExpenses(filteredData)
      } catch (err) {
        console.error("Error fetching expense data:", err)
        setError("Failed to load expense data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [truckId, year, month])

  const handleYearChange = (e) => {
    setYear(e.target.value)
  }

  const handleMonthChange = (e) => {
    setMonth(e.target.value)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    } catch (err) {
      console.error("Error formatting date:", err)
      return "Invalid date"
    }
  }

  // Update this function to pass truck information to ExpenseSubmission
  const handleAddExpense = () => {
    navigate("/ExpenseSubmission", {
      state: {
        truckId: truckId,
        truckRegNum: truckRegNum,
      },
    })
  }

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
        <h2>Expenses for {truckRegNum}</h2>
      </div>

      <div className="action-bar">
        <div className="filter-section7">
          <div className="dropdown-container">
            <select className="dropdown" value={year} onChange={handleYearChange}>
              <option value="all">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <select className="dropdown" value={month} onChange={handleMonthChange}>
              <option value="all">All Months</option>
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
      </div>

      {loading ? (
        <p>Loading expenses...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
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
            {expenses.length > 0 ? (
              expenses.map((expense, index) => (
                <tr key={expense.ekey || index}>
                  <td>{expense.type}</td>
                  <td>{expense.description || "-"}</td>
                  <td>
                    R {typeof expense.expensecost === "number" ? expense.expensecost.toFixed(2) : expense.expensecost}
                  </td>
                  <td>{expense.documentfrom}</td>
                  <td>{formatDate(expense.slipuploaddate)}</td>
                  <td>
                    <button className="view-button" onClick={() => window.open(`http://localhost:5000/uploads/${expense.slipname}`, "_blank")}>View</button>
                  </td>
                  <td>
                    {expense.slipname ? (
                      <button
                        className="download-button"
                        onClick={() => window.open(`http://localhost:5000/uploads/${expense.slipname}`, "_blank")}
                      >
                        Download
                      </button>
                    ) : (
                      <span>No slip</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                  No expenses found for this truck
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <button className="add-btn" onClick={handleAddExpense}>
        Add Fuel Expense
      </button>
    </div>
  )
}

export default ExpenseDetails

