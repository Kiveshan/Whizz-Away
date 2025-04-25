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
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [isEditing, setIsEditing] = useState(false)
const [editingClientId, setEditingClientId] = useState(null)
const [isEditingRate, setIsEditingRate] = useState(false)
const [editingRateId, setEditingRateId] = useState(null)
const [editTruckId, setEditTruckId] = useState(null)





  // State for forms
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showTruckForm, setShowTruckForm] = useState(false)
  const [showDriverRateForm, setShowDriverRateForm] = useState(false)
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false)

  // State for new items
// Update the newEmployee state to include deduction fields
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
  documents: [], // ✅ Initialize as empty array to avoid undefined
  // Deduction fields
  deduction_income_tax: "",
  deduction_other_deductions: "",
  deduction_uif: "",
  deduction_bonus: "",
  deduction_savings: "",
  deduction_loan: "",
  deduction_damage: ""
})

  const [newClient, setNewClient] = useState({
    client: "",
    representative: "",
    companyaddress: "",
    suburb: "",
    postalcode: "",
    email: "",
    client_reg_num: "",
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
    driver_six_meter_rate: "",
    driver_twelve_meter_rate: "",
    subie_six_meter_rate: "",
    subie_twelve_meter_rate: ""
  })
  

  const [newSubcontractor, setNewSubcontractor] = useState({
    companyname: "",
    location: "",
    contact_person: "",
    cellnum: "",
    email: "",
    subei_reg_num: "",
    no_of_trucks: 0,
    truckregnum: "", // Will store comma-separated truck registration numbers
    SubDriverName: "", // Will store comma-separated driver names
    // Keep trucks array for UI management, but we'll extract values before sending
    trucks: []
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
      alert("Please fill in all required fields.");
      return;
    }
  
    setLoading(true);
  
    try {
      if (editingEmployeeId) {
        // Update existing employee
        await axios.put(`${API_URL}/employees/${editingEmployeeId}`, newEmployee, getAuthHeaders());
      } else {
        // Create new employee
        await axios.post(`${API_URL}/employees`, newEmployee, getAuthHeaders());
      }
  
      // Refresh employee list
      const employeesResponse = await axios.get(`${API_URL}/employees`, getAuthHeaders());
      setEmployees(employeesResponse.data);
  
      // Reset form and editing state
      setNewEmployee({
        name: "",
        surname: "",
        telephonenum: "",
        cellnum: "",
        employeenum: "",
        rolename: "",
        email: "",
        password: "",
        base_salary: "",
        status: true,
        deduction_income_tax: "",
        deduction_other_deductions: "",
        deduction_uif: "",
        deduction_bonus: "",
        deduction_savings: "",
        deduction_loan: "",
        deduction_damage: "",
      });
      setEditingEmployeeId(null); // Clear editing state
      setShowEmployeeForm(false);
    } catch (err) {
      console.error("Error saving employee:", err);
      alert(`Error saving employee: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveClient = async () => {
    if (!newClient.client || !newClient.representative || !newClient.email) {
      alert("Please fill in all required fields.")
      return
    }
  
    setLoading(true)
    try {
      if (isEditing) {
        // PUT request to update client
        await axios.put(`${API_URL}/clients/${editingClientId}`, newClient, getAuthHeaders())
      } else {
        // POST request to create client
        await axios.post(`${API_URL}/clients`, newClient, getAuthHeaders())
      }
  
      // Refresh client list
      const clientsResponse = await axios.get(`${API_URL}/clients`, getAuthHeaders())
      setClients(clientsResponse.data)
  
      // Reset form
      setNewClient({
        client: "",
        representative: "",
        companyaddress: "",
        suburb: "",
        postalcode: "",
        email: "",
        client_reg_num: "",
        cellnum: "",
        vatregno: "",
        city: "",
        streetaddress: "",
      })
      setEditingClientId(null)
      setIsEditing(false)
      setShowClientForm(false)
    } catch (err) {
      console.error("Error saving client:", err)
      alert(`Error saving client: ${err.response?.data?.error || err.message}`)
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
      if (editTruckId) {
        await axios.put(`${API_URL}/trucks/${editTruckId}`, newTruck, getAuthHeaders())
      } else {
        await axios.post(`${API_URL}/trucks`, newTruck, getAuthHeaders())
      }
  
      const trucksResponse = await axios.get(`${API_URL}/trucks`, getAuthHeaders())
      setTrucks(trucksResponse.data)
  
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
      setEditTruckId(null)
      setShowTruckForm(false)
    } catch (err) {
      console.error(editTruckId ? "Error updating truck:" : "Error creating truck:", err)
      alert(`Error: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }
  

  const handleSaveDriverRate = async () => {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate
    } = newDriverRate;
  
    if (!startingpoint || !destination || !driver_six_meter_rate || !driver_twelve_meter_rate || !subie_six_meter_rate || !subie_twelve_meter_rate) {
      alert("Please fill in all required fields.");
      return;
    }
  
    setLoading(true);
    try {
      if (isEditingRate) {
        await axios.put(`${API_URL}/driver-rates/${editingRateId}`, newDriverRate, getAuthHeaders());
      } else {
        await axios.post(`${API_URL}/driver-rates`, newDriverRate, getAuthHeaders());
      }
  
      const ratesResponse = await axios.get(`${API_URL}/driver-rates`, getAuthHeaders());
      setDriverRates(ratesResponse.data);
  
      setNewDriverRate({
        startingpoint: "",
        destination: "",
        driver_six_meter_rate: "",
        driver_twelve_meter_rate: "",
        subie_six_meter_rate: "",
        subie_twelve_meter_rate: "",
      });
  
      setIsEditingRate(false);
      setEditingRateId(null);
      setShowDriverRateForm(false);
    } catch (err) {
      console.error("Error saving driver rate:", err);
      alert(`Error saving driver rate: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  
const handleSaveSubcontractor = async () => {
  setLoading(true);

  try {
    const truckRegNums = newSubcontractor.trucks
      .map(truck => truck.reg.trim())
      .filter(Boolean)
      .join(',');

    const subDriverNames = newSubcontractor.trucks
      .map(truck => truck.driver.trim())
      .filter(Boolean)
      .join(',');

    const payload = {
      companyname: newSubcontractor.companyname,
      location: newSubcontractor.location,
      contact_person: newSubcontractor.contact_person,
      cellnum: newSubcontractor.cellnum,
      email: newSubcontractor.email,
      subei_reg_num: newSubcontractor.subei_reg_num,
      no_of_trucks: newSubcontractor.no_of_trucks,
      truckregnum: truckRegNums,
      subdrivername: subDriverNames
    };

    await axios.post(`${API_URL}/subcontractors`, payload, getAuthHeaders());

    const subcontractorsResponse = await axios.get(`${API_URL}/subcontractors`, getAuthHeaders());
    setSubcontractors(subcontractorsResponse.data);

    setNewSubcontractor({
      companyname: "",
      location: "",
      contact_person: "",
      cellnum: "",
      email: "",
      subei_reg_num: "",
      no_of_trucks: "",
      trucks: [{ reg: "", driver: "" }]
    });

    setShowSubcontractorForm(false);
  } catch (err) {
    console.error("Error saving subcontractor:", err);
    alert(`Error: ${err.response?.data?.error || err.message}`);
  } finally {
    setLoading(false);
  }
};

  

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
                <th>Name</th>
                <th>Status</th>
                <th>Employee No</th>
                <th>Role</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.userid}>
                  <td>{`${employee.name} ${employee.surname}`}</td>
                  <td>{employee.status ? "Active" : "Inactive"}</td>
                  <td>{employee.employeenum}</td>
                  <td>{employee.rolename}</td>
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
                <th>Client</th>
                <th>Representative</th>
                <th>Email</th>
                <th>Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.m5clientkey}>
                  <td>{client.client}</td>
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
              <th>Ending Point</th>
              <th>Driver Rate (6m)</th>
              <th>Driver Rate (12m)</th>
              <th>Subie Rate (6m)</th>
              <th>Subie Rate (12m)</th>
              <th>Updated at</th>
              <th>Changes</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {driverRates.map((rate) => (
              <tr key={rate.m5ratekey}>
                <td>{rate.startingpoint}</td>
                <td>{rate.destination}</td>
                <td>{rate.driver_six_meter_rate}</td>
                <td>{rate.driver_twelve_meter_rate}</td>
                <td>{rate.subie_six_meter_rate}</td>
                <td>{rate.subie_twelve_meter_rate}</td>
                <td>{rate.updated_at ? new Date(rate.updated_at).toLocaleDateString() : "N/A"}</td>
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
  );
  

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
                <td>{sub.contact_person}</td>
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
      <h3>Add New Employee</h3>
      <div
        className="manage-form-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        {/* Personal Details */}
        <div className="manage-form-group">
          <label>Name</label>
          <input
            type="text"
            value={newEmployee.name}
            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Surname</label>
          <input
            type="text"
            value={newEmployee.surname}
            onChange={(e) => setNewEmployee({ ...newEmployee, surname: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Telephone Number</label>
          <input
            type="text"
            value={newEmployee.telephonenum}
            onChange={(e) => setNewEmployee({ ...newEmployee, telephonenum: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Cell Number</label>
          <input
            type="text"
            value={newEmployee.cellnum}
            onChange={(e) => setNewEmployee({ ...newEmployee, cellnum: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Employee Number</label>
          <input
            type="text"
            value={newEmployee.employeenum}
            onChange={(e) => setNewEmployee({ ...newEmployee, employeenum: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Base Salary</label>
          <input
            type="number"
            value={newEmployee.base_salary}
            onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Email</label>
          <input
            type="email"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Password</label>
          <input
            type="password"
            value={newEmployee.password}
            onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
          />
        </div>
  

  
        {/* Deductions */}
        <div className="manage-form-group">
          <label>Income Tax</label>
          <input
            type="number"
            value={newEmployee.deduction_income_tax}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_income_tax: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>UIF</label>
          <input
            type="number"
            value={newEmployee.deduction_uif}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_uif: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Loan</label>
          <input
            type="number"
            value={newEmployee.deduction_loan}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_loan: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Bonus</label>
          <input
            type="number"
            value={newEmployee.deduction_bonus}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_bonus: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Savings</label>
          <input
            type="number"
            value={newEmployee.deduction_savings}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_savings: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Damage</label>
          <input
            type="number"
            value={newEmployee.deduction_damage}
            onChange={(e) => setNewEmployee({ ...newEmployee, deduction_damage: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label>Other Deductions</label>
          <input
            type="number"
            value={newEmployee.deduction_other_deductions}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, deduction_other_deductions: e.target.value })
            }
          />
        </div>
                {/* File upload section */}
        <div className="manage-form-group" style={{ gridColumn: '1 / span 3' }}>
          <label><strong>Upload Documents (PDF Only, Max 3)</strong></label>
          <div
            style={{
              border: '2px dashed #ccc',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.type === "application/pdf" && newEmployee.documents.length < 3) {
                  setNewEmployee({
                    ...newEmployee,
                    documents: [...newEmployee.documents, file],
                  });
                }
              }}
              disabled={newEmployee.documents.length >= 3}
            />
            <small>
              {newEmployee.documents.length >= 3
                ? "Maximum of 3 PDF documents uploaded"
                : "Upload PDF documents only"}
            </small>
          </div>
  
          {/* List uploaded files */}
          <div style={{ marginTop: '10px' }}>
            {newEmployee.documents.map((doc, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ flexGrow: 1 }}>{doc.name}</span>
                <a
                  href={URL.createObjectURL(doc)}
                  download={doc.name}
                  style={{
                    marginRight: '10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                  }}
                >
                  Download
                </a>
                <button
                  onClick={() => {
                    const updatedDocs = [...newEmployee.documents];
                    updatedDocs.splice(index, 1);
                    setNewEmployee({ ...newEmployee, documents: updatedDocs });
                  }}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
  
      {/* Submit / Cancel */}
      <div
        className="manage-button-container"
        style={{ marginTop: '30px', display: 'flex', gap: '16px', justifyContent: 'center' }}
      >
        <button onClick={handleSaveEmployee} className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Confirm Employee Register"}
        </button>
        <button onClick={() => setShowEmployeeForm(false)} className="manage-cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
  
  
  

  const renderClientForm = () => (
    <div className="manage-add-client-form">
      <h2>Add New Client</h2>
      <div className="manage-form-grid">
        <div className="manage-form-group">
          <label><strong>Company Name</strong></label>
          <input
            type="text"
            value={newClient.client}
            onChange={(e) => setNewClient({ ...newClient, client: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Representative Name</strong></label>
          <input
            type="text"
            value={newClient.representative}
            onChange={(e) => setNewClient({ ...newClient, representative: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Cell Number</strong></label>
          <input
            type="text"
            value={newClient.cellnum}
            onChange={(e) => setNewClient({ ...newClient, cellnum: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Email Address</strong></label>
          <input
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Street Address</strong></label>
          <input
            type="text"
            value={newClient.streetaddress}
            onChange={(e) => setNewClient({ ...newClient, streetaddress: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>City</strong></label>
          <input
            type="text"
            value={newClient.city}
            onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Suburb</strong></label>
          <input
            type="text"
            value={newClient.suburb}
            onChange={(e) => setNewClient({ ...newClient, suburb: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Postal Code</strong></label>
          <input
            type="text"
            value={newClient.postalcode}
            onChange={(e) => setNewClient({ ...newClient, postalcode: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Company Address</strong></label>
          <input
            type="text"
            value={newClient.companyaddress}
            onChange={(e) => setNewClient({ ...newClient, companyaddress: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>Company Reg. Number</strong></label>
          <input
            type="text"
            value={newClient.client_reg_num}
            onChange={(e) => setNewClient({ ...newClient, client_reg_num: e.target.value })}
          />
        </div>
        <div className="manage-form-group">
          <label><strong>VAT Reg. Number</strong></label>
          <input
            type="text"
            value={newClient.vatregno}
            onChange={(e) => setNewClient({ ...newClient, vatregno: e.target.value })}
          />
        </div>
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
  );
  

  const renderTruckForm = () => (
    <div className="manage-add-truck-form">
      <h2>Add New Truck</h2>
      <div className="manage-truck-form-grid">
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Truck Registration</label>
          <input
            type="text"
            value={newTruck.truckregnum}
            onChange={(e) => setNewTruck({ ...newTruck, truckregnum: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Trailer Size</label>
          <input
            type="text"
            value={newTruck.trailersize}
            onChange={(e) => setNewTruck({ ...newTruck, trailersize: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Year</label>
          <input
            type="text"
            value={newTruck.year}
            onChange={(e) => setNewTruck({ ...newTruck, year: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Model</label>
          <input
            type="text"
            value={newTruck.model}
            onChange={(e) => setNewTruck({ ...newTruck, model: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Purchase Price</label>
          <input
            type="text"
            value={newTruck.purchase_price}
            onChange={(e) => setNewTruck({ ...newTruck, purchase_price: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Current Evaluation</label>
          <input
            type="text"
            value={newTruck.current_evaluation}
            onChange={(e) => setNewTruck({ ...newTruck, current_evaluation: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>VIN Number</label>
          <input
            type="text"
            value={newTruck.vin_num}
            onChange={(e) => setNewTruck({ ...newTruck, vin_num: e.target.value })}
          />
        </div>
  
        <div className="manage-form-group">
          <label style={{ fontWeight: 'bold' }}>Purchase Date</label>
          <input
            type="date"
            value={newTruck.truckpurchasedate}
            onChange={(e) => setNewTruck({ ...newTruck, truckpurchasedate: e.target.value })}
          />
        </div>
  
        {/* File upload section */}
        <div className="manage-form-group" style={{ gridColumn: '1 / span 3' }}>
          <label><strong>Upload Documents (PDF Only, Max 3)</strong></label>
          <div
            style={{
              border: '2px dashed #ccc',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
            }}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.type === "application/pdf" && (newTruck.documents?.length || 0) < 3) {
                  setNewTruck({
                    ...newTruck,
                    documents: [...(newTruck.documents || []), file],
                  });
                }
              }}
              disabled={(newTruck.documents?.length || 0) >= 3}
            />
            <small>
              {(newTruck.documents?.length || 0) >= 3
                ? "Maximum of 3 PDF documents uploaded"
                : "Upload PDF documents only"}
            </small>
          </div>
  
          {/* List uploaded files */}
          <div style={{ marginTop: '10px' }}>
            {(newTruck.documents || []).map((doc, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ flexGrow: 1 }}>{doc.name}</span>
                <a
                  href={URL.createObjectURL(doc)}
                  download={doc.name}
                  style={{
                    marginRight: '10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                  }}
                >
                  Download
                </a>
                <button
                  onClick={() => {
                    const updatedDocs = [...newTruck.documents];
                    updatedDocs.splice(index, 1);
                    setNewTruck({ ...newTruck, documents: updatedDocs });
                  }}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
  
      <button onClick={handleSaveTruck} className="manage-save-button" disabled={loading}>
        {loading ? "Saving..." : editTruckId ? "Update Truck" : "Add Truck"}
      </button>
    </div>
  );
  
  

  const renderDriverRateForm = () => (
    <form onSubmit={(e) => e.preventDefault()} className="manage-driver-rate-form">
      <h2 className="manage-form-title">Add Driver Rate</h2>
  
      <div className="manage-form-group">
  
        <div className="form-row">
          <div className="form-field">
            <label><strong>Starting Point</strong></label>
            <input
              type="text"
              className="form-input"
              value={newDriverRate.startingpoint}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, startingpoint: e.target.value })}
            />
          </div>
  
          <div className="form-field">
            <label><strong>Destination</strong></label>
            <input
              type="text"
              className="form-input"
              value={newDriverRate.destination}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, destination: e.target.value })}
            />
          </div>
        </div>
  
        <div className="form-row">
          <div className="form-field">
            <label><strong>Driver Rate (6m)</strong></label>
            <input
              type="number"
              className="form-input"
              value={newDriverRate.driver_six_meter_rate}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, driver_six_meter_rate: e.target.value })}
            />
          </div>
  
          <div className="form-field">
            <label><strong>Driver Rate (12m)</strong></label>
            <input
              type="number"
              className="form-input"
              value={newDriverRate.driver_twelve_meter_rate}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, driver_twelve_meter_rate: e.target.value })}
            />
          </div>
        </div>
  
        <div className="form-row">
          <div className="form-field">
            <label><strong>Subie Rate (6m)</strong></label>
            <input
              type="number"
              className="form-input"
              value={newDriverRate.subie_six_meter_rate}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, subie_six_meter_rate: e.target.value })}
            />
          </div>
  
          <div className="form-field">
            <label><strong>Subie Rate (12m)</strong></label>
            <input
              type="number"
              className="form-input"
              value={newDriverRate.subie_twelve_meter_rate}
              onChange={(e) => setNewDriverRate({ ...newDriverRate, subie_twelve_meter_rate: e.target.value })}
            />
          </div>
        </div>
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
  
  
  
const RenderSubcontractorForm = ({ setShowSubcontractorForm }) => {
  const [numTrucks, setNumTrucks] = useState(0);
  // const [newSubcontractor, setNewSubcontractor] = useState({
  //   companyname: '',
  //   location: '',
  //   contact_person: '',
  //   cellnum: '',
  //   email: '',
  //   subei_reg_num: '',
  //   no_of_trucks: 0,
  //   truckregnum: '',
  //   trucks: [],
  // });

  const handleTrucksChange = (e) => {
    const value = parseInt(e.target.value, 10);
    const truckCount = isNaN(value) ? 0 : value;
    setNumTrucks(truckCount);
    setNewSubcontractor({
      ...newSubcontractor,
      no_of_trucks: truckCount,
      trucks: Array.from({ length: truckCount }, (_, i) => newSubcontractor.trucks[i] || { reg: '', driver: '' })
    });
  };

  const handleTruckDetailChange = (index, field, value) => {
    const updatedTrucks = [...newSubcontractor.trucks];
    updatedTrucks[index] = { ...updatedTrucks[index], [field]: value };
    setNewSubcontractor({ ...newSubcontractor, trucks: updatedTrucks });
  };

  const addTruckDriver = () => {
    setNewSubcontractor({
      ...newSubcontractor,
      trucks: [...newSubcontractor.trucks, { reg: '', driver: '' }],
      no_of_trucks: newSubcontractor.no_of_trucks + 1
    });
    setNumTrucks(numTrucks + 1);
  };

  const removeTruckDriver = (index) => {
    const updatedTrucks = [...newSubcontractor.trucks];
    updatedTrucks.splice(index, 1);
    setNewSubcontractor({
      ...newSubcontractor,
      trucks: updatedTrucks,
      no_of_trucks: newSubcontractor.no_of_trucks - 1
    });
    setNumTrucks(numTrucks - 1);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="manage-subcontractor-form">
      <h2 className="manage-form-title" style={{ alignItems: "center" }}>Add Subcontractor</h2>

      <div className="manage-subform-group" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px' 
      }}>
        <label>
          <strong>Company Name</strong>
          <input
            type="text"
            className="form-input"
            value={newSubcontractor.companyname}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, companyname: e.target.value })}
          />
        </label>
        <label>
          <strong>Location</strong>
          <input
            type="text"
            className="form-input"
            value={newSubcontractor.location}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, location: e.target.value })}
          />
        </label>
        <label>
          <strong>Contact Person</strong>
          <input
            type="text"
            className="form-input"
            value={newSubcontractor.contact_person}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, contact_person: e.target.value })}
          />
        </label>
        <label>
          <strong>Phone Number</strong>
          <input
            type="text"
            className="form-input"
            value={newSubcontractor.cellnum}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, cellnum: e.target.value })}
          />
        </label>
        <label>
          <strong>Email</strong>
          <input
            type="email"
            className="form-input"
            value={newSubcontractor.email}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
          />
        </label>
        <label>
          <strong>Company Reg Number</strong>
          <input
            type="text"
            className="form-input"
            value={newSubcontractor.subei_reg_num}
            onChange={(e) => setNewSubcontractor({ ...newSubcontractor, subei_reg_num: e.target.value })}
          />
        </label>
        <label>
          <strong>No. of Trucks</strong>
          <input
            type="number"
            className="form-input"
            min="0"
            value={newSubcontractor.no_of_trucks}
            onChange={handleTrucksChange}
          />
        </label>
      </div>

      <div style={{ marginTop: '20px', marginBottom: '10px' }}>
        <h3 className="manage-section-title">Trucks and Drivers</h3>
        <button 
          type="button" 
          className="add-truck-button" 
          onClick={addTruckDriver}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          + Add Truck/Driver
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px' 
      }}>
        {newSubcontractor.trucks.map((truck, index) => (
          <div key={index} className="truck-entry" style={{ 
            gridColumn: '1 / span 3',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            alignItems: 'center',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px'
          }}>
            <label>
           <strong>  Truck {index + 1} Reg Number</strong> 
              <input
                type="text"
                className="form-input"
                value={truck.reg}
                onChange={(e) => handleTruckDetailChange(index, 'reg', e.target.value)}
              />
            </label>
            <label>
             <strong> Driver {index + 1} Name </strong>
              <input
                type="text"
                className="form-input"
                value={truck.driver}
                onChange={(e) => handleTruckDetailChange(index, 'driver', e.target.value)}
              />
            </label>
            <button 
              type="button" 
              onClick={() => removeTruckDriver(index)}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: 'fit-content',
                justifySelf: 'end',
                marginTop: '22px'
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="manage-form-actions" style={{ marginTop: '20px' }}>
        <button type="button" className="manage-save-button" onClick={handleSaveSubcontractor} disabled={loading}>
          {loading ? "Saving..." : "Add Subcontractor"}
        </button>
        <button type="button" className="manage-cancel-button" onClick={() => setShowSubcontractorForm(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
};

  
  

  // const RenderSubcontractorForm = () => {
  //   const [numTrucks, setNumTrucks] = useState(0)

  //   const handleTrucksChange = (e) => {
  //     const value = Number.parseInt(e.target.value, 10)
  //     setNumTrucks(isNaN(value) ? 0 : value)
  //     setNewSubcontractor({ ...newSubcontractor, no_of_trucks: isNaN(value) ? 0 : value })
  //   }

  //   return (
  //     <form onSubmit={(e) => e.preventDefault()} className="manage-subcontractor-form">
  //       <h2 className="manage-form-title" style={{ alignItems: "center" }}>
  //         Add Subcontractor
  //       </h2>

  //       <div className="manage-subform-group">
  //         <input
  //           type="text"
  //           placeholder="Name"
  //           className="form-input"
  //           value={newSubcontractor.name}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Company Name"
  //           className="form-input"
  //           value={newSubcontractor.companyname}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, companyname: e.target.value })}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Location"
  //           className="form-input"
  //           value={newSubcontractor.location}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, location: e.target.value })}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Contact Person"
  //           className="form-input"
  //           value={newSubcontractor.contact_person}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, contact_person: e.target.value })}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Phone Number"
  //           className="form-input"
  //           value={newSubcontractor.cellnum}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, cellnum: e.target.value })}
  //         />
  //         <input
  //           type="email"
  //           placeholder="Email"
  //           className="form-input"
  //           value={newSubcontractor.email}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
  //         />
  //         <input
  //           type="text"
  //           placeholder="Company Reg number"
  //           className="form-input"
  //           value={newSubcontractor.company_reg_num}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, company_reg_num: e.target.value })}
  //         />

  //         {/* Input for Number of Trucks */}
  //         <input
  //           type="number"
  //           placeholder="No. of Trucks"
  //           className="form-input"
  //           min="0"
  //           value={newSubcontractor.no_of_trucks}
  //           onChange={handleTrucksChange}
  //         />

  //         {/* Main truck registration */}
  //         <input
  //           type="text"
  //           placeholder="Main Truck Registration"
  //           className="form-input"
  //           value={newSubcontractor.truckregnum}
  //           onChange={(e) => setNewSubcontractor({ ...newSubcontractor, truckregnum: e.target.value })}
  //         />
  //       </div>

  //       <div className="manage-form-actions">
  //         <button type="button" className="manage-save-button" onClick={handleSaveSubcontractor} disabled={loading}>
  //           {loading ? "Saving..." : "Add Subcontractor"}
  //         </button>
  //         <button type="button" className="manage-cancel-button" onClick={() => setShowSubcontractorForm(false)}>
  //           Cancel
  //         </button>
  //       </div>
  //     </form>
  //   )
  // }

  // Edit handlers (placeholders - would need to be implemented)
  const handleEditEmployee = (id) => {
    const employee = employees.find((e) => e.userid === id);
    if (employee) {
      setNewEmployee({
        name: employee.name,
        surname: employee.surname,
        telephonenum: employee.telephonenum,
        cellnum: employee.cellnum,
        employeenum: employee.employeenum,
        roleid: employee.roleid,
        email: employee.email,
        password: "", // leave empty for security
        base_salary: employee.base_salary,
        deduction_income_tax: employee.deduction_income_tax,
        deduction_uif: employee.deduction_uif,
        deduction_bonus: employee.deduction_bonus,
        deduction_savings: employee.deduction_savings,
        deduction_loan: employee.deduction_loan,
        deduction_damage: employee.deduction_damage,
        deduction_other_deductions: employee.deduction_other_deductions,
      });
      setEditingEmployeeId(id);
      setShowEmployeeForm(true);
    }
  };
  

  const handleEditClient = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/clients/${id}`, getAuthHeaders())
      setNewClient(response.data)
      setEditingClientId(id)
      setIsEditing(true)
      setShowClientForm(true)
    } catch (err) {
      console.error(`Error fetching client ${id}:`, err)
      alert("Failed to load client for editing.")
    }
  }
  

  const handleEditTruck = (id) => {
    const truckToEdit = trucks.find((t) => t.m5truckskey === id)
    if (truckToEdit) {
      setNewTruck(truckToEdit)
      setEditTruckId(id)
      setShowTruckForm(true)
    }
  }
  

  const handleEditDriverRate = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/driver-rates/${id}`, getAuthHeaders())
      setNewDriverRate(response.data)
      setEditingRateId(id)
      setIsEditingRate(true)
      setShowDriverRateForm(true)
    } catch (err) {
      console.error(`Error fetching driver rate ${id}:`, err)
      alert("Failed to load driver rate for editing.")
    }
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

