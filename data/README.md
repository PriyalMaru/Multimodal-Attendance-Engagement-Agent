# Data Directory

Local application data storage directory:
- `db/attendance.db`: Relational SQLite database.
- `embeddings/`: Local directory containing `.npy` normalized facial vectors for consented students.
- `uploads/`: Ephemeral staging folder for uploaded video files and student profile avatars. Temporary video files are automatically cleaned up after frame telemetry extraction.
