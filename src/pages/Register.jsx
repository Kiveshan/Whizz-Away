import React, { useState } from 'react';
import '../css/register.css';

const Register = ({switchToLogin}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    // Implement registration logic here
    if (password === confirmPassword) {
      console.log("Registering", { firstName, lastName, companyName, email, password });
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

        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                placeholder="Input First Name"
                className="form-input"
                value={firstName}
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
                value={lastName}
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
                value={companyName}
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
          <button type="submit" className="submit-button1">Submit</button>
        </form>
      </div>
    </div>
  );
}

export default Register;
