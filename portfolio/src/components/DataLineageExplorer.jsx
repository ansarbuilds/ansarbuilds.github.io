import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LINEAGE_NODES, LINEAGE_EDGES } from "../data/lineageData";

// Layout: each node's column is its longest-path depth from any node
// with no inbound edges (a "source"). Nodes in the same column are
// stacked in the order they appear in LINEAGE_NODES. This is enough
// structure to read a DAG left-to-right without pulling in a graph
// layout library for a demo dataset this small.
function computeLayout(nodes, edges, vertical = false) {
  const forward = new Map(nodes.map((n) => [n.id, []]));
  const remainingIn = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach(([from, to]) => {
    forward.get(from).push(to);
    remainingIn.set(to, (remainingIn.get(to) || 0) + 1);
  });

  // Longest-path-from-a-source depth via Kahn's algorithm: a node's
  // depth is only finalized once every edge into it has been relaxed,
  // which a plain BFS queue can't guarantee on its own.
  const depth = new Map(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => remainingIn.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift();
    for (const next of forward.get(id) || []) {
      depth.set(next, Math.max(depth.get(next), depth.get(id) + 1));
      remainingIn.set(next, remainingIn.get(next) - 1);
      if (remainingIn.get(next) === 0) queue.push(next);
    }
  }

  const columns = new Map();
  nodes.forEach((n) => {
    const d = depth.get(n.id) || 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(n.id);
  });

  // The pipeline is long and narrow (about 11 steps, at most 3 abreast). On
  // a wide screen it runs left to right; on a phone's tall panel it runs top
  // to bottom, or it would shrink to a thin strip of dots.
  const step = vertical ? 74 : 150;
  const lane = vertical ? 132 : 46;
  const positions = new Map();
  const maxRows = Math.max(...[...columns.values()].map((c) => c.length));
  columns.forEach((ids, col) => {
    const offset = ((maxRows - ids.length) * lane) / 2;
    ids.forEach((id, row) => {
      const along = col * step + 40, across = offset + row * lane + 40;
      positions.set(id, vertical ? { x: across, y: along, label: "below" } : { x: along, y: across, label: "right" });
    });
  });

  const length = (Math.max(...depth.values()) + 1) * step + (vertical ? 40 : 110);
  const breadth = maxRows * lane + (vertical ? 60 : 70);
  return { positions, forward, width: vertical ? breadth : length, height: vertical ? length : breadth };
}

// Reverse adjacency, built once, so hover can reach a node's upstream
// neighbors as easily as its downstream ones.
function buildReverse(nodes, edges) {
  const reverse = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach(([from, to]) => reverse.get(to).push(from));
  return reverse;
}

function downstreamOf(startId, forward) {
  const visited = new Set([startId]);
  const queue = [startId];
  const edgesHit = new Set();
  while (queue.length) {
    const id = queue.shift();
    for (const next of forward.get(id) || []) {
      edgesHit.add(`${id}->${next}`);
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return { nodes: visited, edges: edgesHit };
}

// One hop in either direction — the quick "what does this touch"
// preview used on hover, before a click pins the full chain.
function neighborsOf(id, forward, reverse) {
  const nodes = new Set([id]);
  const edges = new Set();
  (forward.get(id) || []).forEach((n) => {
    nodes.add(n);
    edges.add(`${id}->${n}`);
  });
  (reverse.get(id) || []).forEach((n) => {
    nodes.add(n);
    edges.add(`${n}->${id}`);
  });
  return { nodes, edges };
}

// Stone and cobalt, like the rest of the site: the four kinds of node are
// told apart by fill and outline, and cobalt marks what is lit.
const INK = "#111318";
const COBALT = "#1d4ed8";
const PAPER = "#faf9f6";
const TYPE_STYLES = {
  source: { fill: INK, stroke: INK, label: "Source", r: 6 },
  table: { fill: PAPER, stroke: INK, label: "Table", r: 5.5 },
  job: { fill: "#8a909c", stroke: "#8a909c", label: "Job", r: 5 },
  dashboard: { fill: PAPER, stroke: COBALT, label: "Consumer", r: 6.5 },
};

function edgeLine(a, b, r) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: a.x + ux * r,
    y1: a.y + uy * r,
    x2: b.x - ux * r,
    y2: b.y - uy * r,
  };
}

