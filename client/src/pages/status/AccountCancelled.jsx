import { XCircle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function AccountCancelled() {
  const { user, logout } = useAuth()

  return (
    <div className="status-screen cancelled-screen">
      <div className="status-screen-card">
        <div className="status-screen-icon cancelled">
          <XCircle size={48} />
        </div>

        <h1 className="status-screen-heading">Account Cancelled</h1>

        <p className="status-screen-body">
          Your Whizz-Away account has been cancelled. If you believe this is an
          error, or you would like to reactivate your account, please contact us.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Account Reactivation Request — ${user?.company_reg_num || ""}`}
          className="status-screen-cta"
        >
          Contact us to reactivate
        </a>

        <button className="status-screen-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
