# Backend optimizations

1. Compression: Flask-Compress (Brotli + gzip) for JSON/text responses over 500 bytes. Run `pip install -r requirements.txt`.
2. Smaller JSON: subtask lists return only `id, title, day`. Free tasks return only `id, day, title, color, done`. `subject_id`, `position` and `week_offset` are already known from the bucket key and the list order. Read endpoints load only the columns they need.
3. Indexes: added on user_id, subject_id, day, timeslot_id, week_offset, position. Apply them with `flask db upgrade` (migration f6a7b8c9d0e1).
4. Fewer repeated queries:
   - subtask reorder now uses a single UPDATE ... CASE instead of one UPDATE per row
   - autogen config checks all subjects in one query
   - autogen generate looks timeslots up from a dict and adds rows in bulk
5. Bug fix: `GET /api/subtasks?subjectIds=` used to reject text ids such as "subj_..." and return 400. It now accepts them.
