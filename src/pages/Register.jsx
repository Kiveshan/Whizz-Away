import React, { useState } from 'react';
import '../css/register.css';

const Register = ({ switchToLogin, closePopup }) => {
  const [name, setFirstName] = useState("");
  const [surname, setLastName] = useState("");
  const [companyname, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password === confirmPassword) {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:5000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            surname,
            companyname,
            email,
            password,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          alert("Registration successful! Please login.");
          closePopup(); // Close the register popup
          switchToLogin(); // Optionally, switch to the login view if needed
        } else {
          setErrorMessage(data.message || "Registration failed");
        }
      } catch (error) {
        setErrorMessage("An error occurred. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("Passwords do not match");
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <center>
          <div className="logo-container1">
            <img
              src="/images/whizz-away.jpeg"
              alt="LOGITECH FLOW Logo"
              className="logo-image1"
            />
          </div>
        </center>
        <h1 className="register-title">Register</h1>

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                placeholder="Input First Name"
                className="form-input"
                value={name}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                placeholder="Input Surname"
                className="form-input"
                value={surname}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                placeholder="Input Name"
                className="form-input"
                value={companyname}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Input Email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Input Password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm Password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="login-link">
            <button onClick={switchToLogin} className="link-button">
              Already have a profile? Login here
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button1" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
