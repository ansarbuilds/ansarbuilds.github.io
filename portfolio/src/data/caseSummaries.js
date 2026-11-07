// Short, evidence-backed summaries for selected public projects.
export const CASE_SUMMARIES = {
  'agent-flight-recorder': {
    problem: 'Agent failures can be hard to trace back through earlier actions and edits.',
    outcome: 'A local recorder and investigator with command-line, web and MCP interfaces.',
    proof: 'A payment failure walkthrough, regression tests and an independent first-time-user evaluation.',
    limits: 'A ranked suspect is not proof of causation; redaction is imperfect. The independent evaluation tested 1.1.0, not the 1.1.1 release.',
  },
  storyera: {
    problem: 'Long stories need continuity checks that distinguish mistakes from intentional mysteries.',
    outcome: 'A reusable skill that builds a cited ledger and suggests repairs for the author to decide.',
    proof: 'A curated novel example and recorded fictional-sample evaluations.',
    limits: 'The example is not a blind benchmark; report validation does not prove model accuracy.',
  },
  'rea-study': {
    problem: 'Does REA improve an agent’s explanations of programs without source code?',
    outcome: 'No clear accuracy benefit was detected on the programs tested.',
    proof: '153 scored runs, raw results, a claims ledger and a held-out review.',
    limits: 'One model and machine were tested; near-ceiling scores and a small held-out set limit the conclusion.',
  },
  'prh-jepa': {
    problem: 'Do the released code, WIT-1024 baselines and good-views theory in PRH-JEPA hold up when checked independently on one laptop?',
    outcome: '135 of 139 tests passed, 6 of 6 open text baselines reproduced within 0.0012, and coordinate clipping proved to drive 35% of Qwen2.5-3B’s score.',
    proof: 'Frozen analysis plan, independent NumPy metrics, 6 baseline extractions, 20 finite worlds, 6 laptop LeJEPA runs and a 24-claim ledger.',
    limits: 'One 16 GB Mac; web-scale 940M-image runs and 72B models are audited from released CSVs only, and laptop LeJEPA runs are 1/844 of the paper’s smallest WIT run.',
  },
  'decision-models': {
    problem: 'Can smaller decision models route support messages accurately and report honest confidence?',
    outcome: 'The best small model routed 80% of the held-out messages to the right team.',
    proof: 'A shared test harness, 250 fictional requests and a 50-message held-out test.',
    limits: 'The dataset is synthetic and the held-out set is small; the keyword rules share vocabulary with the messages.',
  },
  integration: {
    problem: 'Two systems need to exchange orders and updates reliably when things go wrong.',
    outcome: 'A working connector with authentication, signed webhooks and recovery runbooks.',
    proof: 'Ten deliberate failures and 49 automated tests, including an end-to-end walkthrough.',
    limits: 'Both companies and their data are fictional; this is a demonstration, not a customer deployment.',
  },
  'data-delivery': {
    problem: 'Weekly files arrive in different formats and may contain errors that make a delivery unreliable.',
    outcome: 'A pipeline delivers a clean table only when the required checks pass.',
    proof: 'Six synthetic weeks, deliberately introduced problems, a runbook and 15 automated tests.',
    limits: 'The pharmacies and data are fictional; the project recreates a delivery pattern, not private production code.',
  },
};
