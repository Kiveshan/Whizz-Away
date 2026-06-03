import { Clock } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function TrialExpiredScreen() {
  const { user, logout } = useAuth()

  return (
    <div className="status-screen trial-expired-screen">
      <div className="status-screen-card">
        <div className="status-screen-icon suspension">
          <Clock size={48} />
        </div>

        <h1 className="status-screen-heading">Your free trial has ended</h1>

        <p className="status-screen-body">
          Your 14-day trial period has expired. Subscribe to a plan to continue
          using Whizz-Away and keep access to all your data.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Subscribe — ${user?.company_reg_num || ""}`}
          className="status-screen-cta"
        >
          Contact us to subscribe
        </a>

        <button className="status-screen-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
