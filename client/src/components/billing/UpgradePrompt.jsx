import { X, Lock } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

const PLAN_DISPLAY = {
  lite:         "Lite",
  professional: "Professional",
  growth:       "Growth",
  enterprise:   "Enterprise",
}

export default function UpgradePrompt({ requiredPlan, featureName, onClose }) {
  const { subscription } = useAuth()
  const currentPlan = subscription?.tier || "none"

  return (
    <div className="upgrade-prompt-overlay" onClick={onClose}>
      <div className="upgrade-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-prompt-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="upgrade-prompt-icon">
          <Lock size={32} />
        </div>

        <h2 className="upgrade-prompt-title">Feature Locked</h2>

        {featureName && (
          <p className="upgrade-prompt-feature">
            <strong>{featureName}</strong> is not available on your current plan.
          </p>
        )}

        <div className="upgrade-prompt-plans">
          <div className="upgrade-prompt-plan upgrade-prompt-plan--current">
            <span className="upgrade-prompt-plan-label">Current Plan</span>
            <span className="upgrade-prompt-plan-name">
              {PLAN_DISPLAY[currentPlan] || "None"}
            </span>
          </div>
          <div className="upgrade-prompt-arrow">→</div>
          <div className="upgrade-prompt-plan upgrade-prompt-plan--required">
            <span className="upgrade-prompt-plan-label">Required Plan</span>
            <span className="upgrade-prompt-plan-name">
              {PLAN_DISPLAY[requiredPlan] || requiredPlan}
            </span>
          </div>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Plan Upgrade Request&body=Hi, I would like to upgrade my Whizz-Away plan from ${PLAN_DISPLAY[currentPlan] || currentPlan} to ${PLAN_DISPLAY[requiredPlan] || requiredPlan}.`}
          className="upgrade-prompt-cta"
        >
          Contact your account manager to upgrade
        </a>

        <button className="upgrade-prompt-dismiss" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
