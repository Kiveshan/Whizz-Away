"use client"

import { useState, useEffect } from "react"
import "../css/register.css"

const Register = ({ switchToLogin, closePopup }) => {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    companyname: "",
    company_reg_num: "",
    cluster_box: "",
    address: "",
    suburb: "",
    cell_num: "",
    cell_num2: "",
    vat_reg_num: "",
    account_num: "",
    name_of_acc: "",
    bank: "",
    branch: "",
    branch_code: "",
    swift_code: "",
  })

  const [errorMessage, setErrorMessage] = useState("")
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
    valid: false,
  })
  const [
    /* Remove the showPasswordRequirements state and the password requirements div */
  ] = useState(false)

  // Close error popup after 5 seconds
  useEffect(() => {
    let timer
    if (showErrorPopup) {
      timer = setTimeout(() => {
        setShowErrorPopup(false)
      }, 5000)
    }
    return () => clearTimeout(timer)
  }, [showErrorPopup])

  // Handle input change with validation
  const handleChange = (e) => {
    const { name, value } = e.target

    // Fields that should only accept numbers
    const numericFields = ["cell_num", "cell_num2", "vat_reg_num", "account_num", "branch_code", "company_reg_num"]

    // If this is a numeric field and contains non-numeric characters, don't update
    if (numericFields.includes(name) && value !== "" && !/^\d+$/.test(value)) {
      return
    }

    // Special validation for SWIFT code
    if (name === "swift_code" && value !== "") {
      // Convert to uppercase for SWIFT code
      const upperValue = value.toUpperCase()

      // Update with uppercase value
      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
      }))
      return
    }

    // Password strength validation
    if (name === "password") {
      const length = value.length >= 8
      const lowercase = /[a-z]/.test(value)
      const uppercase = /[A-Z]/.test(value)
      const number = /[0-9]/.test(value)
      const special = /[!@#$%^&*]/.test(value)
      const valid = length && lowercase && uppercase && number && special

      setPasswordStrength({
        length,
        lowercase,
        uppercase,
        number,
        special,
        valid,
      })
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error message when user changes input
    if (errorMessage) {
      setErrorMessage("")
      setShowErrorPopup(false)
    }
  }

  // Function to check if email already exists
  const checkEmailExists = async (email) => {
    try {
      setIsCheckingEmail(true)
      const response = await fetch(`http://localhost:5000/check-email?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (data.exists) {
        setErrorMessage("This email is already registered. Please use a different email or login.")
        setShowErrorPopup(true)
        return true
      }
      return false
    } catch (error) {
      console.error("Error checking email:", error)
      return false
    } finally {
      setIsCheckingEmail(false)
    }
  }

  // Validate SWIFT code
  const validateSwiftCode = (code) => {
    if (!code) return true // Optional field

    // SWIFT code must be either 8 or 11 characters
    if (code.length !== 8 && code.length !== 11) {
      return "SWIFT code must be either 8 or 11 characters long"
    }

    // First 4 characters: Bank code (letters)
    if (!/^[A-Z]{4}/.test(code)) {
      return "First 4 characters of SWIFT code must be letters"
    }

    // Next 2 characters: Country code (letters)
    if (!/^[A-Z]{4}[A-Z]{2}/.test(code)) {
      return "Characters 5-6 of SWIFT code must be letters (country code)"
    }

    // Following 2 characters: Location code (letters or numbers)
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}/.test(code)) {
      return "Characters 7-8 of SWIFT code must be letters or numbers"
    }

    // If 11 characters, last 3 must be letters or numbers (branch code)
    if (code.length === 11 && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}$/.test(code)) {
      return "Last 3 characters of SWIFT code must be letters or numbers"
    }

    return true
  }

  // Validate password
  const validatePassword = (password) => {
    if (!password) return "Password is required"
    if (password.length < 8) return "Password must be at least 8 characters long"
    if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter"
    if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter"
    if (!/[0-9]/.test(password)) return "Password must include at least one number"
    if (!/[!@#$%^&*]/.test(password)) return "Password must include at least one special character (!@#$%^&*)"
    return true
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.name || !formData.surname || !formData.email || !formData.password) {
      setErrorMessage("Please fill in all required fields.")
      setShowErrorPopup(true)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("Please enter a valid email address.")
      setShowErrorPopup(true)
      return
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password)
    if (passwordValidation !== true) {
      setErrorMessage(passwordValidation)
      setShowErrorPopup(true)
      return
    }

    // Numeric fields validation
    const numericFields = [
      { name: "cell_num", label: "Cell Number", required: true },
      { name: "cell_num2", label: "Alternate Cell", required: false },
      { name: "vat_reg_num", label: "VAT Registration Number", required: false },
      { name: "account_num", label: "Account Number", required: true },
      { name: "branch_code", label: "Branch Code", required: true },
      { name: "company_reg_num", label: "Company Registration Number", required: true },
    ]

    for (const field of numericFields) {
      if (field.required && !formData[field.name]) {
        setErrorMessage(`${field.label} is required.`)
        setShowErrorPopup(true)
        return
      }

      if (formData[field.name] && !/^\d+$/.test(formData[field.name])) {
        setErrorMessage(`${field.label} must contain only numbers.`)
        setShowErrorPopup(true)
        return
      }
    }

    // Cell number length validation
    if (formData.cell_num && formData.cell_num.length !== 10) {
      setErrorMessage("Cell Number must be exactly 10 digits.")
      setShowErrorPopup(true)
      return
    }

    if (formData.cell_num2 && formData.cell_num2.length !== 10) {
      setErrorMessage("Alternate Cell Number must be exactly 10 digits.")
      setShowErrorPopup(true)
      return
    }

    // SWIFT code validation
    const swiftValidation = validateSwiftCode(formData.swift_code)
    if (swiftValidation !== true) {
      setErrorMessage(swiftValidation)
      setShowErrorPopup(true)
      return
    }

    // Check if email already exists before submitting
    const emailExists = await checkEmailExists(formData.email)
    if (emailExists) {
      return // Stop form submission if email exists
    }

    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Registration successful! Please login.")
        closePopup()
        switchToLogin()
      } else {
        // Handle specific error for email already registered
        if (data.message === "Email already registered") {
          setErrorMessage("This email is already registered. Please use a different email or login.")
          setShowErrorPopup(true)
        } else if (data.message === "Company registration number already exists") {
          setErrorMessage("This company registration number is already registered.")
          setShowErrorPopup(true)
        } else {
          setErrorMessage(data.message || "Registration failed")
          setShowErrorPopup(true)
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again later.")
      setShowErrorPopup(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="register-container">
      {showErrorPopup && errorMessage && (
        <div className="error-popup">
          <div className="error-popup-content">
            <span className="close-popup" onClick={() => setShowErrorPopup(false)}>
              &times;
            </span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="register-form">
        <h1 className="register-title" style={{ marginBottom: "5px", marginTop: "-10px" }}>
          Register
        </h1>

        <form onSubmit={handleRegister}>
          <div className="form-row three-fields">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="First Name"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Surname"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={(e) => e.target.value && checkEmailExists(e.target.value)}
                placeholder="Email"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-container">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className={`form-input ${formData.password ? (passwordStrength.valid ? "valid-password" : "invalid-password") : ""}`}
                  required
                />
                {formData.password && (
                  <span className={`password-indicator ${passwordStrength.valid ? "valid" : "invalid"}`}>
                    {passwordStrength.valid ? "✓" : "✕"}
                  </span>
                )}
              </div>
              <small style={{ color: "#666", fontSize: "11px" }}>
                8+ chars with lowercase, uppercase, number & special char
              </small>
            </div>
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                name="companyname"
                value={formData.companyname}
                onChange={handleChange}
                placeholder="Company Name"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Company Reg. No.</label>
              <input
                type="text"
                name="company_reg_num"
                value={formData.company_reg_num}
                onChange={handleChange}
                placeholder="Reg. No. (numbers only)"
                className="form-input"
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>Numbers only</small>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Cluster Box</label>
              <input
                type="text"
                name="cluster_box"
                value={formData.cluster_box}
                onChange={handleChange}
                placeholder="Cluster Box"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Suburb</label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleChange}
                placeholder="Suburb"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Cell Number</label>
              <input
                type="text"
                name="cell_num"
                value={formData.cell_num}
                onChange={handleChange}
                placeholder="Cell Number (10 digits)"
                className="form-input"
                required
                maxLength={10}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>10 digits, numbers only</small>
            </div>
            <div className="form-group">
              <label>Alternate Cell</label>
              <input
                type="text"
                name="cell_num2"
                value={formData.cell_num2}
                onChange={handleChange}
                placeholder="Alternate Cell (10 digits)"
                className="form-input"
                maxLength={10}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>10 digits, numbers only</small>
            </div>
            <div className="form-group">
              <label>VAT Reg No.</label>
              <input
                type="text"
                name="vat_reg_num"
                value={formData.vat_reg_num}
                onChange={handleChange}
                placeholder="VAT Number (numbers only)"
                className="form-input"
                maxLength={20}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>Numbers only</small>
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                name="account_num"
                value={formData.account_num}
                onChange={handleChange}
                placeholder="Account Number (numbers only)"
                className="form-input"
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>Numbers only</small>
            </div>
            <div className="form-group">
              <label>Account Name</label>
              <input
                type="text"
                name="name_of_acc"
                value={formData.name_of_acc}
                onChange={handleChange}
                placeholder="Name of Account"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Bank</label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                placeholder="Bank"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row three-fields">
            <div className="form-group">
              <label>Branch</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Branch"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Branch Code</label>
              <input
                type="text"
                name="branch_code"
                value={formData.branch_code}
                onChange={handleChange}
                placeholder="Branch Code (numbers only)"
                className="form-input"
                required
              />
              <small style={{ color: "#666", fontSize: "11px" }}>Numbers only</small>
            </div>
            <div className="form-group">
              <label>SWIFT Code</label>
              <input
                type="text"
                name="swift_code"
                value={formData.swift_code}
                onChange={handleChange}
                placeholder="SWIFT Code (8 or 11 chars)"
                className="form-input"
                maxLength={11}
              />
              <small style={{ color: "#666", fontSize: "11px" }}>Format: BANK+COUNTRY+LOCATION+[BRANCH]</small>
            </div>
          </div>

          <div className="form-actions" style={{ marginBottom: "-48px", marginTop: "-20px" }}>
            <button type="submit" className="submit-button1" disabled={isLoading || isCheckingEmail}>
              {isLoading ? "Submitting..." : isCheckingEmail ? "Checking..." : "Submit"}
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
  )
}

export default Register
