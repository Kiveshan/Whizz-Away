import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { CustomAxisTick } from "./AnalyticsFunctions";

// Every analytic row is { name, categories: { [key]: { ex, vat } } }. A chart
// stacks its categories and shows each one excluding VAT (ex) or including it
// (ex + vat), so both views come from the same numbers.
export const vatValue = (category, includeVat) =>
  category ? category.ex + (includeVat ? category.vat : 0) : 0;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const formatRand = (value) =>
  `R${round2(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Adds every row's categories together into one row (e.g. "Totals").
export const collapseRows = (rows, name) => {
  const categories = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.categories || {})) {
      const sum = categories[key] || { ex: 0, vat: 0 };
      categories[key] = { ex: sum.ex + value.ex, vat: sum.vat + value.vat };
    }
  }
  return [{ name, categories }];
};

// Per-chart VAT preference, remembered per browser. Storage can be missing or
// blocked (private windows), so every access falls back to the chart default.
const readVatPreference = (storageKey, fallback) => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "incl") return true;
    if (stored === "excl") return false;
  } catch (e) {
    // storage unavailable
  }
  return fallback;
};

export function useVatToggle(chartKey, defaultIncludeVat) {
  const storageKey = `analytics.vat.${chartKey}`;
  const [chosen, setChosen] = useState({});
  const includeVat = chosen[storageKey] ?? readVatPreference(storageKey, defaultIncludeVat);

  const setIncludeVat = (next) => {
    setChosen((previous) => ({ ...previous, [storageKey]: next }));
    try {
      localStorage.setItem(storageKey, next ? "incl" : "excl");
    } catch (e) {
      // storage unavailable; the choice still applies for this session
    }
  };

  return [includeVat, setIncludeVat];
}

export function VatToggle({ includeVat, onChange }) {
  return (
    <div className="vat-toggle" role="group" aria-label="VAT">
      <button
        type="button"
        className={includeVat ? "active" : ""}
        aria-pressed={includeVat}
        onClick={() => onChange(true)}
      >
        Incl. VAT
      </button>
      <button
        type="button"
        className={!includeVat ? "active" : ""}
        aria-pressed={!includeVat}
        onClick={() => onChange(false)}
      >
        Excl. VAT
      </button>
    </div>
  );
}

/**
 * Stacked bar chart of categorised values.
 *
 * categories: [{ key, label, color, stack }] — categories sharing a stack are
 *   stacked into one bar; different stacks sit side by side on each row.
 * stackLabels: { [stack]: "Income" } — names each stack in the tooltip.
 * net: { label, plus, minus } — a stack difference shown in the tooltip
 *   (e.g. Profit = income - expense).
 * showShare: label each bar with its share of the chart total.
 * statusColor: (total) => colour, for single-category charts coloured by size.
 * legendItems: [{ label, color }] to replace the category legend.
 * summary: (data) => text shown under the chart.
 * wrapLabels: wrap long row names (clients, companies) over several lines.
 */
export default function CategoryBarChart({
  rows,
  categories,
  includeVat,
  width,
  yLabel = "Amount (R)",
  stackLabels = {},
  net,
  showShare = false,
  statusColor,
  legendItems,
  summary,
  wrapLabels = false,
}) {
  const stacks = [...new Set(categories.map((c) => c.stack))];

  const data = rows.map((row) => {
    const point = { name: row.name, row };
    for (const c of categories) {
      point[c.key] = round2(vatValue(row.categories?.[c.key], includeVat));
    }
    for (const stack of stacks) {
      point[`__top_${stack}`] = 0;
      point[`__total_${stack}`] = round2(
        categories
          .filter((c) => c.stack === stack)
          .reduce((sum, c) => sum + point[c.key], 0)
      );
    }
    return point;
  });

  const grandTotal = data.reduce(
    (sum, point) => sum + stacks.reduce((t, s) => t + point[`__total_${s}`], 0),
    0
  );
  const hasNegative = data.some((point) => categories.some((c) => point[c.key] < 0));
  const netOf = (point) =>
    net
      ? point[`__total_${net.plus}`] -
        net.minus.reduce((sum, stack) => sum + point[`__total_${stack}`], 0)
      : 0;

  // Labels sit on a zero-height bar at the top of each stack, so they always
  // show the stack's total however many segments it has.
  const stackTotalLabel = (stack) => (props) => {
    const { x, y, width: barWidth, index } = props;
    const point = data[index];
    if (!point) return null;
    const hasStack = categories.some(
      (c) => c.stack === stack && point.row.categories?.[c.key]
    );
    if (!hasStack) return null;
    const total = point[`__total_${stack}`];
    const share =
      showShare && grandTotal ? ` (${((total / grandTotal) * 100).toFixed(2)}%)` : "";
    return (
      <text
        x={x + barWidth / 2}
        y={y - 10}
        fill="#000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {`${formatRand(total)}${share}`}
      </text>
    );
  };

  const CategoryTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">
          {label}{" "}
          <span className="tooltip-vat">({includeVat ? "incl. VAT" : "excl. VAT"})</span>
        </p>
        {stacks.map((stack) => {
          const present = categories.filter(
            (c) => c.stack === stack && point.row.categories?.[c.key]
          );
          if (!present.length) return null;
          const stackLabel = stackLabels[stack];
          return (
            <div key={stack} className="tooltip-stack">
              {stackLabel && (
                <p className="tooltip-value tooltip-stack-total">
                  {`${stackLabel}: ${formatRand(point[`__total_${stack}`])}`}
                </p>
              )}
              {present.map((c) => (
                <p key={c.key} className="tooltip-value" style={{ color: c.color }}>
                  {`${stackLabel ? "• " : ""}${c.label}: ${formatRand(point[c.key])}`}
                </p>
              ))}
              {!stackLabel && present.length > 1 && (
                <p className="tooltip-value tooltip-stack-total">
                  {`Total: ${formatRand(point[`__total_${stack}`])}`}
                </p>
              )}
            </div>
          );
        })}
        {net && (
          <p
            className="tooltip-value tooltip-stack-total"
            style={{ color: netOf(point) >= 0 ? "#4CAF50" : "#F44336" }}
          >
            {`${net.label}: ${formatRand(netOf(point))}`}
          </p>
        )}
      </div>
    );
  };

  const legend = legendItems || categories;

  return (
    <>
      <div className="chart-header">
        {legend.map((item) => (
          <div className="chart-header-item" key={item.key || item.label}>
            <span className="legend-color" style={{ backgroundColor: item.color }}></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-scroll-container">
        <ResponsiveContainer width={width} height="100%">
          <BarChart data={data} stackOffset="sign" margin={{ top: 40, right: 30, left: 60, bottom: 24 }}>
            <XAxis
              dataKey="name"
              interval={0}
              height={wrapLabels ? 90 : 60}
              tick={wrapLabels ? <CustomAxisTick /> : { fontSize: 12, fill: "#000" }}
            />
            <YAxis
              label={{ value: yLabel, angle: 0, position: "top", dy: -20 }}
            />
            <Tooltip content={<CategoryTooltip />} />
            {hasNegative && <ReferenceLine y={0} stroke="#999" />}
            {categories.map((c) => (
              <Bar
                key={c.key}
                dataKey={c.key}
                name={c.label}
                stackId={c.stack}
                fill={c.color}
                maxBarSize={160}
                isAnimationActive={false}
              >
                {statusColor &&
                  data.map((point, index) => (
                    <Cell key={`cell-${index}`} fill={statusColor(point[`__total_${c.stack}`])} />
                  ))}
              </Bar>
            ))}
            {stacks.map((stack) => (
              <Bar
                key={`top-${stack}`}
                dataKey={`__top_${stack}`}
                stackId={stack}
                fill="transparent"
                legendType="none"
                maxBarSize={160}
                isAnimationActive={false}
              >
                <LabelList dataKey={`__top_${stack}`} content={stackTotalLabel(stack)} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {summary && <div className="chart-summary">{summary(data)}</div>}
    </>
  );
}
