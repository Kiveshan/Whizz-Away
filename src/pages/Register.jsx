import React, { useState } from 'react';
import '../css/register.css';

const Register = ({ switchToLogin, closePopup }) => {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    companyname: "",
    company_reg_number: "",
    cluster_box: "",
    street: "",
    cell_num: "",
    cell_num2: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch: "",
    branch_code: "",
 
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        alert("Registration successful! Please login.");
        closePopup();
        switchToLogin();
      } else {
        setErrorMessage(data.message || "Registration failed");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <center>
          <div className="logo-container1">
            <img src="/images/whizz-away.jpeg" alt="Whizz-Away Logo" className="logo-image1" />
          </div>
        </center>
        <h1 className="register-title">Register</h1>

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-row three-fields">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="First Name" className="form-input" required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="form-input" required/>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" name="companyname" value={formData.companyname} onChange={handleChange} placeholder="Company Name" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Company Reg. No.</label>
              <input type="text" name="company_reg_number" value={formData.company_reg_number} onChange={handleChange} placeholder="Reg. No." className="form-input" required/>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Cluster Box</label>
              <input type="text" name="cluster_box" value={formData.cluster_box} onChange={handleChange} placeholder="Cluster Box" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Street</label>
              <input type="text" name="street" value={formData.street} onChange={handleChange} placeholder="Street" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Cell Number</label>
              <input type="text" name="cell_num" value={formData.cell_num} onChange={handleChange} placeholder="Cell Number" className="form-input" required/>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Alternate Cell</label>
              <input type="text" name="cell_num2" value={formData.cell_num2} onChange={handleChange} placeholder="Alternate Cell" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>VAT Reg No.</label>
              <input type="text" name="vat_reg_num" value={formData.vat_reg_num} onChange={handleChange} placeholder="VAT Number" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input type="text" name="account_num" value={formData.account_num} onChange={handleChange} placeholder="Account Number" className="form-input" required/>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Account Name</label>
              <input type="text" name="name_of_acc" value={formData.name_of_acc} onChange={handleChange} placeholder="Name of Account" className="form-input" required/>
            </div>
            <div className="form-group">
              <label>Bank</label>
              <input type="text" name="bank" value={formData.bank} onChange={handleChange} placeholder="Bank" className="form-input" required />
            </div>
            <div className="form-group">
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} placeholder="Branch" className="form-input" required/>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Branch Code</label>
              <input type="text" name="branch_code" value={formData.branch_code} onChange={handleChange} placeholder="Branch Code" className="form-input" required />
            </div>
        
          </div>
          <div className="form-actions" style={{ marginBottom: "-48px" , marginTop: "-20px"}}>
            <button type="submit" className="submit-button1" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>

          <div className="login-link" style={{ marginTop: "40px" }}>
            <button onClick={switchToLogin} className="link-button">
              Already have a profile? Login here
            </button>
          </div>

         
        </form>
      </div>
    </div>
  );
};

export default Register;
