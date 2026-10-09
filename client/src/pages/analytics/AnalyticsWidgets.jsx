import { useEffect, useRef, useState } from "react";
import { formatCompact, formatRand, stacksOf, usePrefersReducedMotion } from "./CategoryBarChart.jsx";

// --- Report navigation ----------------------------------------------------
// A grouped list on wide screens; a plain dropdown on narrow ones (CSS picks).
export function ReportNav({ groups, charts, active, onChange }) {
  return (
    <>
      <nav className="az-nav" aria-label="Reports">
        {groups.map((group) => (
          <div className="az-nav-group" key={group.label}>
            <p className="az-nav-heading">{group.label}</p>
            {group.reports.map((key) => (
              <button
                type="button"
                key={key}
                className={`az-nav-item${key === active ? " is-active" : ""}`}
                aria-current={key === active ? "page" : undefined}
                onClick={() => onChange(key)}
              >
                {charts[key].title}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <label className="az-nav-select">
        <span className="az-visually-hidden">Report</span>
        <select value={active} onChange={(e) => onChange(e.target.value)}>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.reports.map((key) => (
                <option key={key} value={key}>
                  {charts[key].title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}

// --- Segmented control (VAT basis, chart/table view) -----------------------
// The highlight slides between options rather than jumping.
export function SegmentedControl({ label, options, value, onChange }) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      className="az-segmented"
      role="group"
      aria-label={label}
      style={{ "--az-seg-count": options.length, "--az-seg-index": index }}
    >
      <span className="az-segmented-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          className={option.value === value ? "is-active" : ""}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// --- Headline figures ------------------------------------------------------
// Numbers ease from their previous value to the new one (e.g. on a VAT switch).
function useAnimatedNumber(target, disabled) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (disabled || from === target || !Number.isFinite(target)) {
      fromRef.current = target;
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    const duration = 550;
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      fromRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, disabled]);

  return shown;
}

const formatTile = (value, format) => {
  if (format === "percent") return `${(Number(value) || 0).toFixed(1)}%`;
  if (format === "count") return Math.round(Number(value) || 0).toLocaleString("en-US");
  return formatCompact(value);
};

function KpiTile({ tile, reducedMotion }) {
  const shown = useAnimatedNumber(Number(tile.value) || 0, reducedMotion);
  const exact = tile.format === "money" ? formatRand(tile.value) : null;
  return (
    <div className={`az-tile${tile.tone ? ` is-${tile.tone}` : ""}`}>
      <p className="az-tile-label">{tile.label}</p>
      <p className="az-tile-value" title={exact || undefined}>
        {formatTile(shown, tile.format)}
      </p>
      <p className="az-tile-note">{tile.note || exact || " "}</p>
    </div>
  );
}

export function KpiTiles({ tiles }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!tiles.length) return null;
  return (
    <div className="az-tiles">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} tile={tile} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}

// Builds the helper the chart configs use to describe their headline figures.
export const tileContext = (points, categories) => {
  const stacks = stacksOf(categories);
  const rowTotal = (point) => stacks.reduce((sum, s) => sum + (point?.[`__total_${s}`] || 0), 0);
  const ranked = [...points].sort((a, b) => rowTotal(b) - rowTotal(a));
  return {
    count: points.length,
    row: (index) => rowTotal(points[index]),
    name: (index) => points[index]?.name,
    stack: (stack) => points.reduce((sum, point) => sum + (point[`__total_${stack}`] || 0), 0),
    cat: (key) => points.reduce((sum, point) => sum + (point[key] || 0), 0),
    grand: points.reduce((sum, point) => sum + rowTotal(point), 0),
    top: () => (ranked[0] ? { name: ranked[0].name, total: rowTotal(ranked[0]) } : null),
  };
};

// --- Legend --------------------------------------------------------------
// Swatches mirror the bar marks; text stays in ink, never the series colour.
// Side-by-side stacks are grouped under their names (Income · Expenses).
export function ChartLegend({ categories, stackLabels, legendItems }) {
  if (legendItems) {
    return (
      <ul className="az-legend">
        {legendItems.map((item) => (
          <li key={item.label} className="az-legend-item">
            <span className="az-legend-swatch" style={{ backgroundColor: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
    );
  }
  if (categories.length < 2) return null;

  const groups = stackLabels
    ? stacksOf(categories).map((stack) => ({
        label: stackLabels[stack],
        items: categories.filter((c) => c.stack === stack),
      }))
    : [{ label: null, items: categories }];

  return (
    <ul className="az-legend">
      {groups.map((group) => (
        <li key={group.label || "all"} className="az-legend-group">
          {group.label && <span className="az-legend-group-label">{group.label}</span>}
          <ul>
            {group.items.map((c) => (
              <li key={c.key} className="az-legend-item">
                <span className="az-legend-swatch" style={{ backgroundColor: c.color }} />
                {c.label}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// --- Table view ----------------------------------------------------------
// The same numbers as the chart, readable without hovering.
// totalsRow: add a Total footer — only meaningful when rows are parts of a whole
// (e.g. one row per truck), not when they compare a part with its total.
// showShare: add each row's share of the total. statusLabel: (total) => text,
// a Status column (e.g. which trucks are over the fuel threshold).
export function DataTable({
  points,
  categories,
  stackLabels,
  net,
  includeVat,
  totalsRow = false,
  showShare = false,
  statusLabel,
}) {
  const stacks = stacksOf(categories);
  const stackColumns = stackLabels
    ? stacks.map((stack) => ({ key: `__total_${stack}`, label: stackLabels[stack] }))
    : [];
  const needsTotal = !stackLabels && (stacks.length > 1 || categories.length > 1);
  const rowTotal = (point) => stacks.reduce((sum, s) => sum + point[`__total_${s}`], 0);
  const grand = points.reduce((sum, point) => sum + rowTotal(point), 0);
  const netOf = (point) =>
    point[`__total_${net.plus}`] - net.minus.reduce((sum, s) => sum + point[`__total_${s}`], 0);

  const columns = [
    ...categories.map((c) => ({ key: c.key, label: c.label, color: c.color, get: (p) => p[c.key] })),
    ...stackColumns.map((col) => ({ ...col, strong: true, get: (p) => p[col.key] })),
    ...(needsTotal ? [{ key: "__rowTotal", label: "Total", strong: true, get: rowTotal }] : []),
    ...(net ? [{ key: "__net", label: "Net", strong: true, get: netOf }] : []),
    ...(showShare
      ? [{ key: "__share", label: "Share", format: "percent", get: (p) => (grand ? (rowTotal(p) / grand) * 100 : 0) }]
      : []),
    ...(statusLabel
      ? [{ key: "__status", label: "Status", format: "text", get: (p) => statusLabel(rowTotal(p)) }]
      : []),
  ];
  const footer = totalsRow && points.length > 1;
  const show = (col, value) =>
    col.format === "percent" ? `${value.toFixed(1)}%` : col.format === "text" ? value : formatRand(value);
  const footerValue = (col) =>
    col.format === "text" ? "" : show(col, points.reduce((sum, point) => sum + col.get(point), 0));

  return (
    <div className="az-table-wrap">
      <table className="az-table">
        <caption className="az-visually-hidden">
          Values {includeVat ? "including" : "excluding"} VAT
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            {columns.map((col) => (
              <th scope="col" key={col.key} className={col.format === "text" ? "" : "is-number"}>
                {col.color && <span className="az-legend-swatch" style={{ backgroundColor: col.color }} />}
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.name}>
              <th scope="row">{point.name}</th>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${col.format === "text" ? "" : "is-number"}${col.strong ? " is-strong" : ""}`}
                >
                  {show(col, col.get(point))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {columns.map((col) => (
                <td key={col.key} className={col.format === "text" ? "" : "is-number is-strong"}>
                  {footerValue(col)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
