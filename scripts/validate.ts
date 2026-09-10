import { Glob } from 'bun';

import {
  contestantSchema,
  matchSchema,
  seasonSchema,
  taskSchema,
} from '../schema';

/**
 * The gate that keeps the public page honest. CI runs this on every push:
 * genfeed.ai/benchmark renders whatever is in `data/`, so an invalid season
 * here is a broken page there.
 */

const errors: string[] = [];
const fail = (where: string, detail: unknown): void => {
  errors.push(`${where}: ${detail instanceof Error ? detail.message : detail}`);
};

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await Bun.file(path).text());

const collect = async (pattern: string): Promise<string[]> => {
  const found: string[] = [];
  for await (const path of new Glob(pattern).scan('.')) found.push(path);
  return found.sort();
};

const taskPaths = await collect('tasks/**/*.json');
const tasks = new Map<string, ReturnType<typeof taskSchema.parse>>();

for (const path of taskPaths) {
  try {
    const task = taskSchema.parse(await readJson(path));
    if (tasks.has(task.id)) fail(path, `duplicate task id "${task.id}"`);
    tasks.set(task.id, task);
  } catch (error) {
    fail(path, error);
  }
}

const contestants = new Map<
  string,
  ReturnType<typeof contestantSchema.parse>
>();

try {
  const parsed = (await readJson('data/contestants.json')) as unknown[];
  for (const entry of parsed) {
    const contestant = contestantSchema.parse(entry);
    if (contestants.has(contestant.id)) {
      fail('data/contestants.json', `duplicate id "${contestant.id}"`);
    }
    contestants.set(contestant.id, contestant);
  }
} catch (error) {
  fail('data/contestants.json', error);
}

/**
 * A bench whose only entrant is its own author is a scoreboard. The registry
 * must always be able to show Genfeed losing to something.
 */
const compiled = [...contestants.values()].filter((one) => one.isCompiled);
const raw = [...contestants.values()].filter((one) => !one.isCompiled);
if (compiled.length < 1) fail('data/contestants.json', 'no compiled contestant');
if (raw.length < 4) {
  fail('data/contestants.json', `only ${raw.length} raw contestants, need 4`);
}

for (const path of await collect('data/seasons/*.json')) {
  let season: ReturnType<typeof seasonSchema.parse>;
  try {
    season = seasonSchema.parse(await readJson(path));
  } catch (error) {
    fail(path, error);
    continue;
  }

  for (const taskId of season.taskIds) {
    const task = tasks.get(taskId);
    if (!task) {
      fail(path, `unknown task "${taskId}"`);
      continue;
    }
    if (task.medium !== season.medium) {
      fail(path, `task "${taskId}" is ${task.medium}, season is ${season.medium}`);
    }
    if (task.isDraft) fail(path, `task "${taskId}" is a draft and cannot run`);
  }

  for (const id of season.contestantIds) {
    const contestant = contestants.get(id);
    if (!contestant) fail(path, `unknown contestant "${id}"`);
    else if (!contestant.mediums.includes(season.medium)) {
      fail(path, `contestant "${id}" does not do ${season.medium}`);
    }
  }

  const journalPath = `data/matches/${season.id}.jsonl`;
  const journal = Bun.file(journalPath);
  if (!(await journal.exists())) {
    fail(path, `missing journal ${journalPath}`);
    continue;
  }

  const lines = (await journal.text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let recorded = 0;
  const seen = new Set<string>();

  for (const [index, line] of lines.entries()) {
    let match: ReturnType<typeof matchSchema.parse>;
    try {
      match = matchSchema.parse(JSON.parse(line));
    } catch (error) {
      fail(`${journalPath}:${index + 1}`, error);
      continue;
    }
    const at = `${journalPath}:${index + 1}`;
    if (seen.has(match.id)) fail(at, `duplicate match id "${match.id}"`);
    seen.add(match.id);
    if (match.seasonId !== season.id) fail(at, 'match belongs to another season');
    if (!season.taskIds.includes(match.taskId)) fail(at, 'task not in season');
    if (match.a.contestantId === match.b.contestantId) {
      fail(at, 'a contestant cannot face itself');
    }
    /** Void matches never move Elo — the whole ladder depends on this. */
    if (match.state === 'void' && match.ratingChange !== null) {
      fail(at, 'void match carries a rating change');
    }
    if (match.state === 'recorded') {
      recorded += 1;
      if (match.verdict === null) fail(at, 'recorded match has no verdict');
      if (match.votes.length < 3) fail(at, 'recorded match has under 3 votes');
    }
  }

  if (season.matchCount !== recorded) {
    fail(
      path,
      `matchCount ${season.matchCount} but ${recorded} recorded in the journal` +
        ' — run `bun run ladder` to rederive the season',
    );
  }
  if (recorded === 0 && season.ladder.length > 0) {
    fail(path, 'ladder has entries but no match has been recorded');
  }
  for (const entry of season.ladder) {
    if (!season.contestantIds.includes(entry.contestantId)) {
      fail(path, `ladder names non-entrant "${entry.contestantId}"`);
    }
  }
}

/**
 * This tree is public and its data is fetched by the marketing site. A signed
 * URL leaks a key and rots; both are disqualifying.
 */
const SECRET_PATTERNS = [
  /X-Amz-Signature=/i,
  /[?&]token=/i,
  /sk-[a-z0-9]{16,}/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];

for (const path of [...taskPaths, ...(await collect('data/**/*'))]) {
  const file = Bun.file(path);
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) continue;
  const text = await file.text().catch(() => '');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) fail(path, `matches forbidden pattern ${pattern}`);
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s):\n`);
  for (const line of errors) console.error(`  ${line}`);
  process.exit(1);
}

console.log(
  `✓ ${tasks.size} tasks, ${contestants.size} contestants, seasons valid`,
);
