# Design and methodology

## The shape

A **season** fixes a medium, a task pack and a contestant registry. A **match** draws one
task and two contestants, generates both answers independently under identical limits,
then hands the pair to a blind judge panel. A majority verdict writes one record to the
journal and moves Elo. That is the entire mechanism.

Seasons are `announced` → `open` → `closed`. Matches are `queued` → `generated` →
`judging` → `recorded`, or `void`.

## Why pairwise and not scores

Absolute quality scores from a model judge are not stable across releases — the judge
drifts, and last season's 7.4 stops meaning what it meant. Pairwise comparison only asks
"which of these two", which is the question judges are reliably good at, and Elo turns a
pile of those answers into a ranking that stays comparable as contestants come and go.

It also makes the bench cheap to extend. A new model drops, it enters the registry, it
plays the existing suite against existing contestants, and the ladder absorbs it. No
re-scoring of history.

## Why the tasks are what they are

Each task exists because it separates models in work people actually get paid for.

| task | what it catches |
| --- | --- |
| Unbranded craft | default taste with no constraints — where raw models are strongest |
| Legible text | the most commercially decisive capability, and the fastest-moving |
| Brand kit fidelity | whether a model can be constrained at all |
| Character consistency | serialised content across a week of posts |
| Product consistency | commerce; hallucinated labels are disqualifying |
| Prompt adherence | counting, spatial relations, negation — the three reliable failures |

A beautiful image that gets the brief wrong loses to a plainer one that gets it right.
Several rubrics say so explicitly, in order, so a judge cannot quietly trade adherence for
craft.

## Judging

Three judges minimum, different model ids, each shown the task text and two unlabelled
images as A and B. Position is shuffled per match. Each returns a choice and a rationale;
both go in the journal. Majority writes the verdict. A tie voids the match.

Judges never see the provider, the model name, or whether Genfeed's compiler was in the
path. This matters most for the compiled contestant: the bench is only worth publishing if
it can report that the compile step made things worse.

## Voids

A match voids when generation fails, a provider refuses, or the panel ties. Voids are
counted per contestant and shown on the ladder, because a model that refuses a third of
the suite is telling you something real — but they never move a rating. Rating movement
requires a decided match.

## Reproducibility

Every recorded match stores the task id and version, both contestant ids, both artifact
URLs, seeds where the provider supports them, the full settings object, every judge model
id, and every rationale. `bun run ladder` rebuilds the standings from that journal alone.

Artifacts are public URLs. Never signed URLs — they leak a key and they rot, and a bench
whose evidence expires is not a bench.

## What this is not

- Not a product comparison. Season One scores model routes and one compile path, not
  Midjourney's web app or Runway's editor.
- Not a training or fine-tuning benchmark.
- Not an internal quality gate. Genfeed's own ablations live in the product repo and never
  publish onto this ladder.
- Not a scoreboard for Genfeed. If the compiled route ranks below its own raw model, that
  is the result and it ships.

## Cost discipline

Season One is image-only because video duration and judge load are a different budget, and
a bench that runs out of money mid-season is worse than one that waited. Matches use a
fixed candidate count and the cheapest representative family per contestant unless a
maintainer overrides it.
