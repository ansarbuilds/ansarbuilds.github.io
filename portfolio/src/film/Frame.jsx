/* One storyboard drawing per kind of shot. These are rough boards on
   purpose: they show composition and what is in frame, not the final look.
   Every frame is 2.39:1 (the film's shape), drawn on a 239 x 100 grid. */

const BONE = "#efe6d8";
const SIGNAL = "#ff8a5f";
const DIM = "#6b635a";
const W = 239, H = 100, CX = W / 2, CY = H / 2;

// The same seed always gives the same scatter, so a board does not reshuffle
// between renders.
function scatter(seed, count, fn) {
  let state = seed;
  const next = () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; };
  return Array.from({ length: count }, (_, i) => fn(next, i));
}
// Points in a soft-edged blob around (x, y).
const blob = (seed, count, x, y, rx, ry) => scatter(seed, count, (next) => {
  const angle = next() * Math.PI * 2, reach = Math.sqrt(next());
  return [x + Math.cos(angle) * rx * reach, y + Math.sin(angle) * ry * reach, 0.25 + next() * 0.6];
});
const Dots = ({ points, fill = BONE }) => points.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity={0.35 + (i % 5) * 0.13} />);
const Links = ({ points, every = 3, stroke = DIM }) => points.map(([x, y], i) => i % every === 0 && points[i + 7] && <line key={i} x1={x} y1={y} x2={points[i + 7][0]} y2={points[i + 7][1]} stroke={stroke} strokeWidth=".18" opacity=".7" />);
const Glow = ({ x = CX, y = CY, r = 14, color = SIGNAL }) => <><circle cx={x} cy={y} r={r} fill={color} opacity=".12" /><circle cx={x} cy={y} r={r * 0.45} fill={color} opacity=".28" /><circle cx={x} cy={y} r={Math.max(0.9, r * 0.1)} fill="#fff" /></>;
const Flare = ({ x = CX, y = CY, w = 90 }) => <ellipse cx={x} cy={y} rx={w} ry=".5" fill={SIGNAL} opacity=".55" />;
const Title = ({ children, y = CY + 5, size = 15, fill = BONE, ...rest }) => <text x={CX} y={y} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize={size} letterSpacing=".5" fill={fill} {...rest}>{children}</text>;
const Mono = ({ children, x = CX, y, size = 4, fill = DIM, anchor = "middle" }) => <text x={x} y={y} textAnchor={anchor} fontFamily="JetBrains Mono, monospace" fontSize={size} fill={fill}>{children}</text>;
const Screen = ({ x, y, w, h, r = 2 }) => <rect x={x} y={y} width={w} height={h} rx={r} fill="#111" stroke={BONE} strokeWidth=".5" />;
const Rays = ({ count = 26, inner = 6, outer = 130, x = CX, y = CY, stroke = BONE }) => Array.from({ length: count }, (_, i) => {
  const angle = (i / count) * Math.PI * 2 + 0.2, start = inner + (i % 4) * 9;
  return <line key={i} x1={x + Math.cos(angle) * start} y1={y + Math.sin(angle) * start} x2={x + Math.cos(angle) * outer} y2={y + Math.sin(angle) * outer} stroke={stroke} strokeWidth={0.2 + (i % 3) * 0.2} opacity=".55" />;
});
const Arrow = ({ d }) => <path d={d} fill="none" stroke={SIGNAL} strokeWidth=".7" strokeDasharray="2 1.4" markerEnd="url(#sb-arrow)" />;
const Head = ({ x = CX, y = 46, s = 1 }) => <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={BONE} strokeWidth=".6"><ellipse cx="0" cy="0" rx="10" ry="13" /><path d="M-9 -7 Q0 -20 9 -7" fill={DIM} stroke="none" /><circle cx="-3.6" cy="-1" r="1" fill={BONE} /><circle cx="3.6" cy="-1" r="1" fill={BONE} /><path d="M-3 7 Q0 9 3 7" /><path d="M-6 13 L-9 24 M6 13 L9 24" /></g>;

