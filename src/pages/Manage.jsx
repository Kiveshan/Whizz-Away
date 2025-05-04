"use client"

import { useState, useEffect } from "react"
import "../css/Manage.css"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API_URL = "http://localhost:5000/api"

const Manage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("employees")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State for data
  const [employees, setEmployees] = useState([])
  const [clients, setClients] = useState([])
  const [trucks, setTrucks] = useState([])
  const [driverRates, setDriverRates] = useState([])
  const [subcontractors, setSubcontractors] = useState([])

  // State for forms
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showTruckForm, setShowTruckForm] = useState(false)
  const [showDriverRateForm, setShowDriverRateForm] = useState(false)
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false)

  // State for new items
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    surname: "",
    telephonenum: "",
    cellnum: "",
    employeenum: "",
    roleid: "",
    email: "",
    password: "",
    base_salary: "",
    status: true,
  })

  const [newClient, setNewClient] = useState({
    companyname: "",
    representative: "",
    companyaddress: "",
    suburb: "",
    postalcode: "",
    email: "",
    companyregnum: "",
    cellnum: "",
    vatregno: "",
    city: "",
    streetaddress: "",
    payment_type: "",
  })

  const [newTruck, setNewTruck] = useState({
    truckregnum: "",
    trailersize: "",
    truckpurchasedate: "",
    year: "",
    model: "",
    purchase_price: "",
    current_evaluation: "",
    vin_num: "",
    is_subcontractor: false,
  })

  const [newDriverRate, setNewDriverRate] = useState({
    startingpoint: "",
    destination: "",
    rate: "",
    driverid: "",
  })

  const [newSubcontractor, setNewSubcontractor] = useState({
    name: "",
    companyname: "",
    location: "",
    contact_person: "",
    cellnum: "",
    email: "",
    company_reg_num: "",
    no_of_trucks: 0,
    truckregnum: "",
    status: true,
  })

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token")
  }

  // Setup axios headers with auth token
  const getAuthHeaders = () => {
    const token = getAuthToken()
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch employees
      const employeesResponse = await axios.get(`${API_URL}/employees`, getAuthHeaders())
      setEmployees(employeesResponse.data)

      // Fetch clients
      const clientsResponse = await axios.get(`${API_URL}/clients`, getAuthHeaders())
      setClients(clientsResponse.data)

      // Fetch trucks
      const trucksResponse = await axios.get(`${API_URL}/trucks`, getAuthHeaders())
      setTrucks(trucksResponse.data)

      // Fetch driver rates
      const ratesResponse = await axios.get(`${API_URL}/driver-rates`, getAuthHeaders())
      setDriverRates(ratesResponse.data)

      // Fetch subcontractors
      const subcontractorsResponse = await axios.get(`${API_URL}/subcontractors`, getAuthHeaders())
      setSubcontractors(subcontractorsResponse.data)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to load data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle form submissions
  const handleSaveEmployee = async () => {
    if (!newEmployee.name || !newEmployee.surname || !newEmployee.email || !newEmployee.password) {
      alert("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/employees`, newEmployee, getAuthHeaders())

      // Refresh employee list
      const employeesResponse = await axios.get(`${API_URL}/employees`, getAuthHeaders())
      setEmployees(employeesResponse.data)

      // Reset form
      setNewEmployee({
        name: "",
        surname: "",
        telephonenum: "",
        cellnum: "",
        employeenum: "",
        roleid: "",
        email: "",
        password: "",
        base_salary: "",
        status: true,
      })
      setShowEmployeeForm(false)
    } catch (err) {
      console.error("Error creating employee:", err)
      alert(`Error creating employee: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClient = async () => {
    if (!newClient.companyname || !newClient.representative || !newClient.email) {
      alert("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/clients`, newClient, getAuthHeaders())

      // Refresh client list
      const clientsResponse = await axios.get(`${API_URL}/clients`, getAuthHeaders())
      setClients(clientsResponse.data)

      // Reset form
      setNewClient({
        companyname: "",
        representative: "",
        companyaddress: "",
        suburb: "",
        postalcode: "",
        email: "",
        companyregnum: "",
        cellnum: "",
        vatregno: "",
        city: "",
        streetaddress: "",
        payment_type: "",
      })
      setShowClientForm(false)
    } catch (err) {
      console.error("Error creating client:", err)
      alert(`Error creating client: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTruck = async () => {
    if (!newTruck.truckregnum || !newTruck.trailersize) {
      alert("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/trucks`, newTruck, getAuthHeaders())

      // Refresh truck list
      const trucksResponse = await axios.get(`${API_URL}/trucks`, getAuthHeaders())
      setTrucks(trucksResponse.data)

      // Reset form
      setNewTruck({
        truckregnum: "",
        trailersize: "",
        truckpurchasedate: "",
        year: "",
        model: "",
        purchase_price: "",
        current_evaluation: "",
        vin_num: "",
        is_subcontractor: false,
      })
      setShowTruckForm(false)
    } catch (err) {
      console.error("Error creating truck:", err)
      alert(`Error creating truck: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDriverRate = async () => {
    if (!newDriverRate.startingpoint || !newDriverRate.destination || !newDriverRate.rate) {
      alert("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/driver-rates`, newDriverRate, getAuthHeaders())

      // Refresh driver rate list
      const ratesResponse = await axios.get(`${API_URL}/driver-rates`, getAuthHeaders())
      setDriverRates(ratesResponse.data)

      // Reset form
      setNewDriverRate({
        startingpoint: "",
        destination: "",
        rate: "",
        driverid: "",
      })
      setShowDriverRateForm(false)
    } catch (err) {
      console.error("Error creating driver rate:", err)
      alert(`Error creating driver rate: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSubcontractor = async () => {
    if (!newSubcontractor.name || !newSubcontractor.companyname || !newSubcontractor.cellnum) {
      alert("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/subcontractors`, newSubcontractor, getAuthHeaders())

      // Refresh subcontractor list
      const subcontractorsResponse = await axios.get(`${API_URL}/subcontractors`, getAuthHeaders())
      setSubcontractors(subcontractorsResponse.data)

      // Reset form
      setNewSubcontractor({
        name: "",
        companyname: "",
        location: "",
        contact_person: "",
        cellnum: "",
        email: "",
        company_reg_num: "",
        no_of_trucks: 0,
        truckregnum: "",
        status: true,
      })
      setShowSubcontractorForm(false)
    } catch (err) {
      console.error("Error creating subcontractor:", err)
      alert(`Error creating subcontractor: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle disable/delete actions
  const handleDisableEmployee = async (id) => {
    setLoading(true)
    try {
      await axios.put(`${API_URL}/employees/${id}/toggle-status`, { status: false }, getAuthHeaders())

      // Refresh employee list
      const employeesResponse = await axios.get(`${API_URL}/employees`, getAuthHeaders())
      setEmployees(employeesResponse.data)
    } catch (err) {
      console.error(`Error disabling employee ${id}:`, err)
      alert(`Error disabling employee: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableClient = async (id) => {
    setLoading(true)
    try {
      await axios.delete(`${API_URL}/clients/${id}`, getAuthHeaders())

      // Refresh client list
      const clientsResponse = await axios.get(`${API_URL}/clients`, getAuthHeaders())
      setClients(clientsResponse.data)
    } catch (err) {
      console.error(`Error deleting client ${id}:`, err)
      alert(`Error deleting client: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableTruck = async (id) => {
    setLoading(true)
    try {
      await axios.delete(`${API_URL}/trucks/${id}`, getAuthHeaders())

      // Refresh truck list
      const trucksResponse = await axios.get(`${API_URL}/trucks`, getAuthHeaders())
      setTrucks(trucksResponse.data)
    } catch (err) {
      console.error(`Error deleting truck ${id}:`, err)
      alert(`Error deleting truck: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableDriverRate = async (id) => {
    setLoading(true)
    try {
      await axios.delete(`${API_URL}/driver-rates/${id}`, getAuthHeaders())

      // Refresh driver rate list
      const ratesResponse = await axios.get(`${API_URL}/driver-rates`, getAuthHeaders())
      setDriverRates(ratesResponse.data)
    } catch (err) {
      console.error(`Error deleting driver rate ${id}:`, err)
      alert(`Error deleting driver rate: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableSubcontractor = async (id) => {
    setLoading(true)
    try {
      await axios.put(`${API_URL}/subcontractors/${id}/toggle-status`, { status: false }, getAuthHeaders())

      // Refresh subcontractor list
      const subcontractorsResponse = await axios.get(`${API_URL}/subcontractors`, getAuthHeaders())
      setSubcontractors(subcontractorsResponse.data)
    } catch (err) {
      console.error(`Error disabling subcontractor ${id}:`, err)
      alert(`Error disabling subcontractor: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setShowEmployeeForm(true)
  }

  const handleAddClient = () => {
    setShowClientForm(true)
  }

  const handleAddTruck = () => {
    setShowTruckForm(true)
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
    } else {
      navigate("/Dashboard")
    }
  }

  const renderEmployeeTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading employees...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-employees-table">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Name</th>
                <th>Status</th>
                <th>Employee No</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.userid}>
                  <td>{employee.roleid}</td>
                  <td>{`${employee.name} ${employee.surname}`}</td>
                  <td>{employee.status ? "Active" : "Inactive"}</td>
                  <td>{employee.employeenum}</td>
                  <td>
                    <button className="manage-view-button" onClick={() => handleEditEmployee(employee.userid)}>
                      Edit
                    </button>
                  </td>
                  <td>
                    <button className="manage-delete-button" onClick={() => handleDisableEmployee(employee.userid)}>
                      Disable
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="manage-add-employee-button" onClick={handleAddEmployee}>
        Add Employee
      </button>
    </>
  )

  const renderClientTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading clients...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-clients-table">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Representative</th>
                <th>Email</th>
                <th>Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.m5clientkey}>
                  <td>{client.companyname}</td>
                  <td>{client.representative}</td>
                  <td>{client.email}</td>
                  <td>
                    <button className="manage-view-button" onClick={() => handleEditClient(client.m5clientkey)}>
                      Edit
                    </button>
                  </td>
                  <td>
                    <button className="manage-delete-button" onClick={() => handleDisableClient(client.m5clientkey)}>
                      Disable
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="manage-add-client-button" onClick={handleAddClient}>
        Add Client
      </button>
    </>
  )

  const renderDriverRatesTable = () => (
    <div className="manage-DriverRates-table">
      {loading ? (
        <div className="loading">Loading driver rates...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Starting Point</th>
              <th>Destination</th>
              <th>Rate</th>
              <th>Driver</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {driverRates.map((rate) => (
              <tr key={rate.m5ratekey}>
                <td>{rate.startingpoint}</td>
                <td>{rate.destination}</td>
                <td>{rate.rate}</td>
                <td>{rate.name ? `${rate.name} ${rate.surname}` : "N/A"}</td>
                <td>
                  <button className="manage-edit-button" onClick={() => handleEditDriverRate(rate.m5ratekey)}>
                    Edit
                  </button>
                </td>
                <td>
                  <button className="manage-delete-button" onClick={() => handleDisableDriverRate(rate.m5ratekey)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <center>
        <button className="manage-add-driver-rate-button" onClick={() => setShowDriverRateForm(true)}>
          Add Driver Rate
        </button>
      </center>
    </div>
  )

  const renderSubcontractorsTable = () => (
    <div className="manage-subcontractor-table">
      {loading ? (
        <div className="loading">Loading subcontractors...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Truck Registration</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subcontractors.map((sub) => (
              <tr key={sub.userid}>
                <td>{sub.name}</td>
                <td>{sub.truckregnum}</td>
                <td>{sub.companyname}</td>
                <td>{sub.cellnum}</td>
                <td>{sub.email}</td>
                <td>
                  <button className="manage-edit-button" onClick={() => handleEditSubcontractor(sub.userid)}>
                    Edit
                  </button>
                </td>
                <td>
                  <button className="manage-delete-button" onClick={() => handleDisableSubcontractor(sub.userid)}>
                    Disable
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <center>
        <button className="manage-add-subcontractor-button" onClick={() => setShowSubcontractorForm(true)}>
          Add Subcontractor
        </button>
      </center>
    </div>
  )

  const renderTruckTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading trucks...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-trucks-table">
          <table>
            <thead>
              <tr>
                <th>Truck Registration</th>
                <th>Trailer Size</th>
                <th>Truck Purchase Date</th>
                <th>Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((truck) => (
                <tr key={truck.m5truckskey}>
                  <td>{truck.truckregnum}</td>
                  <td>{truck.trailersize}</td>
                  <td>{new Date(truck.truckpurchasedate).toLocaleDateString()}</td>
                  <td>
                    <button className="manage-edit-button" onClick={() => handleEditTruck(truck.m5truckskey)}>
                      Edit
                    </button>
                  </td>
                  <td>
                    <button className="manage-delete-button" onClick={() => handleDisableTruck(truck.m5truckskey)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="manage-add-truck-button" onClick={handleAddTruck}>
        Add Truck
      </button>
    </>
  )

  const renderEmployeeForm = () => (
    <div className="manage-add-employee-form">
      <h2>Add New Employee</h2>
      <div className="manage-form-grid">
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input First Name"
            value={newEmployee.name}
            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input Surname"
            value={newEmployee.surname}
            onChange={(e) => setNewEmployee({ ...newEmployee, surname: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input Telephone"
            value={newEmployee.telephonenum}
            onChange={(e) => setNewEmployee({ ...newEmployee, telephonenum: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input Cell"
            value={newEmployee.cellnum}
            onChange={(e) => setNewEmployee({ ...newEmployee, cellnum: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input Employee Number"
            value={newEmployee.employeenum}
            onChange={(e) => setNewEmployee({ ...newEmployee, employeenum: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Input Basic Salary"
            value={newEmployee.base_salary}
            onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <select
            className="dropdown"
            value={newEmployee.roleid}
            onChange={(e) => setNewEmployee({ ...newEmployee, roleid: e.target.value })}
          >
            <option value="">Select Role</option>
            <option value="2">Controller</option>
            <option value="3">Manager</option>
            <option value="5">Driver</option>
            <option value="6">Finance Clerk</option>
            <option value="8">Yard Staff</option>
          </select>
        </div>
        <div className="manage-form-group">
          <input
            type="email"
            placeholder="Input email"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <input
            type="password"
            placeholder="Input password"
            value={newEmployee.password}
            onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
          />
        </div>
      </div>

      <div className="manage-button-container">
        <button onClick={handleSaveEmployee} className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Confirm Employee Register"}
        </button>
        <button onClick={() => setShowEmployeeForm(false)} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </div>
  )

  const renderClientForm = () => (
    <div className="manage-add-client-form">
      <h2>Add New Client</h2>
      <div className="manage-form-grid">
        <input
          type="text"
          placeholder="Company Name"
          value={newClient.companyname}
          onChange={(e) => setNewClient({ ...newClient, companyname: e.target.value })}
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
          value={newClient.cellnum}
          onChange={(e) => setNewClient({ ...newClient, cellnum: e.target.value })}
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
          value={newClient.companyaddress}
          onChange={(e) => setNewClient({ ...newClient, companyaddress: e.target.value })}
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
          value={newClient.postalcode}
          onChange={(e) => setNewClient({ ...newClient, postalcode: e.target.value })}
        />
        <input
          type="text"
          placeholder="Company Reg. Number"
          value={newClient.companyregnum}
          onChange={(e) => setNewClient({ ...newClient, companyregnum: e.target.value })}
        />
      </div>

      <div className="manage-button-container">
        <button onClick={handleSaveClient} className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
        <button onClick={() => setShowClientForm(false)} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </div>
  )

  const renderTruckForm = () => (
    <div className="manage-add-truck-form">
      <h2>Add New Truck</h2>
      <div className="manage-truck-form-grid">
        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter truck registration"
            value={newTruck.truckregnum}
            onChange={(e) => setNewTruck({ ...newTruck, truckregnum: e.target.value })}
          />
        </div>

        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter trailer size"
            value={newTruck.trailersize}
            onChange={(e) => setNewTruck({ ...newTruck, trailersize: e.target.value })}
          />
        </div>

        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter year"
            value={newTruck.year}
            onChange={(e) => setNewTruck({ ...newTruck, year: e.target.value })}
          />
        </div>

        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter model"
            value={newTruck.model}
            onChange={(e) => setNewTruck({ ...newTruck, model: e.target.value })}
          />
        </div>

        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter purchase price"
            value={newTruck.purchase_price}
            onChange={(e) => setNewTruck({ ...newTruck, purchase_price: e.target.value })}
          />
        </div>

        <div className="manage-form-group">
          <input
            type="text"
            placeholder="Enter current evaluation"
            value={newTruck.current_evaluation}
            onChange={(e) => setNewTruck({ ...newTruck, current_evaluation: e.target.value })}
          />
        </div>

        <div className="manage-form-group manage-full-width">
          <input
            type="text"
            placeholder="Enter VIN number"
            value={newTruck.vin_num}
            onChange={(e) => setNewTruck({ ...newTruck, vin_num: e.target.value })}
          />
        </div>

        <div className="manage-form-group manage-full-width">
          <input
            type="date"
            value={newTruck.truckpurchasedate}
            onChange={(e) => setNewTruck({ ...newTruck, truckpurchasedate: e.target.value })}
          />
        </div>

        <div className="manage-form-group checkbox-container">
          <label className="custom-checkbox">
            <input
              type="checkbox"
              checked={newTruck.is_subcontractor}
              onChange={(e) => setNewTruck({ ...newTruck, is_subcontractor: e.target.checked })}
            />
            <span className="checkmark"></span>
            Sub-Constructor
          </label>
        </div>
      </div>

      <button onClick={handleSaveTruck} className="manage-save-button" disabled={loading}>
        {loading ? "Saving..." : "Add Truck"}
      </button>
    </div>
  )

  const renderDriverRateForm = () => (
    <form onSubmit={(e) => e.preventDefault()} className="manage-driver-rate-form">
      <h2 className="manage-form-title">Add Driver Rate</h2>

      <div className="manage-form-group">
        <input
          type="text"
          placeholder="Starting Point"
          className="form-input"
          value={newDriverRate.startingpoint}
          onChange={(e) => setNewDriverRate({ ...newDriverRate, startingpoint: e.target.value })}
        />
        <input
          type="number"
          placeholder="Driver Rate"
          className="form-input"
          value={newDriverRate.rate}
          onChange={(e) => setNewDriverRate({ ...newDriverRate, rate: e.target.value })}
        />
        <input
          type="text"
          placeholder="Destination"
          className="form-input"
          value={newDriverRate.destination}
          onChange={(e) => setNewDriverRate({ ...newDriverRate, destination: e.target.value })}
        />

        <select
          className="form-input"
          value={newDriverRate.driverid}
          onChange={(e) => setNewDriverRate({ ...newDriverRate, driverid: e.target.value })}
        >
          <option value="">Select Driver (Optional)</option>
          {employees
            .filter((emp) => emp.roleid === 5) // Assuming roleid 5 is for drivers
            .map((driver) => (
              <option key={driver.userid} value={driver.userid}>
                {driver.name} {driver.surname}
              </option>
            ))}
        </select>
      </div>

      <div className="manage-form-actions">
        <button type="button" className="manage-save-button" onClick={handleSaveDriverRate} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" className="manage-cancel-button" onClick={() => setShowDriverRateForm(false)}>
          Cancel
        </button>
      </div>
    </form>
  )

  const RenderSubcontractorForm = () => {
    const [numTrucks, setNumTrucks] = useState(0)

    const handleTrucksChange = (e) => {
      const value = Number.parseInt(e.target.value, 10)
      setNumTrucks(isNaN(value) ? 0 : value)
      setNewSubcontractor({ ...newSubcontractor, no_of_trucks: isNaN(value) ? 0 : value })
    }

    return (
      <form onSubmit={(e) => e.preventDefault()} className="manage-subcontractor-form">
        <h2 className="manage-form-title" style={{ alignItems: "center" }}>
          Add Subcontractor
        </h2>

        <div className="manage-subform-group">
          <input
            type="text"
            placeholder="Name"
            className="form-input"
            value={newSubcontractor.name}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Company Name"
            className="form-input"
            value={newSubcontractor.companyname}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, companyname: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            className="form-input"
            value={newSubcontractor.location}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, location: e.target.value })}
          />
          <input
            type="text"
            placeholder="Contact Person"
            className="form-input"
            value={newSubcontractor.contact_person}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, contact_person: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone Number"
            className="form-input"
            value={newSubcontractor.cellnum}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, cellnum: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            className="form-input"
            value={newSubcontractor.email}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Company Reg number"
            className="form-input"
            value={newSubcontractor.company_reg_num}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, company_reg_num: e.target.value })}
          />

          {/* Input for Number of Trucks */}
          <input
            type="number"
            placeholder="No. of Trucks"
            className="form-input"
            min="0"
            value={newSubcontractor.no_of_trucks}
            onChange={handleTrucksChange}
          />

          {/* Main truck registration */}
          <input
            type="text"
            placeholder="Main Truck Registration"
            className="form-input"
            value={newSubcontractor.truckregnum}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, truckregnum: e.target.value })}
          />
        </div>

        <div className="manage-form-actions">
          <button type="button" className="manage-save-button" onClick={handleSaveSubcontractor} disabled={loading}>
            {loading ? "Saving..." : "Add Subcontractor"}
          </button>
          <button type="button" className="manage-cancel-button" onClick={() => setShowSubcontractorForm(false)}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  // Edit handlers (placeholders - would need to be implemented)
  const handleEditEmployee = (id) => {
    console.log(`Edit employee with ID: ${id}`)
    // Implementation would fetch the employee data and populate a form
  }

  const handleEditClient = (id) => {
    console.log(`Edit client with ID: ${id}`)
    // Implementation would fetch the client data and populate a form
  }

  const handleEditTruck = (id) => {
    console.log(`Edit truck with ID: ${id}`)
    // Implementation would fetch the truck data and populate a form
  }

  const handleEditDriverRate = (id) => {
    console.log(`Edit driver rate with ID: ${id}`)
    // Implementation would fetch the driver rate data and populate a form
  }

  const handleEditSubcontractor = (id) => {
    console.log(`Edit subcontractor with ID: ${id}`)
    // Implementation would fetch the subcontractor data and populate a form
  }

  return (
    <div className="manage-container">
      <div className="manage-header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="manage-button-row">
        <button
          className={`manage-tab-button ${activeTab === "employees" ? "active" : ""}`}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`manage-tab-button ${activeTab === "clients" ? "active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          Clients Information
        </button>
        <button
          className={`manage-tab-button ${activeTab === "rates" ? "active" : ""}`}
          onClick={() => setActiveTab("rates")}
        >
          Driver Rates
        </button>
        <button
          className={`manage-tab-button ${activeTab === "subcontractors" ? "active" : ""}`}
          onClick={() => setActiveTab("subcontractors")}
        >
          Subcontractors
        </button>

        <button
          className={`manage-tab-button ${activeTab === "trucks" ? "active" : ""}`}
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
      {activeTab === "subcontractors" && showSubcontractorForm && <RenderSubcontractorForm />}
    </div>
  )
}

export default Manage

