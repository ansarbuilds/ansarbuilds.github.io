import { Composition } from "remotion";
import { Film } from "./Film.jsx";
import { FPS, TOTAL } from "./cuts.js";

// The same film twice: wide for screens, upright for phones.
export const Root = () => <>
  <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={FPS} width={1280} height={720} defaultProps={{ withScore: true }} />
  <Composition id="FilmUpright" component={Film} durationInFrames={TOTAL} fps={FPS} width={720} height={1280} defaultProps={{ withScore: true }} />
</>;
