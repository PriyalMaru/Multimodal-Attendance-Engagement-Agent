import asyncio
import datetime
import numpy as np
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.core.init_db import init_database
from app.models.db_models import Student, Session, AttendanceRecord, EngagementWindow, TeachingSuggestion, ConsentLog
from app.core.config import settings

async def seed_demo_data():
    await init_database()
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(Student))
        if res.scalars().first():
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding demo classroom data...")
        students_data = [
            ("CS-2024-001", "Emma Watson", "Computer Science 101", "emma.w@university.edu"),
            ("CS-2024-002", "Liam Smith", "Computer Science 101", "liam.s@university.edu"),
            ("CS-2024-003", "Sophia Garcia", "Computer Science 101", "sophia.g@university.edu"),
            ("CS-2024-004", "Noah Patel", "Computer Science 101", "noah.p@university.edu"),
            ("CS-2024-005", "Ava Chen", "Computer Science 101", "ava.c@university.edu"),
        ]

        created_students = []
        for sid, name, course, email in students_data:
            s = Student(
                student_id=sid,
                full_name=name,
                course_name=course,
                email=email,
                has_consented=True,
                consent_date=datetime.datetime.utcnow(),
                embedding_path=None
            )
            db.add(s)
            created_students.append(s)

        await db.flush()

        for s in created_students:
            log = ConsentLog(
                student_id=s.id,
                consent_action="GRANTED",
                notes="Biometric consent documented on record"
            )
            db.add(log)

            # Create mock embedding vector
            vec = np.random.randn(512).astype(np.float32)
            vec /= np.linalg.norm(vec)
            emb_path = settings.EMBEDDINGS_DIR / f"student_{s.id}_{s.student_id}.npy"
            np.save(str(emb_path), vec)
            s.embedding_path = str(emb_path)

        # Create Past Session 1
        now = datetime.datetime.utcnow()
        sess1 = Session(
            session_uid="SESS-A109F2",
            course_title="Computer Science 101: Intro to Algorithms",
            instructor_name="Dr. Ada Lovelace",
            room_number="Lecture Hall 3",
            target_class="Computer Science 101",
            expected_duration_minutes=50,
            status="COMPLETED",
            source_type="LIVE",
            start_time=now - datetime.timedelta(days=2, hours=1),
            end_time=now - datetime.timedelta(days=2, minutes=10),
            actual_duration_seconds=3000.0
        )
        db.add(sess1)
        await db.flush()

        # Session 1 Attendance
        statuses = ["PRESENT", "PRESENT", "LATE", "PRESENT", "PRESENT"]
        for idx, s in enumerate(created_students):
            att = AttendanceRecord(
                session_id=sess1.id,
                student_id=s.id,
                detected_name=s.full_name,
                status=statuses[idx],
                first_seen_seconds=30.0 if statuses[idx] != "LATE" else 720.0,
                last_seen_seconds=2800.0,
                sustained_duration_seconds=2400.0 if statuses[idx] != "LATE" else 1800.0,
                observation_count=35,
                avg_confidence=0.89,
                is_manual_override=False,
                notes="Automated facial verification sustained"
            )
            db.add(att)

        # Session 1 Engagement Windows (30s intervals)
        for w_idx in range(10):
            score = 75.0 + (5.0 if w_idx % 2 == 0 else -6.0)
            win = EngagementWindow(
                session_id=sess1.id,
                window_index=w_idx,
                start_seconds=w_idx * 30.0,
                end_seconds=(w_idx + 1) * 30.0,
                person_count_avg=4.8,
                forward_facing_ratio=0.82,
                movement_intensity=0.35,
                prolonged_inactivity_ratio=0.1,
                speech_active_ratio=0.28,
                interaction_activity_score=score,
                is_audio_available=True,
                is_video_available=True,
                notes="Observable signals"
            )
            db.add(win)

        # Session 1 Teaching Suggestion
        sug = TeachingSuggestion(
            session_id=sess1.id,
            suggestion_type="STEADY_FLOW",
            title="Maintain Current Instructional Rhythm",
            description="Classroom behavioral signals reflected steady, sustained interaction throughout the lecture interval.",
            evidence="Observed forward pose ratio averaged 82% with moderate physical activity.",
            urgency="LOW",
            generated_by="RULE_BASED",
            acknowledged=True
        )
        db.add(sug)

        await db.commit()
        print("Demo data successfully populated!")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
