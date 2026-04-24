import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText, ClipboardList, Receipt, BarChart2, Settings,
  Package, TrendingUp, FileBarChart, DollarSign, Fingerprint,
  Calculator, Users, Headphones, Lock,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import UsageBadge from "../../components/billing/UsageBadge"
import UpgradePrompt from "../../components/billing/UpgradePrompt"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

const LITE_MODULES = [
  { label: "Instructions", route: "/instructions",  Icon: FileText,     description: "Create and manage delivery instructions" },
  { label: "Assignment",   route: "/update-instructions", Icon: ClipboardList, description: "Assign instructions to drivers" },
  { label: "Invoice",      route: "/invoices",      Icon: Receipt,      description: "Generate and view invoices" },
  { label: "Statements",   route: "/statements-list", Icon: BarChart2,  description: "View financial statements" },
  { label: "Manage",       route: "/manage",        Icon: Settings,     description: "Manage company settings and users" },
]

const LOCKED_MODULES = [
  { key: "addons",           label: "Add-ons",             Icon: Package,     requiredPlan: "professional" },
  { key: "analytics",        label: "Analytics",           Icon: TrendingUp,  requiredPlan: "professional" },
  { key: "reports",          label: "Reports",             Icon: FileBarChart, requiredPlan: "professional" },
  { key: "payroll",          label: "Payroll",             Icon: DollarSign,  requiredPlan: "growth" },
  { key: "biometric",        label: "Biometric Register",  Icon: Fingerprint, requiredPlan: "growth" },
  { key: "vat",              label: "VAT Management",      Icon: Calculator,  requiredPlan: "growth" },
  { key: "creditors",        label: "Creditors",           Icon: Users,       requiredPlan: "enterprise" },
  { key: "priority_support", label: "Priority Support",    Icon: Headphones,  requiredPlan: "enterprise" },
]

function ModuleCard({ label, route, Icon, description, locked, onLockedClick }) {
  const navigate = useNavigate()

  return (
    <button
      className={`lite-module-card ${locked ? "lite-module-card--locked" : ""}`}
      onClick={() => (locked ? onLockedClick() : navigate(route))}
      aria-label={locked ? `${label} — upgrade required` : label}
    >
      <div className="lite-module-card-icon">
        {locked ? <Lock size={22} /> : <Icon size={22} />}
      </div>
      <span className="lite-module-card-label">{label}</span>
      {locked && (
        <span className="lite-module-card-plan-badge">
          {label === "Add-ons" || label === "Analytics" || label === "Reports"
            ? "Professional"
            : label === "Payroll" || label === "Biometric Register" || label === "VAT Management"
            ? "Growth"
            : "Enterprise"}
        </span>
      )}
      {!locked && description && (
        <span className="lite-module-card-desc">{description}</span>
      )}
    </button>
  )
}

export default function LiteDashboard() {
  const { user, subscription, getUsage } = useAuth()
  const usage = getUsage()

  const [upgradeModal, setUpgradeModal] = useState(null) // { requiredPlan, featureName }

  const openUpgrade = (mod) =>
    setUpgradeModal({ requiredPlan: mod.requiredPlan, featureName: mod.label })

  const companyName = user?.companyname || subscription?.company_reg_num || "Your Company"

  return (
    <div className="lite-dashboard">
      {/* Top bar */}
      <div className="lite-topbar">
        <div className="lite-topbar-left">
          <h1 className="lite-topbar-company">{companyName}</h1>
          <span
            className="lite-plan-badge"
            title="Click to upgrade"
            style={{ cursor: "pointer" }}
            onClick={() => setUpgradeModal({ requiredPlan: "professional", featureName: null })}
          >
            LITE
          </span>
        </div>
        <div className="lite-topbar-usage">
          <UsageBadge label="Users"  used={0} max={usage.maxUsers} />
          <UsageBadge label="Trucks" used={0} max={usage.maxTrucks} />
        </div>
      </div>

      {/* Welcome */}
      <div className="lite-welcome-card">
        <h2>Welcome back, {user?.name || "there"}!</h2>
        <p>You are on the <strong>Lite</strong> plan. Access your five included modules below.</p>
      </div>

      {/* Module grid */}
      <section className="lite-modules-section">
        <h2 className="lite-section-title">Your Modules</h2>
        <div className="lite-module-grid">
          {LITE_MODULES.map((m) => (
            <ModuleCard key={m.route} {...m} locked={false} />
          ))}
          {LOCKED_MODULES.map((m) => (
            <ModuleCard
              key={m.key}
              label={m.label}
              Icon={m.Icon}
              locked={true}
              onLockedClick={() => openUpgrade(m)}
            />
          ))}
        </div>
      </section>

      {/* Contact banner */}
      <div className="lite-contact-banner">
        <p>Need more capacity or want to unlock additional modules?</p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="lite-contact-link">
          Contact your Whizz-Away account manager
        </a>
      </div>

      {/* Upgrade modal */}
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