const network = blob(7, 150, CX, CY, 96, 38);

const KINDS = {
  black: () => <Mono x={W - 8} y={H - 8} anchor="end">◉ sound on</Mono>,
  point: () => <><Flare /><Glow r={7} /></>,
  pulse: () => <><Rays count={9} inner={9} outer={34} stroke={DIM} /><circle cx={CX} cy={CY} r="16" fill="none" stroke={SIGNAL} strokeWidth=".3" opacity=".7" /><circle cx={CX} cy={CY} r="27" fill="none" stroke={SIGNAL} strokeWidth=".2" opacity=".4" /><Glow r={9} /><Dots points={blob(3, 9, CX, CY, 34, 26)} /></>,
  network: () => <><Links points={network} /><Dots points={network} /><Glow r={10} /><Arrow d="M150 82 L205 92" /><Arrow d="M89 82 L34 92" /></>,
  name: () => <><Links points={network} every={5} /><Dots points={network.slice(0, 80)} /><Rays count={14} inner={30} outer={120} stroke={SIGNAL} /><Title size={24} y={58}>MOHAMED ANSAR</Title></>,
  subtitle: () => <><Title size={24} y={50} fill={DIM}>MOHAMED ANSAR</Title><Mono y={68} size={5} fill={BONE}>I build agents, studies and apps. With proof.▌</Mono></>,
  open: () => <><Title size={22} y={48}>MOHAMED ANSAR</Title><Mono y={60} size={4} fill={BONE}>I build agents, studies and apps.</Mono><rect x="96" y="68" width="22" height="7" rx="3.5" fill={SIGNAL} /><rect x="122" y="68" width="22" height="7" rx="3.5" fill="none" stroke={BONE} strokeWidth=".4" /><Mono x={12} y={9} anchor="start" fill={BONE}>ma</Mono><Mono x={W - 12} y={9} anchor="end">Work · Capabilities · Contact</Mono><Arrow d="M20 16 L20 3" /><Arrow d="M20 84 L20 97" /></>,
  through: () => <><text x="-18" y="92" fontFamily="Anton, sans-serif" fontSize="120" fill="none" stroke={BONE} strokeWidth=".7" opacity=".8">M</text><text x="168" y="92" fontFamily="Anton, sans-serif" fontSize="120" fill="none" stroke={BONE} strokeWidth=".7" opacity=".8">A</text><Dots points={blob(11, 60, CX, CY, 34, 24)} /><Glow r={6} /><Arrow d="M119 92 L119 62" /></>,
  numbers: () => <>{[["10+", 30, 30], ["2", 82, 22], ["3", 132, 16], ["2", 176, 11]].map(([label, x, size], i) => <text key={i} x={x} y={52 + size * 0.2} fontFamily="Anton, sans-serif" fontSize={size} fill={i === 0 ? SIGNAL : BONE} opacity={1 - i * 0.18}>{label}</text>)}{scatter(5, 16, (next, i) => <path key={i} d={`M0 ${70 + i * 1.9} Q${90 + next() * 40} ${64 + i * 1.6} 239 ${72 + i * 1.8}`} fill="none" stroke={DIM} strokeWidth=".25" opacity={0.3 + next() * 0.5} />)}<Mono y={93}>code river</Mono></>,
  orbit: () => <><ellipse cx={CX} cy={CY} rx="88" ry="26" fill="none" stroke={DIM} strokeWidth=".3" /><ellipse cx={CX} cy={CY} rx="56" ry="15" fill="none" stroke={DIM} strokeWidth=".3" /><Glow r={6} />{[[40, 40, "MCP"], [78, 66, "PYTHON"], [150, 29, "PYTORCH"], [196, 58, "RUST"], [110, 31, "CLAUDE CODE"]].map(([x, y, label]) => <g key={label}><circle cx={x} cy={y} r="2.2" fill={BONE} /><Mono x={x} y={y - 4} size={3.2} fill={BONE}>{label}</Mono></g>)}</>,
  tunnel: () => <><Rays count={46} inner={10} outer={150} /><Glow r={5} color={BONE} /></>,
  monitor: () => <><Screen x={128} y={24} w={72} h={44} /><Mono x={164} y={48} size={3.6} fill={BONE}>launch film</Mono><Dots points={blob(21, 70, 62, 46, 12, 16)} /><path d="M78 50 q5 -6 10 0 t10 0 t10 0 t10 0 t8 0" fill="none" stroke={SIGNAL} strokeWidth=".8" /></>,
  control: () => <><Glow r={11} />{[[42, 26, 10], [70, 62, 6], [176, 22, 8], [190, 60, 12], [116, 12, 4]].map(([x, y, tilt], i) => <g key={i} transform={`rotate(${i % 2 ? tilt : -tilt} ${x} ${y})`}><Screen x={x - 16} y={y - 9} w={32} h={18} r={1.5} /></g>)}<path d="M96 78 A26 26 0 0 1 143 78" fill="none" stroke={SIGNAL} strokeWidth="1.4" /><Mono y={88} fill={BONE}>20 calls / day</Mono></>,
  blackbox: () => <><path d={`M${CX} 0 L92 100 L147 100 Z`} fill={SIGNAL} opacity=".1" />{[["tool calls", 30, BONE], ["edits", 44, BONE], ["suspect edit", 58, SIGNAL], ["failure", 72, BONE]].map(([label, y, color], i) => <g key={label}><path d={`M${88 + i * 2} ${y} l44 -6 l22 5 l-44 6 z`} fill="#111" stroke={color} strokeWidth=".6" /><Mono x={164} y={y + 1.5} anchor="start" size={3.4} fill={color}>{label}</Mono></g>)}</>,
  clouds: () => <><Dots points={blob(31, 70, 80, 50, 26, 22)} /><Dots points={blob(32, 70, 158, 50, 26, 22)} fill={SIGNAL} /><Arrow d="M112 34 Q120 26 128 34" /><Mono x={80} y={88}>images</Mono><Mono x={158} y={88}>text</Mono><Title y={22} size={9} fill={SIGNAL}>−35%</Title></>,
  devices: () => <><Screen x={62} y={24} w={70} h={42} /><rect x="54" y="67" width="86" height="2.4" rx="1" fill={BONE} /><Screen x={146} y={30} w={34} h={46} r={3} /><Screen x={188} y={44} w={15} h={30} r={2.5} /><ellipse cx={CX + 12} cy="84" rx="92" ry="5" fill="none" stroke={DIM} strokeWidth=".3" strokeDasharray="2 2" /></>,
  head: () => <><path d={`M${CX} 0 L84 100 L155 100 Z`} fill={BONE} opacity=".08" /><Head />{Array.from({ length: 12 }, (_, i) => <rect key={i} x={12 + (i % 3) * 13} y={18 + Math.floor(i / 3) * 16} width="11" height="13" fill="none" stroke={DIM} strokeWidth=".35" />)}<Mono x={31} y={90}>12 stages</Mono></>,
  monoliths: () => <>{[[78, 30], [112, 14], [146, 36]].map(([x, top], i) => <rect key={i} x={x} y={top} width="18" height={100 - top} fill="#151515" stroke={BONE} strokeWidth=".5" />)}<path d="M0 86 L239 86" stroke={DIM} strokeWidth=".3" /><Arrow d="M60 80 L60 40" /><Mono x={87} y={95} size={3.2} fill={BONE}>AGENTS</Mono><Mono x={121} y={95} size={3.2} fill={BONE}>RESEARCH</Mono><Mono x={155} y={95} size={3.2} fill={BONE}>SHIPPING</Mono></>,
  orbitstones: () => <>{[[58, 24, 22], [104, 10, 30], [160, 30, 20]].map(([x, top, w], i) => <g key={i}><rect x={x} y={top} width={w} height={100 - top} fill="#151515" stroke={BONE} strokeWidth=".5" />{[0, 1, 2].map((row) => <rect key={row} x={x + 3} y={top + 10 + row * 9} width={w - 6} height="2" fill={row === i ? SIGNAL : DIM} />)}</g>)}<Arrow d="M40 90 Q120 104 204 86" /></>,
  star: () => <><Dots points={blob(41, 110, CX, CY, 70, 34)} /><Rays count={30} inner={40} outer={22} stroke={SIGNAL} /><Glow r={16} /></>,
  solar: () => <><Glow x={40} y={56} r={18} />{[40, 70, 104, 142].map((rx) => <ellipse key={rx} cx="40" cy="56" rx={rx} ry={rx * 0.24} fill="none" stroke={DIM} strokeWidth=".3" />)}<circle cx="110" cy="58" r="3" fill={BONE} /><circle cx="158" cy="38" r="7" fill="#151515" stroke={BONE} strokeWidth=".5" /><ellipse cx="158" cy="38" rx="12" ry="2.4" fill="none" stroke={BONE} strokeWidth=".4" /><circle cx="204" cy="66" r="4.5" fill={DIM} /></>,
  ribbon: () => <><path d="M20 50 C60 0 100 100 120 50 S180 0 220 50 S160 100 120 50 S60 100 20 50" fill="none" stroke={SIGNAL} strokeWidth="1.6" opacity=".9" /><path d="M20 50 C60 0 100 100 120 50 S180 0 220 50 S160 100 120 50 S60 100 20 50" fill="none" stroke={BONE} strokeWidth=".3" /><Arrow d="M40 22 L72 34" /></>,
  droid: () => <><path d="M70 0 L40 100 L104 100 Z" fill={BONE} opacity=".08" /><Head x={72} y={44} /><circle cx="136" cy="76" r="10" fill="#151515" stroke={BONE} strokeWidth=".6" /><path d="M129 67 a7 7 0 0 1 14 0 z" fill="#151515" stroke={BONE} strokeWidth=".6" /><circle cx="136" cy="63" r="1.2" fill={SIGNAL} /><Screen x={166} y={24} w={58} h={40} /><Mono x={170} y={33} anchor="start" size={3.2} fill={SIGNAL}>emet ▌</Mono></>,
  recede: () => <><Rays count={22} inner={18} outer={110} stroke={DIM} /><Dots points={blob(51, 50, CX, CY, 60, 30)} /><Glow r={6} /></>,
  contact: () => <><Title size={17} y={46}>LET'S BUILD SOMETHING.</Title><rect x="84" y="58" width="71" height="10" rx="5" fill="none" stroke={SIGNAL} strokeWidth=".7" /><Mono y={64.6} size={3.6} fill={SIGNAL}>email</Mono><Glow x={CX} y={63} r={16} /></>,
  credits: () => <>{["DIRECTED BY", "MOHAMED ANSAR", "", "BUILT WITH", "React · three.js · GLSL", "", "© 2026"].map((line, i) => <Mono key={i} y={20 + i * 10} size={i === 1 ? 6 : 3.6} fill={i === 1 ? BONE : DIM}>{line}</Mono>)}<Arrow d="M214 80 L214 30" /></>,
  dive: () => <>{[[96, 40, 47, 20], [78, 32, 83, 36], [50, 20, 139, 60], [10, 4, 219, 92]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="none" stroke={i === 0 ? SIGNAL : BONE} strokeWidth={0.4 + i * 0.1} opacity={1 - i * 0.2} />)}<Arrow d="M150 62 L196 82" /></>,
};

export default function Frame({ kind, bars = false, label }) {
  const Draw = KINDS[kind] || KINDS.black;
  return <svg className="sb-frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <defs><marker id="sb-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill={SIGNAL} /></marker></defs>
    <rect width={W} height={H} fill="#060606" />
    <Draw />
    {bars && <><rect width={W} height="5" fill="#000" /><rect y={H - 5} width={W} height="5" fill="#000" /></>}
  </svg>;
}
