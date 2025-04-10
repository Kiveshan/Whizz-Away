"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Card from "../components/Card"
import Header from "../components/landingHeader"
import Modal from "../components/modal"
import "../css/index.css"

const dashboardData = [
  { title: "Instructions", image: "/images/monitorInstruction.jpeg", path: "/instructions" },
  { title: "Creditors", image: "/images/newInstruction2.jpeg", path: "/client-payments" },
  { title: "Debtors", image: "/images/clientDoc.jpeg", path: "/client-documents" },
  { title: "Wages", image: "/images/wage.jpeg", path: "/wages" },
  { title: "Manage", image: "/images/team-management.png", path: "/creditors" },
  { title: "Analytics", image: "/images/Analytics.jpg", path: "/creditors" },
]

const Landing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalForm, setModalForm] = useState("login")
  const navigate = useNavigate()

  const handleCardClick = (path) => {
    setModalForm("login")
    setIsModalOpen(true)
  }

  const handleLoginClick = () => {
    setModalForm("login")
    setIsModalOpen(true)
  }

  const handleRegisterClick = () => {
    setModalForm("register")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="landing">
      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />
      <div className="dashboard-container">
        <div className="dashboard-grid">
          {dashboardData.map((item) => (
            <Card key={item.title} title={item.title} image={item.image} onClick={() => handleCardClick(item.path)} />
          ))}
        </div>
      </div>

      {/* Modal for login/register */}
      <Modal isOpen={isModalOpen} onClose={closeModal} initialForm={modalForm} />
    </div>
  )
}

export default Landing

