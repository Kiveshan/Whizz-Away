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
        {/* Use a conditional class name based on the current form */}
        <button className={isLogin ? "close-btn-login" : "close-btn"} onClick={onClose}>
          X
        </button>

        {isLogin ? (
          <Login switchToRegister={() => setIsLogin(false)} closePopup={onClose} />
        ) : (
          <Register switchToLogin={() => setIsLogin(true)} closePopup={onClose} />
        )}
      </div>
    </div>
  )
}

export default Modal
