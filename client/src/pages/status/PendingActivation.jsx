import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clock, CheckCircle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { getPostLoginRoute } from "../../router/AuthRouter"

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL || "support@whizzaway.co.za"

export default function PendingActivation() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [message,  setMessage]  = useState("")

  const handleCheckStatus = async () => {
    setChecking(true)
    setMessage("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Could not refresh status.")
      const data = await res.json()

      // If the server returns updated user + token, refresh auth state
      if (data.token) {
        login(data.user, data.token)
        const route = getPostLoginRoute(
          data.user.subscription_tier,
          data.user.subscription_status,
          data.user.roleid,
          data.user.trial_ends_at
        )
        if (route !== "/pending-activation") {
          navigate(route, { replace: true })
          return
        }
      }
      setMessage("Your account is still pending activation. We will notify you once it is ready.")
    } catch (err) {
      setMessage("Could not check status right now. Please try again shortly.")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="status-screen pending-screen">
      <div className="status-screen-card">
        <div className="status-screen-icon pending">
          <Clock size={48} />
        </div>

        <h1 className="status-screen-heading">Welcome to Whizz-Away</h1>

        <p className="status-screen-body">
          Your account is pending activation. A Whizz-Away team member will assign
          your plan and enable your access shortly.
        </p>

        <ol className="pending-steps">
          <li className="pending-step pending-step--done">
            <CheckCircle size={18} /> Payment received
          </li>
          <li className="pending-step">
            <span className="pending-step-num">2</span> Admin assigns plan
          </li>
          <li className="pending-step">
            <span className="pending-step-num">3</span> Access enabled
          </li>
        </ol>

        <p className="status-screen-contact">
          Questions? Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>

        {message && <p className="pending-message">{message}</p>}

        <button
          className="status-screen-cta"
          onClick={handleCheckStatus}
          disabled={checking}
        >
          {checking ? "Checking..." : "Check activation status"}
        </button>

        <button className="status-screen-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
