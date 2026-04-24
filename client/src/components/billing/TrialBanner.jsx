import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function TrialBanner() {
  const { isTrial, trialDaysRemaining } = useAuth()

  if (!isTrial()) return null

  const days = trialDaysRemaining()
  const urgent = days !== null && days <= 3

  return (
    <div
      className="trial-banner"
      style={{ backgroundColor: urgent ? "#d97706" : "#2563eb" }}
      role="banner"
    >
      <span className="trial-banner-text">
        {days === null
          ? "You are on a 14-day Professional trial."
          : days === 0
          ? "Your trial expires today."
          : `Your trial ends in ${days} day${days === 1 ? "" : "s"}.`}
      </span>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=Activate My Plan`}
        className="trial-banner-cta"
      >
        Contact your account manager to activate your plan
      </a>
    </div>
  )
}
