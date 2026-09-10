# Genfeed Benchmark

An independent benchmark for image and video generation models.

Public tasks, blind pairwise judging, Elo, and a match journal a stranger can re-run.
Genfeed enters as a contestant, not as the scoreboard — the ladder is built so that a
Genfeed-compiled route can lose to the raw model it sits in front of, and that result
gets published like any other.

**Results render at [genfeed.ai/benchmark](https://genfeed.ai/benchmark).** This repository
holds the tasks, the registry, the harness and the data. It has no website of its own.

Season One is **image only** and currently **announced with an empty ladder**. That is the
honest state: no matches have been recorded, so there is nothing to rank. Video is Season
Two — its tasks are published here as drafts so they are fixed in public before anyone
knows which model they will favour.

## Why this exists

Every time a new image or video model ships, the discourse is screenshots from whoever got
early access. There is no content-side equivalent of LMSYS or Artificial Analysis: no fixed
task suite, no blind judging, no journal. This is an attempt at one.

The tasks are chosen because they are where models actually differ in production work —
legible text, brand constraint, character and product consistency, literal prompt
adherence — not because they make pretty demos.

## Layout

```
schema/           zod contracts for tasks, contestants, seasons, matches
tasks/image/      Season One task pack (6 tasks, versioned)
tasks/video/      Season Two drafts — readable, not runnable
data/
  contestants.json      append-only registry (compiled + raw routes)
  tasks.json            derived flat index of every task, for the site
  seasons/*.json        season state and the derived ladder
  matches/*.jsonl       append-only match journal
fixtures/brand-kit/     public synthetic brand kit, so brand tasks are re-runnable
scripts/validate.ts     the CI gate
scripts/ladder.ts       recomputes a ladder from its journal
```

## Commands

```bash
bun install
bun run validate     # schema, referential integrity, no-secrets gate
bun run ladder       # recompute every season ladder from its journal
bun run build:index  # rebuild data/tasks.json from tasks/
```

`bun run ladder` is deterministic. Clone this repo, run it, and you must get byte-identical
output to what the site shows. If you don't, the bench is wrong and we want the issue.

## Rules the harness enforces

- A season with zero recorded matches publishes an **empty** ladder, never seeded scores.
- A voided match is counted and shown but **never moves Elo**.
- A recorded match carries **at least three judge votes** and a majority verdict.
- Judges see the task and two unlabelled images. Nothing else — not the model name, not
  the provider, not whether a compile step was involved.
- The registry must always hold at least one compiled route and at least four raw routes.
- Every task prompt is public. There is no hidden prompt set.
- No signed URLs, no tenant media, no customer assets in this tree. Brand tasks use the
  synthetic `Kelder` kit in `fixtures/`.

## Contributing a contestant

Open an issue with the provider route and model id. The registry is append-only: entries
are retired with `retiredAt`, never deleted, so an old ladder stays readable.

## Licence

AGPL-3.0-only.
