import { X, Check } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const CONTACT_EMAIL = "info@smart-builders.co.za"

const PLAN_RANK = { lite: 1, professional: 2, growth: 3, enterprise: 4 }

const PLANS = [
  {
    key: "lite",
    label: "Lite",
    tag: "Entry Tier",
    monthly: "R2 000",
    setup: "R2 500",
    fleet: "5–10 trucks",
    users: "1 user",
    features: ["Instructions", "Assignment", "Invoice", "Statements", "Manage"],
  },
  {
    key: "professional",
    label: "Professional",
    tag: null,
    monthly: "R4 500",
    setup: "R10 000",
    fleet: "11–15 trucks",
    users: "3 users",
    features: ["Instructions", "Assignment", "Invoice", "Statements", "Manage", "Add-ons", "Analytics", "Age Analysis", "Reports"],
  },
  {
    key: "growth",
    label: "Growth",
    tag: null,
    monthly: "R8 500",
    setup: "R15 000",
    fleet: "16–25 trucks",
    users: "5–8 users",
    features: ["Instructions", "Assignment", "Invoice", "Statements", "Manage", "Add-ons", "Analytics", "Age Analysis", "Reports", "Payroll", "Biometric Register", "VAT"],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    tag: null,
    monthly: "R10 500",
    setup: "R25 000",
    fleet: "26+ trucks",
    users: "5–15 users",
    features: ["Instructions", "Assignment", "Invoice", "Statements", "Manage", "Add-ons", "Analytics", "Age Analysis", "Reports", "Payroll", "Biometric Register", "VAT", "Creditors", "Priority Support"],
  },
]

export default function PlansModal({ onClose }) {
  const { subscription } = useAuth()
  const currentTier = subscription?.tier || "none"

  return (
    <div className="plans-modal-overlay" onClick={onClose}>
      <div className="plans-modal" onClick={(e) => e.stopPropagation()}>
        <button className="plans-modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <h2 className="plans-modal-title">Plans &amp; Features</h2>
        <p className="plans-modal-subtitle">Contact us to upgrade your plan</p>

        <div className="plans-modal-grid">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentTier
            const isUpgrade = (PLAN_RANK[plan.key] ?? 0) > (PLAN_RANK[currentTier] ?? 0)
            return (
              <div key={plan.key} className={`plans-card${isCurrent ? " plans-card--current" : ""}`}>
                {isCurrent && <span className="plans-card-badge">Your Plan</span>}
                <h3 className="plans-card-title">
                  {plan.label}
                  {plan.tag && <span className="plans-card-tag">{plan.tag}</span>}
                </h3>

                <div className="plans-card-pricing">
                  <div className="plans-card-price">
                    <span className="plans-card-price-amount">{plan.monthly}</span>
                    <span className="plans-card-price-period">/month</span>
                  </div>
                  <div className="plans-card-setup">Setup: {plan.setup}</div>
                </div>

                <div className="plans-card-meta">
                  <span>{plan.fleet}</span>
                  <span>·</span>
                  <span>{plan.users}</span>
                </div>

                <ul className="plans-card-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={13} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isUpgrade && (
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Plan Upgrade Request&body=Hi, I would like to upgrade my plan to ${plan.label}.`}
                    className="plans-card-cta"
                  >
                    Upgrade to {plan.label}
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <div className="plans-modal-footer">
          <p>
            Questions? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