function LineageNode({ node, pos, active, dimmed, onClick, onHoverStart, onHoverEnd }) {
  const style = TYPE_STYLES[node.type];
  const radius = active ? style.r * 1.6 : style.r;
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={() => onClick(node.id)}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      className="cursor-pointer"
      role="button"
      aria-label={`${node.label} (${style.label})`}
    >
      {active && (
        <circle r={style.r * 2.6} fill="none" stroke={COBALT} strokeWidth={1} opacity={0.5} className="transition-all duration-200" />
      )}
      <circle
        r={radius}
        fill={active && style.fill !== PAPER ? COBALT : style.fill}
        stroke={active ? COBALT : style.stroke}
        strokeWidth={1.6}
        opacity={dimmed ? 0.25 : 1}
        className="transition-all duration-200"
      />
      {/* Larger invisible ring so hover fires well before the cursor is
          pixel-perfect on a 5-6px dot — the visible circle above stays
          small, this just widens the hit area around it. */}
      <circle r={16} fill="transparent" style={{ pointerEvents: "all" }} />
      <text
        // Beside the node on a wide screen; centred under it on a phone, where
        // the pipeline runs top to bottom and nodes sit side by side.
        x={pos.label === "below" ? 0 : style.r + 10}
        y={pos.label === "below" ? style.r + 16 : 4}
        textAnchor={pos.label === "below" ? "middle" : "start"}
        className="font-mono select-none pointer-events-none transition-opacity duration-150"
        fontSize={11}
        fontWeight={700}
        fill={INK}
        stroke="#f4f3ef"
        strokeWidth={4}
        paintOrder="stroke"
        opacity={active ? 1 : 0}
      >
        {node.label}
      </text>
    </g>
  );
}

