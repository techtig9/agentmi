/**
 * The node-graph motif: Agentmi's own execution pipeline, drawn.
 *
 * Deliberately not abstract decoration — these are the five stages a real run
 * goes through (`lib/chat/run-agent-chat.ts`): the request arrives, knowledge
 * is retrieved, the model is called, tools may be invoked, a response is
 * returned. Someone who has read the product's trace view recognises it.
 *
 * Pure inline SVG with CSS animation: no charting or animation library, and
 * only `stroke-dashoffset`, `opacity` and `transform` are animated, so it
 * never triggers layout. `prefers-reduced-motion` stops the motion through the
 * global rule in globals.css while the diagram itself stays fully legible —
 * the dashes simply hold still.
 */
export function NodeGraph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 160"
      className={className}
      role="img"
      aria-labelledby="node-graph-title node-graph-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="node-graph-title">How an Agentmi run executes</title>
      <desc id="node-graph-desc">
        A request flows through knowledge retrieval and the model, calling tools
        as needed, before returning a response.
      </desc>

      {CONNECTORS.map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <path
            d={`M${x1} ${y1} C ${x1 + 34} ${y1}, ${x2 - 34} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="rgb(var(--hairline))"
            strokeWidth="1.5"
          />
          <path
            d={`M${x1} ${y1} C ${x1 + 34} ${y1}, ${x2 - 34} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="1.5"
            strokeDasharray="4 20"
            className="animate-flow-dash"
            style={{ animationDelay: `${i * 160}ms` }}
            opacity="0.85"
          />
        </g>
      ))}

      {NODES.map(({ x, y, label, accent }, i) => (
        <g key={label}>
          <circle
            cx={x}
            cy={y}
            r="17"
            fill="rgb(var(--surface))"
            stroke={accent ? "rgb(var(--accent))" : "rgb(var(--hairline))"}
            strokeWidth="1.5"
          />
          <circle
            cx={x}
            cy={y}
            r="5"
            fill={accent ? "rgb(var(--accent))" : "rgb(var(--content-subtle))"}
            className="animate-pulse-node"
            style={{ animationDelay: `${i * 300}ms` }}
          />
          <text
            x={x}
            y={y + 36}
            textAnchor="middle"
            className="font-mono"
            fontSize="10"
            fill="rgb(var(--content-subtle))"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const NODES = [
  { x: 40, y: 80, label: "Request", accent: false },
  { x: 190, y: 44, label: "Knowledge", accent: false },
  { x: 320, y: 80, label: "Model", accent: true },
  { x: 460, y: 44, label: "Tools", accent: false },
  { x: 600, y: 80, label: "Response", accent: true },
] as const;

const CONNECTORS: ReadonlyArray<readonly [number, number, number, number]> = [
  [57, 80, 173, 44],
  [207, 44, 303, 80],
  [57, 80, 303, 80],
  [337, 80, 443, 44],
  [477, 44, 583, 80],
  [337, 80, 583, 80],
];
