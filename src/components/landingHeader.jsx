"use client"
import "../css/modal.css"

const Header = ({ onLoginClick, onRegisterClick }) => {
  return (
    <header className="header2">
      <div className="logo-container">
        <img src="/images/whizz-away.png" className="logo-img" alt="Business Logo" />
      </div>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", textAlign: "center", color: "black" }}>
  Whizz-Away
</h1>

      <div className="header-buttons1">
        <button className="header-btn login-btn" onClick={onLoginClick}>
          Login
        </button>
        <button className="header-btn register-btn" onClick={onRegisterClick}>
          Register
        </button>
      </div>
    </header>
  )
}

export default Header

