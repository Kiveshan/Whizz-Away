"use client"

import { useNavigate } from "react-router-dom"
import { useState,useEffect } from "react"
import axios from "axios"

const CreatePO = () => {
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [expenseTypes, setExpenseTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

useEffect(() => {
  const fetchExpenseTypes = async () => {
    try {
      setLoading(true)
      const response = await axios.get("http://localhost:5000/api/po/expense-types")
      setExpenseTypes(response.data)
      setError(null)
    } catch (err) {
      setError("Failed to load expense types. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  fetchExpenseTypes()
}, [])
  const handleBack = () => {
    navigate("/Creditors/CreditorsOther")
  }

  const handleCreatePO = () => {
    const category = expenseTypes.find((c) => c.id === Number.parseInt(selectedCategoryId))
    if (category) {
      navigate("/Creditors/POForm", {
        state: {
          categoryId: category.id,
          categoryName: category.expense,
        },
      })
    }
  }

  return (
    <div className="create-po-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
      </div>

      <div className="expenses-container">
        <table className="expenses-table1" style={{marginTop:"40px"}}>
          <thead>
            <tr>
              <th className="align-h1" colSpan={2}>Select Purchase Order Category</th>
            </tr>
          </thead>
          <tbody>

            <tr>
              <td>
                <select
                  className="dropdown" style={{outline:"2px solid #ccc"}}
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {expenseTypes.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.expense}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ width: "30%" }}>
                <button
                  className="view-btn"
                  onClick={handleCreatePO}
                  disabled={!selectedCategoryId}
                >
                  Create
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CreatePO
