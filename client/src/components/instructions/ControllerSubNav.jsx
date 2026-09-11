import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { dashboardForRole } from "../../config/routeRoles";

/**
 * Secondary bar for the controller instruction screens: a back button on the
 * left and Clients / Create Instruction tabs in the middle. Logout stays in the
 * global Header. Without `onBack`, Back returns to the user's own dashboard.
 *
 * @param {object}   props
 * @param {"clients"|"create"} props.active  Which tab is highlighted
 * @param {string}   [props.backLabel]
 * @param {function} [props.onBack]
 */
export function ControllerSubNav({ active, backLabel = "← Dashboard", onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleBack = onBack || (() => navigate(dashboardForRole(user?.roleid)));

  return (
    <div className="wa-subnav">
      <div>
        <button type="button" className="wa-subnav-back" onClick={handleBack}>
          {backLabel}
        </button>
      </div>
      <nav className="wa-tabs" aria-label="Instructions">
        <button
          type="button"
          className={`wa-tab ${active === "clients" ? "is-active" : ""}`}
          aria-current={active === "clients" ? "page" : undefined}
          onClick={() => navigate("/CompanyInstructionView")}
        >
          Clients
        </button>
        <button
          type="button"
          className={`wa-tab ${active === "create" ? "is-active" : ""}`}
          aria-current={active === "create" ? "page" : undefined}
          onClick={() => navigate("/ControllerInstructions")}
        >
          Create Instruction
        </button>
      </nav>
      <div />
    </div>
  );
}
