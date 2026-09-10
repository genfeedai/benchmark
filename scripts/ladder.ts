import { Glob } from 'bun';

import {
  type LadderEntry,
  type Match,
  matchSchema,
  seasonSchema,
} from '../schema';

/**
 * Recomputes a season's ladder from its journal and writes it back.
 *
 * The ladder is derived, never edited. Anyone who clones this repo can run
 * `bun run ladder` and must get byte-identical output — that is the whole
 * claim the bench makes.
 */

const K_FACTOR = 24;
const SEED_RATING = 1500;

const expectedScore = (rating: number, against: number): number =>
  1 / (1 + 10 ** ((against - rating) / 400));

interface Record {
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  voids: number;
}

const blank = (): Record => ({
  rating: SEED_RATING,
  matches: 0,
  wins: 0,
  losses: 0,
  voids: 0,
});

const seasonPaths: string[] = [];
for await (const path of new Glob('data/seasons/*.json').scan('.')) {
  seasonPaths.push(path);
}

for (const path of seasonPaths.sort()) {
  const season = seasonSchema.parse(JSON.parse(await Bun.file(path).text()));
  const journalPath = `data/matches/${season.id}.jsonl`;

  const matches: Match[] = (await Bun.file(journalPath).text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => matchSchema.parse(JSON.parse(line)));

  const records = new Map<string, Record>();
  const of = (id: string): Record => {
    const existing = records.get(id);
    if (existing) return existing;
    const created = blank();
    records.set(id, created);
    return created;
  };

  for (const id of season.contestantIds) of(id);

  let recorded = 0;

  for (const match of matches) {
    const a = of(match.a.contestantId);
    const b = of(match.b.contestantId);

    /** A void match is counted and shown, but it does not move a rating. */
    if (match.state === 'void' || match.verdict === 'void') {
      a.voids += 1;
      b.voids += 1;
      continue;
    }
    if (match.state !== 'recorded' || match.verdict === null) continue;

    recorded += 1;
    const scoreA = match.verdict === 'a' ? 1 : 0;
    const deltaA = K_FACTOR * (scoreA - expectedScore(a.rating, b.rating));

    a.rating += deltaA;
    b.rating -= deltaA;
    a.matches += 1;
    b.matches += 1;
    if (match.verdict === 'a') {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }

  /**
   * An announced season publishes an empty ladder on purpose. Ranking six
   * contestants who have never met would be inventing a result.
   */
  const ladder: LadderEntry[] =
    recorded === 0
      ? []
      : [...records.entries()]
          .sort(([, one], [, two]) => two.rating - one.rating)
          .map(([contestantId, record], index) => ({
            rank: index + 1,
            contestantId,
            rating: Math.round(record.rating * 10) / 10,
            matches: record.matches,
            wins: record.wins,
            losses: record.losses,
            voids: record.voids,
          }));

  /**
   * `updatedAt` only moves when the derived result moves. Stamping it every run
   * would make the season file dirty on every invocation, which would defeat
   * CI's check that the committed ladder actually matches the journal.
   */
  const isUnchanged =
    season.matchCount === recorded &&
    JSON.stringify(season.ladder) === JSON.stringify(ladder);

  const next = {
    ...season,
    matchCount: recorded,
    ladder,
    updatedAt: isUnchanged ? season.updatedAt : new Date().toISOString(),
  };

  await Bun.write(path, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `${season.id}: ${recorded} recorded, ${ladder.length} ranked${
      isUnchanged ? ' (unchanged)' : ''
    }`,
  );
}
