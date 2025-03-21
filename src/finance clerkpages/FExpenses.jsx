"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../finance clerkpages/css/Expenses1.css"

const FExpenses = () => {
  const navigate = useNavigate()
  const [view, setView] = useState("dashboard") // "dashboard", "details", "submission"
  const [selectedTruck, setSelectedTruck] = useState("")
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [formData, setFormData] = useState({
    type: "Diesel",
    documentFrom: "Controller",
    expenseCost: "R500",
    description: "Low Tank",
  })
  const [file, setFile] = useState(null)

  // Dashboard data matching the image
  const trucks = [
    { regNo: "ND 30", monthlyExpense: "R 8870" },
    { regNo: "ND 35", monthlyExpense: "R 778" },
    { regNo: "ND 65", monthlyExpense: "R 890" },
    { regNo: "ND 57", monthlyExpense: "R 568" },
  ]

  // Your original expenses data
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
    if (view === "submission") {
      setView("details")
    } else if (view === "details") {
      setView("dashboard")
    } else {
      navigate("/")
    }
  }

  const handleViewTruck = (truck) => {
    setSelectedTruck(truck.regNo)
    setView("details")
  }

  const handleadd = (expense) => {
    setSelectedExpense(expense)
    setView("submission")
  }

  const handleDownload = (expense) => {
    console.log("Downloading expense:", expense)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    console.log("File:", file)
    // Reset and go back to details view
    setView("details")
  }

  const handleCancel = () => {
    setFile(null)
  }

  // Dashboard view (first screen)
  if (view === "dashboard") {
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
                <button className="view-button" onClick={() => handleViewTruck(truck)}>
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Detail view (second screen - your original expenses table)
  if (view === "details") {
    return (
      <div className="expenses-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
          {selectedTruck && <h2>Expenses for {selectedTruck}</h2>}
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
<div>
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
                <button className="view-button" >
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
        <button className="add-btn" onClick={() => handleadd()}>Add Fuel Expense</button>
        </div>
      </div>
    )
  }

  // Submission view (third screen - petrol slip submission form)
  return (
    <div className="expenses-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
        <h2 className="center-h2">Submit Petrol Slip</h2>
      </div>

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-row">
          <div className="form-group">
            <label>Select Type</label>
            <select name="type" value={formData.type} onChange={handleInputChange} className="form-select">
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Toll">Toll</option>
            </select>
          </div>

          <div className="form-group">
            <label>Document From</label>
            <select
              name="documentFrom"
              value={formData.documentFrom}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="Controller">Controller</option>
              <option value="Driver">Driver</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div className="form-group">
            <label>Expense Cost</label>
            <input
              type="text"
              name="expenseCost"
              value={formData.expenseCost}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Description of Expense</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-input"
          />
        </div>

        <div className="file-upload-container">
          <div className="file-upload-header">
            <h3>Petrol Slip Submission</h3>
            <button type="button" className="close-button" onClick={handleCancel}>
              ×
            </button>
          </div>

          <div className="file-upload-area">
            <div className="drop-zone">
              <div className="upload-icon">📁</div>
              <p>Drop files here</p>
              <p className="file-format">Supported format: PNG, JPG</p>

              <div className="or-divider">OR</div>

              <div className="browse-files">
                <label htmlFor="file-upload" className="browse-button">
                  Browse files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>

          <div className="file-upload-actions">
            <button type="button" className="cancel-button" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="upload-button">
              Upload
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Submit
          </button>
        </div>
      </form>
    </div>
  )
}

export default FExpenses

