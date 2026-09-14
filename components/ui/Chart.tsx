"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/**
 * Categorical series colors.
 *
 * Validated with the dataviz palette checker against the #121218 card surface:
 * all four sit inside the dark lightness band, clear the chroma floor, keep
 * adjacent CVD ΔE >= 8 and clear 3:1 contrast. The brand's raw neon accents
 * fail that check outright — neon green and amber measure ΔE 5.1 under
 * deuteranopia, i.e. indistinguishable — so charts use these steps instead and
 * leave the neon accents to status and UI chrome, where they are never the only
 * thing carrying meaning.
 *
 * Assigned in fixed order and never cycled. Beyond four series, the callers here
 * fold the tail into "Other" rather than inventing a fifth hue.
 */
export const SERIES_COLORS = ["#0D95A6", "#8257E0", "#C08230", "#CE5A82"] as const;

/**
 * The "Other" bucket is deliberately neutral, not a fifth hue.
 *
 * Cycling back to SERIES_COLORS[0] would paint "Other" the same colour as the
 * top category — two different things reading as one. A recessive grey also
 * says the right thing: this row is a remainder, not a peer.
 */
const OTHER_COLOR = "#5C6178";

/** Status colors are reserved and never used as a categorical series. */
const SUCCESS = "#39FF14";
const FAILURE = "#FF2E9A";
const GRID = "#1B1B24";

export interface SeriesDatum {
  label: string;
  succeeded: number;
  failed: number;
  total: number;
}

/**
 * Runs over time as a stacked column chart.
 *
 * Columns rather than a line: the measure is a count per bucket, which is
 * magnitude-per-category, and a line between discrete counts implies
 * interpolation that did not happen. Success and failure are status colors, so
 * each column also carries its counts in the tooltip and the table view below —
 * the split is never conveyed by color alone.
 */
export function RunsOverTime({
  data,
  height = 180,
  caption,
}: {
  data: SeriesDatum[];
  height?: number;
  caption: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const max = Math.max(1, ...data.map((d) => d.total));
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-base-700 text-sm text-ink-600"
        style={{ height }}
      >
        No runs recorded in this range.
      </div>
    );
  }

  const gap = 2; // surface gap between adjacent columns
  const slot = 100 / data.length;
  const barWidth = Math.max(0.5, slot - gap);

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          onMouseLeave={() => setHover(null)}
        >
          <title id={titleId}>{caption}</title>
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={100}
              y1={height - fraction * height}
              y2={height - fraction * height}
              stroke={GRID}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {data.map((point, i) => {
            const x = i * slot;
            const succeededHeight = (point.succeeded / max) * (height - 8);
            const failedHeight = (point.failed / max) * (height - 8);
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                {/* Full-height hit target so the hover zone is bigger than the mark. */}
                <rect x={x} y={0} width={slot} height={height} fill="transparent" />
                {failedHeight > 0 && (
                  <rect
                    x={x + gap / 2}
                    y={height - succeededHeight - failedHeight}
                    width={barWidth}
                    height={failedHeight}
                    fill={FAILURE}
                    opacity={hover === null || hover === i ? 0.9 : 0.45}
                  />
                )}
                {succeededHeight > 0 && (
                  <rect
                    x={x + gap / 2}
                    y={height - succeededHeight}
                    width={barWidth}
                    height={succeededHeight}
                    fill={SUCCESS}
                    opacity={hover === null || hover === i ? 0.85 : 0.4}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 rounded-lg border border-base-700 bg-base-900 px-2.5 py-1.5 font-mono text-[11px] shadow-popover"
            style={{
              left: `${Math.min(80, (hover / data.length) * 100)}%`,
            }}
          >
            <p className="text-ink-100">{data[hover].label}</p>
            <p className="text-neon-green">{data[hover].succeeded} succeeded</p>
            <p className="text-neon-pink">{data[hover].failed} failed</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink-600">
        <span>{data[0]?.label}</span>
        <Legend
          items={[
            { label: "Succeeded", color: SUCCESS },
            { label: "Failed", color: FAILURE },
          ]}
        />
        <span>{data[data.length - 1]?.label}</span>
      </div>

      <figcaption className="sr-only">{caption}</figcaption>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-ink-600 hover:text-ink-400">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-auto" tabIndex={0}>
          <table className="w-full text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead className="border-b border-base-700">
              <tr>
                <th scope="col" className="px-2 py-1.5 text-left font-mono text-[10px] uppercase text-ink-600">Period</th>
                <th scope="col" className="px-2 py-1.5 text-right font-mono text-[10px] uppercase text-ink-600">Succeeded</th>
                <th scope="col" className="px-2 py-1.5 text-right font-mono text-[10px] uppercase text-ink-600">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-700">
              {data.map((point, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 text-ink-400">{point.label}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-400">{point.succeeded}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-400">{point.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/**
 * Ranked horizontal bars with a direct label on every row.
 *
 * The direct labels are what make the categorical colors legal at the all-pairs
 * CVD floor: identity never depends on the hue alone.
 */
export function BarList({
  items,
  caption,
  emptyMessage = "No data recorded yet.",
  valueSuffix = "",
}: {
  items: Array<{ label: string; count: number }>;
  caption: string;
  emptyMessage?: string;
  valueSuffix?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-base-700 px-4 py-8 text-center text-sm text-ink-600">
        {emptyMessage}
      </p>
    );
  }

  // A fifth-and-beyond category folds into "Other" rather than getting a new hue.
  const head = items.slice(0, SERIES_COLORS.length);
  const tail = items.slice(SERIES_COLORS.length);
  const hasOther = tail.length > 0;
  const rows = hasOther
    ? [...head, { label: "Other", count: tail.reduce((sum, item) => sum + item.count, 0) }]
    : head;

  const max = Math.max(1, ...rows.map((row) => row.count));
  const colorAt = (index: number) =>
    hasOther && index === rows.length - 1 ? OTHER_COLOR : SERIES_COLORS[index];

  return (
    <ul aria-label={caption} className="space-y-2.5">
      {rows.map((row, i) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorAt(i) }}
              />
              <span className="truncate text-ink-400">{row.label}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-ink-400">
              {row.count.toLocaleString()}
              {valueSuffix}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-base-800">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.count / max) * 100}%`,
                backgroundColor: colorAt(i),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <span className="flex items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </span>
  );
}

/** Segmented range picker shared by Observability and Analytics. */
export function RangeTabs({
  options,
  active,
  basePath,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  active: string;
  basePath: string;
}) {
  return (
    // Wraps rather than forcing a fixed row: four ranges do not fit on a
    // 320px screen, and a nav that overflows the viewport is worse than one
    // that takes two lines.
    <nav aria-label="Time range" className="flex flex-wrap rounded-lg border border-base-700 p-0.5">
      {options.map((option) => (
        <a
          key={option.id}
          href={`${basePath}?range=${option.id}`}
          aria-current={option.id === active ? "page" : undefined}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs transition-colors",
            option.id === active ? "bg-base-800 text-neon-cyan" : "text-ink-400 hover:text-ink-100"
          )}
        >
          {option.label}
        </a>
      ))}
    </nav>
  );
}
