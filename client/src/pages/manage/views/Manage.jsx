"use client";

import { useState, useEffect, useRef } from "react";
import "../css/Manage.css";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the centralized axios instance

const Manage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("employees");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for data
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [driverRates, setDriverRates] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState(null);
  const [editTruckId, setEditTruckId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [subcontractorId, setSubcontractorId] = useState(null);
  const [numTrucks, setNumTrucks] = useState(1);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const emailRef = useRef(null);

  // State for forms
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTruckForm, setShowTruckForm] = useState(false);
  const [showDriverRateForm, setShowDriverRateForm] = useState(false);
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false);

  // Utility function to extract filename from S3 URL
const extractFilenameFromUrl = (url) => {
  if (!url) return "Unknown Document";
  try {
    const decodedPath = decodeURIComponent(new URL(url).pathname);
    const parts = decodedPath.split("/");
    const filename = parts[parts.length - 1].split("?")[0]; // Remove query params
    return filename || "Unknown Document";
  } catch (error) {
    console.error(`Error extracting filename from URL ${url}:`, error);
    return "Unknown Document";
  }
};

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
    // we no longer send `status` in the body
    documents: [],
    existingDocuments: [],
    // Deduction fields (now stored on m5_employee)
    income_tax_rate: "",
    deduction_other_deductions: "",
    deduction_uif: "",
    deduction_bonus: "",
    deduction_savings: "",
    deduction_loan: "",
    deduction_damage: "",
  });

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
  });

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
    existingDocuments: [],
  });
  const [newDriverRate, setNewDriverRate] = useState({
    startingpoint: "",
    destination: "",
    driver_six_meter_rate: "",
    driver_twelve_meter_rate: "",
    subie_six_meter_rate: "",
    subie_twelve_meter_rate: "",
  });

  const [newSubcontractor, setNewSubcontractor] = useState({
    companyname: "",
    location: "",
    contact_person: "",
    cellnum: "",
    email: "",
    subei_reg_num: "",
    no_of_trucks: 1,
    trucks: [{ reg: "", driver: "" }], // always at least one for input visibility
  });

  const CustomAlert = ({ message, onClose }) => {
    return (
      <div className="custom-alert">
        <div className="alert-content">
          <span className="alert-message">{message}</span>
          <button className="alert-close-btn" onClick={onClose}>
            X
          </button>
        </div>
      </div>
    );
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch employees
      const employeesResponse = await api.get("/api/employees");
      setEmployees(employeesResponse.data);

      // Fetch clients
      const clientsResponse = await api.get("/api/m5Clients");
      setClients(clientsResponse.data);

      // Fetch trucks
      const trucksResponse = await api.get("/api/trucks");
      setTrucks(trucksResponse.data);

      // Fetch driver rates
      const ratesResponse = await api.get("/api/driver-rates");
      setDriverRates(ratesResponse.data);

      // Fetch subcontractors
      const subcontractorsResponse = await api.get("/api/subcontractors");
      setSubcontractors(subcontractorsResponse.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      let errorMessage = "Failed to load data. Please try again.";

      if (err.response) {
        const { status } = err.response;
        if (status === 401 || status === 403) {
          navigate("/");
          return;
        }
        errorMessage = err.response.data?.error || errorMessage;
      } else if (err.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  //updated to handle editing (2May)
  const handleSaveEmployee = async (e) => {
    // 1️⃣ Validate required fields
    e.preventDefault();

    // Check the form’s built-in validation; if invalid, show messages and stop
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }

    setLoading(true);

    setLoading(true);
    // clear prior email errors
    emailRef.current.setCustomValidity("");
    try {
      // 1️⃣ Check duplicate email (only on create, not edit)
      if (!editingEmployeeId) {
        const { data } = await api.get(
          `/api/employees/check-email-existence?email=${encodeURIComponent(
            newEmployee.email
          )}`
        );
        if (data.exists) {
          // set field-level error:
          emailRef.current.setCustomValidity(
            "Email already exists. Please use a different one."
          );
          emailRef.current.reportValidity();
          setLoading(false);
          return;
        }
      }
      // 2️⃣ Build FormData
      const formData = new FormData();
      // Append all scalar fields except documents
      [
        "name",
        "surname",
        "telephonenum",
        "cellnum",
        "employeenum",
        "roleid",
        "email",
        "password", // will be blank on edit
        "base_salary",
        "income_tax_rate",
        "deduction_other_deductions",
        "deduction_uif",
        "deduction_bonus",
        "deduction_savings",
        "deduction_loan",
        "deduction_damage",
        // "loan_amount"
      ].forEach((field) => {
        // On edit, skip password if empty
        if (field === "password" && editingEmployeeId && !newEmployee.password)
          return;
        formData.append(field, newEmployee[field] ?? "");
      });
      // Append up to 3 PDF files
      newEmployee.documents.forEach((file) => {
        formData.append("documents", file);
      });

      // 3️⃣ Determine URL & HTTP method
      const url = editingEmployeeId
        ? `/api/employees/${editingEmployeeId}`
        : `/api/employees`;
      const method = editingEmployeeId ? "put" : "post";

      // 4️⃣ Send request
      await api[method](url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // 5️⃣ Refresh the list
      const { data } = await api.get("/api/employees");
      setEmployees(data);

      // 6️⃣ Reset form state
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
        documents: [],
        income_tax_rate: "",
        deduction_other_deductions: "",
        deduction_uif: "",
        deduction_bonus: "",
        deduction_savings: "",
        deduction_loan: "",
        deduction_damage: "",
        // loan_amount: "",
      });
      setEditingEmployeeId(null);
      setShowEmployeeForm(false);
    } catch (err) {
      console.error("Error saving employee:", err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    // Prevent the default form submission
    e.preventDefault();

    // Check the form's built-in validation; if invalid, show messages and stop
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }

    // Start loading indicator
    setLoading(true);

    try {
      // Early exit if client info is missing
      if (!newClient.client || !newClient.representative || !newClient.email) {
        return;
      }

      // Check if email already exists (for new client creation)

      // Check email
      const { data } = await api.get(
        `/api/m5Clients/check-email-existence?email=${encodeURIComponent(
          newClient.email
        )}`
      );

      if (data.exists && !isEditing) {
        // Set a validation error on the email field
        emailRef.current.setCustomValidity(
          "Email already exists. Please use a different one."
        );
        // Triggers the browser to show the error tooltip
        emailRef.current.reportValidity();
        setLoading(false);
        return;
      }

      // Save client (either update or create)
      if (isEditing) {
        // PUT request to update client
        await api.put(`/api/m5Clients/${editingClientId}`, newClient);
      } else {
        // POST request to create client
        await api.post(`/api/m5Clients`, newClient);
      }

      // Refresh client list
      const clientsResponse = await api.get("/api/m5Clients");
      setClients(clientsResponse.data);

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
      });
      setEditingClientId(null);
      setIsEditing(false);
      setShowClientForm(false);
      alert(isEditing ? "Client updated!" : "Client added!");
    } catch (err) {
      console.error("Error saving client:", err);
      alert(`Error saving client: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTruck = async (e) => {
    // Prevent the default form submission
    e.preventDefault();

    // Check the form's built-in validation; if invalid, show messages and stop
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }

    setLoading(true);

    // Create a FormData object to hold form values and files
    const formData = new FormData();
    formData.append("truckregnum", newTruck.truckregnum);
    formData.append("trailersize", newTruck.trailersize);
    formData.append("truckpurchasedate", newTruck.truckpurchasedate);
    formData.append("year", newTruck.year);
    formData.append("model", newTruck.model);
    formData.append("purchase_price", newTruck.purchase_price);
    formData.append("current_evaluation", newTruck.current_evaluation);
    formData.append("vin_num", newTruck.vin_num);
    formData.append("is_subcontractor", newTruck.is_subcontractor);

    // Append each uploaded document to the FormData object
    if (newTruck.documents && newTruck.documents.length) {
      newTruck.documents.forEach((file) => {
        formData.append("documents", file);
      });
    }

    try {
      if (editTruckId) {
        await api.put(`/api/trucks/${editTruckId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await api.post(`/api/trucks`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      const trucksResponse = await api.get("/api/trucks");
      setTrucks(trucksResponse.data);

      // Reset the form state after successful submission
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
        documents: [], // Reset document array as well
      });
      setEditTruckId(null);
      setShowTruckForm(false);
    } catch (err) {
      console.error(
        editTruckId ? "Error updating truck:" : "Error creating truck:",
        err
      );
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriverRate = async (e) => {
    e.preventDefault();

    // Trigger browser validation.
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }

    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
    } = newDriverRate;

    // Prepare payload—convert empty strings to null where desired.
    const cleanedDriverRate = {
      startingpoint,
      destination,
      driver_six_meter_rate:
        driver_six_meter_rate === "" ? null : Number(driver_six_meter_rate),
      driver_twelve_meter_rate:
        driver_twelve_meter_rate === ""
          ? null
          : Number(driver_twelve_meter_rate),
      subie_six_meter_rate:
        subie_six_meter_rate === "" ? null : Number(subie_six_meter_rate),
      subie_twelve_meter_rate:
        subie_twelve_meter_rate === "" ? null : Number(subie_twelve_meter_rate),
    };

    setLoading(true);
    try {
      if (isEditingRate) {
        await api.put(`/api/driver-rates/${editingRateId}`, cleanedDriverRate);
      } else {
        await api.post(`/api/driver-rates`, cleanedDriverRate);
      }

      const ratesResponse = await api.get("/api/driver-rates");
      setDriverRates(ratesResponse.data);

      // Reset the form.
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
      alert(
        `Error saving driver rate: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  //working version
  const handleSaveSubcontractor = async () => {
    setLoading(true);

    try {
      // Prepare truck data
      const truckRegNums = newSubcontractor.trucks
        .map((truck) => truck.reg.trim())
        .filter(Boolean)
        .join(",");

      const subDriverNames = newSubcontractor.trucks
        .map((truck) => truck.driver.trim())
        .filter(Boolean)
        .join(",");

      // Prepare payload
      const payload = {
        companyname: newSubcontractor.companyname,
        location: newSubcontractor.location,
        contact_person: newSubcontractor.contact_person,
        cellnum: newSubcontractor.cellnum,
        email: newSubcontractor.email,
        subei_reg_num: newSubcontractor.subei_reg_num,
        no_of_trucks: newSubcontractor.no_of_trucks,
        truckregnum: truckRegNums,
        subdrivername: subDriverNames,
      };

      // Determine method and URL
      const url = isEditMode
        ? `/api/subcontractors/${subcontractorId}`
        : `/api/subcontractors`;

      const method = isEditMode ? "put" : "post";

      // Save the subcontractor
      await api[method](url, payload);

      // Refresh list after saving
      const subcontractorsResponse = await api.get("/api/subcontractors");
      setSubcontractors(subcontractorsResponse.data);

      // Reset form
      setNewSubcontractor({
        companyname: "",
        location: "",
        contact_person: "",
        cellnum: "",
        email: "",
        subei_reg_num: "",
        no_of_trucks: "",
        trucks: [{ reg: "", driver: "" }],
      });

      setShowSubcontractorForm(false);
      alert(isEditMode ? "Subcontractor updated!" : "Subcontractor added!");
    } catch (err) {
      console.error("Error saving subcontractor:", err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle disable/delete actions
  const handleDisableEmployee = async (id) => {
    setLoading(true);
    try {
      await api.put(`/api/employees/${id}/toggle-status`, { status: false });

      // Refresh employee list
      const employeesResponse = await api.get("/api/employees");
      setEmployees(employeesResponse.data);
    } catch (err) {
      console.error(`Error disabling employee ${id}:`, err);
      alert(
        `Error disabling employee: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableClient = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/api/m5Clients/${id}`);

      // Refresh client list
      const clientsResponse = await api.get("/api/m5Clients");
      setClients(clientsResponse.data);
    } catch (err) {
      console.error(`Error deleting client ${id}:`, err);
      alert(
        `Error deleting client: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTruck = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/api/trucks/${id}`);

      // Refresh truck list
      const trucksResponse = await api.get("/api/trucks");
      setTrucks(trucksResponse.data);
    } catch (err) {
      console.error(`Error deleting truck ${id}:`, err);
      alert(
        `Error deleting truck: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableDriverRate = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/api/driver-rates/${id}`);

      // Refresh driver rate list
      const ratesResponse = await api.get("/api/driver-rates");
      setDriverRates(ratesResponse.data);
    } catch (err) {
      console.error(`Error deleting driver rate ${id}:`, err);
      alert(
        `Error deleting driver rate: ${
          err.response?.data?.error || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSubcontractor = async (id) => {
    setLoading(true);
    try {
      await api.put(`/api/subcontractors/${id}/toggle-status`, {
        status: false,
      });

      // Refresh subcontractor list
      const subcontractorsResponse = await api.get("/api/subcontractors");
      setSubcontractors(subcontractorsResponse.data);
    } catch (err) {
      console.error(`Error disabling subcontractor ${id}:`, err);
      alert(
        `Error disabling subcontractor: ${
          err.response?.data?.error || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setShowEmployeeForm(true);
  };

  const handleAddClient = () => {
    setShowClientForm(true);
  };

  const handleAddTruck = () => {
    setShowTruckForm(true);
  };

  const handleBack = () => {
    if (showEmployeeForm) {
      setShowEmployeeForm(false);
    } else if (showClientForm) {
      setShowClientForm(false);
    } else if (showTruckForm) {
      setShowTruckForm(false);
    } else if (showDriverRateForm) {
      setShowDriverRateForm(false);
    } else if (showSubcontractorForm) {
      setShowSubcontractorForm(false);
    } else {
      navigate("/Dashboard");
    }
  };

  const renderEmployeeTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading employees...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-employees-table1">
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
                    <button
                      className="manage-view-button"
                      onClick={() => handleEditEmployee(employee.userid)}
                    >
                      Edit
                    </button>
                  </td>
                  <td>
                    <button
                      className={
                        employee.status
                          ? "manage-delete-button"
                          : "manage-enable-button"
                      }
                      onClick={() =>
                        handleToggleEmployee(employee.userid, employee.status)
                      }
                    >
                      {employee.status ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="manage-add-employee-button"
        onClick={handleAddEmployee}
      >
        Add Employee
      </button>
    </>
  );
  const handleToggleEmployee = async (id, currentStatus) => {
    setLoading(true);
    try {
      // Flip the status
      const newStatus = !currentStatus;
      await api.put(`/api/employees/${id}/toggle-status`, {
        status: newStatus,
      });

      // Refresh the list
      const { data } = await api.get("/api/employees");
      setEmployees(data);
    } catch (err) {
      console.error(`Error toggling employee ${id}:`, err);
      alert(
        `Error ${currentStatus ? "disabling" : "enabling"} employee: ${
          err.response?.data?.error || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderClientTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading clients...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-clients-table1">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Representative</th>
                <th>Email</th>
                <th>Edit</th>
                <th>Enable / Disable</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.m5clientkey}>
                  <td>{c.client}</td>
                  <td>{c.representative}</td>
                  <td>{c.email}</td>
                  <td>
                    <button
                      className="manage-view-button"
                      onClick={() => handleEditClient(c.m5clientkey)}
                    >
                      Edit
                    </button>
                  </td>
                  <td>
                    <button
                      className={
                        c.status
                          ? "manage-delete-button"
                          : "manage-enable-button"
                      }
                      onClick={() =>
                        handleToggleClient(c.m5clientkey, c.status)
                      }
                    >
                      {c.status ? "Disable" : "Enable"}
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
  );

  const handleToggleClient = async (id, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = !currentStatus;

      // 1) toggle on server
      const { data: updatedClient } = await api.put(
        `/api/clients/${id}/toggle-status`,
        { status: newStatus }
      );

      // 2) update local state (optimistic UI)
      setClients((prev) =>
        prev.map((c) =>
          c.m5clientkey === id ? { ...c, status: updatedClient.status } : c
        )
      );
    } catch (err) {
      console.error(`Error toggling client ${id}:`, err);
      alert(
        `Error ${currentStatus ? "disabling" : "enabling"} client: ${
          err.response?.data?.error || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Generalized toggle handler

  const renderDriverRatesTable = () => (
    <div className="manage-DriverRates-table1">
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
              <th>Subbie Rate (6m)</th>
              <th>Subbie Rate (12m)</th>
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
                <td>
                  {rate.updated_at
                    ? new Date(rate.updated_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <button
                    className="manage-edit-button"
                    onClick={() => handleEditDriverRate(rate.m5ratekey)}
                  >
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    className="manage-delete-button"
                    onClick={() => handleDisableDriverRate(rate.m5ratekey)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <center>
        <button
          className="manage-add-driver-rate-button"
          onClick={() => setShowDriverRateForm(true)}
        >
          New Rate
        </button>
      </center>
    </div>
  );

  const renderSubcontractorsTable = () => (
    <div className="manage-subcontractor-table1">
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
              <th>Status</th>
              <th>Actions</th>
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
                <td>{sub.status ? "Active" : "Inactive"}</td>
                <td>
                  <button
                    className="manage-edit-button"
                    onClick={() => handleEditSubcontractor(sub.userid)}
                  >
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    className={
                      sub.status
                        ? "manage-delete-button"
                        : "manage-enable-button"
                    }
                    onClick={() =>
                      handleToggleSubcontractor(sub.userid, sub.status)
                    }
                  >
                    {sub.status ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <center>
        <button
          className="manage-add-subcontractor-button"
          onClick={() => setShowSubcontractorForm(true)}
        >
          Add Subcontractor
        </button>
      </center>
    </div>
  );

  const handleToggleSubcontractor = async (id, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = !currentStatus;
      await api.put(`/api/subcontractors/${id}/toggle-status`, {
        status: newStatus,
      });

      const response = await api.get("/api/subcontractors");
      setSubcontractors(response.data);
    } catch (err) {
      console.error(`Error toggling subcontractor ${id}:`, err);
      alert(
        `Error ${currentStatus ? "disabling" : "enabling"} subcontractor: ${
          err.response?.data?.error || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTruckTable = () => (
    <>
      {loading ? (
        <div className="loading">Loading trucks...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="manage-trucks-table1">
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
                  <td>
                    {new Date(truck.truckpurchasedate).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="manage-edit-button"
                      onClick={() => handleEditTruck(truck.m5truckskey)}
                    >
                      Edit
                    </button>
                  </td>
                  <td>
                    <button
                      className="manage-delete-button"
                      onClick={() => handleDisableTruck(truck.m5truckskey)}
                    >
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
  );

    const renderEmployeeForm = () => (
    <>
      {/* Hidden form to trigger browser validation */}
      <form
        id="employeeForm"
        noValidate
        style={{ display: "none" }}
        onSubmit={handleSaveEmployee}
      />
      <div className="manage-add-employee-form">
        <h3>Add New Employee</h3>
        <div
          className="manage-form-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {/* Personal Details */}
          <div className="manage-form-group">
            <label>
              Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              form="employeeForm"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>
              Surname <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              value={newEmployee.surname}
              form="employeeForm"
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, surname: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>Telephone Number</label>
            <input
              type="text"
              form="employeeForm"
              value={newEmployee.telephonenum}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, telephonenum: e.target.value })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Cell Number</label>
            <input
              type="text"
              form="employeeForm"
              value={newEmployee.cellnum}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, cellnum: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>Employee Number</label>
            <input
              type="text"
              form="employeeForm"
              value={newEmployee.employeenum}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, employeenum: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>Base Salary</label>
            <input
              type="number"
              form="employeeForm"
              value={newEmployee.base_salary}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, base_salary: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>
              Email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              ref={emailRef}
              type="email"
              form="employeeForm"
              value={newEmployee.email}
              onChange={(e) => {
                emailRef.current.setCustomValidity("");
                setNewEmployee({ ...newEmployee, email: e.target.value });
              }}
              required
            />
          </div>

          <div className="manage-form-group">
            <label>
              Password <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="password"
              form="employeeForm"
              value={newEmployee.password}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, password: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label>
              <strong>Role</strong>
            </label>
            <select
              className="dropdown"
              form="employeeForm"
              value={newEmployee.roleid || ""}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  roleid: parseInt(e.target.value),
                })
              }
            >
              <option value="">Select Role</option>
              <option value="2">Controller</option>
              <option value="4">Director</option>
              <option value="5">Driver</option>
              <option value="3">Finance Clerk</option>
              <option value="0">Yard Staff</option>
            </select>
          </div>

          {/* Deductions */}
          <div style={{ gridColumn: "1 / span 3" }}>
            <h3 style={{ textAlign: "center", marginTop: "30px" }}>
              Employee Salary Deductions
            </h3>
          </div>

          <div className="manage-form-group">
            <label>Income Tax (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              form="employeeForm"
              step="0.01"
              value={newEmployee.income_tax_rate}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  income_tax_rate: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>UIF (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              form="employeeForm"
              step="0.01"
              value={newEmployee.deduction_uif}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_uif: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Loan</label>
            <input
              type="number"
              min="0"
              form="employeeForm"
              value={newEmployee.deduction_loan}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_loan: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Bonus</label>
            <input
              type="number"
              min="0"
              form="employeeForm"
              value={newEmployee.deduction_bonus}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_bonus: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Savings</label>
            <input
              type="number"
              min="0"
              form="employeeForm"
              value={newEmployee.deduction_savings}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_savings: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Damage</label>
            <input
              type="number"
              min="0"
              form="employeeForm"
              value={newEmployee.deduction_damage}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_damage: e.target.value,
                })
              }
            />
          </div>

          <div className="manage-form-group">
            <label>Other Deductions</label>
            <input
              type="number"
              min="0"
              form="employeeForm"
              value={newEmployee.deduction_other_deductions}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  deduction_other_deductions: e.target.value,
                })
              }
            />
          </div>

          <div
            className="manage-form-group"
            style={{ gridColumn: "1 / span 3" }}
          >
            <label>
              <strong>Upload Documents (PDF Only, Max 3)</strong>
            </label>
            <div
              style={{
                border: "2px dashed #ccc",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
              }}
            >
              <input
                type="file"
                accept=".pdf"
                name="documents"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (
                    file &&
                    file.type === "application/pdf" &&
                    newEmployee.documents.length < 3
                  ) {
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

            {/* Combined list of uploaded and existing documents */}
            <div style={{ marginTop: "15px" }}>
              {editingEmployeeId &&
                newEmployee.existingDocuments?.length > 0 && (
                  <>
                    <h4>Previously Uploaded Documents</h4>
                    {newEmployee.existingDocuments.map((url, index) => (
                      <div
                        key={`existing-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ flexGrow: 1 }}>
                          {extractFilenameFromUrl(url)}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginRight: "10px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                          }}
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteEmployeeDocument(url)}
                          style={{
                            backgroundColor: "#f44336",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </>
                )}

              {newEmployee.documents.length > 0 && (
                <>
                  <h4>Newly Uploaded Documents</h4>
                  {newEmployee.documents.map((doc, index) => (
                    <div
                      key={`new-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>{doc.name}</span>
                      <a
                        href={URL.createObjectURL(doc)}
                        download={doc.name}
                        style={{
                          marginRight: "10px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        Download
                      </a>
                      <button
                        onClick={() => {
                          const updatedDocs = [...newEmployee.documents];
                          updatedDocs.splice(index, 1);
                          setNewEmployee({
                            ...newEmployee,
                            documents: updatedDocs,
                          });
                        }}
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submit / Cancel */}
        <div
          className="manage-button-container"
          style={{
            marginTop: "30px",
            display: "flex",
            gap: "16px",
            justifyContent: "center",
          }}
        >
          <button
            type="submit"
            form="employeeForm"
            className="manage-save-button"
            disabled={loading}
          >
            {loading ? "Saving..." : "Confirm Employee Register"}
          </button>
          <button
            onClick={() => setShowEmployeeForm(false)}
            className="manage-cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  const renderClientForm = () => (
    <form
      className="manage-add-client-form"
      onSubmit={handleSaveClient}
      noValidate
    >
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
      <h2>Add New Client</h2>
      <div className="manage-form-grid">
        <div className="manage-form-group">
          <label>
            <strong>Company Name</strong>
          </label>
          <input
            type="text"
            value={newClient.client}
            onChange={(e) =>
              setNewClient({ ...newClient, client: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Representative Name</strong>
          </label>
          <input
            type="text"
            value={newClient.representative}
            onChange={(e) =>
              setNewClient({ ...newClient, representative: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Cell Number</strong>
          </label>
          <input
            type="text"
            value={newClient.cellnum}
            onChange={(e) =>
              setNewClient({ ...newClient, cellnum: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Email Address</strong>
          </label>
          <input
            ref={emailRef}
            type="email"
            value={newClient.email}
            onChange={(e) => {
              // clear the custom error once user types
              emailRef.current.setCustomValidity("");
              setNewClient({ ...newClient, email: e.target.value });
            }}
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Street Address</strong>
          </label>
          <input
            type="text"
            value={newClient.streetaddress}
            onChange={(e) =>
              setNewClient({ ...newClient, streetaddress: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>City</strong>
          </label>
          <input
            type="text"
            value={newClient.city}
            onChange={(e) =>
              setNewClient({ ...newClient, city: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Suburb</strong>
          </label>
          <input
            type="text"
            value={newClient.suburb}
            onChange={(e) =>
              setNewClient({ ...newClient, suburb: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Postal Code</strong>
          </label>
          <input
            type="text"
            value={newClient.postalcode}
            onChange={(e) =>
              setNewClient({ ...newClient, postalcode: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Company Address</strong>
          </label>
          <input
            type="text"
            value={newClient.companyaddress}
            onChange={(e) =>
              setNewClient({ ...newClient, companyaddress: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>Client Reg. Number</strong>
          </label>
          <input
            type="text"
            value={newClient.client_reg_num}
            onChange={(e) =>
              setNewClient({ ...newClient, client_reg_num: e.target.value })
            }
            required
          />
        </div>
        <div className="manage-form-group">
          <label>
            <strong>VAT Reg. Number</strong>
          </label>
          <input
            type="text"
            value={newClient.vatregno}
            onChange={(e) =>
              setNewClient({ ...newClient, vatregno: e.target.value })
            }
            required
          />
        </div>
        {/* Add any additional fields here */}
      </div>

      <div className="manage-button-container">
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
        <button
          type="button"
          onClick={() => setShowClientForm(false)}
          className="manage-cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );

   const renderTruckForm = () => (
    <>
      {/* Hidden form to harness native HTML5 validation */}
      <form
        id="truckForm"
        noValidate
        style={{ display: "none" }}
        onSubmit={handleSaveTruck}
      />

      {/* Your visible UI remains exactly as before */}
      <div className="manage-add-truck-form">
        <h2>{editTruckId ? "Edit Truck" : "Add New Truck"}</h2>
        <div className="manage-truck-form-grid">
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Truck Registration</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.truckregnum}
              onChange={(e) =>
                setNewTruck({ ...newTruck, truckregnum: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Trailer Size</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.trailersize}
              onChange={(e) =>
                setNewTruck({ ...newTruck, trailersize: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Year</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.year}
              onChange={(e) =>
                setNewTruck({ ...newTruck, year: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Model</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.model}
              onChange={(e) =>
                setNewTruck({ ...newTruck, model: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Price</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.purchase_price}
              onChange={(e) =>
                setNewTruck({ ...newTruck, purchase_price: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Current Evaluation</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.current_evaluation}
              onChange={(e) =>
                setNewTruck({ ...newTruck, current_evaluation: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>VIN Number</label>
            <input
              type="text"
              form="truckForm"
              value={newTruck.vin_num}
              onChange={(e) =>
                setNewTruck({ ...newTruck, vin_num: e.target.value })
              }
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Date</label>
            <input
              type="date"
              form="truckForm"
              value={newTruck.truckpurchasedate}
              onChange={(e) =>
                setNewTruck({ ...newTruck, truckpurchasedate: e.target.value })
              }
              required
            />
          </div>

          {/* Document Uploads */}
          <div
            className="manage-form-group"
            style={{ gridColumn: "1 / span 3" }}
          >
            <label>
              <strong>Upload Documents (PDF Only, Max 3)</strong>
            </label>
            <div
              style={{
                border: "2px dashed #ccc",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
              }}
            >
              <input
                type="file"
                accept=".pdf"
                form="truckForm"
                name="truck-documents"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (
                    file &&
                    file.type === "application/pdf" &&
                    (newTruck.documents?.length || 0) < 3
                  ) {
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

            {/* Existing + New Documents List */}
            <div style={{ marginTop: "15px" }}>
              {editTruckId && newTruck.existingDocuments?.length > 0 && (
                <>
                  <h4>Previously Uploaded Documents</h4>
                  {newTruck.existingDocuments.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>
                        {extractFilenameFromUrl(url)}
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginRight: "10px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(url)}
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}

              {newTruck.documents?.length > 0 && (
                <>
                  <h4>Newly Uploaded Documents</h4>
                  {newTruck.documents.map((doc, index) => (
                    <div
                      key={`new-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>{doc.name}</span>
                      <a
                        href={URL.createObjectURL(doc)}
                        download={doc.name}
                        style={{
                          marginRight: "10px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          textDecoration: "none",
                          fontSize: "0.85rem",
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
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submit via the hidden form */}
        <button
          type="submit"
          form="truckForm"
          className="manage-save-button"
          disabled={loading}
        >
          {loading ? "Saving..." : editTruckId ? "Update Truck" : "Add Truck"}
        </button>
      </div>
    </>
  );
  const renderDriverRateForm = () => (
    <form
      onSubmit={handleSaveDriverRate}
      className="manage-driver-rate-form"
      noValidate
    >
      <h2 className="manage-form-title">Add Rate</h2>

      <div className="manage-form-group">
        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Starting Point</strong>
            </label>
            <input
              type="text"
              className="form-input"
              value={newDriverRate.startingpoint}
              onChange={(e) =>
                setNewDriverRate({
                  ...newDriverRate,
                  startingpoint: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Destination</strong>
            </label>
            <input
              type="text"
              className="form-input"
              value={newDriverRate.destination}
              onChange={(e) =>
                setNewDriverRate({
                  ...newDriverRate,
                  destination: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Driver Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={newDriverRate.driver_six_meter_rate}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                if (value >= 0 || e.target.value === "") {
                  setNewDriverRate({
                    ...newDriverRate,
                    driver_six_meter_rate: e.target.value,
                  });
                }
              }}
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Driver Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={newDriverRate.driver_twelve_meter_rate}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                if (value >= 0 || e.target.value === "") {
                  setNewDriverRate({
                    ...newDriverRate,
                    driver_twelve_meter_rate: e.target.value,
                  });
                }
              }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Subbie Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={newDriverRate.subie_six_meter_rate}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                if (value >= 0 || e.target.value === "") {
                  setNewDriverRate({
                    ...newDriverRate,
                    subie_six_meter_rate: e.target.value,
                  });
                }
              }}
            />
          </div>

          <div className="form-field">
            <label>
              <strong>Subbie Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={newDriverRate.subie_twelve_meter_rate}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                if (value >= 0 || e.target.value === "") {
                  setNewDriverRate({
                    ...newDriverRate,
                    subie_twelve_meter_rate: e.target.value,
                  });
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="manage-form-actions">
        <button type="submit" className="manage-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="manage-cancel-button"
          onClick={() => setShowDriverRateForm(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  // Working 11 may
  const RenderSubcontractorForm = ({ setShowSubcontractorForm }) => {
    const [numTrucks, setNumTrucks] = useState(1);
    const [loading, setLoading] = useState(false); // placeholder, update as needed

    const handleTrucksChange = (e) => {
      const value = Number.parseInt(e.target.value, 10);
      const truckCount = isNaN(value) ? 0 : value;
      setNumTrucks(truckCount);
      setNewSubcontractor({
        ...newSubcontractor,
        no_of_trucks: truckCount,
        trucks: Array.from(
          { length: truckCount },
          (_, i) => newSubcontractor.trucks[i] || { reg: "", driver: "" }
        ),
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
        trucks: [...newSubcontractor.trucks, { reg: "", driver: "" }],
        no_of_trucks: newSubcontractor.no_of_trucks + 1,
      });
      setNumTrucks(numTrucks + 1);
    };

    const removeTruckDriver = (index) => {
      const updatedTrucks = [...newSubcontractor.trucks];
      updatedTrucks.splice(index, 1);
      setNewSubcontractor({
        ...newSubcontractor,
        trucks: updatedTrucks,
        no_of_trucks: newSubcontractor.no_of_trucks - 1,
      });
      setNumTrucks(numTrucks - 1);
    };

    return (
      <form
        onSubmit={(e) => e.preventDefault()}
        className="manage-subcontractor-form"
      >
        <h2
          className="manage-form-title"
          style={{ alignItems: "center", textAlign: "center" }}
        >
          {isEditMode ? "Edit Subcontractor" : "Add Subcontractor"}
        </h2>

        <div
          className="manage-subform-group"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          <label>
            <strong>Company Name</strong>
            <input
              type="text"
              className="form-input"
              value={newSubcontractor.companyname}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  companyname: e.target.value,
                })
              }
            />
          </label>

          <label>
            <strong>Location</strong>
            <input
              type="text"
              className="form-input"
              value={newSubcontractor.location}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  location: e.target.value,
                })
              }
            />
          </label>
          <label>
            <strong>Contact Person</strong>
            <input
              type="text"
              className="form-input"
              value={newSubcontractor.contact_person}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  contact_person: e.target.value,
                })
              }
            />
          </label>
          <label>
            <strong>Phone Number</strong>
            <input
              type="text"
              className="form-input"
              value={newSubcontractor.cellnum}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  cellnum: e.target.value,
                })
              }
            />
          </label>

          <label>
            <strong>Email</strong>
            <input
              type="email"
              className="form-input"
              value={newSubcontractor.email}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  email: e.target.value,
                })
              }
            />
          </label>
          <label>
            <strong>Company Reg Number</strong>
            <input
              type="text"
              className="form-input"
              value={newSubcontractor.subei_reg_num}
              onChange={(e) =>
                setNewSubcontractor({
                  ...newSubcontractor,
                  subei_reg_num: e.target.value,
                })
              }
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

        <div style={{ marginTop: "20px", marginBottom: "10px" }}>
          <h3 className="manage-section-title">Trucks and Drivers</h3>
          <button
            type="button"
            className="add-truck-button"
            onClick={addTruckDriver}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              marginLeft: "10px",
            }}
          >
            + Add Truck/Driver
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {newSubcontractor.trucks.map((truck, index) => (
            <div
              key={index}
              className="truck-entry"
              style={{
                gridColumn: "1 / span 3",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                alignItems: "center",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "10px",
              }}
            >
              <label>
                <strong> Truck {index + 1} Reg Number</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.reg}
                  onChange={(e) =>
                    handleTruckDetailChange(index, "reg", e.target.value)
                  }
                />
              </label>
              <label>
                <strong> Driver {index + 1} Name </strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.driver}
                  onChange={(e) =>
                    handleTruckDetailChange(index, "driver", e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => removeTruckDriver(index)}
                style={{
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "fit-content",
                  justifySelf: "end",
                  marginTop: "22px",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="manage-form-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="manage-save-button"
            onClick={handleSaveSubcontractor}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEditMode
              ? "Update Subcontractor"
              : "Add Subcontractor"}
          </button>

          <button
            type="button"
            className="manage-cancel-button"
            onClick={() => setShowSubcontractorForm(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  // 11 May
  const handleEditEmployee = async (id) => {
    try {
      // Fetch the employee record (including deductionHistory and signed document URLs)
      const response = await api.get(`/api/employees/${id}/details`);
      const updatedEmployee = response.data;

      // Build an array of existing document URLs (if available)
      const existingDocuments = [];
      if (updatedEmployee.document_url1)
        existingDocuments.push(updatedEmployee.document_url1);
      if (updatedEmployee.document_url2)
        existingDocuments.push(updatedEmployee.document_url2);
      if (updatedEmployee.document_url3)
        existingDocuments.push(updatedEmployee.document_url3);

      // Use the latest deduction record from deductionHistory, if available
      const latestDeduction =
        updatedEmployee.deductionHistory &&
        updatedEmployee.deductionHistory.length > 0
          ? updatedEmployee.deductionHistory[0]
          : {};

      // Set the form state using the fetched details.
      // The deduction fields are now coming from the latest deduction history.
      setNewEmployee({
        name: updatedEmployee.name,
        surname: updatedEmployee.surname,
        telephonenum: updatedEmployee.telephonenum,
        cellnum: updatedEmployee.cellnum,
        employeenum: updatedEmployee.employeenum,
        roleid: updatedEmployee.roleid,
        email: updatedEmployee.email,
        base_salary: updatedEmployee.base_salary,
        // Use latest deduction values; fallback to empty strings if undefined.
        income_tax_rate: latestDeduction.income_tax_rate || "",
        deduction_other_deductions:
          latestDeduction.deduction_other_deductions || "",
        deduction_uif: latestDeduction.deduction_uif || "",
        deduction_bonus: latestDeduction.deduction_bonus || "",
        deduction_savings: latestDeduction.deduction_savings || "",
        deduction_loan: latestDeduction.deduction_loan || "",
        deduction_damage: latestDeduction.deduction_damage || "",
        password: updatedEmployee.password,
        documents: [],
        existingDocuments, // Array of signed URLs for existing documents
      });

      setEditingEmployeeId(id);
      setShowEmployeeForm(true);
    } catch (error) {
      console.error("Error fetching employee details:", error);
      alert("Could not load employee details.");
    }
  };

  const handleDeleteEmployeeDocument = async (url) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        console.log("Deleting employee document with URL:", url);
        const response = await api.post("/api/employees/delete-doc", {
          employeeId: editingEmployeeId,
          url,
        });

        if (response.data.message === "Document deleted successfully") {
          setNewEmployee((prevState) => ({
            ...prevState,
            existingDocuments: prevState.existingDocuments.filter(
              (doc) => doc !== url
            ),
          }));

          alert("Document deleted successfully.");
        }
      } catch (error) {
        console.error("Failed to delete employee document:", error);
        alert("Error occurred while deleting document.");
      }
    }
  };

  const handleEditClient = async (id) => {
    try {
      const response = await api.get(`/api/m5Clients/${id}`);
      setNewClient(response.data);
      setEditingClientId(id);
      setIsEditing(true);
      setShowClientForm(true);
    } catch (err) {
      console.error(`Error fetching client ${id}:`, err);
      alert("Failed to load client for editing.");
    }
  };

  const handleEditTruck = async (id) => {
    const truckToEdit = trucks.find((t) => t.m5truckskey === id);
    if (truckToEdit) {
      try {
        const response = await api.get(`/api/trucks/${id}`);
        const updatedTruck = response.data;

        const existingDocuments = [];
        if (updatedTruck.document_url1)
          existingDocuments.push(updatedTruck.document_url1);
        if (updatedTruck.document_url2)
          existingDocuments.push(updatedTruck.document_url2);
        if (updatedTruck.document_url3)
          existingDocuments.push(updatedTruck.document_url3);

        setNewTruck({
          ...updatedTruck,
          documents: [], // for new uploads
          existingDocuments,
        });
        setEditTruckId(id);
        setShowTruckForm(true);
      } catch (err) {
        console.error("Failed to fetch truck with documents:", err);
        alert("Could not load truck details.");
      }
    }
  };

  const handleDeleteDocument = async (url) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        console.log("Deleting document with URL:", url); // Log the URL being passed
        const response = await api.post("/api/trucks/delete-doc", {
          truckId: editTruckId,
          url,
        });

        if (response.data.message === "Document deleted successfully") {
          setNewTruck((prevState) => ({
            ...prevState,
            existingDocuments: prevState.existingDocuments.filter(
              (doc) => doc !== url
            ),
          }));

          alert("Document deleted successfully.");
        }
      } catch (error) {
        console.error("Failed to delete document:", error);
        alert("Error occurred while deleting document.");
      }
    }
  };

  const handleEditDriverRate = async (id) => {
    try {
      const response = await api.get(`/api/driver-rates/${id}`);
      setNewDriverRate(response.data);
      setEditingRateId(id);
      setIsEditingRate(true);
      setShowDriverRateForm(true);
    } catch (err) {
      console.error(`Error fetching driver rate ${id}:`, err);
      alert("Failed to load driver rate for editing.");
    }
  };

  const handleEditSubcontractor = async (id) => {
    try {
      const response = await api.get(`/api/subcontractors/${id}`);
      const data = response.data;

      console.log("Received subcontractor data:", data); // Log to see the structure

      // Initialize arrays for truck registrations and driver names
      let truckRegs = [];
      let driverNames = [];

      // Handle truck registration numbers
      if (data.truckregnum) {
        // Ensure it's a string before splitting
        truckRegs =
          typeof data.truckregnum === "string"
            ? data.truckregnum.split(",").map((reg) => reg.trim())
            : Array.isArray(data.truckregnum)
            ? data.truckregnum
            : [String(data.truckregnum)];
      }

      // Handle driver names
      if (data.subdrivername) {
        // Ensure it's a string before splitting
        driverNames =
          typeof data.subdrivername === "string"
            ? data.subdrivername.split(",").map((name) => name.trim())
            : Array.isArray(data.subdrivername)
            ? data.subdrivername
            : [String(data.subdrivername)];
      }

      // Create trucks array with both registration and driver info
      const trucks = [];
      const maxLength = Math.max(truckRegs.length, driverNames.length);

      for (let i = 0; i < maxLength; i++) {
        trucks.push({
          reg: truckRegs[i] || "",
          driver: driverNames[i] || "",
        });
      }

      // If no trucks were found, add an empty one
      if (trucks.length === 0) {
        trucks.push({ reg: "", driver: "" });
      }

      // Set form state
      setNewSubcontractor({
        companyname: data.companyname || "",
        location: data.location || "",
        contact_person: data.contact_person || "",
        cellnum: data.cellnum || "",
        email: data.email || "",
        subei_reg_num: data.subei_reg_num || "",
        no_of_trucks: data.no_of_trucks || trucks.length,
        truckregnum: data.truckregnum || "",
        subdrivername: data.subdrivername || "",
        trucks: trucks,
      });

      setSubcontractorId(id);
      setIsEditMode(true);
      setNumTrucks(trucks.length);
      setShowSubcontractorForm(true);
    } catch (error) {
      console.error("❌ Failed to fetch subcontractor:", error);
      alert(`Failed to load subcontractor for editing. ${error.message}`);
    }
  };

  return (
    <div className="manage-container">
      <div className="manage-header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="manage-button-row">
        <button
          className={`manage-tab-button ${
            activeTab === "employees" ? "active" : ""
          }`}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`manage-tab-button ${
            activeTab === "clients" ? "active" : ""
          }`}
          onClick={() => setActiveTab("clients")}
        >
          Clients Information
        </button>
        <button
          className={`manage-tab-button ${
            activeTab === "rates" ? "active" : ""
          }`}
          onClick={() => setActiveTab("rates")}
        >
          Driver Rates
        </button>
        <button
          className={`manage-tab-button ${
            activeTab === "subcontractors" ? "active" : ""
          }`}
          onClick={() => setActiveTab("subcontractors")}
        >
          Subcontractors
        </button>

        <button
          className={`manage-tab-button ${
            activeTab === "trucks" ? "active" : ""
          }`}
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

      {activeTab === "subcontractors" &&
        !showSubcontractorForm &&
        renderSubcontractorsTable()}
      {activeTab === "subcontractors" && showSubcontractorForm && (
        <RenderSubcontractorForm />
      )}
    </div>
  );
};

export default Manage;
