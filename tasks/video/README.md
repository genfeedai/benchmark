# Video tasks — Season Two

These are drafts. Season One is image-only: duration, cost and judge load make video a
different budget, and a bench that runs out of money mid-season is worse than one that
waited. Every task here carries `"isDraft": true` and the harness refuses to draw a draft
task into a match.

They are published now so the suite is legible before it is affordable, and so the tasks
are fixed in public *before* anyone knows which model they will favour.

`long-form-presenter` is the end-to-end task: a synthetic voice note
(`fixtures/long-form/voice-note.json`) in, a finished talking-head video of up to eight
minutes out. Its contestants are routes (script, presenter, B-roll and edit together), so a
compiled route and the raw avatar model it calls can meet in the same match.

`kinetic-typography` is a route task too: a video model and a code-rendered composition
(Remotion or an HTML-based framework) answer the same brand-kit brief and are judged blind.

`native-audio-dialogue` only admits contestants that generate sound with the picture.

Durations are fixed per task, but providers accept different lengths. A runner must
generate at the shortest supported length that is not shorter than the task's, trim to the
task's length, and record both in the match settings.
