"use client";

import { useState } from "react";
import "../css/login.css";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../../../api"; // Import the configured Axios instance

const Login = ({ switchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      const response = await api.post("/login", {
        email,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Login response:', response);
      
      if (response.data && response.data.token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.token);
        
        // Redirect based on user role or to dashboard
        const redirectUrl = response.data.redirectUrl || '/dashboard';
        navigate(redirectUrl);
      } else {
        console.error('Unexpected response format:', response);
        setError('Unexpected response from server. Please try again.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      
      // Handle different types of errors
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = err.response.data?.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        
        // Handle specific status codes
        if (err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response.status === 403) {
          setError('Account not active or not approved. Please contact support.');
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('Unable to connect to the server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        console.error('Error:', err.message);
        setError('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <center>
          <div className="logo-container1">
            <img
              src="/images/whizz-away.jpeg"
              alt="LOGITECH FLOW Logo"
              className="logo-image5"
            />
          </div>
        </center>
        <center>
          <h2>Login</h2>
        </center>

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
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter Password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="password-eye-icon" size={18} />
                ) : (
                  <Eye className="password-eye-icon" size={18} />
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button">
            Login
          </button>
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
