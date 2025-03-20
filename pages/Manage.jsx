"use client"

import { useState } from "react"
import "../css/Manage.css"
import { useNavigate } from "react-router-dom"

const Manage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("employees")

  const [employees, setEmployees] = useState([
    { id: 1, role: "Software Engineer", name: "John Doe", status: "Active" },
    { id: 2, role: "Project Manager", name: "Jane Smith", status: "Inactive" },
    { id: 3, role: "UI/UX Designer", name: "Alice Johnson", status: "Active" },
    { id: 4, role: "QA Engineer", name: "Bob Brown", status: "Active" },
  ])

  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    telephone: "",
    cellNumber: "",
    employeeNumber: "",
    companyRole: "",
    email: "",
    password: "",
    confirmPassword: "",
    status: "Active",
  })

  const [clients, setClients] = useState([
    { id: 1, company: "Company ABC", representative: "Andrew Taylor", email: "taylordrew@yahoo.com" },
    { id: 2, company: "Little Helpers LTD", representative: "Brian Hall", email: "brian_hall@yahoo.com" },
  ])

  const [showClientForm, setShowClientForm] = useState(false)
  const [newClient, setNewClient] = useState({
    company: "",
    representative: "",
    cellNumber: "",
    email: "",
    companyAddress: "",
    suburb: "",
    postalCode: "",
    regNumber: "",
  })

  // Truck state
  const [trucks, setTrucks] = useState([
    { id: 1, registration: "ND 27", trailerSize: "12m", purchaseDate: "23/06/2024" },
    { id: 2, registration: "ND 49", trailerSize: "6m", purchaseDate: "28/07/2021" },
    { id: 3, registration: "ND 59", trailerSize: "12m", purchaseDate: "30/04/2022" },
    { id: 4, registration: "ND 34", trailerSize: "12m", purchaseDate: "10/08/2021" },
    { id: 5, registration: "ND 92", trailerSize: "6m", purchaseDate: "19/05/2020" },
  ])

  const [showTruckForm, setShowTruckForm] = useState(false)
  const [newTruck, setNewTruck] = useState({
    registration: "",
    trailerSize: "",
    purchaseDate: "",
  })

  const [driverRates, setDriverRates] = useState([
    {
      id: 1,
      area: "Johannesburg",
      current: "$120",
      trailerSize: "12ft",
      updatedAt: "2025-03-10",
      old: "$100",
      changes: "$20 increase",
    },
    {
      id: 2,
      area: "Cape Town",
      current: "$150",
      trailerSize: "14ft",
      updatedAt: "2025-03-12",
      old: "$130",
      changes: "$20 increase",
    },
  ]);

  const [subcontractors, setSubcontractors] = useState([
    {
      id: 1,
      name: "John Doe",
      truckRegistration: "ABC123",
      company: "Doe Logistics",
      phone: "123-456-7890",
      email: "johndoe@example.com",
    },
    {
      id: 2,
      name: "Jane Smith",
      truckRegistration: "XYZ789",
      company: "Smith Transport",
      phone: "098-765-4321",
      email: "janesmith@example.com",
    },
  ]);

  const [showDriverRateForm, setShowDriverRateForm] = useState(false);
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false);


  const handleAddEmployee = () => {
    setShowEmployeeForm(true)
  }

  const handleSaveEmployee = () => {
    if (Object.values(newEmployee).some((value) => value === "")) {
      alert("Please fill in all fields.")
      return
    }


    const fullName = `${newEmployee.firstName} ${newEmployee.lastName}`

    setEmployees([
      ...employees,
      {
        id: employees.length + 1,
        name: fullName,
        role: newEmployee.companyRole,
        status: newEmployee.status,
      },
    ])

    setNewEmployee({
      firstName: "",
      lastName: "",
      telephone: "",
      cellNumber: "",
      employeeNumber: "",
      companyRole: "",
      email: "",
      password: "",
      confirmPassword: "",
      status: "Active",
    })

    setShowEmployeeForm(false)
  }

  const handleAddClient = () => {
    setShowClientForm(true)
  }

  const handleSaveClient = () => {
    if (Object.values(newClient).some((value) => value === "")) {
      alert("Please fill in all fields.")
      return
    }

    setClients([...clients, { id: clients.length + 1, ...newClient }])
    setNewClient({
      company: "",
      representative: "",
      cellNumber: "",
      email: "",
      companyAddress: "",
      suburb: "",
      postalCode: "",
      regNumber: "",
    })
    setShowClientForm(false)
  }

  const handleAddTruck = () => {
    setShowTruckForm(true)
  }

  const handleSaveTruck = () => {
    if (Object.values(newTruck).some((value) => value === "")) {
      alert("Please fill in all fields.")
      return
    }

    setTrucks([...trucks, { id: trucks.length + 1, ...newTruck }])
    setNewTruck({
      registration: "",
      trailerSize: "",
      purchaseDate: "",
    })
    setShowTruckForm(false)
  }

  const handleBack = () => {
    if (showEmployeeForm) {
      setShowEmployeeForm(false)
    } else if (showClientForm) {
      setShowClientForm(false)
    } else if (showTruckForm) {
      setShowTruckForm(false)
    } else if (showDriverRateForm) {
      setShowDriverRateForm(false)
    } else if (showSubcontractorForm) {
      setShowSubcontractorForm(false)
    }else {
      navigate("/")
    }
  }

  const renderEmployeeTable = () => (
    <>
      <div className="employees-table">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>Status</th>
              <th>Employee No</th>
              <th>Actions</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.role}</td> {/* Corrected to display 'role' in the 'Role' column */}
                <td>{employee.name}</td> {/* Corrected to display 'name' in the 'Name' column */}
                <td>{employee.status}</td> {/* Corrected to display 'status' in the 'Status' column */}
                <td>{employee.id}</td> {/* Employee ID to display in 'Employee No' column */}
                <td>
                  <button className="view-button">View</button>
                </td>
                <td>
                  <button
                    className="delete-button"
                    onClick={() => setEmployees(employees.filter((e) => e.id !== employee.id))}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="add-button" onClick={handleAddEmployee}>
        Add Employee
      </button>
    </>
  )

  const renderClientTable = () => (
    <>
      <div className="clients-table">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Representative</th>
              <th>Email</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.company}</td>
                <td>{client.representative}</td>
                <td>{client.email}</td>
                <td>
                  <button className="view-button">View</button>
                </td>
                <td>
                  <button
                    className="delete-button" /* from instructions css*/
                    onClick={() => setClients(clients.filter((c) => c.id !== client.id))}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="add-client-button" onClick={handleAddClient}>
        Add Client
      </button>
    </>
  )
  const renderDriverRatesTable = () => (
    <div className="table-container">
      <h2>Driver Rates</h2>
      <table>
        <thead>
          <tr>
            <th>Area</th>
            <th>Current</th>
            <th>Trailer Size</th>
            <th>Updated at</th>
            <th>Old</th>
            <th>Changes</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {driverRates.map((rate) => (
            <tr key={rate.id}>
              <td>{rate.area}</td>
              <td>{rate.current}</td>
              <td>{rate.trailerSize}</td>
              <td>{rate.updatedAt}</td>
              <td>{rate.old}</td>
              <td>{rate.changes}</td>
              <td>
                <button
                  className="delete-button"
                  onClick={() => setDriverRates(driverRates.filter((r) => r.id !== rate.id))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <center>
      <button className="add-client-button" onClick={() => setShowDriverRateForm(true)}>
        Add Driver Rate
      </button>
      </center>
    
    </div>
  )

  const renderSubcontractorsTable = () => (
    <div className="table-container">
      <h2>Subcontractors</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Truck Registration</th>
            <th>Company</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {subcontractors.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.name}</td>
              <td>{sub.truckRegistration}</td>
              <td>{sub.company}</td>
              <td>{sub.phone}</td>
              <td>{sub.email}</td>
              <td>
                <button
                  className="edit-button"
                  onClick={() => console.log(`Editing ${sub.name}`)}
                >
                  Edit
                </button>
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={() => setSubcontractors(subcontractors.filter((s) => s.id !== sub.id))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <center>
      <button className="add-client-button" onClick={() => setShowSubcontractorForm(true)}>
        Add Subcontractor
      </button>
      </center>
   
    </div>
  )
  const renderTruckTable = () => (
    <>
      <div className="trucks-table">
        <table>
          <thead>
            <tr>
              <th>Truck Registration</th>
              <th>Trailer Size</th>
              <th>Truck Purchased</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <tr key={truck.id}>
                <td>{truck.registration}</td>
                <td>{truck.trailerSize}</td>
                <td>{truck.purchaseDate}</td>
                <td>
                  <button className="edit-button">Edit</button>
                </td>
                <td>
                  <button className="delete-button" onClick={() => setTrucks(trucks.filter((t) => t.id !== truck.id))}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="add-subcontractor-button" onClick={handleAddTruck}>
        Add Truck
      </button>
    </>
  )

  const renderEmployeeForm = () => (
    <div className="add-employee-form">
      <h2>Add New Employee</h2>
      <div className="form-grid">
        <div className="form-group">
          <input
            type="text"
            placeholder="Input First Name"
            value={newEmployee.firstName}
            onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Input Surname"
            value={newEmployee.lastName}
            onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Input Telephone"
            value={newEmployee.telephone}
            onChange={(e) => setNewEmployee({ ...newEmployee, telephone: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Input Cell"
            value={newEmployee.cellNumber}
            onChange={(e) => setNewEmployee({ ...newEmployee, cellNumber: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Input Employee Number"
            value={newEmployee.employeeNumber}
            onChange={(e) => setNewEmployee({ ...newEmployee, employeeNumber: e.target.value })}
          />
        </div>
        <div className="form-group">
          <select
            value={newEmployee.companyRole}
            onChange={(e) => setNewEmployee({ ...newEmployee, companyRole: e.target.value })}
          >
            <option value="">Select Role</option>
            <option value="Controller">Controller</option>
            <option value="Manager">Manager</option>
            <option value="Driver">Driver</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div className="form-group">
          <input
            type="email"
            placeholder="Input email"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Input password"
            value={newEmployee.password}
            onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
          />
        </div>
        <div className="form-group">
          <select
            value={newEmployee.status}
            onChange={(e) => setNewEmployee({ ...newEmployee, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="button-container">
        <button onClick={handleSaveEmployee} className="save-button">
          Confirm Employee Register
        </button>
        <button onClick={() => setShowEmployeeForm(false)} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  )

  const renderClientForm = () => (
    <div className="add-client-form">
      <h2>Add New Client</h2>
      <div className="form-grid">
        <input
          type="text"
          placeholder="Company Name"
          value={newClient.company}
          onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
        />
        <input
          type="text"
          placeholder="Representative Name"
          value={newClient.representative}
          onChange={(e) => setNewClient({ ...newClient, representative: e.target.value })}
        />
        <input
          type="text"
          placeholder="Cell Number"
          value={newClient.cellNumber}
          onChange={(e) => setNewClient({ ...newClient, cellNumber: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={newClient.email}
          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Company Address"
          value={newClient.companyAddress}
          onChange={(e) => setNewClient({ ...newClient, companyAddress: e.target.value })}
        />
        <input
          type="text"
          placeholder="Suburb"
          value={newClient.suburb}
          onChange={(e) => setNewClient({ ...newClient, suburb: e.target.value })}
        />
        <input
          type="text"
          placeholder="Postal Code"
          value={newClient.postalCode}
          onChange={(e) => setNewClient({ ...newClient, postalCode: e.target.value })}
        />
        <input
          type="text"
          placeholder="Company Registration Number"
          value={newClient.regNumber}
          onChange={(e) => setNewClient({ ...newClient, regNumber: e.target.value })}
        />
      </div>

      <div className="button-container">
        <button onClick={handleSaveClient} className="save-button">
          Save Client
        </button>
        <button onClick={() => setShowClientForm(false)} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  )

  const renderTruckForm = () => (
    <div className="add-truck-form">
            <h2>Add New Truck</h2>
      <div className="truck-form-grid">
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter truck registration"
            value={newTruck.registration}
            onChange={(e) => setNewTruck({ ...newTruck, registration: e.target.value })}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter trailer size"
            value={newTruck.trailerSize}
            onChange={(e) => setNewTruck({ ...newTruck, trailerSize: e.target.value })}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter year"
            value={newTruck.year}
            onChange={(e) => setNewTruck({ ...newTruck, year: e.target.value })}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter model"
            value={newTruck.model}
            onChange={(e) => setNewTruck({ ...newTruck, model: e.target.value })}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter purchase price"
            value={newTruck.purchasePrice}
            onChange={(e) => setNewTruck({ ...newTruck, purchasePrice: e.target.value })}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Enter current evaluation"
            value={newTruck.currentEvaluation}
            onChange={(e) => setNewTruck({ ...newTruck, currentEvaluation: e.target.value })}
          />
        </div>

        <div className="form-group full-width">
          <input
            type="text"
            placeholder="Enter VIN number"
            value={newTruck.vinNumber}
            onChange={(e) => setNewTruck({ ...newTruck, vinNumber: e.target.value })}
          />
        </div>

        <div className="form-group full-width">
        <input
          type="date"
          value={newTruck.purchaseDate}
          onChange={(e) => setNewTruck({ ...newTruck, purchaseDate: e.target.value })}
        />
        </div>
      </div>

      <button onClick={handleSaveTruck} className="add-truck-button">
        Add Truck
      </button>
    </div>
  )
  const renderDriverRateForm = () => (
    <form onSubmit={(e) => e.preventDefault()} className="driver-rate-form">
      <h2 className="form-title">Add Driver Rate</h2>
      
      <div className="form-group">
        <input type="text" placeholder="Starting Point" className="form-input" />
        <input type="text" placeholder="Driver Rate" className="form-input" />
        <select className="form-input">
          <option value="" disabled selected>Select Destination</option>
          <option value="Transnet">Transnet</option>
          <option value="MSC port">MSC Port</option>
        </select>
       
      </div>
  
      <div className="form-actions">
        <button type="" className="save-button">Save Driver Rate</button>
        <button type="button" className="cancel-button" onClick={() => setShowDriverRateForm(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
  
  

  const renderSubcontractorForm = () => (
    <form onSubmit={(e) => e.preventDefault()} className="subcontractor-form">
      <h2 className="form-title">Add Subcontractor</h2>
      
      <div className="subform-group">
      <input type="text" placeholder="Company Name" className="form-input" />
      <input type="text" placeholder="Location" className="form-input" />

        <input type="text" placeholder="Contact Person" className="form-input" />
        <input type="text" placeholder="Phone Number" className="form-input" />

        <input type="email" placeholder="Email" className="form-input" />
        <input type="email" placeholder="Company Reg number" className="form-input" />

        <input type="text" placeholder="No. of Trucks" className="form-input" />

        <input type="text" placeholder="Driver Name" className="form-input" />
        <input type="text" placeholder="Driver Surname" className="form-input" />
    
        <input type="text" placeholder="Truck Reg Number" className="form-input" />
    
    
        </div>
  
      <div className="form-actions">
        <button type="submit" className="save-button">Add Subcontractor</button>
        <button type="button" className="cancel-button" onClick={() => setShowSubcontractorForm(false)}>
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="manage-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="button-row">
        <button
          className={`manage-button ${activeTab === "employees" ? "active" : ""}`}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`manage-button ${activeTab === "clients" ? "active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          Clients Information
        </button>
        <button
          className={`manage-button ${activeTab === "rates" ? "active" : ""}`}
          onClick={() => setActiveTab("rates")}
        >
          Driver Rates
        </button>
        <button
          className={`manage-button ${activeTab === "subcontractors" ? "active" : ""}`}
          onClick={() => setActiveTab("subcontractors")}
        >
          Subcontractors
        </button>
        <button
          className={`manage-button ${activeTab === "trucks" ? "active" : ""}`}
          onClick={() => setActiveTab("trucks")}
        >
          Trucks
        </button>
      </div>

      {activeTab === "employees" && !showEmployeeForm && renderEmployeeTable()}
      {activeTab === "employees" && showEmployeeForm && renderEmployeeForm()}

      {activeTab === "clients" && !showClientForm && renderClientTable()}
      {activeTab === "clients" && showClientForm && renderClientForm()}

      {activeTab === "trucks" && !showTruckForm && renderTruckTable()}
      {activeTab === "trucks" && showTruckForm && renderTruckForm()}

      {activeTab === "rates" && !showDriverRateForm && renderDriverRatesTable()}
      {activeTab === "rates" && showDriverRateForm && renderDriverRateForm()}

      {activeTab === "subcontractors" && !showSubcontractorForm && renderSubcontractorsTable()}
      {activeTab === "subcontractors" && showSubcontractorForm && renderSubcontractorForm()}
    </div>
  )
}

export default Manage

