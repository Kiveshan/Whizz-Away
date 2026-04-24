import { useNavigate } from "react-router-dom"
import { AlertTriangle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function SuspensionScreen() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // The suspension reason is stored in plan_notes and echoed back in the JWT
  // via the login response. Fall back to a generic message.
  const reason =
    user?.suspension_reason ||
    "Your account has been suspended due to an outstanding issue."

  return (
    <div className="status-screen suspension-screen">
      <div className="status-screen-card">
        <div className="status-screen-icon suspension">
          <AlertTriangle size={48} />
        </div>

        <h1 className="status-screen-heading">Your account has been suspended</h1>

        <p className="status-screen-reason">{reason}</p>

        <p className="status-screen-body">
          Please contact your Whizz-Away account manager to resolve this. You can
          still view your existing data — no changes can be made while suspended.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Account Suspension — ${user?.company_reg_num || ""}`}
          className="status-screen-cta"
        >
          Contact account manager
        </a>

        <button
          className="status-screen-secondary"
          onClick={() => navigate("/Dashboard")}
        >
          View my data (read-only)
        </button>

        <button className="status-screen-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
