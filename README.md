# Genfeed Benchmark

An independent benchmark for image and video generation models.

The design is public tasks, blind pairwise judging, Elo, and a match journal a stranger can
re-run. Genfeed enters as a contestant, not as the scoreboard — the ladder is built so that
a Genfeed-compiled route can lose to the raw model it sits in front of, and that result
gets published like any other.

**Results render at [genfeed.ai/benchmark](https://genfeed.ai/benchmark).** This repository
holds the tasks, the registry, the schemas and the data. It has no website of its own.

## Status: no match has ever been run

> **There is no runner in this repository yet.** No provider adapter, no match loop, no
> judge panel, and nothing that writes the match journal — `data/matches/s1-image.jsonl` is
> an empty file. `scripts/ladder.ts` derives Elo *from* that journal; nothing fills it.
>
> What is built and working today is the published half: the task packs, the contestant
> registry, the schemas, and the validation gates that keep them honest. What is specified
> but unbuilt is the engine between them.
>
> So Season One is **announced with an empty ladder**, and that is a truthful state rather
> than a placeholder — there are no results to show because nothing has been generated or
> judged. Anything you see quoted as a standing from this bench today is not a model
> result. Tracking issue:
> [genfeedai/genfeed.ai#3848](https://github.com/genfeedai/genfeed.ai/issues/3848).

Season One is image only. Video is Season Two — its tasks are published here as drafts so
they are fixed in public before anyone knows which model they will favour.

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
scripts/build-index.ts  rebuilds data/tasks.json from tasks/

(no harness/ or adapters/ yet — see Status above)
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

## Rules

Split by what actually runs, because the difference matters to anyone auditing this.

### Enforced today, by `validate.ts` and CI

These are checks over the committed data. They run on every push.

- A season with zero recorded matches publishes an **empty** ladder, never seeded scores.
- A journal entry marked void **carries no rating change**.
- A journal entry marked recorded **carries at least three votes** and a verdict.
- The registry holds at least one compiled route and at least four raw routes.
- The committed ladder must equal a fresh `bun run ladder`, so standings cannot be
  hand-edited.
- No signed URLs, no tenant media, no customer assets in this tree. Brand tasks use the
  synthetic `Kelder` kit in `fixtures/`.
- Every task prompt is public. There is no hidden prompt set.

Note the shape of the first four: they validate records that *already exist* in the
journal. They do not produce them.

### Specified, not yet enforced — these need the runner

- Both contestants generate independently, under the same limits, before judging starts.
- Judges see the task and two unlabelled images. Nothing else — not the model name, not
  the provider, not whether a compile step was involved.
- A majority of at least three judges writes one verdict; a tie voids the match.
- Seeds and full settings are captured so a match can be reproduced.

Until the runner exists, nothing enforces these at generation time. They are a contract
for the implementation, not a property of the current code.

## Contributing a contestant

Open an issue with the provider route and model id. The registry is append-only: entries
are retired with `retiredAt`, never deleted, so an old ladder stays readable.

## Licence

AGPL-3.0-only.
