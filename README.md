# ansarbuilds.github.io

Live portfolio for **Mohamed Ansar**. Reliable data systems, evidence-backed AI tools, and apps.

**Live site:** [ansarbuilds.dev](https://ansarbuilds.dev)

Every project has a page in the [full index](https://ansarbuilds.dev/work/), with live demos where they exist. My [GitHub profile](https://github.com/ansarbuilds) has the public repositories.

## What's in this repo

```
portfolio/            React + Vite + Tailwind site, deployed to GitHub Pages
projects/
  forex/              AUD/USD trading analysis (Python)
  f1-telemetry/       F1 session/car telemetry pipeline (Python)
.github/workflows/    CI/CD for portfolio deployment
```

Other projects live in their own repositories. These are public:

- [hedwig](https://github.com/ansarbuilds/hedwig)
- [saywhen](https://github.com/ansarbuilds/saywhen)
- [agent-flight-recorder](https://github.com/ansarbuilds/agent-flight-recorder)
- [storyera](https://github.com/ansarbuilds/storyera)
- [rea-study](https://github.com/ansarbuilds/rea-study)
- [prh-jepa](https://github.com/ansarbuilds/prh-jepa)
- [analytics-assistant](https://github.com/ansarbuilds/analytics-assistant)

These are private, so they have no links here: Haloscript, RepTrack, decision-models (My Take on Jev), catalogue-checker, data-delivery, integration-in-a-box, sitescout, site-recon, authorized-web-exposure-audit, mcp-analytics-stub and mv3-sidepanel-starter. Each has a page on the site, and I'm happy to give a walkthrough.

## How it's built

The portfolio site auto-deploys to GitHub Pages on every push to `main` that touches `portfolio/**`, via `.github/workflows/deploy-portfolio.yml` using `npm run build`.

## Public release and maintenance checklist

Use this when releasing a project or reviewing the public portfolio. Skip steps that do not apply to the project.

- Confirm the version and status agree across source, README, changelog, release notes and any package registry or app store listing.
- Run the relevant checks, build the release artifact, and verify installation or usage from a clean environment. Record what was tested and any limits; do not imply that a new version was independently evaluated if it was not.
- Publish the versioned release and artifacts where appropriate. Verify their links and checksums, and confirm the package or app listing is publicly accessible.
- Update the project description, portfolio case study and profile when needed. Use evidence-backed claims, accurate project names and current links; distinguish shipped features from plans.
- For website changes, check CI and the deployment result, then open the live page and exercise the changed links or behavior on desktop and mobile where relevant.
- During a periodic review, check GitHub pins, repository descriptions and status, project links, the sitemap, contact links and screenshots. Remove stale promises and label synthetic examples or research drafts accurately.
