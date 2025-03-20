"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../css/DriverWage.css"

const DriverWage = () => {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState("list")
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedDelivery, setSelectedDelivery] = useState(null)

  const drivers = [
    { name: "Doge Patel", wage: "R 5,434" },
    { name: "Sherman ", wage: "R 8,923" },
    { name: "John Cena", wage: "R 6,448" },
    { name: "Ukant Seemee", wage: "R 3,235" },
  ]

  const deliveries = [
    {
      instructionId: "53474",
      truckReg: "53474",
      start: "A",
      end: "B",
      trailer: "6m",
      date: "22/10/2020",
      amount: "R 45",
    },
    {
      instructionId: "38591",
      truckReg: "38591",
      start: "B",
      end: "C",
      trailer: "6m",
      date: "18/03/2024",
      amount: "R 74",
    },
    {
      instructionId: "70157",
      truckReg: "70157",
      start: "A",
      end: "C",
      trailer: "12m",
      date: "16/10/2024",
      amount: "R 85",
    },
    {
      instructionId: "75746",
      truckReg: "75746",
      start: "A",
      end: "D",
      trailer: "6m",
      date: "24/07/2020",
      amount: "R 55",
    },
  ]

  const handleBack = () => {
    if (activeView === "list") {
      navigate("/")
    } else if (activeView === "details") {
      setActiveView("list")
    } else if (activeView === "slip") {
      setActiveView("details")
    }
  }

  const handleViewDriver = (driver) => {
    setSelectedDriver(driver)
    setActiveView("details")
  }

  const handleViewSlip = (delivery) => {
    setSelectedDelivery(delivery)
    setActiveView("slip")
  }

  const renderList = () => (
    <div className="wage-table">
      <div className="table-header">
        <div className="header-cell">Driver Name</div>
        <div className="header-cell">Wage</div>
        <div className="header-cell">Delivery Details</div>
      </div>
      {drivers.map((driver, index) => (
        <div key={index} className="table-row">
          <div className="table-cell">{driver.name}</div>
          <div className="table-cell">{driver.wage}</div>
          <div className="table-cell">
            <button className="drview-button" onClick={() => handleViewDriver(driver)}>
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderDetails = () => (
    <div className="details-container">
      <h2>Wage for {selectedDriver?.name}</h2>
      <div className="details-table">
        <div className="table-header">
          <div className="header-cell">Instruction ID</div>
          <div className="header-cell">Truck Reg</div>
          <div className="header-cell">Start</div>
          <div className="header-cell">End</div>
          <div className="header-cell">Trailer</div>
          <div className="header-cell">Date</div>
          <div className="header-cell">Amount</div>
          <div className="header-cell">Actions</div>
        </div>
        {deliveries.map((delivery, index) => (
          <div key={index} className="table-row">
            <div className="table-cell">{delivery.instructionId}</div>
            <div className="table-cell">{delivery.truckReg}</div>
            <div className="table-cell">{delivery.start}</div>
            <div className="table-cell">{delivery.end}</div>
            <div className="table-cell">{delivery.trailer}</div>
            <div className="table-cell">{delivery.date}</div>
            <div className="table-cell">{delivery.amount}</div>
            <div className="table-cell actions">
              <button className="drview-button" onClick={() => handleViewSlip(delivery)}>
                View
              </button>
              <button className="download-button">Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSlip = () => (
    <div className="wage-slip">
      <div className="slip-header">
        <div className="company-info">
          <h2>Company Name</h2>
          <p>Company Contact Details</p>
        </div>
        <h1>Wage Slip</h1>
      </div>

      <div className="slip-details">
        <div className="pay-period">
          <p>
            <strong>Pay Period:</strong> 1 March 2023 - 25 March 2023
          </p>
          <p>
            <strong>Pay Date:</strong> 25 March
          </p>
        </div>

        <div className="employee-info">
          <p>
            <strong>Employee Name:</strong> {selectedDriver?.name}
          </p>
          <p>
            <strong>Employee Contact:</strong> 087 555 5475
          </p>
          <p>
            <strong>Position:</strong> Driver
          </p>
        </div>

        <div className="earnings-section">
          <h3>Earnings</h3>
          <div className="earnings-table">
            <div className="earnings-row">
              <span>Basic Salary</span>
              <span>R 5000</span>
            </div>
            <div className="earnings-row">
              <span>All trips</span>
              <span>R 2500</span>
            </div>
          </div>
        </div>

        <div className="net-pay-section">
          <h3>Net Pay</h3>
          <div className="net-pay-amount">R 7500</div>
        </div>

        <p className="slip-footer">For inquiries, please feel free to contact You Name at Your Email.</p>
      </div>
    </div>
  )

  return (
    <div className="driver-wage-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      {activeView === "list" && renderList()}
      {activeView === "details" && renderDetails()}
      {activeView === "slip" && renderSlip()}
    </div>
  )
}

export default DriverWage

