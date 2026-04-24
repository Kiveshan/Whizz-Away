import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import Card from "../../components/Card"
import UpgradePrompt from "../../components/billing/UpgradePrompt"
import "../../pages/user_menus/css/card.css"
import "../../pages/user_menus/css/dashboard.css"

const MAIN_MODULES = [
  { title: "Instructions", image: "/images/Instructions.png", path: "/dashboard/lite/instructions" },
  { title: "Debtors",      image: "/images/Payment.jpg",      path: "/dashboard/lite/debtors" },
  { title: "Manage",       image: "/images/manage.jpg",       path: "/manage" },
]

const PLAN_LABEL = { professional: "Professional", growth: "Growth", enterprise: "Enterprise" }

const LOCKED_MODULES = [
  { key: "addons",           title: "Add-ons",            image: "/images/Add-On's.jpg",              requiredPlan: "professional" },
  { key: "analytics",        title: "Analytics",          image: "/images/analytics.jpg",             requiredPlan: "professional" },
  { key: "reports",          title: "Reports",            image: "/images/reports.jpg",               requiredPlan: "professional" },
  { key: "payroll",          title: "Payroll",            image: "/images/wages.jpeg",                requiredPlan: "growth" },
  { key: "biometric",        title: "Biometric Register", image: "/images/pexels-photo-8962519.jpeg", requiredPlan: "growth" },
  { key: "vat",              title: "VAT Management",     image: "/images/expenses.jpeg",             requiredPlan: "growth" },
  { key: "creditors",        title: "Creditors",          image: "/images/createpo.jpg",              requiredPlan: "enterprise" },
  { key: "priority_support", title: "Priority Support",   image: "/images/team-management.png",       requiredPlan: "enterprise" },
]

function LockedCard({ title, image, requiredPlan, onClick }) {
  return (
    <div
      className="locked-card-wrapper"
      onClick={onClick}
      role="button"
      aria-label={`${title} — upgrade to ${PLAN_LABEL[requiredPlan]} to unlock`}
    >
      <Card title={title} image={image} />
      <div className="locked-card-overlay">
        <Lock size={22} />
        <span className="locked-card-plan-label">{PLAN_LABEL[requiredPlan]}</span>
      </div>
    </div>
  )
}

export default function LiteDashboard() {
  const navigate = useNavigate()
  const [upgradeModal, setUpgradeModal] = useState(null)

  const handleNavigate = (path) => {
    localStorage.setItem("dashboardRoute", "/dashboard/lite")
    navigate(path)
  }

  return (
    <div className="dashboard">
      {/* Main unlocked modules */}
      <div className="dashboard-row top-row">
        {MAIN_MODULES.map((m) => (
          <Card key={m.title} title={m.title} image={m.image} onClick={() => handleNavigate(m.path)} />
        ))}
      </div>

      {/* Locked / upgrade section */}
      <div className="lite-locked-section">
        <h3 className="lite-locked-heading">Upgrade to Unlock More Features</h3>
        <div className="lite-locked-grid">
          {LOCKED_MODULES.map((m) => (
            <LockedCard
              key={m.key}
              title={m.title}
              image={m.image}
              requiredPlan={m.requiredPlan}
              onClick={() => setUpgradeModal({ requiredPlan: m.requiredPlan, featureName: m.title })}
            />
          ))}
        </div>
      </div>

      {upgradeModal && (
        <UpgradePrompt
          requiredPlan={upgradeModal.requiredPlan}
          featureName={upgradeModal.featureName}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </div>
  )
}
