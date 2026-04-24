import { useState } from "react"
import { Lock } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import Card from "./Card"
import UpgradePrompt from "./billing/UpgradePrompt"

const PLAN_LABEL = { professional: "Professional", growth: "Growth", enterprise: "Enterprise" }
const FEATURE_PLAN_MAP = {
  instructions: "lite",
  assignment: "lite",
  invoice: "lite",
  statements: "lite",
  manage: "lite",
  addons: "professional",
  analytics: "professional",
  reports: "professional",
  payroll: "growth",
  biometric: "growth",
  vat: "growth",
  creditors: "enterprise",
  priority_support: "enterprise",
}

export default function FeatureGatedCard({ title, image, path, featureKey, onClick }) {
  const { hasFeature, subscription } = useAuth()
  const [upgradeModal, setUpgradeModal] = useState(null)

  const isAvailable = hasFeature(featureKey)
  const requiredPlan = FEATURE_PLAN_MAP[featureKey]

  const handleClick = () => {
    if (isAvailable) {
      onClick?.()
    } else {
      setUpgradeModal({ requiredPlan, featureName: title })
    }
  }

  if (isAvailable) {
    return <Card title={title} image={image} onClick={handleClick} />
  }

  return (
    <>
      <div
        className="locked-card-wrapper"
        onClick={handleClick}
        role="button"
        aria-label={`${title} — upgrade to ${PLAN_LABEL[requiredPlan]} to unlock`}
      >
        <Card title={title} image={image} />
        <div className="locked-card-overlay">
          <Lock size={22} />
          <span className="locked-card-plan-label">{PLAN_LABEL[requiredPlan]}</span>
        </div>
      </div>
      {upgradeModal && (
        <UpgradePrompt
          requiredPlan={upgradeModal.requiredPlan}
          featureName={upgradeModal.featureName}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </>
  )
}
