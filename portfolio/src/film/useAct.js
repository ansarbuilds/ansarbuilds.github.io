import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* One act inside the film player (FilmPlayer.jsx). The player owns the
   clock: it says where the film is in this act (`playback.timeOf(id)`, in
   seconds) and which acts should be drawing. The act builds its scene once
   its code arrives, hands it to the player, and draws its overlays from
   `onFrame(t, moments)` every frame it renders.

   `load()` resolves to a function that builds the scene from
   { getTime, onFrame }. Returns whether the act failed to start, and whether
   its title card ("II. Seven builds") is up: for its first seconds. */
const TITLE_FROM = 0.1, TITLE_UNTIL = 2.4;

export function useAct({ id, playback, load, onFrame }) {
  const [failed, setFailed] = useState(false);
  const [titleUp, setTitleUp] = useState(false);
  const frame = useRef(onFrame);
  const loader = useRef(load);
  useLayoutEffect(() => { frame.current = onFrame; loader.current = load; });

  useEffect(() => {
    let film = null, cancelled = false;
    (async () => {
      try {
        const build = await loader.current();
        if (cancelled) return;
        film = build({
          getTime: () => playback.timeOf(id),
          onFrame: (t, moments) => {
            setTitleUp(playback.isOn(id) && t >= TITLE_FROM && t < TITLE_UNTIL);
            frame.current?.(t, moments);
          },
        });
        playback.attach(id, film);
        // The canvas fades in once there is a scene to show (see .is-live).
        document.querySelector(`.film-act[data-act="${id}"]`)?.classList.add("is-live");
      } catch (error) {
        if (import.meta.env.DEV) console.warn(`film: ${id} could not start`, error);
        if (!cancelled) { setFailed(true); playback.failed(id); }
      }
    })();
    return () => { cancelled = true; playback.attach(id, null); film?.dispose(); };
  }, [id, playback]);

  return { failed, titleUp };
}

// Fades a card in over the frame and lifts it into place. A card that is
// not on screen is hidden, keyboard included.
export function show(node, amount, rise) {
  if (!node) return;
  node.style.opacity = amount;
  node.style.transform = `translateY(${(1 - amount) * rise}px)`;
  node.style.visibility = amount > 0.02 ? "visible" : "hidden";
}
