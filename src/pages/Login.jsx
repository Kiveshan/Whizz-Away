import React, { useState } from 'react';
import "../css/login.css";

const Login = ({ switchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Implement login logic here
    console.log("Logging in with", email, password);
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

          {/* <div className="forgot-password">
            <a href="#">Forgot your password? Click Here</a>
          </div> */}

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
}

export default Login;
