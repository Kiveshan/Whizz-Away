"use client";

import { useState } from "react";
import styles from "../css/login.module.css"; // Updated to CSS Module
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../../../api";

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

    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      if (response.status === 200) {
        const data = response.data;
        console.log("Login successful. Token:", data.token);

        localStorage.setItem("token", data.token);
        navigate(data.redirectUrl);
      } else {
        console.log("Error from server:", response.data);
        setError(response.data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginForm}>
        <center>
          <div className={styles.logoContainer1}>
            <img
              src="/images/whizz-away.jpeg"
              alt="LOGITECH FLOW Logo"
              className={styles.logoImage5}
            />
          </div>
        </center>
        <center>
          <h2>Login</h2>
        </center>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter Email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordInputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter Password"
                className={styles.formInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={togglePasswordVisibility}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className={styles.passwordEyeIcon} size={18} />
                ) : (
                  <Eye className={styles.passwordEyeIcon} size={18} />
                )}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.loginButton}>
            Login
          </button>
        </form>

        <div className={styles.newProfile}>
          <button onClick={switchToRegister} className={styles.linkButton}>
            New Profile? Register Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;