import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";

// Every analytic row is { name, categories: { [key]: { ex, vat } } }. A chart
// stacks its categories and shows each one excluding VAT (ex) or including it
// (ex + vat), so both views come from the same numbers.
export const vatValue = (category, includeVat) =>
  category ? category.ex + (includeVat ? category.vat : 0) : 0;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const formatRand = (value) => {
  const amount = round2(value);
  const text = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "−" : ""}R${text}`;
};

// Short form for axes, bar labels and headline figures: R512 · R151.2k · R2.29M.
export const formatCompact = (value) => {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  const trim = (n, digits) => String(Number(n.toFixed(digits)));
  if (abs >= 1e6) return `${sign}R${trim(abs / 1e6, abs >= 1e7 ? 1 : 2)}M`;
  if (abs >= 1e3) return `${sign}R${trim(abs / 1e3, abs >= 1e5 ? 0 : 1)}k`;
  return `${sign}R${Math.round(abs)}`;
};

// Adds every row's categories together into one row (e.g. "All trucks").
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

// Height of an element, kept up to date as the window resizes.
function useElementHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height];
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(reducedMotionQuery).matches
  );
  useEffect(() => {
    const query = window.matchMedia?.(reducedMotionQuery);
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/**
 * Chart points for a set of rows: each category's value on the chosen VAT
 * basis, each stack's total, and which category sits at the outer end of each
 * stack (that segment gets the rounded end). Shared by the chart, the table and
 * the headline figures so they always agree.
 */
export const buildPoints = (rows, categories, includeVat) => {
  const stacks = [...new Set(categories.map((c) => c.stack))];
  return rows.map((row) => {
    const point = { name: row.name, row };
    for (const c of categories) {
      point[c.key] = round2(vatValue(row.categories?.[c.key], includeVat));
    }
    for (const stack of stacks) {
      const inStack = categories.filter((c) => c.stack === stack);
      point[`__top_${stack}`] = 0;
      point[`__total_${stack}`] = round2(inStack.reduce((sum, c) => sum + point[c.key], 0));
      point[`__end_${stack}`] = [...inStack].reverse().find((c) => point[c.key] > 0)?.key;
      point[`__negEnd_${stack}`] = [...inStack].reverse().find((c) => point[c.key] < 0)?.key;
      point[`__has_${stack}`] = inStack.some((c) => row.categories?.[c.key]);
    }
    return point;
  });
};

export const stacksOf = (categories) => [...new Set(categories.map((c) => c.stack))];

// --- Marks ------------------------------------------------------------------
// Bars: thin, the outer end of each stack rounded (square at the baseline),
// and a 2px gap of card colour between stacked segments instead of outlines.
// Chart chrome: recessive hairline grid and baseline, a faint hover band.
const CHROME = { grid: "#ebeae5", baseline: "#c9c7bf", hover: "rgba(42, 120, 214, 0.06)" };
const GAP = 2;
const RADIUS = 4;

const roundedRectPath = (x, y, w, h, r) =>
  [
    `M${x + r.tl},${y}`,
    `H${x + w - r.tr}`,
    `Q${x + w},${y} ${x + w},${y + r.tr}`,
    `V${y + h - r.br}`,
    `Q${x + w},${y + h} ${x + w - r.br},${y + h}`,
    `H${x + r.bl}`,
    `Q${x},${y + h} ${x},${y + h - r.bl}`,
    `V${y + r.tl}`,
    `Q${x},${y} ${x + r.tl},${y}`,
    "Z",
  ].join(" ");

const segmentShape = (catKey, stack, horizontal) => (props) => {
  const { payload, fill } = props;
  let { x, y, width, height } = props;
  const value = payload?.[catKey];
  if (!value) return null;
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  const positive = value > 0;
  const isOuter = payload[positive ? `__end_${stack}` : `__negEnd_${stack}`] === catKey;

  // The gap faces away from the baseline, toward the next segment out.
  if (!isOuter) {
    if (horizontal) {
      if (positive) width -= GAP;
      else {
        x += GAP;
        width -= GAP;
      }
    } else if (positive) {
      y += GAP;
      height -= GAP;
    } else {
      height -= GAP;
    }
  }
  if (width <= 0 || height <= 0) return null;

  const r = isOuter ? Math.min(RADIUS, horizontal ? width : height, horizontal ? height / 2 : width / 2) : 0;
  const none = { tl: 0, tr: 0, br: 0, bl: 0 };
  const corners = !isOuter
    ? none
    : horizontal
      ? positive
        ? { tl: 0, tr: r, br: r, bl: 0 }
        : { tl: r, tr: 0, br: 0, bl: r }
      : positive
        ? { tl: r, tr: r, br: 0, bl: 0 }
        : { tl: 0, tr: 0, br: r, bl: r };

  return <path d={roundedRectPath(x, y, width, height, corners)} fill={fill} className="az-bar-segment" />;
};

// --- Axis ticks -------------------------------------------------------------
// Row names wrap onto at most two lines; anything longer is shortened.
const wrapName = (name, perLine = 18) => {
  const words = String(name ?? "").trim().split(/\s+/);
  const lines = [""];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current) lines[lines.length - 1] = word;
    else if ((current + " " + word).length <= perLine) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  }
  if (lines.length > 2) {
    lines.length = 2;
    lines[1] = `${lines[1].slice(0, perLine - 1)}…`;
  }
  return lines;
};

const CategoryTick = ({ x, y, payload }) => (
  <g transform={`translate(${x},${y})`}>
    {wrapName(payload.value).map((line, index) => (
      <text key={index} x={0} y={14 + index * 15} textAnchor="middle" className="az-axis-label">
        {line}
      </text>
    ))}
  </g>
);

const RowTick = ({ x, y, payload }) => {
  const name = String(payload.value ?? "").trim();
  return (
    <text x={x - 8} y={y} dy={4} textAnchor="end" className="az-axis-label">
      {name.length > 20 ? `${name.slice(0, 19)}…` : name}
    </text>
  );
};

// --- Tooltip ----------------------------------------------------------------
// Values lead; series names follow in quieter ink; a short line of the series
// colour keys each row.
function ChartTooltip({ active, payload, categories, stackLabels, net, includeVat, statusOf }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const stacks = stacksOf(categories);
  const netValue = net
    ? point[`__total_${net.plus}`] -
      net.minus.reduce((sum, stack) => sum + point[`__total_${stack}`], 0)
    : null;
  const status = statusOf?.(point);

  return (
    <div className="az-tooltip">
      <div className="az-tooltip-head">
        <span className="az-tooltip-title">{point.name}</span>
        <span className="az-tooltip-basis">{includeVat ? "Incl. VAT" : "Excl. VAT"}</span>
      </div>
      {stacks.map((stack) => {
        const inStack = categories.filter(
          (c) => c.stack === stack && point.row.categories?.[c.key]
        );
        if (!inStack.length) return null;
        // Zero lines are noise; keep them only if the whole stack is zero.
        const nonZero = inStack.filter((c) => point[c.key] !== 0);
        const present = nonZero.length ? nonZero : inStack.slice(0, 1);
        const stackLabel = stackLabels?.[stack];
        const showTotal = stackLabel || present.length > 1;
        return (
          <div key={stack} className="az-tooltip-section">
            {present.map((c) => (
              <div key={c.key} className="az-tooltip-row">
                <span className="az-tooltip-key" style={{ backgroundColor: status?.color || c.color }} />
                <span className="az-tooltip-name">{c.label}</span>
                <span className="az-tooltip-value">{formatRand(point[c.key])}</span>
              </div>
            ))}
            {showTotal && (
              <div className="az-tooltip-row az-tooltip-total">
                <span className="az-tooltip-key az-tooltip-key-blank" />
                <span className="az-tooltip-name">{stackLabel || "Total"}</span>
                <span className="az-tooltip-value">{formatRand(point[`__total_${stack}`])}</span>
              </div>
            )}
          </div>
        );
      })}
      {net && (
        <div className={`az-tooltip-net ${netValue >= 0 ? "is-positive" : "is-negative"}`}>
          <span>{net.label}</span>
          <span>{formatRand(netValue)}</span>
        </div>
      )}
      {status && (
        <div className="az-tooltip-status">
          <span className="az-status-dot" style={{ backgroundColor: status.color }} />
          {status.label}
        </div>
      )}
    </div>
  );
}

/**
 * Stacked bar chart of categorised values.
 *
 * points: from buildPoints(); categories: [{ key, label, color, stack }] —
 *   categories sharing a stack are stacked into one bar; different stacks sit
 *   side by side on each row.
 * stackLabels: { [stack]: "Income" } names each stack in the tooltip.
 * net: { label, plus, minus } a stack difference shown in the tooltip.
 * horizontal: rank rows as horizontal bars (for long lists of trucks).
 * showShare: label horizontal bars with their share of the total.
 * statusColor / statusLabel: colour and name a single-category bar by size.
 */
export default function CategoryBarChart({
  points,
  categories,
  includeVat,
  stackLabels,
  net,
  horizontal = false,
  showShare = false,
  statusColor,
  statusLabel,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [listRef, listHeight] = useElementHeight();
  const stacks = stacksOf(categories);
  const barCount = points.length * stacks.length;
  const grandTotal = points.reduce(
    (sum, point) => sum + stacks.reduce((t, s) => t + point[`__total_${s}`], 0),
    0
  );
  const hasNegative = points.some((point) => categories.some((c) => point[c.key] < 0));
  // Label every bar only while there are few enough to read; otherwise the
  // axis, tooltip and table carry the values. Horizontal rankings always label
  // the bar ends — there is room beside each bar and it is how a ranking reads.
  const showLabels = horizontal || barCount <= 8;

  const statusOf = statusColor
    ? (point) => {
        const total = point[`__total_${stacks[0]}`];
        return { color: statusColor(total), label: statusLabel?.(total) };
      }
    : null;

  const capLabel = (stack) => (props) => {
    const { x, y, width: barWidth, height: barHeight, index } = props;
    const point = points[index];
    if (!point || !point[`__has_${stack}`]) return null;
    const total = point[`__total_${stack}`];
    if (horizontal) {
      const pct =
        showShare && grandTotal ? ` · ${((total / grandTotal) * 100).toFixed(1)}%` : "";
      return (
        <text x={x + 8} y={y + barHeight / 2} dy={4} className="az-bar-label" textAnchor="start">
          {`${formatCompact(total)}${pct}`}
        </text>
      );
    }
    return (
      <text x={x + barWidth / 2} y={y - 8} className="az-bar-label" textAnchor="middle">
        {formatCompact(total)}
      </text>
    );
  };

  const animation = {
    isAnimationActive: !reducedMotion,
    animationDuration: 650,
    animationEasing: "ease-out",
  };

  const valueAxisProps = {
    type: "number",
    tickFormatter: formatCompact,
    tick: { className: "az-axis-label" },
    tickLine: false,
    axisLine: false,
  };

  // Horizontal rankings fit every row into the space the card has, thinning
  // the bars as needed. Only when rows would get too cramped to read (a very
  // short window) does the list scroll inside the card instead.
  const AXIS_SPACE = 48;
  const MIN_ROW = 14;
  const fittedRow = listHeight ? (listHeight - AXIS_SPACE) / Math.max(points.length, 1) : 0;
  const fits = fittedRow >= MIN_ROW;
  const rowHeight = fits ? Math.min(fittedRow, 44) : 24;
  const chartHeight = horizontal
    ? fits
      ? Math.floor(listHeight) - 6 // labels may overhang the SVG edge slightly
      : points.length * rowHeight + AXIS_SPACE
    : "100%";
  const barSize = horizontal ? Math.max(8, Math.min(20, Math.floor(rowHeight * 0.6))) : 48;

  const chart = (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={points}
        layout={horizontal ? "vertical" : "horizontal"}
        stackOffset="sign"
        barCategoryGap={horizontal ? "30%" : "28%"}
        barGap={6}
        margin={
          horizontal
            ? { top: 8, right: 120, left: 8, bottom: 8 }
            : { top: 28, right: 16, left: 8, bottom: 8 }
        }
        accessibilityLayer
      >
        <CartesianGrid
          stroke={CHROME.grid}
          vertical={horizontal}
          horizontal={!horizontal}
        />
        {/* Axes must be direct children of the chart: Recharts does not find
            them inside fragments. */}
        {horizontal && <XAxis {...valueAxisProps} />}
        {horizontal && (
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            interval={0}
            tick={<RowTick />}
            tickLine={false}
            axisLine={{ stroke: CHROME.baseline }}
          />
        )}
        {!horizontal && (
          <XAxis
            dataKey="name"
            interval={0}
            height={44}
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={{ stroke: CHROME.baseline }}
          />
        )}
        {!horizontal && <YAxis {...valueAxisProps} width={64} />}
        <Tooltip
          cursor={{ fill: CHROME.hover }}
          wrapperStyle={{ outline: "none", zIndex: 10 }}
          animationDuration={reducedMotion ? 0 : 150}
          content={
            <ChartTooltip
              categories={categories}
              stackLabels={stackLabels}
              net={net}
              includeVat={includeVat}
              statusOf={statusOf}
            />
          }
        />
        {hasNegative &&
          (horizontal ? (
            <ReferenceLine x={0} stroke={CHROME.baseline} />
          ) : (
            <ReferenceLine y={0} stroke={CHROME.baseline} />
          ))}
        {categories.map((c) => (
          <Bar
            key={c.key}
            dataKey={c.key}
            name={c.label}
            stackId={c.stack}
            fill={c.color}
            barSize={barSize}
            shape={segmentShape(c.key, c.stack, horizontal)}
            {...animation}
          >
            {statusColor &&
              points.map((point, index) => (
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
            barSize={barSize}
            isAnimationActive={false}
          >
            {showLabels && <LabelList dataKey={`__top_${stack}`} content={capLabel(stack)} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  return horizontal ? (
    <div className={`az-plot-scroll${fits ? " is-fitted" : ""}`} ref={listRef}>
      {chart}
    </div>
  ) : (
    chart
  );
}
