# The film

The portfolio's launch film: a 24-second trailer of three projects (Hedwig, saywhen and Haloscript), cut on the drum. It is made with [Remotion](https://www.remotion.dev) (React to video) and rendered to MP4 for `portfolio/public/film/`. This folder is not part of the website's build; only its rendered files are.

## What it is

- **`src/cuts.js`** is the cut list: every shot in order, how many frames it holds, what it shows and the sound on its cut. Change the film here.
- **`src/Film.jsx`** draws the shots: kinetic type, commands typed at a prompt, each project's title card, its own footage and screens, numbers slammed full frame, and grain and a vignette over all of it. Every cut lands with a punch-in and a split of colour; only the big hits flash, and never more than three times a second.
- **Two cuts from the same shots:** `Film` (1280×720) for screens and `FilmUpright` (720×1280) for a phone held upright, where the footage sits over a blurred fill of itself.
- **The numbers on screen** come from the portfolio's project data (`portfolio/src/data/projects.js`). Nothing is made up.
- **The soundtrack** is the portfolio's own music engine (`portfolio/src/lib/sound.js`: organ, strings, a clock figure, trailer drums), played in a headless browser along the cut list and recorded by `score/record.mjs`: each chapter's section under it, a braam on each title, a drum on every cut, the finale chord at the end.

## Making it

```bash
npm install
node fetch-media.mjs        # footage and fonts into public/ (not committed)
node score/record.mjs       # the soundtrack, public/score.wav (needs the portfolio's npm ci)
npm run studio              # preview and scrub it in the browser
node render.mjs             # render both cuts to ../portfolio/public/film/
```

`render.mjs` also writes `portfolio/src/film/filmCuts.json`: the film's length and its chapters, which the site's player shows on its timeline.

If Remotion cannot download its own headless Chrome, point it at Playwright's: `REMOTION_BROWSER=~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell node render.mjs`.

## Size

The site has a 32 MB budget for everything it ships (`portfolio/scripts/check-budget.mjs`). The two cuts are about 2.6 and 2.4 MB at CRF 28, with 96 kbps sound; raise the CRF in `render.mjs` to shrink them.

Remotion is free for individuals and small teams; see its license for larger companies.
