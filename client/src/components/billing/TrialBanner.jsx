import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function TrialBanner() {
  const { isTrial, trialDaysRemaining } = useAuth()

  if (!isTrial()) return null

  const days   = trialDaysRemaining()
  const urgent = days !== null && days <= 3

  const message =
    days === null  ? "You are on a 14-day Professional trial."
    : days === 0   ? "Your trial expires today — activate now to keep access."
    :                `${days} day${days === 1 ? "" : "s"} left on your Professional trial.`

  return (
    <div className={`trial-notification${urgent ? " trial-notification--urgent" : ""}`}>
      <span className="trial-notification__icon" aria-hidden="true">
        {urgent ? "⚠" : "ℹ"}
      </span>
      <span className="trial-notification__message">{message}</span>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=Activate My Plan`}
        className="trial-notification__cta"
      >
        Activate plan
      </a>
    </div>
  )
}
