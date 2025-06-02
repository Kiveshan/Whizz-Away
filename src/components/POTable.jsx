"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../pages/Creditors/purchaseOrder/css/filterButtonBlue.css"
import axios from "axios"

const POTable = ({ showFilterButtons = true }) => {
  const [selectedYear, setSelectedYear] = useState("2025")
  const [selectedMonth, setSelectedMonth] = useState("May")
  const [activeFilter, setActiveFilter] = useState("All")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expenseTypes, setExpenseTypes] = useState([])
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true)
        const endpoint = showFilterButtons
  ? "http://localhost:5000/api/purchase-orders"
  : "http://localhost:5000/api/supplier-summary";

const response = await axios.get(endpoint, {
  params: !showFilterButtons
    ? {
        year: selectedYear,
        month: selectedMonth,
      }
    : {},
})
        console.log("Response received:", response.data)
          const formattedData = showFilterButtons
            ? response.data.map((po) => ({
                type: po.expense_type,
                suppliedBy: po.supplier_name,
                date: formatDate(po.date),
                amount: formatAmount(po.total),
                details: po.po_id.toString(),
                id: po.po_id,
              
              }))
            : response.data.map((row) => ({
                supplier: row.supplier,
                supplierId: row.supplier_id, 
                monthYear: `${row.month_name.trim()} ${row.year}`,
                total: formatAmount(row.total_amount),
                rawMonth: row.month_name.trim(),
                rawYear: row.year.toString(),
                 poNumber: row.ponum
            }))


        setExpenses(formattedData)
        const uniqueTypes = [...new Set(response.data.map((po) => po.expense_type))]
        setExpenseTypes(uniqueTypes)

        setError(null)
      } catch (err) {
        console.error("Error fetching purchase orders:", err)
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        })
        setError(`Failed to load purchase orders. Status: ${err.response?.status || "Unknown"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [])
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`
  }
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return "N/A"
    return `R ${Number.parseFloat(amount).toFixed(2)}`
  }

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    setIsDropdownOpen(false)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

 
  const getFilteredExpenses = () => {
    let filtered = expenses

if (selectedYear !== "All") {
  filtered = filtered.filter((expense) => {
    return showFilterButtons
      ? new Date(expense.date).getFullYear().toString() === selectedYear
      : expense.rawYear === selectedYear
  })
}

if (selectedMonth !== "All") {
  const monthIndex = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ].indexOf(selectedMonth)

  filtered = filtered.filter((expense) => {
    return showFilterButtons
      ? new Date(expense.date).getMonth() === monthIndex
      : expense.rawMonth === selectedMonth
  })
}
    if (activeFilter === "All") {
      return filtered
    }
    return filtered.filter((expense) => expense.type === activeFilter)
  }

const handleViewClick = async (expense) => {
  if (!showFilterButtons) {
    navigate("/Creditors/ViewStatement", {
      state: { supplierId: expense.supplierId }
    });
    return;
  }

  try {
    const response = await axios.get(`http://localhost:5000/api/po-form/list`, {
      params: { poId: expense.id },
    });

    if (response.data && response.data.length > 0) {
      const poData = response.data[0];
      navigate("/Creditors/PurchaseOrder/View", {
        state: { poData, supplierId: poData.supplier_id },
      });
    } else {
      console.error("No purchase order data found for ID:", expense.id);
      setError("No purchase order data found.");
    }
  } catch (err) {
    console.error("Error fetching purchase order details:", err);
    setError("Failed to load purchase order details.");
  }
};

  const navigate = useNavigate()

  const handleBackClick = () => {
    const userData = localStorage.getItem("user")
    let userRoleId = null
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData)
        userRoleId = parsedUserData.roleid
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error)
      }
    }
    if (!userRoleId) {
      userRoleId = localStorage.getItem("roleId") || localStorage.getItem("userRoleId")
      console.log("Direct role ID from localStorage:", userRoleId)
    }
    userRoleId = Number.parseInt(userRoleId, 10)
    console.log("Final user role ID for navigation:", userRoleId)

    // Navigate based on role ID
    if (userRoleId === 1 || userRoleId === 4) {
      navigate("/DirectorCreditorsOther")
    } else {
      navigate("/Creditors/CreditorsOther")
    }
  }
  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-dropdown-container")) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 4; i <= currentYear + 1; i++) {
      years.push(i.toString())
    }
    return years
  }
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div>
      <button className="back-button" onClick={handleBackClick}>
        Back
      </button>
      <div className="dropdown-container74">
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="dropdown">
          <option value="All">All Years</option>
          {getYearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="dropdown">
          <option value="All">All Months</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
        </select>
      </div>

      {showFilterButtons && (
        <div className="button-group">
          <div className="filter-buttons filter-btn-group">
            <button className={activeFilter === "All" ? "active" : ""} onClick={() => handleFilterClick("All")}>
              All
            </button>

            <div className="filter-dropdown-container">
              <button className="dropdown-toggle-btn" onClick={toggleDropdown}>
                {activeFilter !== "All" ? activeFilter : "Filters"} {isDropdownOpen ? "▾" : "▸"}
              </button>

              {isDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {expenseTypes.map((type) => (
                    <button
                      key={type}
                      className={activeFilter === type ? "dropdown-item active" : "dropdown-item"}
                      onClick={() => handleFilterClick(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="content1" style={{ marginTop: "20px" }}>
        <div className="tables-container">
          {loading ? (
            <div className="loading">Loading purchase orders...</div>
          ) : error ? (
            <div className="error">
              {error}
              <br />
              <button onClick={handleRetry} style={{ marginTop: "10px" }}>
                Retry
              </button>
            </div>
          ) : (
<table className="t1" style={{ margin: "0 auto" }}>
  <thead>
    <tr>
      {showFilterButtons ? (
        <>
          <th>Type</th>
          <th>Supplied By</th>
          <th>Date</th>
          <th>Details</th>
        </>
      ) : (
        <>
          <th>Supplier</th>
          <th>Month-Year</th>
          <th>Total</th>
           <th>Details</th>
        </>
      )}
    </tr>
  </thead>
<tbody>
  {getFilteredExpenses().length === 0 ? (
    <tr>
      <td colSpan={showFilterButtons ? "5" : "3"}>No expenses found</td>
    </tr>
  ) : (
    getFilteredExpenses().map((expense, index) => (
      <tr key={index}>
        {showFilterButtons ? (
          <>
            <td>{expense.type}</td>
            <td>{expense.suppliedBy}</td>
            <td>{expense.date}</td>
            <td>
              <button className="view-btn" onClick={() => handleViewClick(expense)}>
                View
              </button>
            </td>
          </>
        ) : (
          <>
            <td>{expense.supplier}</td>
            <td>{expense.monthYear}</td>
            <td>{expense.total}</td>
              <td>
    <button className="view-btn" onClick={() => handleViewClick(expense)}>
      View
    </button>
  </td>
          </>
        )}
      </tr>
    ))
  )}
</tbody>

</table>
          )}
        </div>
      </div>
    </div>
  )
}

export default POTable
