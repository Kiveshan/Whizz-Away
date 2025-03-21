"use client"

import { useState, useEffect } from "react"
import Login from "../pages/Login"
import Register from "../pages/Register"
import "../css/modal.css"

const Modal = ({ isOpen, onClose, initialForm }) => {
  const [isLogin, setIsLogin] = useState(initialForm === "login")

  useEffect(() => {
    setIsLogin(initialForm === "login")
  }, [initialForm])

  if (!isOpen) return null

  // Close modal when clicking outside
  const handleBackgroundClick = (event) => {
    if (event.target.id === "modal-popup") {
      onClose()
    }
  }

  return (
    <div id="modal-popup" className="modal-popup" onClick={handleBackgroundClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>X</button>
        <div className="modal-header">
          <button 
            onClick={() => setIsLogin(true)} 
            className={`tab-btn ${isLogin ? "active" : ""}`}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)} 
            className={`tab-btn ${!isLogin ? "active" : ""}`}
          >
            Register
          </button>
        </div>
        {isLogin ? (
          <Login switchToRegister={() => setIsLogin(false)} />
        ) : (
          <Register switchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}

export default Modal
