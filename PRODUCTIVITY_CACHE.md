# Productivity optimization

- `renderScheduleGrid()` no longer triggers `/api/productivity` on every render.
  It calls `refreshProductivity()`, which is a no-op when the card already shows
  the current week's still-valid data, repaints from cache on a cache hit, and
  fetches only on a miss.
- Productivity is cached per week in `Store` (mirrored in `appState.productivity`)
  with a version counter bumped on each invalidation.
- Invalidation happens only on data the score depends on (schedule entries,
  timeslots, subjects): `patchScheduleRecord`, `setScheduleWeek`, `addTimeslot`,
  `removeTimeslot`, `invalidateSchedule/Timeslots/Subjects`, `invalidateAll`.
- Done toggles, subtask edits and free tasks no longer refresh productivity.
- In-flight responses invalidated mid-request are not cached.
