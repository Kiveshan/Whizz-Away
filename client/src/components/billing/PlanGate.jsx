import { useAuth } from "../../context/AuthContext"

const PLAN_RANK = { lite: 1, professional: 2, growth: 3, enterprise: 4 }

/**
 * PlanGate — renders children only when the company's plan meets the requirement.
 * Otherwise renders `fallback` (or null).
 *
 * Usage:
 *   <PlanGate feature="analytics" fallback={<LockedCard />}>
 *     <AnalyticsPage />
 *   </PlanGate>
 *
 *   <PlanGate minimumPlan="growth">
 *     <PayrollPage />
 *   </PlanGate>
 */
export default function PlanGate({ children, feature, minimumPlan, fallback = null }) {
  const { hasFeature, hasPlan } = useAuth()

  const allowed = feature ? hasFeature(feature) : hasPlan(minimumPlan || "lite")

  return allowed ? children : fallback
}
