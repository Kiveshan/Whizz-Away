import React, { useState } from "react";
import "../css/login.css";
import { useNavigate } from "react-router-dom";

const Login = ({ switchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // For handling login errors
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log("Redirect data:", data);  // Log the response data
        navigate(data.redirectUrl);
      } else {
        const errorData = await response.json();
        console.log("Error from server:", errorData);  // Log server error data
        setError(errorData.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login Error:", err);  // Log any other errors
      setError("An error occurred. Please try again.");
    }
  };
  
  


  return (
    <div className="login-container">
      <div className="login-form">
        <center>
          <div className="logo-container1">
            <img src="/images/whizz-away.jpeg" alt="LOGITECH FLOW Logo" className="logo-image1" />
          </div>
        </center>
        <center><h2>Login</h2></center>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter Email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter Password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-button">Login</button>
        </form>

        <div className="new-profile">
          <button onClick={switchToRegister} className="link-button">
            New Profile? Register Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
