import "./film.css";
import Frame from "./Frame";
import { ACTS, SHOTS, TIMELINE_SHOTS, runtime, shotsInAct } from "./shots";
import { timecode } from "./rig";

/* The storyboard: every shot of the film on one page, in order, with its
   drawing, timing, camera move and sound. It is the thing to approve (or
   mark up) before any of it is built. Development only: it is not part of
   the published site. */

function Shot({ shot }) {
  return <li className="sb-shot" id={shot.id}>
    <a href={shot.offTimeline ? undefined : `/previs/#${shot.id}`} className="sb-frame-link" title={shot.offTimeline ? undefined : "Open this shot in the moving pre-vis"}>
      <Frame kind={shot.frame} bars={shot.bars} label={`Storyboard frame: ${shot.title}`} />
    </a>
    <div className="sb-meta"><span className="sb-id">{shot.id}</span><span>{shot.seconds.toFixed(1)}s</span><span>{shot.cut ? "Cut" : "Continuous"}</span>{shot.scroll > 0 ? <span>{shot.scroll} screen{shot.scroll === 1 ? "" : "s"} of scroll</span> : <span>Plays by itself</span>}</div>
    <h3>{shot.title}</h3>
    <p>{shot.action}</p>
    <dl>
      <div><dt>Camera</dt><dd>{shot.camera.move} · {shot.camera.fov}° lens</dd></div>
      {shot.text && <div><dt>On screen</dt><dd className="sb-text">{shot.text}</dd></div>}
      <div><dt>Sound</dt><dd>{shot.sound}</dd></div>
    </dl>
  </li>;
}

export default function Storyboard() {
  const total = runtime(TIMELINE_SHOTS);
  const scroll = TIMELINE_SHOTS.reduce((sum, shot) => sum + shot.scroll, 0);
  return <div className="sb">
    <header className="sb-head">
      <p className="sb-kicker">Pre-vis · storyboard · not published</p>
      <h1>Signal</h1>
      <p className="sb-lede">The whole site as one film, shot by shot. Read it top to bottom. To change something, name the shot by its code ("A2-03b: make it longer").</p>
      <ul className="sb-totals">
        <li><strong>{SHOTS.length}</strong> shots</li>
        <li><strong>{timecode(total)}</strong> at playing speed</li>
        <li><strong>{scroll.toFixed(1)}</strong> screens of scrolling</li>
        <li><a href="/previs/">Watch the moving pre-vis →</a></li>
      </ul>
      <nav className="sb-acts" aria-label="Acts">{ACTS.map((act) => <a key={act.id} href={`#act-${act.id}`}>{act.title}</a>)}</nav>
    </header>
    {ACTS.map((act) => {
      const shots = shotsInAct(act.id);
      return <section key={act.id} id={`act-${act.id}`} className="sb-act">
        <div className="sb-act-head"><h2>{act.title}</h2><span>{shots.length} shots · {runtime(shots).toFixed(1)}s</span><p>{act.note}</p></div>
        <ol className="sb-grid">{shots.map((shot) => <Shot key={shot.id} shot={shot} />)}</ol>
      </section>;
    })}
  </div>;
}
