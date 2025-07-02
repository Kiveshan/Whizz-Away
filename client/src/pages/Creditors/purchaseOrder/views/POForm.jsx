"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plus, Trash2 } from "lucide-react"
import api from "../../../../api.js"
import "../css/PO.css"
import CompanyHeader from "../../../../components/CompanyHeader"

const POForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { categoryId, categoryName } = location.state || {}

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form data for header information
  const [headerData, setHeaderData] = useState({
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    attentionTo: "",
    receivedBy: "",
    regNo: "",
    subbie: "",
  })

  // Array of line items
  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      expenseType: categoryName || "",
      expenseTypeId: categoryId || "",
      description: "",
      quantity: "",
      unitPrice: "",
      amount: 0,
    },
  ])

  const [totals, setTotals] = useState({
    subtotal: 0,
    vat: 0,
    total: 0,
  })

  useEffect(() => {
    if (categoryId) {
      const fetchSuppliers = async () => {
        try {
          setLoading(true)
          const response = await api.get(`/api/po-form/suppliers/${categoryId}`)
          setSuppliers(response.data)
          setError(null)
        } catch (err) {
          setError("Failed to load suppliers. Please try again.")
          console.error("Error fetching suppliers:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchSuppliers()
    }
  }, [categoryId])

  // Calculate totals whenever line items change
  useEffect(() => {
    const calculateTotals = () => {
      const subtotal = lineItems.reduce((sum, item) => {
        const qty = Number.parseFloat(item.quantity) || 0
        const price = Number.parseFloat(item.unitPrice) || 0
        return sum + qty * price
      }, 0)

      const vat = subtotal * 0.15
      const total = subtotal + vat

      setTotals({
        subtotal: Number.parseFloat(subtotal.toFixed(2)),
        vat: Number.parseFloat(vat.toFixed(2)),
        total: Number.parseFloat(total.toFixed(2)),
      })
    }

    calculateTotals()
  }, [lineItems])

  const handleHeaderChange = (e) => {
    const { name, value } = e.target
    setHeaderData({
      ...headerData,
      [name]: value,
    })
  }

  const handleLineItemChange = (id, field, value) => {
    if ((field === "quantity" || field === "unitPrice") && value < 0) {
      return
    }

    setLineItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Calculate amount for this line item
          if (field === "quantity" || field === "unitPrice") {
            const qty = Number.parseFloat(field === "quantity" ? value : updatedItem.quantity) || 0
            const price = Number.parseFloat(field === "unitPrice" ? value : updatedItem.unitPrice) || 0
            updatedItem.amount = Number.parseFloat((qty * price).toFixed(2))
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const addLineItem = () => {
    const newId = Math.max(...lineItems.map((item) => item.id)) + 1
    setLineItems([
      ...lineItems,
      {
        id: newId,
        expenseType: categoryName || "",
        expenseTypeId: categoryId || "",
        description: "",
        quantity: "",
        unitPrice: "",
        amount: 0,
      },
    ])
  }

  const deleteLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id))
    }
  }

  const handleBack = () => {
    navigate("/Creditors/CreatePO")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!headerData.supplier) {
      alert("Please select a supplier")
      return
    }

    // Validate all line items
    const invalidItems = lineItems.filter((item) => !item.description || !item.quantity || !item.unitPrice)

    if (invalidItems.length > 0) {
      alert("Please fill in all required fields for all line items")
      return
    }

    try {
      setLoading(true)

      const purchaseOrderData = {
        ...headerData,
        lineItems: lineItems.map((item) => ({
          expenseTypeId: item.expenseTypeId,
          description: item.description,
          quantity: Number.parseFloat(item.quantity),
          unitPrice: Number.parseFloat(item.unitPrice),
          amount: item.amount,
        })),
        totals,
      }

      const response = await api.post("/api/po-form/create-multiple", purchaseOrderData)
      
      navigate("/Creditors/CreditorsOther")
    } catch (err) {
      setError("Failed to create purchase order. Please try again.")
      console.error("Error creating purchase order:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <CompanyHeader />
        <button className="back-button" onClick={handleBack}>
          Back
        </button>

        <form onSubmit={handleSubmit}>
          {/* Header Section */}
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="supplier">Supplier</label>
                <select
                  id="supplier"
                  name="supplier"
                  className="dropdown"
                  value={headerData.supplier}
                  onChange={handleHeaderChange}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  className="form-control"
                  value={headerData.date}
                  onChange={handleHeaderChange}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="attentionTo">Att</label>
                <input
                  type="text"
                  id="attentionTo"
                  name="attentionTo"
                  className="form-control"
                  value={headerData.attentionTo}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="receivedBy">Received by</label>
                <input
                  type="text"
                  id="receivedBy"
                  name="receivedBy"
                  className="form-control"
                  value={headerData.receivedBy}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="regNo">Ref/Reg No</label>
                <input
                  type="text"
                  id="regNo"
                  name="regNo"
                  className="form-control"
                  value={headerData.regNo}
                  onChange={handleHeaderChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="subbie">Subbie</label>
                <input
                  type="text"
                  id="subbie"
                  name="subbie"
                  className="form-control"
                  value={headerData.subbie}
                  onChange={handleHeaderChange}
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="line-items">
            <div className="line-items-header">
              <h3>Line Items</h3>
              <button type="button" className="add-item-btn" onClick={addLineItem}>
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Expense Type</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input type="text" value={item.expenseType} readOnly />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(item.id, "quantity", e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(item.id, "unitPrice", e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td>
                      <input type="text" value={`R ${item.amount.toFixed(2)}`} readOnly />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="delete-item-btn"
                        onClick={() => deleteLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        title="Delete item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label-cell">Sub-Total</td>
                  <td className="amount-cell">
                    <input type="text" value={`R ${totals.subtotal.toFixed(2)}`} readOnly />
                  </td>
                </tr>
                <tr>
                  <td className="label-cell">VAT(15%)</td>
                  <td className="amount-cell">
                    <input type="text" value={`R ${totals.vat.toFixed(2)}`} readOnly />
                  </td>
                </tr>
                <tr>
                  <td className="label-cell">Total</td>
                  <td className="amount-cell">
                    <input type="text" value={`R ${totals.total.toFixed(2)}`} readOnly />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="submit-section">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit Purchase Order"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  )
}

export default POForm
