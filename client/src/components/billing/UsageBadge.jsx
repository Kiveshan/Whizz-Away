/**
 * UsageBadge — shows a labelled progress bar for a resource (users or trucks).
 * Colour: grey < 80%, amber 80-99%, red at 100%.
 */
export default function UsageBadge({ label, used, max }) {
  const isUnlimited = max >= 999
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / max) * 100))

  const barColor =
    isUnlimited ? "#6b7280"
    : pct >= 100 ? "#dc2626"
    : pct >= 80  ? "#d97706"
    :               "#6b7280"

  return (
    <div className="usage-badge">
      <div className="usage-badge-header">
        <span className="usage-badge-label">{label}</span>
        <span className="usage-badge-count">
          {isUnlimited ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      <div className="usage-badge-track">
        <div
          className="usage-badge-fill"
          style={{
            width:           isUnlimited ? "4px" : `${pct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {!isUnlimited && pct >= 80 && (
        <p className="usage-badge-warning" style={{ color: barColor }}>
          {pct >= 100
            ? "Limit reached — upgrade to add more."
            : `${100 - pct}% remaining`}
        </p>
      )}
    </div>
  )
}