export default function DataLineageExplorer() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const [vertical] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  const { positions, forward, width, height } = useMemo(
    () => computeLayout(LINEAGE_NODES, LINEAGE_EDGES, vertical),
    [vertical]
  );
  const reverse = useMemo(() => buildReverse(LINEAGE_NODES, LINEAGE_EDGES), []);

  // A click pins the full downstream impact chain (and drives the side
  // panel); hovering with nothing pinned previews just the immediate
  // connections, so the graph feels alive before you commit to a node.
  const active = selected
    ? { id: selected, ...downstreamOf(selected, forward) }
    : hovered
      ? { id: hovered, ...neighborsOf(hovered, forward, reverse) }
      : null;

  const selectedNode = LINEAGE_NODES.find((n) => n.id === selected);
  const impactList = useMemo(() => {
    if (!selected) return [];
    const impact = downstreamOf(selected, forward);
    return LINEAGE_NODES.filter((n) => impact.nodes.has(n.id) && n.id !== selected);
  }, [selected, forward]);

  return (
    <div className="h-full overflow-y-auto mono-scroll bg-[#f4f3ef] text-[#111318]">
      <div className="mx-auto max-w-[1260px] px-5 pt-24 pb-10">
        <a
          href="/work/lineage-explorer/"
          className="mb-6 inline-block font-mono text-[.68rem] uppercase tracking-[.14em] text-[#1d4ed8] hover:text-[#111318] transition-colors"
        >
          ← About this project
        </a>

        <p className="font-mono text-[.68rem] uppercase tracking-[.14em] text-[#1d4ed8] mb-2">Live demo</p>
        <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-[-0.035em] mb-3">Data lineage &amp; impact explorer</h1>
        <p className="text-[#4b5262] text-sm max-w-2xl mb-2">
          Hover a point to see what it connects to. Click one to pin the full downstream impact
          chain: everything that would break, go stale or need a re-run if that node changed.
        </p>
        <p className="font-mono text-[.65rem] text-[#4b5262] mb-4">
          Sample data only. This is a made-up retail pricing pipeline, built to show the idea.
        </p>
        <ul className="mb-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[.65rem] uppercase tracking-[.12em] text-[#4b5262]" aria-label="Key">
          {Object.entries(TYPE_STYLES).map(([type, t]) => (
            <li key={type} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r={t.r} fill={t.fill} stroke={t.stroke} strokeWidth={1.6} /></svg>
              {t.label}
            </li>
          ))}
        </ul>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div>
          {/* On a wide screen the pipeline is about 8 times wider than tall.
              Squeezed into a fixed box it shrank to a thin strip of unreadable
              labels, so it is drawn near its real size instead and scrolls
              sideways inside its frame when the screen is narrower. */}
          <div className={`border border-[#111318]/20 bg-[#faf9f6] p-2 ${vertical ? "h-[640px]" : "overflow-x-auto overscroll-x-contain mono-scroll"}`}
            tabIndex={vertical ? undefined : 0} role={vertical ? undefined : "region"} aria-label={vertical ? undefined : "Pipeline graph, scrolls sideways"}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              className="block w-full h-full"
              style={vertical ? undefined : { width: `max(100%, ${Math.round(width * 0.85)}px)`, height: "auto", aspectRatio: `${width} / ${height}` }}
            >
              <g>
                {LINEAGE_EDGES.map(([from, to]) => {
                  const a = positions.get(from);
                  const b = positions.get(to);
                  const key = `${from}->${to}`;
                  const isHot = active?.edges.has(key);
                  const isDimmed = active && !isHot;
                  const line = edgeLine(a, b, 8);
                  return (
                    <line
                      key={key}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={isHot ? COBALT : INK}
                      strokeWidth={isHot ? 1.6 : 1}
                      opacity={isDimmed ? 0.08 : isHot ? 0.95 : 0.28}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </g>
              <g>
                {LINEAGE_NODES.map((node) => {
                  const pos = positions.get(node.id);
                  const isActive = active?.nodes.has(node.id);
                  const isDimmed = active && !isActive;
                  return (
                    <LineageNode
                      key={node.id}
                      node={node}
                      pos={pos}
                      active={isActive}
                      dimmed={isDimmed}
                      onClick={(id) => setSelected((cur) => (cur === id ? null : id))}
                      onHoverStart={setHovered}
                      onHoverEnd={() => setHovered(null)}
                    />
                  );
                })}
              </g>
            </svg>
          </div>
          {!vertical && <p className="mt-2 font-mono text-[.65rem] text-[#4b5262]">Scroll sideways inside the frame to follow the pipeline →</p>}
          </div>

          <motion.div
            key={selected || "empty"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="border border-[#111318]/20 border-t-[#111318] bg-[#faf9f6] p-5 h-fit"
          >
            {!selectedNode ? (
              <p className="text-[#4b5262] text-sm">
                Hover a point to preview its connections. Click one to pin the full impact chain.
              </p>
            ) : (
              <>
                <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#1d4ed8] mb-1">
                  {TYPE_STYLES[selectedNode.type].label}
                </p>
                <h2 className="font-mono text-sm font-bold mb-2">{selectedNode.label}</h2>
                <p className="text-[#4b5262] text-[.8rem] mb-4">{selectedNode.desc}</p>

                <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[#4b5262] mb-2">
                  Downstream impact ({impactList.length})
                </p>
                {impactList.length === 0 ? (
                  <p className="text-[#4b5262] text-[.8rem]">Nothing downstream. This is an end point.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {impactList.map((n) => (
                      <li key={n.id} className="flex items-center gap-2 font-mono text-[.72rem]">
                        <svg width="10" height="10" viewBox="-5 -5 10 10" className="shrink-0" aria-hidden="true">
                          <circle r={3.5} fill={TYPE_STYLES[n.type].fill} stroke={TYPE_STYLES[n.type].stroke} strokeWidth={1.4} />
                        </svg>
                        <span className="text-[#111318]">{n.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
