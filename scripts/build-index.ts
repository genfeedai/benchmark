import { Glob } from 'bun';

import { type Task, taskSchema } from '../schema';

/**
 * Flattens `tasks/**` into one `data/tasks.json`.
 *
 * genfeed.ai/benchmark renders the suite, and nine HTTP round trips to fetch
 * nine task files would be nine chances for the page to half-load. The index
 * is derived, never hand-edited: CI rebuilds it and fails on any diff.
 */

const paths: string[] = [];
for await (const path of new Glob('tasks/**/*.json').scan('.')) paths.push(path);

const tasks: Task[] = [];
for (const path of paths.sort()) {
  tasks.push(taskSchema.parse(JSON.parse(await Bun.file(path).text())));
}

/** Stable order so the file only changes when a task changes. */
tasks.sort((one, two) =>
  one.medium === two.medium
    ? one.id.localeCompare(two.id)
    : one.medium.localeCompare(two.medium),
);

await Bun.write('data/tasks.json', `${JSON.stringify(tasks, null, 2)}\n`);
console.log(`data/tasks.json: ${tasks.length} tasks`);
